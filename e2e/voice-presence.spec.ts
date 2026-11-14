import { expect, test, type Page } from './fixtures';
import path from 'node:path';

type PresenceApp = Window & typeof globalThis & {
  showScreen(id: string): void; stopAllAppAudio(): void; CorexGrades: { selectJunior(grade: number): void };
  presenceUrls: Set<string>; presenceContexts: Set<AudioContext>; presenceTracks: MediaStreamTrack[];
  releaseCapture(): Promise<void>;
};

test.describe.configure({ timeout: 120_000 });
test.use({ launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] } });

async function openExercise(page: Page, locale = 'ru', theme = 'light') {
  await page.addInitScript(({ locale, theme }) => {
    localStorage.setItem('locale', locale);
    localStorage.setItem('profileLang', locale);
    localStorage.setItem('theme', theme);
    localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true');
    const app = window as PresenceApp, create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
    app.presenceUrls = new Set(); app.presenceContexts = new Set(); app.presenceTracks = [];
    URL.createObjectURL = value => { const url = create(value); app.presenceUrls.add(url); return url; };
    URL.revokeObjectURL = url => { app.presenceUrls.delete(url); revoke(url); };
    const OriginalContext = window.AudioContext;
    window.AudioContext = class extends OriginalContext {
      createMediaElementSource(element: HTMLMediaElement) {
        if (element instanceof HTMLVideoElement && element.dataset.part === 'video') app.presenceContexts.add(this);
        return super.createMediaElementSource(element);
      }
    };
    const obtain = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async constraints => { const stream = await obtain(constraints); app.presenceTracks.push(...stream.getTracks()); return stream; };
  }, { locale, theme });
  await page.route('**/api/tts', route => route.abort());
  await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#mainRadialMenu .radial-center-btn').click();
  await page.locator('#mainRadialMenu [data-destination="grade0Menu"]').click();
  await page.locator('#grade0Menu select').selectOption('1');
  await page.locator('#grade0Menu [data-destination="grade0SoundsMenu"]').click();
  const menu = page.locator('#grade0SoundsMenu');
  const entry = menu.locator('[data-destination="voicePresenceScreen"]');
  while (!await entry.isVisible()) {
    const next = menu.locator('.grade-menu-pages button').last();
    await expect(next).toBeEnabled();
    await next.click();
  }
  await entry.focus(); await page.keyboard.press('Enter');
  return page.locator('#voicePresenceScreen');
}

// Generate real, locally decoded media without shipping a person's recording as a fixture.
async function videoFixture(page: Page, withAudio: boolean) {
  const bytes = await page.evaluate(async sound => {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 48;
    const paint = canvas.getContext('2d')!;
    paint.fillRect(0, 0, 64, 48);
    const stream = canvas.captureStream(10);
    const audio = new AudioContext();
    if (sound) {
      await audio.resume();
      const oscillator = audio.createOscillator();
      const destination = audio.createMediaStreamDestination();
      oscillator.frequency.value = 330;
      oscillator.connect(destination); oscillator.start();
      stream.addTrack(destination.stream.getAudioTracks()[0]);
    }
    const recorder = new MediaRecorder(stream, { mimeType: sound ? 'video/webm;codecs=vp8,opus' : 'video/webm;codecs=vp8' });
    const chunks: Blob[] = [];
    recorder.ondataavailable = event => chunks.push(event.data);
    const finished = new Promise<void>(resolve => { recorder.onstop = () => resolve(); });
    recorder.start();
    for (let i = 0; i < 12; i++) {
      paint.fillStyle = i % 2 ? '#6366aa' : '#638899';
      paint.fillRect(i, i, 32, 24);
      await new Promise(resolve => setTimeout(resolve, 90));
    }
    recorder.stop(); await finished;
    stream.getTracks().forEach(track => track.stop()); await audio.close();
    return Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer()));
  }, withAudio);
  return { buffer: Buffer.from(bytes), mimeType: 'video/webm', name: 'browser-generated-test.webm' };
}

