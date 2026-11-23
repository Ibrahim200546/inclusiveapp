import { expect, test, type Page } from './fixtures';
import { openGrade, openModule, findRadialEntry } from './radial-navigation';

async function openLesson(page: Page, grade: 3 | 4, language: 'ru' | 'kk') {
  await page.addInitScript(lang => {
    localStorage.setItem('profileLang', lang);
    localStorage.setItem('locale', lang);
    localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true');
  }, language);
  await page.route('**/api/tts', route => route.abort());
  await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
  const parent = await openGrade(page, grade);
  await openModule(page, parent, grade === 3 ? 'speech' : 'comprehension');
  await (await findRadialEntry(page, 'data-activity', `g${grade}Task2`)).click();
  return page.locator(`#g${grade}Task2.active`);
}

test('grade 3 intonations unlock only after their own completed recording and retry the same file', async ({ page }, info) => {
  test.setTimeout(100_000);
  await page.setViewportSize({ width: 320, height: 568 });
  const played: string[] = [];
  await page.exposeFunction('speechSource', (url: string) => played.push(decodeURI(url)));
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (/\/intonation\/|\/kk-human\//.test(this.src)) void (window as unknown as { speechSource(s: string): void }).speechSource(this.src);
      return play.call(this);
    };
  });
  const lesson = await openLesson(page, 3, 'ru');
  const listen = lesson.locator('[data-speech-play]'), answers = lesson.locator('[data-speech-answer]');
  await expect(answers.first()).toBeDisabled();
  const audio = /\/sounds\/(?:intonation\/[^/]+\.mpeg|kk-human\/[^/]+\.mp4)/;
  await page.route(audio, route => route.abort());
  await listen.click();
  await expect(lesson.getByRole('status')).toContainText('не прозвучала');
  await expect(answers.first()).toBeDisabled();
  const initial = played.at(-1);
  await page.unroute(audio);
  const heard = new Set<string>();
  for (let ix = 0; ix < 3; ix++) {
    await listen.click();
    await expect(answers.first()).toBeEnabled({ timeout: 20_000 });
    const source = played.at(-1)!;
    if (ix === 0) expect(source).toBe(initial);
    const id = source.includes('question.mpeg') ? 'question' : source.includes('exclamation.mpeg') ? 'exclamation' : 'statement';
    if (id === 'statement') expect(source).toContain('бала нан жеді.mp4');
    heard.add(id);
    if (ix === 0) {
      await lesson.locator('[data-speech-answer]:not([data-speech-answer="' + id + '"])').first().click();
      await expect(lesson.getByRole('status')).toContainText('ещё раз');
      await listen.click();
      await expect(answers.first()).toBeEnabled({ timeout: 20_000 });
      expect(played.at(-1)).toBe(source);
      await page.screenshot({ path: info.outputPath('grade-3-intonation-320.png') });
    }
    await lesson.locator('[data-speech-answer="' + id + '"]').click();
    await expect(lesson.getByRole('status')).toContainText('Правильно');
    await expect(answers.first()).toBeDisabled();
    const modal = page.locator('#rewardModal.active button').first();
    if (await modal.isVisible()) await modal.click();
    await lesson.locator('[data-speech-next]').click();
    await expect(answers.first()).toBeDisabled();
  }
  expect(heard.size).toBe(3);
});

function testVoice(frequency: number) {
  const rate = 8000, frames = 6000, data = Buffer.alloc(44 + frames * 2);
  data.write('RIFF'); data.writeUInt32LE(data.length - 8, 4); data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22);
  data.writeUInt32LE(rate, 24); data.writeUInt32LE(rate * 2, 28); data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34); data.write('data', 36); data.writeUInt32LE(frames * 2, 40);
  for (let i = 0; i < frames; i++) data.writeInt16LE(Math.round(600 * Math.sin(2 * Math.PI * frequency * i / rate)), 44 + i * 2);
  return { name: 'test-' + frequency + '.wav', mimeType: 'audio/wav', buffer: data };
}

test('grade 4 classroom dialogue validates three local files and permits answers after playback', async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const lesson = await openLesson(page, 4, 'kk');
  const listen = lesson.locator('[data-speech-play]'), answers = lesson.locator('[data-speech-answer]');
  await expect(listen).toBeDisabled();
  const child = lesson.locator('[data-speaker="child"]'), adult = lesson.locator('[data-speaker="adult"]');
  await child.setInputFiles({ name: 'invalid.wav', mimeType: 'audio/wav', buffer: Buffer.from('invalid') });
  await expect(lesson.getByRole('status')).toContainText('Файл ашылмады');
  await child.setInputFiles(testVoice(120));
  await adult.setInputFiles(testVoice(120));
  await expect(lesson.getByRole('status')).toContainText('Осы файл таңдалған');
  await expect(listen).toBeDisabled();
  await adult.setInputFiles(testVoice(220));
  await lesson.locator('[data-speaker="both"]').setInputFiles(testVoice(330));
  await expect(listen).toBeEnabled();
  await expect(answers.first()).toBeDisabled();
  await listen.focus(); await page.keyboard.press('Enter');
  await expect(answers.first()).toBeEnabled();
  await page.screenshot({ path: info.outputPath('grade-4-dialogue-1280.png') });
  await lesson.getByRole('button', { name: /Артқа/ }).click();
  await (await findRadialEntry(page, 'data-activity', 'g4Task2')).click();
  await expect(listen).toBeEnabled();
  await expect(answers.first()).toBeDisabled();
});

