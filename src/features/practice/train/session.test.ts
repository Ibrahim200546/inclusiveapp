import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTrainSession, type CaptureEnvironment } from './session';
import type { Segment, SessionOptions } from './types';

function deferred<T>() { let resolve!: (value: T) => void, reject!: (error: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function setup(options: Partial<SessionOptions> = {}) {
  const track = Object.assign(new EventTarget(), { readyState: 'live', stop: vi.fn() });
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] } as unknown as MediaStream;
  const source = { connect: vi.fn(), disconnect: vi.fn() };
  const processor = { connect: vi.fn(), disconnect: vi.fn(), onaudioprocess: null as ScriptProcessorNode['onaudioprocess'] };
  const context = Object.assign(new EventTarget(), { state: 'running', sampleRate: 16000, destination: {},
    createMediaStreamSource: vi.fn(() => source), createScriptProcessor: vi.fn(() => processor),
    resume: vi.fn(async () => {}), close: vi.fn(async () => {}) });
  const getUserMedia = vi.fn(async () => stream), model = { preload: vi.fn<() => Promise<unknown>>().mockResolvedValue({ ready: true }),
    recognize: vi.fn<(pcm: ArrayBuffer, signal: AbortSignal) => Promise<Segment[]>>().mockResolvedValue([{ phone: 'a', confidence: .95 }]) };
  const env = { navigator: { mediaDevices: { getUserMedia } }, AudioContext: function () { return context; } } as unknown as CaptureEnvironment;
  const callbacks = { onState: vi.fn(), onResult: vi.fn(), onProgress: vi.fn(), onError: vi.fn(), ...options };
  const session = createTrainSession({ letter: 'А', mode: 'long', ...callbacks }, model, env);
  const samples = Float32Array.from({ length: 1024 }, (_, i) => Math.sin(i * 220 / 16000 * 2 * Math.PI) * .15);
  return { session, callbacks, model, env, track, stream, source, processor, context, getUserMedia,
    tick(silent = false) {
      const input = silent ? new Float32Array(1024) : samples, output = new Float32Array(1024).fill(1);
      processor.onaudioprocess?.call(processor as unknown as ScriptProcessorNode,
        { inputBuffer: { getChannelData: () => input }, outputBuffer: { getChannelData: () => output } } as unknown as AudioProcessingEvent);
      return output;
    },
    capture(silent = false) { for (let i = 0; i < 125; i++) this.tick(silent); },
  };
}
afterEach(() => { vi.useRealTimers(); });

