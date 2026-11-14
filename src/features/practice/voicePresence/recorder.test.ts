import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { AudioWindow } from '../audio/types';
import { createTeacherRecorder } from './recorder';

function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; }
function setup() {
  const tracks: (EventTarget & { readyState: string; stop: ReturnType<typeof vi.fn> })[] = [];
  function stream(audio = true, video = true) {
    const make = () => { const track = Object.assign(new EventTarget(), { readyState: 'live', stop: vi.fn(() => { track.readyState = 'ended'; }) }); tracks.push(track); return track; };
    const a = audio ? [make()] : [], v = video ? [make()] : [];
    return { getTracks: () => [...a, ...v], getAudioTracks: () => a, getVideoTracks: () => v } as unknown as MediaStream;
  }
  const recorders: Recorder[] = [], request = vi.fn(async () => stream());
  class Recorder {
    state = 'inactive'; mimeType = 'video/webm'; empty = false; hang = false;
    ondataavailable: ((event: { data: Blob }) => void) | null = null; onstop: (() => void) | null = null; onerror: (() => void) | null = null;
    start = vi.fn(() => { this.state = 'recording'; });
    stop = vi.fn(() => {
      this.state = 'inactive';
      if (!this.hang) queueMicrotask(() => { this.ondataavailable?.({ data: new Blob(this.empty ? [] : ['frames-and-audio']) }); this.onstop?.(); });
    });
    constructor() { recorders.push(this); }
  }
  const app = { MediaRecorder: Recorder, navigator: { mediaDevices: { getUserMedia: request } },
    setTimeout: window.setTimeout.bind(window), clearTimeout: window.clearTimeout.bind(window),
  } as unknown as AudioWindow;
  return { recorder: createTeacherRecorder(app), request, stream, tracks, recorders, started: vi.fn() };
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('records locally, finishes on request and releases both tracks and the timer', async () => {
  const h = setup(), pending = h.recorder.start(h.started); await Promise.resolve();
  expect(h.started).toHaveBeenCalledOnce(); expect(h.request).toHaveBeenCalledWith({ audio: true, video: { facingMode: 'user' } });
  h.recorder.finish(); const result = await pending;
  expect(result.kind).toBe('recorded'); if (result.kind === 'recorded') { expect(result.source.size).toBeGreaterThan(0); expect(result.source.type).toBe('video/webm'); }
  h.tracks.forEach(track => expect(track.stop).toHaveBeenCalledOnce()); expect(vi.getTimerCount()).toBe(0); expect(h.recorders[0].onstop).toBeNull();
});
it('finishes automatically after fifteen seconds', async () => {
  const h = setup(), pending = h.recorder.start(h.started); await Promise.resolve();
  await vi.advanceTimersByTimeAsync(14999); expect(h.recorders[0].stop).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1); expect((await pending).kind).toBe('recorded'); expect(h.tracks.every(track => track.readyState === 'ended')).toBe(true);
});
it('cancels immediately while permissions are pending and stops a late stream without affecting a new take', async () => {
  const h = setup(), permission = deferred<MediaStream>(); h.request.mockReturnValueOnce(permission.promise);
  const first = h.recorder.start(h.started); h.recorder.cancel(); expect(await first).toEqual({ kind: 'cancelled' });
  const next = h.recorder.start(h.started); await Promise.resolve(); const late = h.stream(); permission.resolve(late); await Promise.resolve();
  expect(h.tracks.slice(0, 2).every(track => track.readyState === 'live')).toBe(true); expect(h.tracks.slice(2).every(track => track.readyState === 'ended')).toBe(true);
  expect(h.started).toHaveBeenCalledOnce(); h.recorder.cancel(); expect(await next).toEqual({ kind: 'cancelled' }); expect(vi.getTimerCount()).toBe(0);
});
it('ignores data emitted after cancellation', async () => {
  const h = setup(), pending = h.recorder.start(h.started); await Promise.resolve(); h.recorder.cancel(); await Promise.resolve();
  expect(await pending).toEqual({ kind: 'cancelled' }); expect(h.recorders[0].ondataavailable).toBeNull(); expect(h.tracks.every(track => track.readyState === 'ended')).toBe(true);
});
it.each(['denied', 'noAudio', 'noVideo', 'ended', 'recorder', 'empty', 'stalledFinish'] as const)('releases resources on %s and permits another attempt', async problem => {
  const h = setup();
  if (problem === 'denied') h.request.mockRejectedValueOnce(new DOMException('Denied', 'NotAllowedError'));
  if (problem === 'noAudio') h.request.mockResolvedValueOnce(h.stream(false, true));
  if (problem === 'noVideo') h.request.mockResolvedValueOnce(h.stream(true, false));
  const pending = h.recorder.start(h.started); await Promise.resolve();
  if (problem === 'ended') h.tracks[0].dispatchEvent(new Event('ended'));
  if (problem === 'recorder') h.recorders[0].onerror!();
  if (problem === 'empty') { h.recorders[0].empty = true; h.recorder.finish(); }
  if (problem === 'stalledFinish') { h.recorders[0].hang = true; h.recorder.finish(); await vi.advanceTimersByTimeAsync(5000); }
  expect(await pending).toEqual({ kind: 'failed' }); expect(h.tracks.every(track => track.readyState === 'ended')).toBe(true); expect(vi.getTimerCount()).toBe(0);
  const next = h.recorder.start(h.started); await Promise.resolve(); h.recorder.cancel(); expect(await next).toEqual({ kind: 'cancelled' });
});