test('grade 2 isolates duration, loudness and number of actual recorded claps', async ({ page }) => {
  test.setTimeout(140_000);
  await page.addInitScript(() => {
    localStorage.setItem('profileLang', 'ru'); localStorage.setItem('locale', 'ru');
    localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true');
  });
  let source = '';
  await page.exposeFunction('clapSource', (raw: string) => { source = decodeURI(raw); });
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (this.src.includes('/igrak/')) void (window as unknown as { clapSource(s: string): void }).clapSource(this.src);
      return play.call(this);
    };
  });
  await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
  await openGrade(page, 2);
  await openModule(page, 'grade2Menu', 'speech');
  await (await findRadialEntry(page, 'data-activity', 'g2Task5')).click();
  const lesson = page.locator('#g2Task5'), pick = lesson.locator('select');
  const answers = lesson.locator('section:visible [data-speech-answer]');
  const listen = lesson.locator('section:visible [data-speech-play]');
  await expect(answers).toHaveCount(2);
  await listen.click(); await expect(answers.first()).toBeEnabled({ timeout: 20_000 });
  await pick.selectOption('volume');
  await expect(answers).toHaveCount(3);
  await expect(answers.first()).toBeDisabled();
  await listen.click();
  await expect(answers.first()).toBeEnabled({ timeout: 20_000 });
  await pick.selectOption('claps');
  const counts = new Set<string>();
  for (let i = 0; i < 3; i++) {
    await listen.click(); await expect(answers.first()).toBeEnabled({ timeout: 20_000 });
    const count = source.split('/').pop()![0]; counts.add(count);
    await lesson.locator('[data-mode="claps"] [data-speech-answer="' + count + '"]').click();
    await expect(lesson.locator('#g2Feedback-claps')).toContainText('Правильно');
    const modal = page.locator('#rewardModal.active button').first();
    if (await modal.isVisible()) await modal.click();
    await lesson.locator('[data-mode="claps"] [data-speech-next]').click();
  }
  expect([...counts].sort()).toEqual(['5','6','7']);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('eduCorex.learning.v1:guest') || '{}'));
  expect(saved['grade:2:table:9:listening:2.1.1.19'].results).toHaveLength(3);
});

test('grade 4 recording gives teacher control over the result and revokes the sample on exit', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('profileLang', 'ru'); localStorage.setItem('locale', 'ru');
    localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true');
    let deny = true;
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => {
      if (deny) { deny = false; throw new Error('permission denied'); }
      const ctx = new AudioContext(); const oscillator = ctx.createOscillator(), output = ctx.createMediaStreamDestination();
      oscillator.connect(output); oscillator.start(); await ctx.resume(); return output.stream;
    } });
  });
  await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
  await openGrade(page, 4);
  await openModule(page, 'grade4Menu', 'comprehension');
  await (await findRadialEntry(page, 'data-activity', 'g4Task3')).click();
  const lesson = page.locator('#g4Task3'), start = lesson.locator('#readBtn'), confirm = lesson.locator('#g4ReadingConfirmed');
  const preview = lesson.locator('#g4ReadingPreview');
  await start.click();
  await expect(lesson.getByRole('status')).toContainText('микрофону');
  await expect(confirm).toBeDisabled();
  await start.click();
  await expect(lesson.getByRole('status')).toContainText('Идёт запись');
  await expect(confirm).toBeDisabled();
  // A real MediaRecorder needs samples before stop; await a real media timeslice.
  await page.waitForTimeout(600);
  await lesson.locator('#stopReadBtn').click();
  await expect(preview).toBeVisible();
  await expect(confirm).toBeDisabled();
  await preview.evaluate((audio: HTMLAudioElement) => audio.play());
  await expect(confirm).toBeEnabled();
  await expect(page.locator('#rewardModal')).not.toHaveClass(/active/);
  await confirm.click();
  await expect(lesson.getByRole('status')).toContainText('Педагог подтвердил');
  await expect(confirm).toBeDisabled();
  const modal = page.locator('#rewardModal.active button').first();
  if (await modal.isVisible()) await modal.click();
  await lesson.locator('button[onclick*="grade4Menu"]').click();
  await expect(preview).not.toHaveAttribute('src', /blob:/);
});