describe('train microphone and recognition lifecycle', () => {
  it('waits for loading before access, refuses a second start and releases late permission', async () => {
    const h = setup(), loaded = deferred<unknown>(), permission = deferred<MediaStream>();
    h.model.preload.mockReturnValueOnce(loaded.promise); h.getUserMedia.mockReturnValueOnce(permission.promise);
    const first = h.session.start(); expect(await h.session.start()).toBe(false); expect(h.getUserMedia).not.toHaveBeenCalled();
    loaded.resolve({}); await vi.waitFor(() => expect(h.getUserMedia).toHaveBeenCalledOnce()); h.session.stop(); permission.resolve(h.stream);
    expect(await first).toBe(false); expect(h.track.stop).toHaveBeenCalledOnce(); expect(h.context.resume).not.toHaveBeenCalled();
  });
  it('does not request microphone after cancellation during model loading', async () => {
    const h = setup(), loaded = deferred<unknown>(); h.model.preload.mockReturnValueOnce(loaded.promise);
    const pending = h.session.start(); h.session.stop(); loaded.resolve({}); await pending;
    expect(h.getUserMedia).not.toHaveBeenCalled();
  });
  it('closes microphone before inference, mutes output and requires identity plus duration', async () => {
    const h = setup(); await h.session.start(); expect(h.tick().every(value => value === 0)).toBe(true);
    h.capture(); expect(h.session.state).toBe('checking'); expect(h.track.stop).toHaveBeenCalledOnce();
    expect(h.source.disconnect).toHaveBeenCalledOnce(); expect(h.processor.disconnect).toHaveBeenCalledOnce(); expect(h.context.close).toHaveBeenCalledOnce();
    await vi.waitFor(() => expect(h.session.state).toBe('complete'));
    expect(h.callbacks.onResult).toHaveBeenCalledWith(expect.objectContaining({ correct: true, durationMs: 2000 }));
    expect(h.model.recognize).toHaveBeenCalledOnce(); expect(h.processor.onaudioprocess).toBeNull(); h.session.dispose();
  });
  it('does not send silence to recognition or award it as correct', async () => {
    const h = setup(); await h.session.start(); h.capture(true);
    await vi.waitFor(() => expect(h.session.state).toBe('incorrect'));
    expect(h.model.recognize).not.toHaveBeenCalled(); expect(h.callbacks.onResult).toHaveBeenCalledWith(expect.objectContaining({ reason: 'empty', correct: false }));
  });
  it('rejects a different recognized sound despite strong sustained voice', async () => {
    const h = setup(); h.model.recognize.mockResolvedValueOnce([{ phone: 'o' }]); await h.session.start(); h.capture();
    await vi.waitFor(() => expect(h.session.state).toBe('incorrect')); expect(h.callbacks.onResult).toHaveBeenCalledWith(expect.objectContaining({ reason: 'different', correct: false }));
  });
  it('aborts inference and ignores its late verdict', async () => {
    const h = setup(), result = deferred<Segment[]>(); h.model.recognize.mockReturnValueOnce(result.promise);
    await h.session.start(); h.capture(); const signal = h.model.recognize.mock.calls[0][1]; h.session.stop();
    expect(signal.aborted).toBe(true); result.resolve([{ phone: 'a' }]); await Promise.resolve(); await Promise.resolve();
    expect(h.callbacks.onResult).not.toHaveBeenCalled(); expect(h.session.state).toBe('stopped');
  });
  it.each([false, true])('resamples a 48 kHz device and releases buffers (cancelled: %s)', async cancelled => {
    const h = setup(), rendering = deferred<AudioBuffer>(), original = new Float32Array(48000 * 8), renderedSamples = new Float32Array(16000 * 8).fill(.1);
    const buffer = { copyToChannel: (pcm: Float32Array) => original.set(pcm), getChannelData: () => original };
    const input = { buffer: null, connect: vi.fn(), start: vi.fn(), disconnect: vi.fn() };
    const offline = { destination: {}, createBuffer: () => buffer, createBufferSource: () => input, startRendering: () => rendering.promise };
    h.context.sampleRate = 48000;
    h.env.OfflineAudioContext = function () { return offline; } as unknown as typeof OfflineAudioContext;
    await h.session.start(); for (let i = 0; i < 375; i++) h.tick();
    expect(h.session.state).toBe('checking'); expect(h.track.stop).toHaveBeenCalledOnce();
    if (cancelled) h.session.stop(); rendering.resolve({ getChannelData: () => renderedSamples } as unknown as AudioBuffer);
    await vi.waitFor(() => expect(original.every(value => value === 0)).toBe(true));
    expect(renderedSamples.every(value => value === 0)).toBe(true); expect(input.disconnect).toHaveBeenCalledOnce();
    if (cancelled) { expect(h.model.recognize).not.toHaveBeenCalled(); expect(h.callbacks.onResult).not.toHaveBeenCalled(); }
    else { expect(h.model.recognize).toHaveBeenCalledOnce(); expect(h.model.recognize.mock.calls[0][0].byteLength).toBeLessThanOrEqual(80000 * 4); }
  });
  it.each(['loading', 'requesting', 'checking'] as const)('supports cancellation directly from the %s notification', async phase => {
    const h = setup({ onState: state => { if (state === phase) h.session.stop(); } });
    await h.session.start(); if (phase === 'checking') h.capture();
    expect(h.session.state).toBe('stopped'); expect(h.model.recognize).not.toHaveBeenCalled();
    if (phase !== 'checking') expect(h.getUserMedia).not.toHaveBeenCalled();
  });
  it('does not emit a completion after the result handler cancels', async () => {
    const h = setup({ onResult: () => h.session.stop() }); await h.session.start(); h.capture();
    await vi.waitFor(() => expect(h.session.state).toBe('stopped')); expect(h.callbacks.onState).not.toHaveBeenCalledWith('complete');
  });
  it('times out a pending permission and stops a late stream', async () => {
    vi.useFakeTimers(); const h = setup(), permission = deferred<MediaStream>(); h.getUserMedia.mockReturnValueOnce(permission.promise);
    const pending = h.session.start(); await Promise.resolve(); await vi.advanceTimersByTimeAsync(45000);
    expect(h.session.state).toBe('error'); expect(h.callbacks.onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'MicrophoneTimeout' }));
    permission.resolve(h.stream); await pending; expect(h.track.stop).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  });
  it('times out suspended resume and ignores its eventual resolution', async () => {
    vi.useFakeTimers(); const h = setup(), resumed = deferred<void>(); h.context.resume.mockReturnValueOnce(resumed.promise);
    const pending = h.session.start(); await vi.advanceTimersByTimeAsync(15000); expect(h.session.state).toBe('error');
    expect(h.track.stop).toHaveBeenCalledOnce(); resumed.resolve(); expect(await pending).toBe(false); expect(vi.getTimerCount()).toBe(0);
  });
  it.each(['denied', 'missing-media', 'missing-context', 'ended-track', 'resume-error'] as const)('recovers from %s without retaining capture resources', async kind => {
    const h = setup();
    if (kind === 'denied') h.getUserMedia.mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'));
    if (kind === 'missing-media') Object.assign(h.env, { navigator: {} });
    if (kind === 'missing-context') h.env.AudioContext = undefined;
    if (kind === 'ended-track') h.track.readyState = 'ended';
    if (kind === 'resume-error') { h.context.resume.mockRejectedValueOnce(new Error('resume')); h.context.close.mockImplementationOnce(() => { throw new Error('close'); }); }
    expect(await h.session.start()).toBe(false); expect(h.session.state).toBe('error'); expect(h.callbacks.onError).toHaveBeenCalledOnce();
    if (!['denied', 'missing-media'].includes(kind)) expect(h.track.stop).toHaveBeenCalledOnce(); h.session.dispose();
  });
  it.each(['device', 'context'] as const)('stops on interruption of the %s', async kind => {
    const h = setup(); await h.session.start(); h.tick();
    if (kind === 'device') h.track.dispatchEvent(new Event('ended'));
    else { h.context.state = 'suspended'; h.context.dispatchEvent(new Event('statechange')); }
    expect(h.session.state).toBe('error'); expect(h.track.stop).toHaveBeenCalledOnce(); expect(h.context.close).toHaveBeenCalledOnce();
    h.track.dispatchEvent(new Event('ended')); expect(h.callbacks.onError).toHaveBeenCalledOnce();
  });
  it('clears capture watchdogs on exit and refuses to restart a disposed session', async () => {
    vi.useFakeTimers(); const h = setup(); await h.session.start(); expect(vi.getTimerCount()).toBe(1);
    h.session.dispose(); expect(vi.getTimerCount()).toBe(0); expect(await h.session.start()).toBe(false); expect(h.track.stop).toHaveBeenCalledOnce();
  });
});