test('teacher previews local video, learner compares identical frames with and without voice and retries', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 568 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const lesson = await openExercise(page);
  const play = lesson.locator('[data-act="play"]'), next = lesson.locator('[data-act="continue"]');
  await lesson.locator('input').setInputFiles(await videoFixture(page, true));
  await expect(next).toBeHidden();
  await play.click();
  await expect(next).toHaveText('Речь слышна, губы видны. Начать');
  await expect(next).toBeVisible(); await next.click();
  const video = lesson.locator('[data-part="video"]');
  const original = await video.evaluate(node => (node as HTMLVideoElement).currentSrc);
  expect(original).toMatch(/^blob:/);
  for (const muted of [false, true]) {
    await play.click();
    await expect(next).toBeVisible();
    expect(await video.evaluate(node => (node as HTMLVideoElement).muted)).toBe(muted);
    expect(await video.evaluate(node => (node as HTMLVideoElement).currentSrc)).toBe(original);
    await next.click();
  }
  const yes = lesson.getByRole('button', { name: 'С голосом', exact: true });
  const no = lesson.getByRole('button', { name: 'Без голоса', exact: true });
  const modes: boolean[] = [];
  for (let round = 0; round < 2; round++) {
    await expect(yes).toBeDisabled();
    await play.click(); await expect(yes).toBeEnabled();
    const muted = await video.evaluate(node => (node as HTMLVideoElement).muted);
    modes.push(muted);
    if (round === 0) {
      await (muted ? yes : no).click();
      await expect(lesson.getByRole('status')).toContainText('ещё раз');
      await expect(yes).toBeDisabled();
      await play.click(); await expect(yes).toBeEnabled();
      expect(await video.evaluate(node => (node as HTMLVideoElement).muted)).toBe(muted);
      expect(await video.evaluate(node => (node as HTMLVideoElement).currentSrc)).toBe(original);
      await lesson.screenshot({ path: info.outputPath('voice-question-320.png') });
    }
    await (muted ? no : yes).focus(); await page.keyboard.press('Enter');
    if (round === 0) { await expect(lesson.getByRole('status')).toContainText('Верно'); await next.click(); }
  }
  expect(modes[0]).not.toBe(modes[1]);
  await expect(lesson.locator('[data-part="step"]')).toContainText('2 / 2');
  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('eduCorex.learning.v1:guest') || '{}'));
  const record = Object.values(progress).find(item => (item as { objective: string }).objective === 'voice-presence');
  expect(record).toMatchObject({ grade: 1, context: 'listening', completed: 2, attempts: 3 });
  const releasedVideo = await video.elementHandle();
  await lesson.getByRole('button', { name: '← Работа со звуком' }).click();
  await expect(page.locator('#grade0SoundsMenu')).toHaveClass(/active/);
  await expect.poll(() => releasedVideo!.evaluate(node => ({ src: node.getAttribute('src'), paused: (node as HTMLVideoElement).paused, ready: (node as HTMLVideoElement).readyState })))
    .toEqual({ src: null, paused: true, ready: 0 });
  await expect.poll(() => page.evaluate(url => ({ retained: (window as PresenceApp).presenceUrls.has(url),
    contextsClosed: [...(window as PresenceApp).presenceContexts].every(context => context.state === 'closed') }), original))
    .toEqual({ retained: false, contextsClosed: true });
  await expect(video).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('audio-only and silent teacher files cannot start assessment', async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const lesson = await openExercise(page);
  const input = lesson.locator('input'), next = lesson.locator('[data-act="continue"]');
  await lesson.screenshot({ path: info.outputPath('voice-setup-1440.png') });
  await input.setInputFiles(path.resolve('public/original/sounds/kk-human/бала нан жеді.mp4'));
  await expect(lesson.getByRole('status')).toContainText('не найдена видеодорожка');
  await expect(next).toBeHidden();
  await input.setInputFiles(await videoFixture(page, false));
  await lesson.locator('[data-act="play"]').click();
  await expect(lesson.getByRole('status')).toContainText('Звуковой сигнал не обнаружен');
  await expect(next).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem('eduCorex.learning.v1:guest'))).toBeNull();
});

