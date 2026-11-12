import { readFileSync } from 'node:fs';
import type { AudioWindow, TtsResult } from '../src/features/practice/audio/types';
import { test, expect } from './fixtures';

type AudioProbe = AudioWindow & {
  showScreen(id: string): void;
  stopAllAppAudio(): void;
  _activeAudios: HTMLAudioElement[];
  audioResult?: TtsResult;
  audioEnded: number;
  audioReady: number;
};
const recording = readFileSync(new URL('../public/original/sounds/find-number/kk-1.mp3', import.meta.url));
const errors = new WeakMap<import('@playwright/test').Page, string[]>();

test.beforeEach(async ({ page }) => {
  const messages: string[] = []; errors.set(page, messages);
  page.on('pageerror', error => messages.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true');
    localStorage.setItem('profileLang', 'kk'); localStorage.setItem('locale', 'kk');
  });
  await page.goto('/original/index2.html');
  await page.locator('#mainRadialMenu > .radial-center-btn').click();
  await page.evaluate(() => {
    const app = window as AudioProbe;
    app.stopAllAppAudio(); app.audioEnded = 0; app.audioReady = 0;
  });
});

test.afterEach(async ({ page }) => { expect(errors.get(page)).toEqual([]); });

test('shared TTS plays a bundled voice to completion and cancels an interrupted replay', async ({ page }) => {
  let remoteRequests = 0;
  await page.route('**/api/tts', route => { remoteRequests++; return route.abort(); });
  await page.evaluate(() => {
    const app = window as AudioProbe;
    void app.appTts!.speakText('алма', 'kk-KZ', {
      waitUntilEnd: true, onEnd: () => { app.audioEnded++; },
    }).then(result => { app.audioResult = result; });
  });
  await expect.poll(() => page.evaluate(() => {
    const app = window as AudioProbe;
    return app._activeAudios.some(audio => audio.currentSrc.includes('/kk-human/') && audio.currentTime > 0 && !audio.paused && !audio.muted);
  })).toBe(true);
  await expect.poll(() => page.evaluate(() => (window as AudioProbe).audioEnded)).toBe(1);
  const completed = await page.evaluate(() => {
    const app = window as AudioProbe, result = app.audioResult;
    return result?.ok ? { ok: result.ok, static: result.static, ended: result.audioEl.ended, active: app._activeAudios.includes(result.audioEl) } : result;
  });
  expect(completed).toEqual({ ok: true, static: true, ended: true, active: false });

  await page.evaluate(() => {
    const app = window as AudioProbe;
    app.audioResult = undefined;
    void app.appTts!.speakText('алма', 'kk-KZ', {
      waitUntilEnd: true, onEnd: () => { app.audioEnded++; },
    }).then(result => { app.audioResult = result; });
  });
  await expect.poll(() => page.evaluate(() => (window as AudioProbe)._activeAudios.some(audio => audio.currentTime > .05 && !audio.paused))).toBe(true);
  const playing = await page.evaluateHandle(() => (window as AudioProbe).appTts!.ensureAudioEl());
  await page.evaluate(() => (window as AudioProbe).showScreen('grade0Menu'));
  await expect.poll(() => page.evaluate(() => (window as AudioProbe).audioResult)).toEqual({ ok: false, reason: 'cancelled' });
  expect(await playing.evaluate(audio => ({ paused: audio.paused, time: audio.currentTime }))).toEqual({ paused: true, time: 0 });
  expect(await page.evaluate(() => (window as AudioProbe).audioEnded)).toBe(1);
  expect(remoteRequests).toBe(0);
});

test('remote speech uses the cache and yields to another content recording', async ({ page }) => {
  const requests: unknown[] = [];
  await page.route('**/api/tts', route => {
    requests.push(route.request().postDataJSON());
    return route.fulfill({ contentType: 'audio/mpeg', body: recording });
  });
  const speak = () => page.evaluate(() => {
    const app = window as AudioProbe;
    app.audioResult = undefined;
    void app.appTts!.speakText('Integration voice sample', 'en-US', {
      waitUntilEnd: true,
      onReady: () => { app.audioReady++; }, onEnd: () => { app.audioEnded++; },
    }).then(result => { app.audioResult = result; });
  });
  await speak();
  await expect.poll(() => page.evaluate(() => (window as AudioProbe).audioResult?.ok)).toBe(true);
  expect(requests).toEqual([{ text: 'Integration voice sample', lang: 'en-US', provider: 'yandex' }]);
  expect(await page.evaluate(() => (window as AudioProbe).audioEnded)).toBe(1);

  await speak();
  await expect.poll(() => page.evaluate(() => (window as AudioProbe)._activeAudios.some(audio => audio.currentSrc.startsWith('blob:') && audio.currentTime > .05))).toBe(true);
  const oldAudio = await page.evaluateHandle(() => (window as AudioProbe).appTts!.ensureAudioEl());
  await page.evaluate(async () => {
    const other = new Audio('/original/sounds/find-number/kk-2.mp3');
    await other.play();
  });
  await expect.poll(() => page.evaluate(() => (window as AudioProbe).audioResult)).toEqual({ ok: false, reason: 'cancelled' });
  expect(await oldAudio.evaluate(audio => audio.paused)).toBe(true);
  expect(await page.evaluate(() => ({ ready: (window as AudioProbe).audioReady, ended: (window as AudioProbe).audioEnded }))).toEqual({ ready: 2, ended: 1 });
  expect(requests).toHaveLength(1);
});

test('leaving a screen settles pending TTS and ignores a late server response', async ({ page }) => {
  let requested = false;
  let release!: () => void;
  const responseAllowed = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/tts', async route => {
    requested = true;
    await responseAllowed;
    // Navigation aborts the request; the server response may already be in flight.
    await route.fulfill({ contentType: 'audio/mpeg', body: recording }).catch(() => {});
  });
  try {
    await page.evaluate(() => {
      const app = window as AudioProbe;
      void app.appTts!.speakText('Delayed integration sample', 'en-US', {
        waitUntilEnd: true, onReady: () => { app.audioReady++; }, onEnd: () => { app.audioEnded++; },
      }).then(result => { app.audioResult = result; });
    });
    await expect.poll(() => requested).toBe(true);
    await page.evaluate(() => (window as AudioProbe).showScreen('grade0Menu'));
    await expect.poll(() => page.evaluate(() => (window as AudioProbe).audioResult)).toEqual({ ok: false, reason: 'cancelled' });
    release();
    const local = await page.evaluate(async () => {
      const app = window as AudioProbe;
      const result = await app.appTts!.speakText('алма', 'kk-KZ', { waitUntilEnd: true });
      return { ok: result.ok, ready: app.audioReady, ended: app.audioEnded, pending: app.audioResult, active: app._activeAudios.length };
    });
    expect(local).toEqual({ ok: true, ready: 0, ended: 0, pending: { ok: false, reason: 'cancelled' }, active: 0 });
  } finally { release(); }
});
