import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { AudioWindow } from '../audio/types';
import { createPresencePlayer } from './player';

function deferred() { let resolve!: () => void, reject!: (error: Error) => void; const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function setup() {
  class Video extends EventTarget {
    src = ''; currentTime = 0; paused = true; ended = false; error = null; readyState = 0; videoWidth = 0; videoHeight = 0;
    muted = false; volume = 1; playbackRate = 1;
    get currentSrc() { return this.src; }
    play = vi.fn(async () => { this.paused = false; });
    pause = vi.fn(() => { const changed = !this.paused; this.paused = true; if (changed) this.dispatchEvent(new Event('pause')); });
    load = vi.fn(); removeAttribute = vi.fn((name: string) => { if (name === 'src') this.src = ''; });
  }
  const contexts: Context[] = [], frames = new Map<number, FrameRequestCallback>(); let frame = 0, url = 0, signal = true;
  const resumed = vi.fn(async () => {});
  class Context {
    state = 'running'; destination = {}; sampleRate = 48000;
    source = { connect: vi.fn(), disconnect: vi.fn() };
    analyser = { fftSize: 2048, connect: vi.fn(), disconnect: vi.fn(), getByteTimeDomainData: (samples: Uint8Array) => samples.fill(signal ? 136 : 128) };
    gain = { gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() };
    resume = resumed; close = vi.fn(async () => { this.state = 'closed'; });
    createMediaElementSource = vi.fn(() => this.source); createAnalyser = () => this.analyser; createGain = () => this.gain;
    constructor() { contexts.push(this); }
  }
  const revoke = vi.fn(), stopContent = vi.fn();
  const app = { AudioContext: Context, URL: { createObjectURL: () => `blob:video-${++url}`, revokeObjectURL: revoke },
    setTimeout: window.setTimeout.bind(window), clearTimeout: window.clearTimeout.bind(window),
    setInterval: window.setInterval.bind(window), clearInterval: window.clearInterval.bind(window),
    requestAnimationFrame: (callback: FrameRequestCallback) => { frames.set(++frame, callback); return frame; }, cancelAnimationFrame: (id: number) => frames.delete(id),
  } as unknown as AudioWindow;
  const player = createPresencePlayer(app, stopContent), video = new Video(); const detach = player.attach(video as unknown as HTMLVideoElement);
  const source = new Blob(['local']);
  async function load() {
    const pending = player.load(source); video.videoWidth = 64; video.videoHeight = 48; video.readyState = 1; video.dispatchEvent(new Event('loadedmetadata'));
    expect(await pending).toBe('ready');
  }
  function end() { video.ended = true; video.dispatchEvent(new Event('ended')); }
  return { player, video, load, end, source, contexts, resumed, revoke, frames, detach, stopContent, setSignal(value: boolean) { signal = value; },
    sample(time = .1) { video.currentTime = time; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(time * 1000)); },
  };
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('uses the same video frames with both muting mechanisms and measures signal during preview', async () => {
  const h = setup(); await h.load(); const url = h.video.currentSrc;
  const preview = h.player.play(true, true); await Promise.resolve();
  expect(h.video.muted).toBe(false); expect(h.contexts[0].gain.gain.value).toBe(1);
  h.sample();
  h.end(); expect(await preview).toEqual({ kind: 'ended', signal: true });
  h.video.ended = false; const silent = h.player.play(false, false); await Promise.resolve();
  expect(h.video.currentSrc).toBe(url); expect(h.video.muted).toBe(true); expect(h.contexts[0].gain.gain.value).toBe(0);
  h.end(); expect(await silent).toEqual({ kind: 'ended', signal: false });
  expect(h.contexts).toHaveLength(1); expect(h.stopContent).toHaveBeenCalledTimes(2); h.detach();
  expect(h.revoke).toHaveBeenCalledWith(url); expect(h.contexts[0].close).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
});
it('does not confuse silent audio with speech and cancels analyser frames', async () => {
  const h = setup(); h.setSignal(false); await h.load(); const preview = h.player.play(true, true); await Promise.resolve();
  expect(h.frames.size).toBe(1); h.end(); expect(await preview).toEqual({ kind: 'ended', signal: false });
  expect(h.frames.size).toBe(0); h.detach();
});
it('ignores previous-file samples until a fresh analysis window has played', async () => {
  const h = setup(); await h.load();
  const preview = h.player.play(true, true); await Promise.resolve();
  h.sample(.001); // The analyser still has old audible samples before the new window.
  h.setSignal(false); h.sample(); h.end();
  expect(await preview).toEqual({ kind: 'ended', signal: false }); h.detach();
});
it('replaces local URLs while reusing the audio source for the mounted video', async () => {
  const h = setup(); await h.load(); const first = h.player.play(true, true); await Promise.resolve(); h.end(); await first;
  await h.load(); h.video.ended = false; const second = h.player.play(true, true); await Promise.resolve(); h.end(); await second;
  expect(h.revoke).toHaveBeenCalledWith('blob:video-1'); expect(h.contexts).toHaveLength(1);
  expect(h.contexts[0].createMediaElementSource).toHaveBeenCalledOnce(); h.player.dispose(); h.detach();
  expect(h.revoke).toHaveBeenCalledTimes(2); expect(h.contexts[0].source.disconnect).toHaveBeenCalledOnce();
});
it('rejects audio-only metadata, loading errors and stalled metadata and clears timeouts', async () => {
  const h = setup(); const audioOnly = h.player.load(h.source); h.video.readyState = 1; h.video.dispatchEvent(new Event('loadedmetadata'));
  expect(await audioOnly).toBe('noVideo');
  const broken = h.player.load(h.source); h.video.error = {} as MediaError; h.video.dispatchEvent(new Event('error')); expect(await broken).toBe('unsupported');
  h.video.error = null; const stalled = h.player.load(h.source); await vi.advanceTimersByTimeAsync(15000); expect(await stalled).toBe('unsupported');
  h.detach(); expect(vi.getTimerCount()).toBe(0);
});
it('settles cancelled loading and cannot resurrect an unmounted source', async () => {
  const h = setup(); const pending = h.player.load(h.source); h.detach(); expect(await pending).toBe('cancelled');
  h.video.dispatchEvent(new Event('loadedmetadata')); expect(h.video.currentSrc).toBe(''); expect(h.revoke).toHaveBeenCalledOnce();
  expect(await h.player.load(h.source)).toBe('cancelled'); expect(vi.getTimerCount()).toBe(0);
});
it('does not start native playback after a cancelled AudioContext resume', async () => {
  const h = setup(), resume = deferred(); await h.load(); h.resumed.mockReturnValueOnce(resume.promise);
  const pending = h.player.play(true, true); h.player.stop(); resume.resolve(); expect(await pending).toEqual({ kind: 'cancelled' });
  await Promise.resolve(); expect(h.video.play).not.toHaveBeenCalled(); h.detach(); expect(vi.getTimerCount()).toBe(0);
});
it('stops a late native play resolution without pausing a newer attempt on the same video', async () => {
  const h = setup(), native = deferred(); await h.load(); h.video.play.mockImplementationOnce(() => { h.video.paused = false; return native.promise; });
  const old = h.player.play(true, true); await Promise.resolve(); h.player.stop(); expect(await old).toEqual({ kind: 'cancelled' });
  const next = h.player.play(false, false); await Promise.resolve(); native.resolve(); await Promise.resolve();
  expect(h.video.paused).toBe(false); h.end(); expect(await next).toEqual({ kind: 'ended', signal: false }); h.detach();
});
it('pauses a cancelled native play that completes after leaving', async () => {
  const h = setup(), native = deferred(); await h.load(); h.video.play.mockReturnValueOnce(native.promise);
  const old = h.player.play(true, true); await Promise.resolve(); h.detach(); expect(await old).toEqual({ kind: 'cancelled' });
  h.video.paused = false; native.resolve(); await Promise.resolve(); expect(h.video.paused).toBe(true);
});
it.each(['pause', 'error', 'stall', 'reject'] as const)('settles %s without successful completion', async action => {
  const h = setup(); await h.load(); if (action === 'reject') h.video.play.mockRejectedValueOnce(new Error('autoplay'));
  const pending = h.player.play(true, true); await Promise.resolve();
  if (action === 'pause') h.video.pause();
  if (action === 'error') h.video.dispatchEvent(new Event('error'));
  if (action === 'stall') await vi.advanceTimersByTimeAsync(34000);
  expect(await pending).toEqual({ kind: action === 'pause' ? 'interrupted' : 'failed' });
  h.detach(); expect(vi.getTimerCount()).toBe(0); expect(h.frames.size).toBe(0);
});