test.describe('teacher camera', () => {
  test('local recording can be cancelled or used and all camera and microphone tracks stop', async ({ page, context }) => {
    await context.grantPermissions(['camera', 'microphone']);
    await page.addInitScript(() => {
      const obtain = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      const state = window as unknown as { teacherTracks: MediaStreamTrack[] };
      state.teacherTracks = [];
      navigator.mediaDevices.getUserMedia = async constraints => {
        const stream = await obtain(constraints);
        state.teacherTracks.push(...stream.getTracks()); return stream;
      };
    });
    const lesson = await openExercise(page);
    const record = lesson.locator('[data-act="record"]'), finish = lesson.locator('[data-act="finishRecording"]');
    const liveTracks = () => page.evaluate(() =>
      (window as unknown as { teacherTracks: MediaStreamTrack[] }).teacherTracks.filter(track => track.readyState === 'live').length);
    await record.click(); await expect(finish).toBeVisible();
    expect(await liveTracks()).toBe(2);
    await lesson.getByRole('button', { name: 'Отменить' }).click();
    await expect.poll(liveTracks).toBe(0);
    await expect(lesson.locator('[data-act="play"]')).toBeHidden();
    await record.click(); await expect(finish).toBeVisible();
    await expect.poll(() => lesson.locator('[data-part="camera"]').evaluate(node => (node as HTMLVideoElement).currentTime)).toBeGreaterThan(2.1);
    await finish.click(); await expect.poll(liveTracks).toBe(0);
    await lesson.locator('[data-act="play"]').click();
    await expect(lesson.locator('[data-act="continue"]')).toBeVisible({ timeout: 15_000 });
    await record.click(); await expect(finish).toBeVisible();
    await lesson.locator('[data-act="back"]').click();
    await expect.poll(liveTracks).toBe(0);
    await expect(page.locator('#grade0SoundsMenu')).toHaveClass(/active/);
  });

  test('denied camera access leaves the local file picker available', async ({ page }) => {
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Denied by test', 'NotAllowedError'); };
    });
    const lesson = await openExercise(page);
    await lesson.locator('[data-act="record"]').click();
    await expect(lesson.getByRole('status')).toContainText('Проверьте разрешения');
    await expect(lesson.locator('input[type="file"]')).toBeEnabled();
    await expect(lesson.locator('[data-act="record"]')).toBeVisible();
    await expect(lesson.locator('[data-act="continue"]')).toBeHidden();
  });
});

async function beginQuestions(page: Page) {
  const lesson = page.locator('#voicePresenceScreen'), play = lesson.locator('[data-act="play"]'), next = lesson.locator('[data-act="continue"]');
  for (let step = 0; step < 3; step++) { await play.click(); await expect(next).toBeVisible(); await next.click(); }
  await expect(lesson.locator('[data-part="choices"]')).toBeVisible();
}
const liveTracks = (page: Page) => page.evaluate(() => (window as PresenceApp).presenceTracks.filter(track => track.readyState === 'live').length);

test('React owns the screen and releases each replaced local source and its audio context on leave', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const lesson = await openExercise(page), fixture = await videoFixture(page, true);
  await expect(lesson.locator('.voice-presence')).toHaveAttribute('data-react-owned', 'true');
  expect(await page.locator('script[src*="voice-presence.js"], link[href*="voice-presence.css"]').count()).toBe(0);
  const urls: string[] = [];
  for (let i = 0; i < 2; i++) {
    await lesson.locator('input').setInputFiles({ ...fixture, name: `teacher-${i}.webm` });
    await lesson.locator('[data-act="play"]').click(); await expect(lesson.locator('[data-act="continue"]')).toBeVisible();
    urls.push(await lesson.locator('[data-part="video"]').evaluate(node => (node as HTMLVideoElement).src));
  }
  expect(urls[0]).not.toBe(urls[1]);
  expect(await page.evaluate(url => (window as PresenceApp).presenceUrls.has(url), urls[0])).toBe(false);
  expect(await page.evaluate(() => (window as PresenceApp).presenceContexts.size)).toBe(1);
  await lesson.locator('input').setInputFiles(await videoFixture(page, false));
  await lesson.locator('[data-act="play"]').click(); await expect(lesson.getByRole('status')).toHaveAttribute('data-message', 'noVoice');
  await expect(lesson.locator('[data-act="continue"]')).toBeHidden();
  urls.push(await lesson.locator('[data-part="video"]').evaluate(node => (node as HTMLVideoElement).src));
  await lesson.locator('[data-act="back"]').click(); await expect(lesson.locator('.voice-presence')).toHaveCount(0);
  await expect.poll(() => page.evaluate(urls => urls.some(url => (window as PresenceApp).presenceUrls.has(url)), urls)).toBe(false);
  await expect.poll(() => page.evaluate(() => [...(window as PresenceApp).presenceContexts].every(context => context.state === 'closed'))).toBe(true);
  expect(errors).toEqual([]);
});

