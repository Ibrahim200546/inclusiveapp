import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createTtsClient } from './ttsClient';
import type { AudioWindow } from './types';

function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; }
function harness() {
  const audios: (HTMLAudioElement & { finish(): void })[] = [];
  vi.stubGlobal('Audio', function () {
    const audio = document.createElement('audio'); let paused = true, ended = false;
    Object.defineProperties(audio, { paused: { get: () => paused }, ended: { get: () => ended } });
    audio.play = vi.fn(async () => { paused = false; });
    audio.pause = vi.fn(() => { if (!paused) { paused = true; audio.dispatchEvent(new Event('pause')); } });
    const result = Object.assign(audio, { finish() { paused = true; ended = true; audio.dispatchEvent(new Event('ended')); } });
    audios.push(result); return result;
  });
  const revoke = vi.fn(); let sequence = 0;
  vi.stubGlobal('URL', class extends URL { static createObjectURL = vi.fn(() => `blob:test-${++sequence}`); static revokeObjectURL = revoke; });
  const fetch = vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['sound']) }); vi.stubGlobal('fetch', fetch);
  const client = createTtsClient(window as AudioWindow);
  return { audios, fetch, revoke, client };
}
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

it('prefers bundled Kazakh and Russian speech and waits for actual completion', async () => {
  const { client, audios, fetch } = harness();
  vi.stubGlobal('getKkHumanVoiceoverAudioPath', (text: string, lang: string) => lang === 'kk-KZ' ? '/kk.mp3' : '');
  vi.stubGlobal('getRuVoiceoverAudioPath', () => '/ru.mp3');
  const ended = vi.fn(); const ready = vi.fn();
  let finished = false;
  const speaking = client.speakText('Сәлем', 'kk-KZ', { waitUntilEnd: true, onEnd: ended, onReady: ready }).then(result => { finished = true; return result; });
  await Promise.resolve(); expect(finished).toBe(false); expect(ready).toHaveBeenCalledOnce();
  expect(audios[0].getAttribute('src')).toBe('/kk.mp3'); audios[0].finish();
  expect(await speaking).toMatchObject({ ok: true, static: true }); expect(ended).toHaveBeenCalledOnce();
  await client.speakText('Привет', 'ru-RU'); expect(audios[1].getAttribute('src')).toBe('/ru.mp3');
  expect(fetch).not.toHaveBeenCalled(); client.dispose();
});

it('uses exact bundled speech or the full TTS prompt for exercises instead of a partial Russian match', async () => {
  const { client, fetch } = harness();
  const maps: Pick<AudioWindow, 'getRuVoiceoverAudioPath' | 'getKkHumanVoiceoverAudioPath'> = {};
  const context = { window: maps };
  for (const file of ['ru-voiceover-map.js', 'lesson-voice-map.js']) {
    runInNewContext(readFileSync(`public/original/js/${file}`, 'utf8'), context);
  }
  vi.stubGlobal('getRuVoiceoverAudioPath', maps.getRuVoiceoverAudioPath);
  // Keep the existing loose matching for UI narration, but never for this task.
  expect(maps.getRuVoiceoverAudioPath!('Кошка пьет молоко', 'ru-RU')).not.toBe('');
  for (const prompt of ['Кошка пьет молоко', 'Мальчик пнул мяч']) {
    expect(maps.getRuVoiceoverAudioPath!(prompt, 'ru-RU', { exactMatch: true })).toBe('');
    expect(await client.speakText(prompt, 'ru-RU', { exactMatch: true })).toMatchObject({ ok: true });
    expect(JSON.parse(fetch.mock.lastCall![1].body).text).toBe(prompt);
  }
  expect(await client.speakText('Кошка', 'ru-RU', { exactMatch: true })).toMatchObject({ ok: true, static: true, path: 'sounds/ru/ui/42c41e298a1d.mp3' });
  expect(await client.speakText('Наступила осень', 'ru-RU', { exactMatch: true })).toMatchObject({ ok: true, static: true, path: 'sounds/articulation-lessons/autumn-arrived-ru.mp3' });
  expect(fetch).toHaveBeenCalledTimes(2); client.dispose();
});

