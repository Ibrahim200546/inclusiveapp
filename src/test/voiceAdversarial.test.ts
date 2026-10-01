import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const source = readFileSync(resolve('public/original/js/voice-practice.js'), 'utf8');
function deferred() {
  let resolve!: (value?: unknown) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
}
function stream() {
  const tracks = Array.from({ length: 2 }, () => ({ readyState: 'live', stop: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  return { getTracks: () => tracks, getAudioTracks: () => tracks, tracks };
}
function fixture(settings: { grants?: unknown[]; resumes?: Promise<unknown>[]; analyze?: () => unknown } = {}) {
  const contexts: any[] = [];
  const frames = new Map<number, () => void>();
  const grants = [...(settings.grants || [Promise.resolve(stream())])];
  const resumes = [...(settings.resumes || [])];
  let active = true, now = 0, frame = 0;
  class Context {
    state = 'running';
    sampleRate = 48000;
    source = { connect: vi.fn(), disconnect: vi.fn() };
    analyser = { fftSize: 4096, getFloatTimeDomainData: vi.fn(), disconnect: vi.fn() };
    resume = vi.fn(() => resumes.shift() || Promise.resolve());
    close = vi.fn(async () => { this.state = 'closed'; });
    createMediaStreamSource = () => this.source;
    createAnalyser = () => this.analyser;
    constructor() { contexts.push(this); }
  }
  const root: any = {
    navigator: {}, document: { readyState: 'loading', addEventListener: vi.fn() },
    requestAnimationFrame: vi.fn(), cancelAnimationFrame: vi.fn(),
  };
  runInNewContext(source, { window: root, Float32Array });
  const onState = vi.fn();
  const getUserMedia = vi.fn(() => grants.shift());
  const session = new root.VoicePracticeSession({
    AudioContext: Context, secureContext: true, mediaDevices: { getUserMedia },
    now: () => now, isActive: () => active, calibrationMs: 0,
    analyze: settings.analyze || (() => ({ rms: 0.1, voiced: true, periodicity: 1 })),
    requestFrame: (callback: () => void) => { frames.set(++frame, callback); return frame; },
    cancelFrame: (id: number) => frames.delete(id), onState,
  });
  const step = (delta = 20) => { now += delta; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback()); };
  return { session, contexts, frames, onState, getUserMedia, step, deactivate: () => { active = false; } };
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

describe('independent microphone cancellation and race review', () => {
  it('late resume of a cancelled session cannot overwrite or close a newer one', async () => {
    const firstResume = deferred();
    const first = stream(), second = stream();
    const f = fixture({ grants: [Promise.resolve(first), Promise.resolve(second)], resumes: [firstResume.promise, Promise.resolve()] });
    const oldStart = f.session.start();
    await flush();
    f.session.stop();
    expect(await f.session.start()).toBe(true);
    firstResume.resolve();
    expect(await oldStart).toBe(false);
    expect(f.session.state).toBe('calibrating');
    expect(f.contexts[1].close).not.toHaveBeenCalled();
    first.tracks.forEach(track => expect(track.stop).toHaveBeenCalledOnce());
    second.tracks.forEach(track => expect(track.stop).not.toHaveBeenCalled());
    f.session.stop();
  });

  it('late rejection of an old permission request cannot change a running session', async () => {
    const permission = deferred();
    const f = fixture({ grants: [permission.promise, Promise.resolve(stream())] });
    const oldStart = f.session.start();
    f.session.stop();
    await f.session.start();
    permission.reject({ name: 'NotAllowedError' });
    expect(await oldStart).toBe(false);
    expect(f.session.state).toBe('calibrating');
    expect(f.contexts[1].close).not.toHaveBeenCalled();
    f.session.stop();
  });

  it('failed AudioContext resume releases all granted tracks without starting a loop', async () => {
    const resume = deferred(), media = stream();
    const f = fixture({ grants: [Promise.resolve(media)], resumes: [resume.promise] });
    const starting = f.session.start();
    await flush();
    resume.reject({ name: 'NotAllowedError' });
    expect(await starting).toBe(false);
    media.tracks.forEach(track => expect(track.stop).toHaveBeenCalledOnce());
    expect(f.contexts[0].close).toHaveBeenCalledOnce();
    expect(f.frames.size).toBe(0);
  });

  it('leaving after permission but before resume closes every resource', async () => {
    const resume = deferred(), media = stream();
    const f = fixture({ grants: [Promise.resolve(media)], resumes: [resume.promise] });
    const starting = f.session.start();
    await flush();
    f.deactivate();
    resume.resolve();
    expect(await starting).toBe(false);
    media.tracks.forEach(track => expect(track.stop).toHaveBeenCalledOnce());
    expect(f.contexts[0].close).toHaveBeenCalledOnce();
    expect(f.frames.size).toBe(0);
  });

  it('analysis failure releases the stream instead of leaving the microphone live', async () => {
    const media = stream();
    const f = fixture({ grants: [Promise.resolve(media)], analyze: () => { throw new Error('DSP failure'); } });
    await f.session.start(); f.step();
    expect(f.onState).toHaveBeenLastCalledWith('error', 'MICROPHONE_ERROR');
    media.tracks.forEach(track => expect(track.stop).toHaveBeenCalledOnce());
    expect(f.frames.size).toBe(0);
  });

  it('background/stalled frames cannot instantly award seconds of unobserved voice', async () => {
    const f = fixture(); await f.session.start();
    for (let i = 0; i < 20; i++) f.step();
    const before = f.session.progressMs;
    f.step(10000);
    expect(f.session.progressMs - before).toBeLessThanOrEqual(125);
    expect(f.session.state).not.toBe('complete');
    f.session.stop();
  });
});

describe('microphone integration contracts', () => {
  it('loads the session after legacy definitions and before shared audio hooks', () => {
    const html = readFileSync(resolve('public/original/index2.html'), 'utf8');
    const scripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(match => match[1].split('?')[0]);
    expect(scripts.indexOf('js/audio-dsp.js')).toBeLessThan(scripts.indexOf('js/voice-practice.js'));
    expect(scripts.indexOf('grade234-functions.js')).toBeLessThan(scripts.indexOf('js/voice-practice.js'));
    expect(scripts.indexOf('js/voice-practice.js')).toBeLessThan(scripts.indexOf('js/app-audio.js'));
    expect(html).toMatch(/<button[^>]+id="voiceCenterBtn"/);
  });

  it('shared screen navigation stops train and articulation input streams before navigating', () => {
    const app = readFileSync(resolve('public/original/js/app-audio.js'), 'utf8');
    const stopInput = app.slice(app.indexOf('  function stopInputStreams()'), app.indexOf('\n  function ', app.indexOf('  function stopInputStreams()') + 12));
    const calls: string[] = [];
    const root = { stopArticulationPractice: () => calls.push('articulation') };
    runInNewContext(`${stopInput}; stopInputStreams();`, {
      window: root, console, stopVoicePractice: () => calls.push('practice'), stopVoiceGame: () => calls.push('train'),
    });
    expect(calls).toEqual(['practice', 'train', 'articulation']);
    const wrapper = app.slice(app.indexOf('  function wrapShowScreen()'), app.indexOf('  function getActiveScreenId()'));
    const navigation: string[] = [];
    const target = { showScreen: (id: string) => navigation.push(id) };
    runInNewContext(`${wrapper}; wrapShowScreen(); window.showScreen('next');`, { window: target, stopAllAppAudio: () => navigation.push('stop') });
    expect(navigation).toEqual(['stop', 'next']);
  });
});
