import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Signal = { rms: number; periodicity: number; voiced: boolean };
type Session = {
  start(): Promise<boolean>;
  stop(reason?: string): void;
  state: string;
  progressMs: number;
};
type VoiceWindow = Window & {
  AudioDSP: { analyzeVoicedFrame(samples: Float32Array, rate: number, minimum?: number): Signal };
  VoicePracticeSession: new (options: Record<string, unknown>) => Session;
  PhonemeValidator: { validate(buffer: unknown, target: string): Promise<Record<string, unknown>> };
  mountVoiceGame(): void;
  startVoicePractice(): void;
  stopVoiceGame(): void;
  getProfileLang(): string;
  showReward(): void;
};
const voice = window as unknown as VoiceWindow;
const load = (name: string) => new Function('window', readFileSync(resolve('public/original/js', name), 'utf8'))(window);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

class FakeTrack extends EventTarget {
  readyState = 'live';
  stop = vi.fn(() => { this.readyState = 'ended'; });
}
function makeStream() {
  const track = new FakeTrack();
  return { track, getTracks: () => [track], getAudioTracks: () => [track] };
}
function fixture(options: Record<string, unknown> = {}) {
  let time = 0;
  let sequence = 0;
  let audible = true;
  let active = true;
  const frames = new Map<number, () => void>();
  const stream = makeStream();
  const source = { connect: vi.fn(), disconnect: vi.fn() };
  const analyser = { fftSize: 4096, smoothingTimeConstant: 0, getFloatTimeDomainData: vi.fn(), disconnect: vi.fn() };
  const contexts: FakeContext[] = [];
  class FakeContext {
    state = 'running';
    sampleRate = 48000;
    resume = vi.fn(async () => {});
    close = vi.fn(async () => { this.state = 'closed'; });
    createMediaStreamSource = vi.fn(() => source);
    createAnalyser = vi.fn(() => analyser);
    constructor() { contexts.push(this); }
  }
  const mediaDevices = { getUserMedia: vi.fn(async () => stream) };
  const onState = vi.fn();
  const onUpdate = vi.fn();
  const session = new voice.VoicePracticeSession({
    mediaDevices, AudioContext: FakeContext, secureContext: true,
    requestFrame: (callback: () => void) => { frames.set(++sequence, callback); return sequence; },
    cancelFrame: (id: number) => frames.delete(id),
    now: () => time,
    analyze: () => ({ rms: audible ? 0.2 : 0, periodicity: audible ? 1 : 0, voiced: audible }),
    isActive: () => active,
    calibrationMs: 0, onState, onUpdate, ...options
  });
  function step(milliseconds = 20) {
    time += milliseconds;
    const callbacks = Array.from(frames.values());
    frames.clear();
    callbacks.forEach(callback => callback());
  }
  return { session, contexts, stream, source, analyser, mediaDevices, onState, onUpdate, frames, step,
    setAudible: (value: boolean) => { audible = value; }, setActive: (value: boolean) => { active = value; } };
}

beforeEach(() => {
  document.body.replaceChildren();
  load('audio-dsp.js');
  load('voice-practice.js');
});
afterEach(() => vi.restoreAllMocks());

describe('local signal analysis, not pronunciation recognition', () => {
  it.each([16000, 44100, 48000])('detects periodic voiced-like sound at %i Hz', rate => {
    const wave = Float32Array.from({ length: 4096 }, (_, i) => 0.08 * Math.sin(2 * Math.PI * 230 * i / rate));
    const result = voice.AudioDSP.analyzeVoicedFrame(wave, rate);
    expect(result.voiced).toBe(true);
    expect(result.rms).toBeGreaterThan(0.04);
    expect(result.periodicity).toBeGreaterThan(0.9);
  });
  it('rejects silence, DC offset, low mains hum, and deterministic broadband noise', () => {
    let seed = 7;
    const noise = Float32Array.from({ length: 4096 }, () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return (seed / 0xffffffff - 0.5) * 0.2;
    });
    const hum = Float32Array.from({ length: 4096 }, (_, i) => 0.08 * Math.sin(2 * Math.PI * 50 * i / 48000));
    for (const input of [new Float32Array(4096), new Float32Array(4096).fill(0.3), noise, hum]) {
      expect(voice.AudioDSP.analyzeVoicedFrame(input, 48000).voiced).toBe(false);
    }
  });
  it('guards malformed input and honors the energy threshold', () => {
    expect(voice.AudioDSP.analyzeVoicedFrame(new Float32Array([NaN]), 48000).voiced).toBe(false);
    const quiet = Float32Array.from({ length: 4096 }, (_, i) => 0.001 * Math.sin(i));
    expect(voice.AudioDSP.analyzeVoicedFrame(quiet, 48000).voiced).toBe(false);
    expect(voice.AudioDSP.analyzeVoicedFrame(new Float32Array(4096).fill(NaN), 48000).rms).toBe(0);
  });
  it('never claims a target vowel is correct or generates a confidence score', async () => {
    load('phoneme-validator.js');
    const wave = Float32Array.from({ length: 8192 }, (_, i) => 0.1 * Math.sin(2 * Math.PI * 220 * i / 48000));
    const result = await voice.PhonemeValidator.validate({ getChannelData: () => wave, sampleRate: 48000 }, 'А');
    expect(result).toMatchObject({ target: 'А', success: false, pronunciationEvaluated: false, voiceDetected: true });
    expect(result).not.toHaveProperty('score');
  });
});

