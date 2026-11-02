import { expect, test, type Page } from './fixtures';
import path from 'node:path';

test.describe.configure({ timeout: 120_000 });
test.use({ launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] } });

async function openExercise(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('locale', 'ru');
    localStorage.setItem('profileLang', 'ru');
    localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true');
  });
  await page.route('**/api/tts', route => route.abort());
  await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#mainRadialMenu .radial-center-btn').click();
  await page.locator('#mainRadialMenu [onclick*="grade0Menu"]').click();
  await page.locator('#grade0Menu select').selectOption('1');
  await page.locator('#grade0Menu [onclick*="grade0SoundsMenu"]').click();
  const menu = page.locator('#grade0SoundsMenu');
  const entry = menu.getByRole('button', { name: 'Есть ли голос?' });
  while (!await entry.isVisible()) {
    const next = menu.getByRole('button', { name: 'Следующая страница' });
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
  await lesson.getByRole('button', { name: '← Работа со звуком' }).click();
  await expect(page.locator('#grade0SoundsMenu')).toHaveClass(/active/);
  expect(await video.evaluate(node => (node as HTMLVideoElement).currentSrc)).toBe('');
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