test('interrupted previews and questions stay locked after stop, language changes, hiding and another sound', async ({ page }) => {
  const lesson = await openExercise(page); await lesson.locator('input').setInputFiles(await videoFixture(page, true));
  const play = lesson.locator('[data-act="play"]'), next = lesson.locator('[data-act="continue"]');
  for (const action of ['stop', 'locale', 'hidden', 'audio'] as const) {
    await play.click(); await expect(play).toHaveAttribute('aria-pressed', 'true');
    if (action === 'locale') await page.locator('#top-lang-btn-kk').click();
    else await page.evaluate(action => {
      if (action === 'stop') (window as PresenceApp).stopAllAppAudio();
      else if (action === 'hidden') { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }
      else void new Audio('/original/sounds/letter-line/У.mp3').play();
    }, action);
    await expect(play).toHaveAttribute('aria-pressed', 'false'); await expect(next).toBeHidden();
    await expect(lesson.getByRole('status')).toHaveAttribute('data-message', 'interrupted');
    expect(await lesson.locator('[data-part="video"]').evaluate(node => (node as HTMLVideoElement).paused)).toBe(true);
    if (action === 'hidden') await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  }
  await beginQuestions(page);
  await play.click(); await expect(play).toHaveAttribute('aria-pressed', 'true'); await play.click();
  await expect(lesson.locator('[data-act="yes"]')).toBeDisabled();
  await play.click(); await expect(lesson.locator('[data-act="yes"]')).toBeEnabled();
  expect(await page.evaluate(() => localStorage.getItem('eduCorex.learning.v1:guest'))).toBeNull();
});

test('late camera permission is released after cancellation or leaving', async ({ page }) => {
  const lesson = await openExercise(page);
  for (const action of ['cancel', 'leave']) {
    await page.evaluate(() => {
      const obtain = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = constraints => {
        navigator.mediaDevices.getUserMedia = obtain;
        return new Promise(resolve => { (window as PresenceApp).releaseCapture = async () => resolve(await obtain(constraints)); });
      };
    });
    await lesson.locator('[data-act="record"]').click(); await expect(lesson.getByRole('status')).toHaveAttribute('data-message', 'permission');
    if (action === 'cancel') await lesson.locator('[data-act="cancelRecording"]').click();
    else await lesson.locator('[data-act="back"]').click();
    await page.evaluate(() => (window as PresenceApp).releaseCapture()); await expect.poll(() => liveTracks(page)).toBe(0);
    if (action === 'cancel') { await expect(lesson.locator('[data-act="play"]')).toBeHidden(); await expect(lesson.locator('input')).toBeEnabled(); }
  }
});

test('recording stops on global stop, language, grade, hidden page and pagehide without retaining a take', async ({ page }) => {
  const lesson = await openExercise(page);
  for (const action of ['stop', 'locale', 'grade', 'hidden', 'pagehide'] as const) {
    await lesson.locator('[data-act="record"]').click(); await expect(lesson.locator('[data-act="finishRecording"]')).toBeVisible();
    expect(await liveTracks(page)).toBe(2);
    if (action === 'locale') await page.locator('#top-lang-btn-kk').click();
    else await page.evaluate(action => {
      if (action === 'stop') (window as PresenceApp).stopAllAppAudio();
      else if (action === 'grade') (window as PresenceApp).CorexGrades.selectJunior(0);
      else if (action === 'hidden') { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }
      else window.dispatchEvent(new Event('pagehide'));
    }, action);
    await expect.poll(() => liveTracks(page)).toBe(0);
    if (action === 'pagehide') await expect(lesson.locator('.voice-presence')).toHaveCount(0);
    else { await expect(lesson.locator('[data-act="play"]')).toBeHidden(); await expect(lesson.locator('input')).toBeEnabled(); }
    if (action === 'hidden') await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  }
});