describe('microphone session lifecycle', () => {
  it('ignores duplicate starts and stops every resource', async () => {
    const f = fixture();
    await Promise.all([f.session.start(), f.session.start()]);
    expect(f.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
    f.session.stop();
    expect(f.stream.track.stop).toHaveBeenCalledOnce();
    expect(f.source.disconnect).toHaveBeenCalledOnce();
    expect(f.analyser.disconnect).toHaveBeenCalledOnce();
    expect(f.contexts[0].close).toHaveBeenCalledOnce();
    expect(f.frames.size).toBe(0);
  });
  it('closes the context and stops a late permission grant after cancel', async () => {
    const grant = deferred<ReturnType<typeof makeStream>>();
    const f = fixture({ mediaDevices: { getUserMedia: () => grant.promise } });
    const started = f.session.start();
    f.session.stop();
    const lateStream = makeStream();
    grant.resolve(lateStream);
    expect(await started).toBe(false);
    expect(lateStream.track.stop).toHaveBeenCalledOnce();
    expect(f.contexts[0].close).toHaveBeenCalledOnce();
    expect(f.frames.size).toBe(0);
  });
  it('does not let an old permission result overwrite a newer session', async () => {
    const old = deferred<ReturnType<typeof makeStream>>();
    const currentStream = makeStream();
    const getUserMedia = vi.fn().mockImplementationOnce(() => old.promise).mockResolvedValueOnce(currentStream);
    const f = fixture({ mediaDevices: { getUserMedia } });
    const oldStart = f.session.start();
    f.session.stop();
    await f.session.start();
    const staleStream = makeStream();
    old.resolve(staleStream);
    await oldStart;
    expect(staleStream.track.stop).toHaveBeenCalledOnce();
    expect(currentStream.track.stop).not.toHaveBeenCalled();
    expect(f.session.state).toBe('calibrating');
    f.session.stop();
  });
  it.each(['NotAllowedError', 'NotFoundError', 'NotReadableError', 'SecurityError'])('surfaces %s and permits retry', async name => {
    const stream = makeStream();
    const getUserMedia = vi.fn().mockRejectedValueOnce({ name }).mockResolvedValueOnce(stream);
    const f = fixture({ mediaDevices: { getUserMedia } });
    expect(await f.session.start()).toBe(false);
    expect(f.onState).toHaveBeenLastCalledWith('error', name);
    expect(f.contexts[0].close).toHaveBeenCalledOnce();
    expect(await f.session.start()).toBe(true);
    f.session.stop();
    expect(stream.track.stop).toHaveBeenCalledOnce();
  });
  it('offers distinct unsupported/insecure errors without requesting a stream', async () => {
    const insecure = fixture({ secureContext: false });
    await insecure.session.start();
    expect(insecure.onState).toHaveBeenLastCalledWith('error', 'INSECURE');
    expect(insecure.mediaDevices.getUserMedia).not.toHaveBeenCalled();
    const unsupported = fixture({ mediaDevices: {} });
    await unsupported.session.start();
    expect(unsupported.onState).toHaveBeenLastCalledWith('error', 'UNSUPPORTED');
  });
  it('stops on leaving the screen, including before a permission response', async () => {
    const f = fixture();
    await f.session.start();
    f.setActive(false); f.step();
    expect(f.stream.track.stop).toHaveBeenCalledOnce();
    expect(f.session.state).toBe('stopped');
    const grant = deferred<ReturnType<typeof makeStream>>();
    const pending = fixture({ mediaDevices: { getUserMedia: () => grant.promise } });
    const start = pending.session.start(); pending.setActive(false);
    const stream = makeStream(); grant.resolve(stream); await start;
    expect(stream.track.stop).toHaveBeenCalledOnce();
    expect(pending.contexts[0].close).toHaveBeenCalledOnce();
  });
  it('stops on device removal or suspended audio', async () => {
    const f = fixture(); await f.session.start();
    f.stream.track.dispatchEvent(new Event('ended'));
    expect(f.onState).toHaveBeenLastCalledWith('error', 'DEVICE_LOST');
    expect(f.frames.size).toBe(0);
    const suspended = fixture(); await suspended.session.start();
    suspended.contexts[0].state = 'suspended'; suspended.step();
    expect(suspended.onState).toHaveBeenLastCalledWith('error', 'AUDIO_PAUSED');
    expect(suspended.stream.track.stop).toHaveBeenCalledOnce();
  });
  it('cleans up if Web Audio graph creation fails after the stream opens', async () => {
    const f = fixture();
    const starting = f.session.start();
    f.contexts[0].createAnalyser.mockImplementation(() => { throw new Error('cannot create analyser'); });
    expect(await starting).toBe(false);
    expect(f.stream.track.stop).toHaveBeenCalledOnce();
    expect(f.contexts[0].close).toHaveBeenCalledOnce();
  });
  it.each([1000 / 15, 1000 / 30, 1000 / 60, 1000 / 120])('uses elapsed time rather than frame count (%f ms frames)', async delta => {
    const f = fixture(); await f.session.start();
    let elapsed = 0;
    while (f.session.state !== 'complete' && elapsed < 5000) { f.step(delta); elapsed += delta; }
    expect(f.session.state).toBe('complete');
    expect(f.session.progressMs).toBe(3000);
    expect(elapsed).toBeGreaterThanOrEqual(3100);
    expect(elapsed).toBeLessThan(3350);
    expect(f.stream.track.stop).toHaveBeenCalledOnce();
    expect(f.frames.size).toBe(0);
  });
  it('does not award silence, short bursts, calibration, or a long unobserved gap', async () => {
    const f = fixture({ calibrationMs: 700 }); await f.session.start();
    for (let i = 0; i < 35; i++) f.step();
    expect(f.session.progressMs).toBe(0);
    f.setAudible(false);
    for (let i = 0; i < 50; i++) f.step();
    expect(f.session.progressMs).toBe(0);
    f.setAudible(true); f.step(50); f.step(50);
    expect(f.session.progressMs).toBe(0);
    f.setAudible(false); f.step();
    f.setAudible(true); f.step(10000);
    expect(f.session.progressMs).toBe(0);
    f.session.stop();
  });
  it('preserves earned time through a breathing pause and stops idle sessions', async () => {
    const f = fixture({ maximumMs: 4000 }); await f.session.start();
    for (let i = 0; i < 50; i++) f.step();
    const earned = f.session.progressMs;
    expect(earned).toBeGreaterThan(0);
    f.setAudible(false);
    for (let i = 0; i < 25; i++) f.step();
    expect(f.session.progressMs).toBe(earned);
    f.step(3000);
    expect(f.onState).toHaveBeenLastCalledWith('stopped', 'timeout');
    expect(f.stream.track.stop).toHaveBeenCalledOnce();
  });
});

describe('train controls', () => {
  it('offers keyboard buttons, only sustainable vowels, real timer, clear limitations and retry', async () => {
    document.body.innerHTML = `<div id="g0Task2" class="screen active"><div id="voiceGameContainer"><button id="voiceCenterBtn" type="button"></button></div><div id="voiceFeedback"></div><div id="voiceTrainContainer"><div><div id="trainIcon"></div><div id="voiceProgressBar"></div></div><span id="trainTimer"></span></div></div>`;
    voice.getProfileLang = () => 'kk';
    voice.showReward = vi.fn();
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn().mockRejectedValue({ name: 'NotAllowedError' }) } });
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: class { state = 'running'; resume = async () => {}; close = async () => {}; } });
    voice.mountVoiceGame();
    document.getElementById('voiceCenterBtn')!.click();
    const options = Array.from(document.querySelectorAll<HTMLButtonElement>('.small-bubble'));
    expect(options.map(option => option.textContent)).toEqual(['А', 'Ә', 'О', 'Ө', 'Ұ', 'Ү', 'Ы', 'І']);
    expect(options.every(option => option.tagName === 'BUTTON' && option.type === 'button')).toBe(true);
    expect(document.activeElement).toBe(options[0]);
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    options[0].click();
    expect(options[0]).toHaveAttribute('aria-pressed', 'true');
    document.getElementById('voiceStartBtn')!.click();
    await Promise.resolve(); await Promise.resolve();
    expect(document.getElementById('voiceFeedback')).toHaveTextContent('рұқсат берілмеді');
    expect(document.getElementById('voiceStartBtn')).not.toHaveAttribute('hidden');
    expect(document.getElementById('voicePracticeNote')).toHaveTextContent('дұрыс айтылуын бағаламайды');
    expect(document.getElementById('trainTimer')).toHaveTextContent('0.0 / 3');
    expect(document.getElementById('voiceProgressBar')).toHaveAttribute('aria-valuenow', '0');
    expect(voice.showReward).not.toHaveBeenCalled();
    document.getElementById('voiceChooseBtn')!.click();
    expect(document.getElementById('voiceGameContainer')!.style.display).toBe('');
    expect(document.getElementById('voiceTrainContainer')!.style.display).toBe('none');
  });
});

