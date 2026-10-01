import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

type MeterResult = { durationMs: number; progress: number; complete: boolean };
type VoiceApi = {
  classifyFrame(samples: Float32Array, rate: number): { voiced: boolean; rms: number };
  createMeter(required?: number): { update(time: number, voiced: boolean): MeterResult };
  create(options: Record<string, unknown>): { start(): Promise<boolean>; stop(): void; dispose(): void; state: string };
};
const scope: { TrainVoiceSession?: VoiceApi } = {};
new Function('window', readFileSync('public/original/js/train-voice-session.js', 'utf8'))(scope);
const api = scope.TrainVoiceSession!;
function tone(frequency = 220) { return Float32Array.from({ length: 2048 }, (_, i) => Math.sin(i * frequency / 48000 * Math.PI * 2) * 0.15); }
function environment(permission: Promise<unknown>) {
  const track = { stop: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), readyState: 'live' };
  const stream = { getTracks: () => [track] };
  const analyser = { fftSize: 2048, getFloatTimeDomainData: (buffer: Float32Array) => buffer.set(tone()) };
  const source = { connect: vi.fn(), disconnect: vi.fn() };
  const context = { sampleRate: 48000, state: 'running', close: vi.fn(async () => {}), resume: vi.fn(async () => {}), createAnalyser: () => analyser, createMediaStreamSource: () => source };
  const events: Record<string, () => void> = {};
  let callback: (now: number) => void = () => {};
  const timers: Record<number, () => void> = {}; let timerId = 0;
  const env = { setTimeout: (fn: () => void) => { timers[++timerId] = fn; return timerId; }, clearTimeout: (id: number) => { delete timers[id]; }, navigator: { mediaDevices: { getUserMedia: vi.fn(() => permission.then(() => stream)) } }, AudioContext: function () { return context; }, requestAnimationFrame: vi.fn((fn: (now: number) => void) => { callback = fn; return 1; }), cancelAnimationFrame: vi.fn(), addEventListener: (name: string, fn: () => void) => { events[name] = fn; }, removeEventListener: vi.fn() };
  return { env, track, context, source, events, timers, tick: (now: number) => callback(now) };
}
describe('train voiced activity, not pronunciation', () => {
  it('handles timeout while permission is pending and cleans up late stream', async () => {
    let resolve!: () => void;
    const fake = environment(new Promise<void>(done => { resolve = done; }));
    const onError = vi.fn(); const session = api.create({ environment: fake.env, onError });
    const pending = session.start(); Object.values(fake.timers)[0]();
    expect(session.state).toBe('error'); resolve(); await pending;
    expect(fake.track.stop).toHaveBeenCalledOnce(); session.dispose();
  });
  it('cleans tracks and context if resume fails, even if close throws', async () => {
    const fake = environment(Promise.resolve());
    fake.context.resume.mockImplementation(async () => { throw new Error('ResumeDenied'); });
    fake.context.close.mockImplementation(() => { throw new Error('CloseFailed'); });
    const session = api.create({ environment: fake.env });
    expect(await session.start()).toBe(false);
    expect(fake.track.stop).toHaveBeenCalledOnce(); expect(session.state).toBe('error'); session.dispose();
  });
  it('handles unavailable audio APIs without resources', async () => {
    const onError = vi.fn();
    const base = { setTimeout: () => 1, clearTimeout: () => {}, navigator: {} };
    const session = api.create({ environment: base, onError });
    expect(await session.start()).toBe(false); expect(onError).toHaveBeenCalledOnce(); session.dispose();
    const fake = environment(Promise.resolve());
    const noContext = { ...fake.env, AudioContext: undefined };
    const another = api.create({ environment: noContext });
    expect(await another.start()).toBe(false); expect(fake.track.stop).toHaveBeenCalledOnce(); another.dispose();
  });
  it('rejects silence and deterministic broadband noise, accepts sustained periodic signal', () => {
    expect(api.classifyFrame(new Float32Array(2048), 48000).voiced).toBe(false);
    let seed = 123;
    const noise = Float32Array.from({ length: 2048 }, () => { seed = (seed * 1664525 + 1013904223) >>> 0; return (seed / 4294967296 - 0.5) * 0.5; });
    expect(api.classifyFrame(noise, 48000).voiced).toBe(false);
    expect(api.classifyFrame(tone(), 48000).voiced).toBe(true);
    expect(api.classifyFrame(tone(80), 48000).voiced).toBe(true);
    expect(api.classifyFrame(tone(430), 48000).voiced).toBe(true);
  });
  it.each([30, 60, 120])('uses 2 seconds at %s FPS', fps => {
    const meter = api.createMeter();
    let result = meter.update(0, true);
    for (let i = 1; i <= fps * 2; i++) result = meter.update(i * 1000 / fps, true);
    expect(result.durationMs).toBeCloseTo(2000);
    expect(result.complete).toBe(true);
  });
  it('long silence and hidden-frame gaps reset sustain', () => {
    const meter = api.createMeter();
    for (let t = 0; t <= 1000; t += 50) meter.update(t, true);
    expect(meter.update(1050, false).progress).toBe(50);
    for (let t = 1100; t <= 1300; t += 50) meter.update(t, false);
    expect(meter.update(1350, true).progress).toBe(0);
    expect(meter.update(9000, true).progress).toBe(0);
  });
  it('stops late permission stream after cancellation and refuses busy start', async () => {
    let resolve!: () => void;
    const fake = environment(new Promise<void>(done => { resolve = done; }));
    const session = api.create({ environment: fake.env });
    const first = session.start();
    expect(await session.start()).toBe(false);
    session.stop(); resolve();
    expect(await first).toBe(false);
    expect(fake.track.stop).toHaveBeenCalledOnce();
    expect(fake.context.resume).not.toHaveBeenCalled();
    session.dispose();
  });
  it('finishes and closes all resources, restarting creates a new duration', async () => {
    const fake = environment(Promise.resolve());
    const session = api.create({ environment: fake.env });
    await session.start();
    for (let t = 0; t <= 2000; t += 50) fake.tick(t);
    expect(session.state).toBe('complete');
    expect(fake.track.stop).toHaveBeenCalledOnce();
    expect(fake.context.close).toHaveBeenCalledOnce();
    expect(fake.source.disconnect).toHaveBeenCalledOnce();
    await session.start(); fake.tick(4000);
    expect(session.state).toBe('listening');
    session.dispose();
  });
  it('cleans up on pagehide and microphone disconnect', async () => {
    const fake = environment(Promise.resolve());
    const onError = vi.fn();
    const session = api.create({ environment: fake.env, onError });
    await session.start();
    const ended = fake.track.addEventListener.mock.calls[0][1] as () => void;
    ended();
    expect(session.state).toBe('error'); expect(onError).toHaveBeenCalledOnce();
    await session.start(); fake.events.pagehide();
    expect(session.state).toBe('hidden'); expect(fake.track.stop).toHaveBeenCalledTimes(2);
    session.dispose();
  });
  it('surfaces permission denial without leaking resources', async () => {
    const fake = environment(Promise.reject(new Error('NotAllowedError')));
    const onError = vi.fn(); const session = api.create({ environment: fake.env, onError });
    expect(await session.start()).toBe(false);
    expect(session.state).toBe('error'); expect(onError).toHaveBeenCalledOnce();
    expect(fake.context.resume).not.toHaveBeenCalled(); session.dispose();
  });
});