test('a grade change clears a loaded teacher video and the previous attempt', async ({ page }) => {
  const lesson = await openExercise(page); await lesson.locator('input').setInputFiles(await videoFixture(page, true)); await beginQuestions(page);
  const video = lesson.locator('[data-part="video"]'), url = await video.evaluate(node => (node as HTMLVideoElement).src);
  await lesson.locator('[data-act="play"]').click(); await expect(lesson.locator('[data-act="yes"]')).toBeEnabled();
  await page.evaluate(() => (window as PresenceApp).CorexGrades.selectJunior(0));
  await expect(lesson.locator('[data-part="setup"]')).toBeVisible(); await expect(video).toBeHidden();
  expect(await page.evaluate(url => (window as PresenceApp).presenceUrls.has(url), url)).toBe(false);
  await expect(lesson.locator('input')).toHaveValue(''); await expect(lesson.locator('[data-act="continue"]')).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem('eduCorex.learning.v1:guest'))).toBeNull();
});

test('a storage error keeps the completed result available for explicit retry', async ({ page }) => {
  const lesson = await openExercise(page); await lesson.locator('input').setInputFiles(await videoFixture(page, true)); await beginQuestions(page);
  await page.evaluate(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('eduCorex.learning.v1:')) { Storage.prototype.setItem = set; throw new DOMException('Full', 'QuotaExceededError'); }
      return set.call(this, key, value);
    };
  });
  for (let round = 0; round < 2; round++) {
    await lesson.locator('[data-act="play"]').click(); await expect(lesson.locator('[data-act="yes"]')).toBeEnabled();
    const muted = await lesson.locator('[data-part="video"]').evaluate(node => (node as HTMLVideoElement).muted);
    await lesson.locator(`[data-act="${muted ? 'no' : 'yes'}"]`).click();
    if (round === 0) await lesson.locator('[data-act="continue"]').click();
  }
  await expect(lesson.getByRole('status')).toHaveAttribute('data-message', 'saveFailed');
  await lesson.locator('[data-act="save"]').click(); await expect(lesson.locator('[data-act="save"]')).toHaveCount(0);
  const records = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('eduCorex.learning.v1:guest') || '{}')));
  expect(records).toHaveLength(1); expect(records[0]).toMatchObject({ grade: 1, context: 'listening', objective: 'voice-presence', attempts: 2, completed: 2 });
});

for (const [width, height, locale, theme] of [[320, 568, 'kk', 'light'], [320, 568, 'ru', 'dark'], [844, 390, 'kk', 'light'], [844, 390, 'ru', 'dark'], [1440, 900, 'kk', 'dark'], [1440, 900, 'ru', 'light']] as const) {
  test(`voice presence is accessible at ${width}x${height} ${locale} ${theme}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height }); await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    const lesson = await openExercise(page, locale, theme);
    await expect(lesson.locator('h2')).toHaveText(locale === 'kk' ? 'Дауыс бар ма?' : 'Есть ли голос?');
    await page.screenshot({ path: info.outputPath('setup.png'), animations: 'disabled' });
    await lesson.locator('input').setInputFiles(await videoFixture(page, true)); await beginQuestions(page);
    await lesson.locator('[data-act="play"]').click(); await expect(lesson.locator('[data-act="yes"]')).toBeEnabled();
    for (const action of ['play', 'yes', 'no', 'back']) {
      const button = lesson.locator(`[data-act="${action}"]`); await button.evaluate(element => element.scrollIntoView({ block: 'center' }));
      const size = await button.boundingBox(); expect(size!.width).toBeGreaterThanOrEqual(44); expect(size!.height).toBeGreaterThanOrEqual(44);
      await expect.poll(() => button.evaluate(element => { const b = element.getBoundingClientRect(); return element.contains(document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)); })).toBe(true);
    }
    expect(await lesson.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await lesson.locator('[data-act="yes"]').evaluate(element => element.scrollIntoView({ block: 'center' }));
    await page.screenshot({ path: info.outputPath('question.png'), animations: 'disabled' });
    expect(errors).toEqual([]);
  });
}
