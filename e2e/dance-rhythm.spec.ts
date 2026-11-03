import { expect, test, type Page } from './fixtures';

async function openDance(page: Page, grade: number) {
  await page.addInitScript(() => {
    localStorage.setItem('profileLang', 'ru'); localStorage.setItem('locale', 'ru');
    localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true');
  });
  await page.route('**/api/tts', route => route.abort());
  await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#mainRadialMenu .radial-center-btn').click();
  await page.locator('#mainRadialMenu [onclick*="grade0Menu"]').click();
  await page.locator('#grade0Menu select').selectOption(String(grade));
  await page.locator('#grade0Menu [onclick*="grade0SoundsMenu"]').click();
  await page.locator('#grade0SoundsMenu [onclick*="g0Task5"]').click();
  return page.locator('#g0Task5');
}

for (const grade of [0, 1]) test('waltz and march retain targets, attempts and grade ' + grade, async ({ page }, info) => {
  test.setTimeout(85_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const sources: string[] = [];
  await page.exposeFunction('observedRhythm', (url: string) => sources.push(url));
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (this.src.includes('/sounds/rhythm/')) void (window as unknown as { observedRhythm(url: string): void }).observedRhythm(this.src);
      return play.call(this);
    };
  });
  await page.setViewportSize(grade ? { width: 1440, height: 900 } : { width: 320, height: 568 });
  const lesson = await openDance(page, grade);
  const choices = lesson.locator('[data-answer]');
  await expect(choices).toHaveCount(2);
  await expect(lesson.getByRole('heading')).toHaveText('Вальс или марш?');
  await expect(choices.first()).toBeDisabled();
  for (let round = 0; round < 2; round++) {
    await expect(choices.first()).toBeEnabled({ timeout: 15_000 });
    const current = sources.at(-1)!;
    expect(current).toMatch(/\/(march|vals)\.mp3$/);
    const target = current.endsWith('/march.mp3') ? 'march' : 'waltz';
    if (round === 0) {
      await lesson.locator('[data-answer]:not([data-answer="' + target + '"])').click();
      await expect(lesson.getByRole('status').first()).toContainText('ещё раз');
      await lesson.getByRole('button', { name: /Слушать ещё раз/ }).click();
      await expect(choices.first()).toBeDisabled();
      await expect(choices.first()).toBeEnabled({ timeout: 15_000 });
      expect(sources.at(-1)).toBe(current);
      await lesson.screenshot({ path: info.outputPath('dance-grade-' + grade + '.png') });
    }
    const correct = lesson.locator('[data-answer="' + target + '"]');
    await correct.focus(); await page.keyboard.press('Enter');
    await expect(choices.first()).toBeDisabled();
    await lesson.getByRole('button', { name: 'Далее', exact: true }).click();
  }
  expect(new Set(sources).size).toBe(2);
  await expect(lesson.locator('.learning-summary')).toContainText('Выполнено: 2. Попыток: 3.');
  const data = await page.evaluate(() => JSON.parse(localStorage.getItem('eduCorex.learning.v1:guest') || '{}'));
  expect(data['grade:' + grade + ':table:' + (grade === 0 ? 5 : 7) + ':listening:dance']).toMatchObject({
    grade, completed: 2, attempts: 3, results: [{ attempts: 2 }, { attempts: 1 }],
  });
  expect(errors).toEqual([]);
});

test('missing dance audio can be retried and does not unlock answers', async ({ page }) => {
  await page.route('**/sounds/rhythm/*.mp3', route => route.abort());
  const lesson = await openDance(page, 1);
  const answer = lesson.locator('[data-answer]').first();
  await expect(lesson.getByRole('status').first()).toContainText('не загрузился');
  await expect(answer).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem('eduCorex.learning.v1:guest'))).toBeNull();
  await page.unroute('**/sounds/rhythm/*.mp3');
  await lesson.getByRole('button', { name: /Слушать ещё раз/ }).click();
  await expect(answer).toBeEnabled({ timeout: 15_000 });
  await lesson.getByRole('button', { name: /Слушать ещё раз/ }).click();
  await lesson.getByRole('button', { name: /Назад/ }).click();
  await expect(page.locator('#grade0SoundsMenu')).toHaveClass(/active/);
  expect(await page.evaluate(() => (window as unknown as { _activeAudios: HTMLAudioElement[] })._activeAudios.filter(audio => !audio.paused && audio.currentSrc.includes('/rhythm/')).length)).toBe(0);
});