describe('articulation sound-presence adapter', () => {
  function loadArticulation() {
    const source = readFileSync(resolve('public/original/script.js'), 'utf8');
    const start = source.indexOf('// ========== LOCAL ARTICULATION PRACTICE (SOUND PRESENCE ONLY) ==========');
    const end = source.indexOf('// ========== INITIALIZATION ==========', start);
    expect(start).toBeGreaterThan(-1);
    return new Function(`${source.slice(start, end)}; return { articulationEngine, startMicrophoneCheck, finishMicrophoneCheck };`)() as {
      articulationEngine: { isRecording: boolean; session: Session; stop(): void; analyze(): Record<string, unknown> };
      startMicrophoneCheck(): Promise<void>;
      finishMicrophoneCheck(): void;
    };
  }
  function modal() {
    document.body.innerHTML = `<div id="articulationModal" class="active"><div id="lessonLetter">С</div><div id="aiVisualizer"></div><button class="btn-primary">Start</button><div id="aiFeedback"></div></div>`;
    voice.getProfileLang = () => 'ru';
    voice.showReward = vi.fn();
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(99);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const contexts: Array<{ close: ReturnType<typeof vi.fn> }> = [];
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: class {
      state = 'running'; sampleRate = 48000;
      resume = async () => {};
      close = vi.fn(async () => { this.state = 'closed'; });
      createMediaStreamSource = () => ({ connect() {}, disconnect() {} });
      createAnalyser = () => ({ fftSize: 4096, disconnect() {}, getFloatTimeDomainData() {} });
      constructor() { contexts.push(this); }
    } });
    return contexts;
  }
  it('cancels a pending permission prompt on Stop and releases its late stream', async () => {
    const contexts = modal();
    const permission = deferred<ReturnType<typeof makeStream>>();
    const getUserMedia = vi.fn(() => permission.promise);
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
    const app = loadArticulation();
    const starting = app.startMicrophoneCheck();
    expect(app.articulationEngine.isRecording).toBe(true);
    await app.startMicrophoneCheck(); // Same button is Stop while permission is pending.
    expect(app.articulationEngine.isRecording).toBe(false);
    const stream = makeStream(); permission.resolve(stream); await starting;
    expect(stream.track.stop).toHaveBeenCalledOnce();
    expect(contexts[0].close).toHaveBeenCalledOnce();
    expect(getUserMedia).toHaveBeenCalledOnce();
    expect(document.querySelector('.btn-primary')).toHaveTextContent('Проверить наличие звука');
  });
  it('never gives phoneme correctness, confidence, or rewards for detected sound', async () => {
    modal();
    const stream = makeStream();
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => stream } });
    const app = loadArticulation();
    await app.startMicrophoneCheck();
    app.articulationEngine.session.progressMs = 600;
    const result = app.articulationEngine.analyze();
    expect(result).toMatchObject({ soundDetected: true, pronunciationEvaluated: false });
    expect(result).not.toHaveProperty('score');
    expect(result).not.toHaveProperty('success');
    app.finishMicrophoneCheck();
    expect(document.getElementById('aiFeedback')).toHaveTextContent('Правильность произношения не проверялась');
    expect(voice.showReward).not.toHaveBeenCalled();
    expect(stream.track.stop).toHaveBeenCalledOnce();
  });
  it('stops on modal close and safely starts a fresh microphone on reopening', async () => {
    modal();
    const first = makeStream(), second = makeStream();
    const getUserMedia = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
    const app = loadArticulation();
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await app.startMicrophoneCheck();
    document.getElementById('articulationModal')!.classList.remove('active');
    await Promise.resolve();
    expect(first.track.stop).toHaveBeenCalledOnce();
    expect(app.articulationEngine.isRecording).toBe(false);
    document.getElementById('articulationModal')!.classList.add('active');
    await Promise.resolve();
    await app.startMicrophoneCheck();
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(second.track.stop).not.toHaveBeenCalled();
    app.articulationEngine.stop();
    expect(second.track.stop).toHaveBeenCalledOnce();
  });
});
