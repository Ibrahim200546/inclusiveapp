import { test, expect, type Page } from './fixtures';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// A generated tone exercises native browser capture without a person's recording.
// Recognition is stubbed separately: these scenarios do not establish model accuracy.
const microphoneFile = path.join(os.tmpdir(), 'educorex-train-test-tone-16000.wav');
const pcmSize = 16000 * 12 * 2, wav = Buffer.alloc(44 + pcmSize);
wav.write('RIFF'); wav.writeUInt32LE(36 + pcmSize, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(16000, 24); wav.writeUInt32LE(32000, 28);
wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(pcmSize, 40);
for (let i = 0; i < pcmSize / 2; i++) wav.writeInt16LE(Math.round(Math.sin(i * 220 / 16000 * Math.PI * 2) * 8000), 44 + i * 2);
if (!fs.existsSync(microphoneFile)) fs.writeFileSync(microphoneFile, wav);
test.use({ launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-audio-capture=${microphoneFile}`] } });
test.describe.configure({ timeout: 90_000 });

type TrainApp = Window & typeof globalThis & {
  showScreen(id: string): void; stopAllAppAudio(): void; showReward(): void;
  CorexGrades: { selectJunior(grade: number): void }; trainTracks: MediaStreamTrack[]; trainContexts: AudioContext[];
  trainRewards: number; releaseTrainPermission(): void;
};
type StubWorker = { phone: string; hold: boolean; requestId: number; postMessage(message: unknown): void };
const phones: Record<string, string> = { 'А': 'a', 'Ә': 'æ', 'О': 'o', 'Ө': 'ø', 'Ұ': 'ʊ', 'Ү': 'y', 'Ы': 'ɯ', 'І': 'ɪ', 'У': 'u', 'П': 'p', 'Б': 'b', 'Т': 't', 'К': 'k' };

async function open(page: Page, locale = 'ru', theme = 'light', permission: 'normal' | 'denied' | 'delayed' = 'normal') {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(({ locale, theme, permission }) => {
    localStorage.setItem('locale', locale); localStorage.setItem('profileLang', locale); localStorage.setItem('theme', theme);
    localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true');
    const app = window as TrainApp; app.trainTracks = []; app.trainContexts = []; app.trainRewards = 0;
    const obtain = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async constraints => {
      if (permission === 'denied') throw new DOMException('Denied by test', 'NotAllowedError');
      if (permission === 'delayed') await new Promise<void>(resolve => { app.releaseTrainPermission = resolve; });
      const stream = await obtain(constraints); app.trainTracks.push(...stream.getTracks()); return stream;
    };
    const Original = AudioContext;
    window.AudioContext = class extends Original {
      createMediaStreamSource(stream: MediaStream) { app.trainContexts.push(this); return super.createMediaStreamSource(stream); }
    };
  }, { locale, theme, permission });
  await page.route('**/js/phoneme-worker.js*', route => route.fulfill({ contentType: 'text/javascript', body: `
    self.phone = 'a'; self.hold = false; self.onmessage = ({ data }) => {
      if (data.type === 'load') self.postMessage({id:data.id,ready:true});
      else { self.requestId = data.id; if (!self.hold) self.postMessage({id:data.id,segments:[{phone:self.phone,confidence:.99},{phone:self.phone,confidence:.99},{phone:self.phone,confidence:.99}]}); }
    };` }));
  await page.route('**/api/tts', route => route.abort());
  await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { const app = window as TrainApp; app.showReward = () => { app.trainRewards++; }; app.showScreen('g0Task2'); });
  const screen = page.locator('#g0Task2'); await expect(screen).toHaveClass(/active/);
  await expect(screen.locator('.train-practice')).toHaveAttribute('data-react-owned', 'true');
  return { screen, errors };
}
async function select(page: Page, mode = 'short') {
  await page.locator('#phonemeMode').selectOption(mode);
  await page.locator('#voiceCenterBtn').focus(); await page.keyboard.press('Enter');
  const letters = page.locator('#voiceGameContainer .small-bubble'); await expect(letters).toHaveCount(8);
  const letter = (await letters.first().textContent())!;
  await letters.first().click(); await expect(page.locator('#voiceCenterBtn')).toContainText(letter);
  await expect.poll(() => page.workers().length).toBeGreaterThan(0);
  await page.workers()[0].evaluate(phone => { (self as unknown as StubWorker).phone = phone; }, phones[letter]);
  return letter;
}
async function stopped(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const app = window as TrainApp;
    return app.trainTracks.every(track => track.readyState === 'ended') && app.trainContexts.every(context => context.state === 'closed');
  })).toBe(true);
}

test('native capture completes both modes only after recognition, retries and rewards once', async ({ page }) => {
  const { errors } = await open(page);
  for (const mode of ['short', 'long']) {
    await select(page, mode); await page.locator('#voiceCenterBtn').click();
    await expect(page.locator('.train-practice')).toHaveAttribute('data-status', 'listening');
    await expect(page.locator('#trainVoiceStop')).toBeFocused();
    await expect(page.locator('.train-practice')).toHaveAttribute('data-status', 'complete', { timeout: 25000 });
    await stopped(page);
    await expect(page.getByRole('progressbar', { name: 'Путь поезда' })).toHaveAttribute('aria-valuenow', '100');
    await expect(page.locator('#trainVoiceRetry')).toBeFocused();
    expect(await page.evaluate(() => (window as TrainApp).trainRewards)).toBe(mode === 'short' ? 1 : 2);
    if (mode === 'short') { await page.locator('#trainVoiceChoose').click(); await page.locator('#voiceCenterBtn').click(); }
  }
  expect(errors).toEqual([]);
});

test('incorrect recognition permits retry and does not reward noise as the selected letter', async ({ page }) => {
  const { errors } = await open(page); await select(page);
  await page.workers()[0].evaluate(() => { (self as unknown as StubWorker).phone = '?'; });
  await page.locator('#voiceCenterBtn').click();
  await expect(page.locator('.train-practice')).toHaveAttribute('data-status', 'incorrect', { timeout: 20000 });
  await expect(page.locator('#voiceFeedback')).toContainText('не подтверждён'); expect(await page.evaluate(() => (window as TrainApp).trainRewards)).toBe(0);
  await stopped(page); await page.locator('#trainVoiceRetry').click(); await expect(page.locator('#trainVoiceStop')).toBeVisible();
  await page.locator('#trainVoiceStop').click(); await stopped(page); expect(errors).toEqual([]);
});

test('leaving during inference ignores a late correct result and releases microphone', async ({ page }) => {
  const { errors } = await open(page); await select(page);
  await page.workers()[0].evaluate(() => { (self as unknown as StubWorker).hold = true; });
  await page.locator('#voiceCenterBtn').click(); await expect(page.locator('.train-practice')).toHaveAttribute('data-status', 'checking', { timeout: 20000 });
  await stopped(page); await page.locator('.train-back').click();
  await page.workers()[0].evaluate(() => { const w = self as unknown as StubWorker; w.postMessage({ id: w.requestId, segments: [{ phone: w.phone, confidence: 1 }] }); });
  await expect(page.locator('#grade0VoiceMenu')).toHaveClass(/active/);
  expect(await page.evaluate(() => (window as TrainApp).trainRewards)).toBe(0); expect(errors).toEqual([]);
});

for (const reason of ['language', 'grade', 'hidden', 'audio', 'content', 'navigation']) {
  test(`capture stops on ${reason}`, async ({ page }) => {
    const { errors } = await open(page); await select(page); await page.locator('#voiceCenterBtn').click();
    await expect(page.locator('.train-practice')).toHaveAttribute('data-status', 'listening');
    if (reason === 'language') await page.locator('#top-lang-btn-kk').click();
    else await page.evaluate(reason => {
      const app = window as TrainApp;
      if (reason === 'grade') app.CorexGrades.selectJunior(1);
      if (reason === 'hidden') { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); }
      if (reason === 'audio') app.stopAllAppAudio();
      if (reason === 'content') void new Audio('/original/sounds/Alippe/Alippe_а.mp3').play();
      if (reason === 'navigation') app.showScreen('grade0VoiceMenu');
    }, reason);
    await stopped(page); expect(await page.evaluate(() => (window as TrainApp).trainRewards)).toBe(0); expect(errors).toEqual([]);
  });
}

test('microphone denial has a keyboard retry', async ({ page }) => {
  const { errors } = await open(page, 'ru', 'light', 'denied'); await select(page); await page.locator('#voiceCenterBtn').click();
  await expect(page.locator('#voiceFeedback')).toContainText('Доступ к микрофону запрещён');
  await expect(page.locator('#trainVoiceRetry')).toBeFocused(); await page.keyboard.press('Enter'); await expect(page.locator('#voiceFeedback')).toContainText('Доступ к микрофону запрещён');
  expect(errors).toEqual([]);
});

test('permission can be cancelled before the browser returns a stream', async ({ page }) => {
  const { errors } = await open(page, 'ru', 'light', 'delayed'); await select(page); await page.locator('#voiceCenterBtn').click();
  await expect(page.locator('.train-practice')).toHaveAttribute('data-status', 'requesting'); await page.locator('.train-back').click();
  await page.evaluate(() => (window as TrainApp).releaseTrainPermission());
  await expect.poll(() => page.evaluate(() => (window as TrainApp).trainTracks.length)).toBe(1); await stopped(page);
  expect(errors).toEqual([]);
});

for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
  for (const locale of ['kk', 'ru']) test(`train controls fit ${viewport.width}x${viewport.height} ${locale}`, async ({ page }, info) => {
    await page.setViewportSize(viewport); const { screen, errors } = await open(page, locale, locale === 'ru' ? 'dark' : 'light');
    await page.locator('#voiceCenterBtn').click();
    await expect(page.locator('#voiceGameContainer')).toHaveClass(/expanded/);
    for (const letter of await screen.locator('.small-bubble').all()) { await expect(letter).toBeVisible(); }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => scrollTo(0, 0));
    await expect.poll(() => screen.evaluate(node => node.getAnimations({ subtree: true }).some(animation => animation.playState === 'running' && animation.effect?.getTiming().iterations !== Infinity))).toBe(false);
    expect(await page.locator('#voiceGameContainer').evaluate(menu => {
      const boxes = Array.from(menu.querySelectorAll('button')).map(button => button.getBoundingClientRect());
      // These hit targets are circles; the empty corners of their bounding boxes may overlap.
      return boxes.some((a, index) => boxes.slice(index + 1).some(b =>
        Math.hypot(a.x + a.width / 2 - b.x - b.width / 2, a.y + a.height / 2 - b.y - b.height / 2) < (a.width + b.width) / 2 - .5));
    })).toBe(false);
    if (viewport.width < 769) {
      const alphabet = await screen.locator('.alippe-panel').boundingBox(), title = await screen.getByRole('heading').boundingBox();
      expect(title!.y).toBeGreaterThanOrEqual(alphabet!.y + alphabet!.height);
    }
    await page.screenshot({ path: info.outputPath('train-menu.png') });
    await page.locator('#voiceCenterBtn').click(); await select(page); await page.locator('#voiceCenterBtn').click();
    await expect(page.locator('#trainVoiceStop')).toBeVisible(); await page.locator('#trainVoiceStop').scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath('train-capture.png') });
    await page.locator('#trainVoiceStop').click(); await stopped(page); await page.locator('.train-back').click();
    await expect(page.locator('#grade0VoiceMenu')).toHaveClass(/active/); expect(errors).toEqual([]);
  });
}
