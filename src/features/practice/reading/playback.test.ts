import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { AudioWindow } from '../audio/types';
import { createReadingPlayback } from './playback';

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
  return { player: createReadingPlayback(app), app, audios };
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
it('tries the next alphabet recording only after a media error, never after cancellation', async () => {
  const { player, audios } = setup();
  const playing = player.paths(['word.mp4', 'word.mp3', 'letter.mp3']);
  audios[0].dispatchEvent(new Event('error')); await Promise.resolve();
  expect(audios[1].src).toBe('word.mp3');
  player.stop(); expect(await playing).toBe('cancelled'); expect(audios).toHaveLength(2); expect(vi.getTimerCount()).toBe(0);
});
it('a replacement recording suppresses the old fallback chain and only succeeds on ended', async () => {
  const { player, audios } = setup();
  const first = player.paths(['old.mp3', 'fallback.mp3']); audios[0].dispatchEvent(new Event('error'));
  const second = player.paths(['new.mp3']); expect(await first).toBe('cancelled'); expect(audios).toHaveLength(2);
  audios[1].ended = true; audios[1].dispatchEvent(new Event('ended')); expect(await second).toBe('ended');
});
it('cancels pending TTS when an alphabet recording starts and requests full playback', async () => {
  const { player, app, audios } = setup();
  let resolve!: (value: { ok: boolean }) => void;
  vi.mocked(app.appTts!.speakText).mockReturnValueOnce(new Promise(yes => { resolve = yes; }) as never);
  const spoken = player.play('Мама читает', 'ru', { speed: .7 });
  const letter = player.paths(['letter.mp3']);
  expect(app.appTts!.stop).toHaveBeenCalled();
  expect(app.appTts!.speakText).toHaveBeenCalledWith('Мама читает', 'ru-RU', expect.objectContaining({ waitUntilEnd: true, speed: .7 }));
  resolve({ ok: true }); expect(await spoken).toBe(false);
  expect(audios[0].pause).not.toHaveBeenCalled(); player.stop(); expect(await letter).toBe('cancelled');
});