it('settles an aborted request promptly and never plays a late server response', async () => {
  const { client, audios, fetch } = harness(); const delayed = deferred<Response>(); fetch.mockReturnValueOnce(delayed.promise);
  const speaking = client.speakText('Delayed'); client.stop();
  expect(await speaking).toEqual({ ok: false, reason: 'cancelled' });
  expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
  delayed.resolve({ ok: true, blob: async () => new Blob(['late']) } as Response);
  await Promise.resolve(); await Promise.resolve(); expect(audios).toHaveLength(0); client.dispose();
});

it('cancels old playback callbacks, reuses cached speech and revokes object URLs', async () => {
  const { client, audios, fetch, revoke } = harness(); const oldEnd = vi.fn(), newEnd = vi.fn();
  await client.speakText('Repeat', 'ru-RU', { onEnd: oldEnd });
  const second = client.speakText('Repeat', 'ru-RU', { waitUntilEnd: true, onEnd: newEnd });
  await vi.waitFor(() => expect(audios).toHaveLength(2));
  expect(fetch).toHaveBeenCalledOnce(); expect(revoke).toHaveBeenCalledWith('blob:test-1');
  audios[0].finish(); expect(oldEnd).not.toHaveBeenCalled(); expect(newEnd).not.toHaveBeenCalled();
  audios[1].finish(); expect(await second).toMatchObject({ ok: true }); expect(newEnd).toHaveBeenCalledOnce();
  client.dispose(); expect(revoke).toHaveBeenCalledWith('blob:test-2');
});

it('returns cancellation for interrupted playback instead of crediting a completed utterance', async () => {
  const { client, audios } = harness(); const ended = vi.fn();
  const speaking = client.speakText('Interrupted', 'kk-KZ', { waitUntilEnd: true, onEnd: ended });
  await vi.waitFor(() => expect(audios).toHaveLength(1)); client.stop();
  expect(await speaking).toEqual({ ok: false, reason: 'cancelled' });
  audios[0].finish(); expect(ended).not.toHaveBeenCalled(); client.dispose();
});

it('keeps provider fallback and distinguishes timeout, empty audio and HTTP errors', async () => {
  const { client, fetch } = harness();
  fetch.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Requested TTS provider is not configured' }), { status: 503, headers: { 'content-type': 'application/json' } }));
  expect(await client.speakText('Fallback', 'ru-RU', { voice: 'voice', speed: 0.7 })).toMatchObject({ ok: true });
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ provider: 'yandex', voice: 'voice', speed: 0.7 });
  expect(JSON.parse(fetch.mock.calls[1][1].body)).not.toHaveProperty('provider');
  fetch.mockResolvedValueOnce({ ok: true, blob: async () => new Blob([]) });
  expect(await client.speakText('Empty')).toMatchObject({ ok: false, reason: 'empty_audio' });
  fetch.mockResolvedValueOnce(new Response('Unavailable', { status: 503 }));
  expect(await client.speakText('Error')).toMatchObject({ ok: false, reason: 'request_failed', status: 503 });
  vi.useFakeTimers(); fetch.mockImplementationOnce(() => new Promise(() => {}));
  const timeout = client.speakText('Timeout', 'ru-RU', { timeoutMs: 1000 });
  await vi.advanceTimersByTimeAsync(1000); expect(await timeout).toEqual({ ok: false, reason: 'timeout' }); client.dispose();
});

it('does not start audio when onReady navigates away', async () => {
  const { client, audios } = harness();
  const result = await client.speakText('Leave', 'kk-KZ', { onReady: () => client.stop() });
  expect(result).toEqual({ ok: false, reason: 'cancelled' }); expect(audios[0].play).not.toHaveBeenCalled(); client.dispose();
});
