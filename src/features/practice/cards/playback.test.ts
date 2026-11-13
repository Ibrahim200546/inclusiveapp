import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { AudioWindow } from '../audio/types';
import { createCardPlayback } from './playback';

function setup() {
  const audios: FakeAudio[] = [];
  class FakeAudio extends EventTarget {
    currentTime = 0; ended = false; paused = true;
    play = vi.fn(async () => { this.paused = false; });
    pause = vi.fn(() => { this.paused = true; this.dispatchEvent(new Event('pause')); });
    constructor(public src: string) { super(); audios.push(this); }
  }
  const app = { Audio: FakeAudio, setInterval: window.setInterval.bind(window), clearInterval: window.clearInterval.bind(window),
    appTts: { stop: vi.fn(), speakText: vi.fn().mockResolvedValue({ ok: true }) } } as unknown as AudioWindow;
  const stopContent = vi.fn();
  return { app, audios, stopContent, player: createCardPlayback(app, stopContent) };
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('requests the original sentence voice and speed, waiting for playback to finish', async () => {
  const { player, app, stopContent } = setup();
  expect(await player.speak('Мама ест суп', 'ru')).toBe('ended');
  expect(app.appTts!.speakText).toHaveBeenCalledWith('Мама ест суп', 'ru-RU', { provider: 'yandex', speed: .85, timeoutMs: 6500, waitUntilEnd: true });
  expect(stopContent).toHaveBeenCalledOnce();
  vi.mocked(app.appTts!.speakText).mockResolvedValueOnce({ ok: false, reason: 'cancelled' });
  expect(await player.speak('Ана', 'kk')).toBe('interrupted');
});
it('preserves the verb module speech settings while still waiting for audio completion', async () => {
  const { app, stopContent } = setup();
  const player = createCardPlayback(app, stopContent, { speed: .82, timeoutMs: 8000, exactMatch: true });
  await player.speak('Қол жуды', 'kk');
  expect(app.appTts!.speakText).toHaveBeenCalledWith('Қол жуды', 'kk-KZ', { provider: 'yandex', speed: .82, timeoutMs: 8000, exactMatch: true, waitUntilEnd: true });
});
it('stops pending TTS when a spatial recording replaces it and ignores the late response', async () => {
  const { player, app, audios } = setup(); let resolve!: (value: never) => void;
  vi.mocked(app.appTts!.speakText).mockReturnValueOnce(new Promise(yes => { resolve = yes; }));
  const old = player.speak('Мама', 'ru'), current = player.recording('spatial.mp3');
  expect(app.appTts!.stop).toHaveBeenCalled(); resolve({ ok: true } as never);
  expect(await old).toBe('cancelled'); expect(audios[0].paused).toBe(false);
  audios[0].ended = true; audios[0].dispatchEvent(new Event('ended')); expect(await current).toBe('ended');
  expect(vi.getTimerCount()).toBe(0);
});
it('stops media, removes listeners and timers, and keeps failures retryable', async () => {
  const { player, audios } = setup(); const first = player.recording('old.mp3');
  const remove = vi.spyOn(audios[0], 'removeEventListener'); player.stop();
  expect(await first).toBe('cancelled'); expect(remove).toHaveBeenCalledTimes(3); expect(vi.getTimerCount()).toBe(0);
  const next = player.recording('new.mp3'); audios[0].dispatchEvent(new Event('ended')); audios[1].dispatchEvent(new Event('error'));
  expect(await next).toBe('error'); expect(vi.getTimerCount()).toBe(0);
});
