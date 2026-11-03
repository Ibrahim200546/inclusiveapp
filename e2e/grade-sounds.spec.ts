import { expect, test, type Page } from './fixtures';

async function enter(page: Page, grade: number, language: string) {
  await page.addInitScript(lang => {
    localStorage.setItem('locale', lang); localStorage.setItem('profileLang', lang);
    localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true');
  }, language);
  await page.route('**/api/tts', route => route.abort());
  await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#mainRadialMenu .radial-center-btn').click();
  const parent = 'grade' + (grade < 2 ? 0 : grade) + 'Menu';
  await page.locator('#mainRadialMenu [onclick*="' + parent + '"]').click();
  if (grade < 2) await page.locator('#grade0Menu select').selectOption(String(grade));
  const menu = page.locator('#' + parent);
  const sounds = grade < 2 ? menu.locator('[onclick*="grade0SoundsMenu"]') : menu.getByRole('button', { name: language === 'ru' ? 'Работа со звуком' : 'Дыбыспен жұмыс', exact: true });
  for (let i = 0; i < 12 && !await sounds.isVisible(); i++) await menu.locator('.grade-menu-pages button').last().click();
  await sounds.click();
  await expect(page.locator('#grade0SoundsMenu')).toHaveClass(/active/);
}

test('the drum recording reaches the end without a browser decoding error', async ({ page }) => {
  await enter(page, 1, 'ru');
  const result = await page.evaluate(() => new Promise<{ ended: boolean; error: string | null }>(resolve => {
    const audio = new Audio('sounds/instruments/drum.mp3');
    let settled = false;
    const finish = (ended: boolean, error: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      audio.pause();
      resolve({ ended, error });
    };
    const timer = setTimeout(() => finish(false, 'Playback timed out'), 15000);
    audio.addEventListener('ended', () => finish(true, null), { once: true });
    audio.addEventListener('error', () => finish(false, audio.error?.message || 'Media decoding failed'), { once: true });
    void audio.play().catch(error => finish(false, String(error)));
  }));
  expect(result).toEqual({ ended: true, error: null });
});

for (const grade of [0, 1, 2, 3, 4]) test('instrument recognition from the grade ' + grade + ' orbit', async ({ page }, info) => {
  test.setTimeout(110_000);
  const lang = grade % 2 ? 'kk' : 'ru';
  const mobile = grade === 0 || grade === 3;
  await page.setViewportSize(mobile ? { width: 320, height: 568 } : { width: 1440, height: 900 });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const audio: string[] = [];
  await page.exposeFunction('observeInstrument', (url: string) => audio.push(url));
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (this.src.includes('/instruments/')) void (window as unknown as { observeInstrument(url: string): void }).observeInstrument(this.src);
      return play.call(this);
    };
  });
  await enter(page, grade, lang);
  const menu = page.locator('#grade0SoundsMenu'), entry = menu.locator('[data-sound-category="instruments"]');
  await expect(entry).toBeVisible();
  await menu.screenshot({ path: info.outputPath('menu-grade-' + grade + '.png') });
  await entry.focus(); await page.keyboard.press('Enter');
  const lesson = page.locator('#g0Task3'), answers = lesson.locator('button[data-answer]');
  await expect(answers).toHaveCount(grade ? 3 : 2);
  await expect(answers.first()).toBeEnabled({ timeout: 25_000 });
  const source = audio.at(-1)!; expect(source).toContain('/instruments/');
  const target = source.split('/').pop()!.split('.')[0];
  await lesson.screenshot({ path: info.outputPath('lesson-grade-' + grade + '.png') });
  await lesson.locator('button[data-answer]:not([data-answer="' + target + '"])').first().click();
  await expect(lesson.locator('.learning-feedback')).toContainText('↻');
  await lesson.locator('.learning-actions button').first().click();
  await expect(answers.first()).toBeEnabled({ timeout: 25_000 }); expect(audio.at(-1)).toBe(source);
  await lesson.locator('[data-answer="' + target + '"]').click();
  await expect(lesson.locator('.learning-feedback')).toContainText('✓');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('eduCorex.learning.v1:guest') || '{}'));
  const key = 'grade:' + grade + ':table:' + (5 + 2 * grade) + ':recognition:instruments:' + (grade === 2 ? 'start' : 'standard');
  expect(saved[key].results[0]).toEqual({ id: target, attempts: 2 });
  await expect(answers.first()).toBeDisabled();
  if (await page.locator('#rewardModal.active').count()) await page.locator('#rewardModal button').first().click();
  if (grade === 2) {
    await lesson.getByRole('button', { name: /6/ }).click();
    await expect(lesson.locator('.learning-wrap > p').first()).toContainText('1 / 6');
  }
  await lesson.locator('.learning-actions button').last().click();
  await expect(entry).toBeVisible();
  await menu.locator('.task-content-wrapper > button.btn').click();
  await expect(page.locator('#grade' + (grade < 2 ? 0 : grade) + 'Menu')).toHaveClass(/active/);
  expect(errors).toEqual([]);
});

test('unavailable audio keeps the same round and grants no credit until a successful retry', async ({ page }) => {
  await enter(page, 1, 'ru');
  await page.route('**/sounds/instruments/*.mp3', route => route.abort());
  await page.locator('[data-sound-category="instruments"]').click();
  const lesson = page.locator('#g0Task3');
  await expect(lesson.getByRole('status').first()).toContainText('не загрузился');
  await expect(lesson.locator('[data-answer]').first()).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem('eduCorex.learning.v1:guest'))).toBeNull();
  await page.unroute('**/sounds/instruments/*.mp3'); await lesson.locator('.learning-actions button').first().click();
  await expect(lesson.locator('[data-answer]').first()).toBeEnabled({ timeout: 25_000 });
});

test('one learner keeps both junior grades and earlier progress when switching inside the same menu', async ({ page }) => {
  test.setTimeout(80_000);
  let heard = '';
  await page.exposeFunction('heardInstrument', (url: string) => { heard = url; });
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (this.src.includes('/sounds/instruments/')) void (window as unknown as { heardInstrument(src: string): void }).heardInstrument(this.src);
      return play.call(this);
    };
  });
  await enter(page, 0, 'kk');
  await page.evaluate(() => localStorage.setItem('eduCorex.learning.v1:guest', JSON.stringify({ earlier: { complete: true } })));
  for (const grade of [0, 1]) {
    if (grade) {
      await page.locator('#grade0SoundsMenu .task-content-wrapper > button.btn').click();
      await page.locator('#grade0Menu select').selectOption('1');
      await page.locator('#grade0Menu [onclick*="grade0SoundsMenu"]').click();
    }
    await page.locator('[data-sound-category="instruments"]').click();
    const lesson = page.locator('#g0Task3');
    await expect(lesson.locator('[data-answer]').first()).toBeEnabled({ timeout: 30_000 });
    const id = heard.split('/').pop()!.split('.')[0];
    await lesson.locator('[data-answer="' + id + '"]').click();
    if (await page.locator('#rewardModal.active').count()) await page.locator('#rewardModal button').first().click();
    await lesson.locator('.learning-actions button').last().click();
  }
  const data = await page.evaluate(() => JSON.parse(localStorage.getItem('eduCorex.learning.v1:guest') || '{}'));
  expect(data.earlier.complete).toBe(true);
  for (const grade of [0, 1]) expect(data['grade:' + grade + ':table:' + (5 + 2 * grade) + ':recognition:instruments:standard'].results).toHaveLength(1);
});
