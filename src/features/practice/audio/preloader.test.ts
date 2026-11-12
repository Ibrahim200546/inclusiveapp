import { afterEach, expect, it, vi } from 'vitest';
import { createAudioPreloader, normalizeAudioUrl } from './preloader';
import type { AudioWindow } from './types';

const disposers: (() => void)[] = [];
afterEach(() => { disposers.splice(0).forEach(dispose => dispose()); vi.unstubAllGlobals(); vi.useRealTimers(); document.body.innerHTML = ''; });

it('preloads only local audio and caps concurrent work at two requests', async () => {
  const fetch = vi.fn<typeof window.fetch>(() => new Promise<Response>(() => {})); vi.stubGlobal('fetch', fetch);
  const nativeAudio = window.Audio;
  const loader = createAudioPreloader(window as AudioWindow, document); disposers.push(loader.dispose);
  loader.schedule('/last.mp3', 5); loader.schedule('/first.mp3', 0); loader.schedule('/second.mp3', 1);
  loader.preload(['/first.mp3', 'https://elsewhere.test/remote.mp3', 'data:audio/mp3;base64,AA', '/page.html']);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch.mock.calls.map(call => new URL(String(call[0])).pathname)).toEqual(['/first.mp3', '/second.mp3']);
  expect(loader.stats()).toEqual({ queued: 1, loading: 2, warmed: 0, failed: 0 });
  loader.dispose(); expect(window.Audio).toBe(nativeAudio); expect(fetch.mock.calls[0][1]?.signal?.aborted).toBe(true);
});

it('keeps the background manifest bounded and aborts its timers on disposal', async () => {
  vi.useFakeTimers(); vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
  vi.stubGlobal('APP_AUDIO_PRELOAD_MANIFEST', [
    ...Array.from({ length: 90 }, (_, index) => ({ src: `/original/sounds/kk-human/${index}.mp3`, bytes: 1000 })),
    { src: '/original/sounds/kk-human/large.mp3', bytes: 1000000 },
  ]);
  const loader = createAudioPreloader(window as AudioWindow, document); disposers.push(loader.dispose);
  loader.start(); await vi.advanceTimersByTimeAsync(1200);
  expect(loader.stats()).toMatchObject({ queued: 78, loading: 2 });
  loader.dispose(); expect(vi.getTimerCount()).toBe(0);
});

it('retries failed files and does not retain a late warmup response after disposal', async () => {
  const fetch = vi.fn().mockResolvedValueOnce({ ok: false, status: 404 }).mockResolvedValue({ ok: true, blob: async () => new Blob(['audio']) });
  vi.stubGlobal('fetch', fetch);
  const loader = createAudioPreloader(window as AudioWindow, document); disposers.push(loader.dispose);
  loader.preload('/retry.mp3'); await vi.waitFor(() => expect(loader.stats().failed).toBe(1));
  loader.preload('/retry.mp3'); await vi.waitFor(() => expect(loader.stats().warmed).toBe(1));
  loader.preload('/retry.mp3'); expect(fetch).toHaveBeenCalledTimes(2);
  expect(normalizeAudioUrl('blob:local', document.baseURI, window.location.origin)).toBe('');
  loader.dispose(); expect(loader.stats()).toEqual({ queued: 0, loading: 0, warmed: 0, failed: 0 });
});
