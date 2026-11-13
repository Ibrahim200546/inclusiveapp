import { expect, it, vi } from 'vitest';
import type { AudioWindow } from '../audio/types';
import { createArticulationRecorder } from './recorder';

function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; }
function setup() {
  const tracks: (EventTarget & { readyState: string; stop: ReturnType<typeof vi.fn> })[] = [];
  const stream = () => {
    const track = Object.assign(new EventTarget(), { readyState: 'live', stop: vi.fn(() => { track.readyState = 'ended'; }) }); tracks.push(track);
    return { getTracks: () => [track], getAudioTracks: () => [track] } as unknown as MediaStream;
  };
  const contexts: Context[] = [], frames = new Map<number, FrameRequestCallback>(); let nextFrame = 0;
  class Context extends EventTarget {
    state = 'running'; source = { connect: vi.fn(), disconnect: vi.fn() };
    analyser = { fftSize: 0, smoothingTimeConstant: 0, frequencyBinCount: 1024, disconnect: vi.fn(), getByteFrequencyData: (bins: Uint8Array): void => { bins.fill(70); } };
    resume = vi.fn(async () => {}); close = vi.fn(async () => { this.state = 'closed'; });
    createMediaStreamSource = vi.fn(() => this.source); createAnalyser = vi.fn(() => this.analyser);
    constructor() { super(); contexts.push(this); }
  }
  const request = vi.fn(async () => stream());
  const app = { AudioContext: Context, navigator: { mediaDevices: { getUserMedia: request } },
    requestAnimationFrame: vi.fn((callback: FrameRequestCallback) => { frames.set(++nextFrame, callback); return nextFrame; }),
    cancelAnimationFrame: vi.fn((id: number) => frames.delete(id)),
  } as unknown as AudioWindow;
  const recorder = createArticulationRecorder(app), levels = vi.fn(), interrupted = vi.fn();
  return { recorder, contexts, frames, tracks, request, stream, levels, interrupted, app,
    tick(time: number) { const current = [...frames.values()]; frames.clear(); current.forEach(frame => frame(time)); },
  };
}
it('captures real analyser bins and releases every track, audio node, frame and context on finish', async () => {
  const h = setup(); expect(await h.recorder.start(h.levels, h.interrupted)).toBe('started');
  for (let index = 0; index < 8; index++) h.tick(index * 16);
  expect(h.levels).toHaveBeenCalledTimes(2); expect(h.levels.mock.lastCall[0]).toHaveLength(20);
  expect(h.recorder.finish()).toHaveLength(8); expect(h.tracks[0].stop).toHaveBeenCalledOnce();
  expect(h.contexts[0].source.disconnect).toHaveBeenCalledOnce(); expect(h.contexts[0].analyser.disconnect).toHaveBeenCalledOnce();
  expect(h.contexts[0].close).toHaveBeenCalledOnce(); expect(h.frames.size).toBe(0); h.recorder.stop();
  expect(h.interrupted).not.toHaveBeenCalled(); expect(h.tracks[0].stop).toHaveBeenCalledOnce();
});
it('stops a late granted stream without affecting a newer recording', async () => {
  const h = setup(), permission = deferred<MediaStream>(); h.request.mockReturnValueOnce(permission.promise);
  const old = h.recorder.start(h.levels, h.interrupted); h.recorder.stop();
  expect(h.contexts[0].close).toHaveBeenCalledOnce(); await h.recorder.start(h.levels, h.interrupted);
  const late = h.stream(); permission.resolve(late); expect(await old).toBe('cancelled');
  expect(h.tracks[1].stop).toHaveBeenCalledOnce(); expect(h.tracks[0].stop).not.toHaveBeenCalled();
  h.tick(0); expect(h.levels).toHaveBeenCalledOnce(); h.recorder.stop(); expect(h.contexts[1].close).toHaveBeenCalledOnce();
});
it('shows a narrow tone even when its frequency is between the visualizer sample points', async () => {
  const h = setup(); await h.recorder.start(h.levels, h.interrupted);
  h.contexts[0].analyser.getByteFrequencyData = bins => { bins.fill(0); bins[31] = 255; };
  h.tick(0); expect(h.levels.mock.lastCall[0][0]).toBe(1); h.recorder.stop();
});
it('handles denied access, missing devices and retry without retaining a broken context', async () => {
  const h = setup(); h.request.mockRejectedValueOnce(new DOMException('Denied', 'NotAllowedError'));
  expect(await h.recorder.start(h.levels, h.interrupted)).toBe('denied'); expect(h.contexts[0].close).toHaveBeenCalledOnce();
  h.request.mockRejectedValueOnce(new DOMException('Missing', 'NotFoundError'));
  expect(await h.recorder.start(h.levels, h.interrupted)).toBe('unavailable'); expect(h.contexts[1].close).toHaveBeenCalledOnce();
  expect(await h.recorder.start(h.levels, h.interrupted)).toBe('started'); h.recorder.stop();
  await expect(createArticulationRecorder({ navigator: {} } as AudioWindow).start(h.levels, h.interrupted)).resolves.toBe('unsupported');
});
it.each(['track', 'context'])('interrupts safely when the %s ends', async kind => {
  const h = setup(); await h.recorder.start(h.levels, h.interrupted);
  if (kind === 'track') h.tracks[0].dispatchEvent(new Event('ended'));
  else { h.contexts[0].state = 'suspended'; h.contexts[0].dispatchEvent(new Event('statechange')); }
  expect(h.interrupted).toHaveBeenCalledOnce(); expect(h.frames.size).toBe(0); expect(h.tracks[0].stop).toHaveBeenCalledOnce();
  h.contexts[0].dispatchEvent(new Event('statechange')); expect(h.interrupted).toHaveBeenCalledOnce();
});
