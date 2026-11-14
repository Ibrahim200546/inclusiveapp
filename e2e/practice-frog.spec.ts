import { test, expect, type Page } from './fixtures';

type FrogApp = Window & typeof globalThis & {
  showScreen(screen: string): void; showReward(): void; frogRewards: number; frogCaptures: number;
  CorexGrades: { selectJunior(grade: number): void };
};

async function open(page: Page, locale = 'ru', theme = 'light', reduced = false) {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await page.addInitScript(({ locale, theme }) => {
    localStorage.setItem('locale', locale); localStorage.setItem('profileLang', locale); localStorage.setItem('theme', theme);
    localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true');
    const app = window as FrogApp; app.frogCaptures = 0; app.frogRewards = 0;
    navigator.mediaDevices.getUserMedia = async () => { app.frogCaptures++; throw new Error('This exercise must not capture audio'); };
  }, { locale, theme });
  await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { const app = window as FrogApp; app.showReward = () => { app.frogRewards++; }; app.showScreen('g0TaskFrog'); });
  const screen = page.locator('#g0TaskFrog'), exercise = screen.locator('.frog-practice');
  await expect(screen).toHaveClass(/active/); await expect(exercise).toHaveAttribute('data-status', 'idle');
  return { screen, exercise, errors };
}
async function noMotion(page: Page) {
  await expect.poll(() => page.locator('#frog-character').evaluate(node => node.getAnimations().length)).toBe(0);
}

test('finishes all original words with keyboard controls and reduced motion, then restarts', async ({ page }) => {
  test.setTimeout(90_000);
  const { screen, exercise, errors } = await open(page, 'ru', 'light', true);
  await expect(screen.locator('.frog-card')).toHaveCount(11); await expect(screen.locator('.frog-syllable')).toHaveCount(24);
  await expect(screen.locator('#frogCardContainer')).toHaveAttribute('lang', 'kk');
  await page.locator('#frogActionBtn').focus();
  for (let index = 0; index < 11; index++) {
    await page.keyboard.press('Enter');
    await expect(exercise).toHaveAttribute('data-status', index === 10 ? 'complete' : 'between');
    await expect(page.locator('#frogStatus')).toContainText(`Пройдено слов: ${index + 1} из 11`);
    await expect(page.locator('#frogActionBtn')).toBeFocused();
  }
  await expect(screen.locator('.frog-syllable-drop.visible')).toHaveCount(24); await noMotion(page);
  expect(await page.evaluate(() => { const app = window as FrogApp; return [app.frogRewards, app.frogCaptures]; })).toEqual([0, 0]);
  await page.keyboard.press('Enter'); await expect(exercise).toHaveAttribute('data-status', 'idle');
  await expect(screen.locator('.frog-syllable-drop.visible')).toHaveCount(0);
  await expect(page.locator('#frogStatus')).toContainText('Пройдено слов: 0 из 11'); expect(errors).toEqual([]);
});

test('real browser jumps leave markers and reset cancels an in-flight animation', async ({ page }) => {
  const { screen, exercise, errors } = await open(page);
  await page.locator('#frogActionBtn').click(); await expect(exercise).toHaveAttribute('data-status', 'between');
  await expect(screen.locator('.frog-syllable-drop.visible')).toHaveCount(1); await noMotion(page);
  const landing = await page.locator('#frog-character').boundingBox(), syllable = await page.locator('[data-frog-step="1"]').boundingBox();
  expect(Math.abs(landing!.x + 30 - syllable!.x - syllable!.width / 2)).toBeLessThan(1);
  expect(Math.abs(landing!.y + 60 - syllable!.y)).toBeLessThan(1);
  await page.locator('#frogActionBtn').click(); await expect(exercise).toHaveAttribute('data-status', 'running');
  await page.locator('#frogResetBtn').click(); await noMotion(page); await expect(exercise).toHaveAttribute('data-status', 'idle');
  await page.waitForTimeout(1300); await expect(screen.locator('.frog-syllable-drop.visible')).toHaveCount(0);
  await expect(page.locator('#frogStatus')).toContainText('Пройдено слов: 0 из 11'); expect(errors).toEqual([]);
});

test('entering from the voice menu and returning during a jump leaves a fresh exercise', async ({ page }) => {
  const { errors } = await open(page);
  await page.locator('.frog-back').click(); await expect(page.locator('#grade0VoiceMenu')).toHaveClass(/active/);
  await page.locator('#grade0VoiceMenu [data-destination="g0TaskFrog"]').click();
  await page.locator('#frogActionBtn').click(); await expect(page.locator('.frog-practice')).toHaveAttribute('data-status', 'running');
  await page.locator('.frog-back').click(); await expect(page.locator('.frog-practice')).toHaveCount(0);
  await page.waitForTimeout(1200);
  await page.locator('#grade0VoiceMenu [data-destination="g0TaskFrog"]').click();
  await expect(page.locator('.frog-practice')).toHaveAttribute('data-status', 'idle');
  await expect(page.locator('.frog-syllable-drop.visible')).toHaveCount(0); expect(errors).toEqual([]);
});

test('alphabet word popup is available on the first visit and returns focus after closing', async ({ page }) => {
  const { screen, errors } = await open(page);
  const letter = screen.locator('.alippe-item').first(); await letter.click();
  const dialog = page.getByRole('dialog', { name: 'А', exact: true });
  await expect(dialog).toBeVisible(); await expect(dialog.locator('.alippe-popup-word')).toHaveCount(3);
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(letter).toBeFocused();
  await page.locator('#frogActionBtn').click(); await expect(screen.locator('.frog-practice')).toHaveAttribute('data-status', 'between');
  expect(errors).toEqual([]);
});

for (const reason of ['language', 'hidden', 'pagehide', 'grade', 'resize', 'alphabet']) test(`interrupts reading on ${reason} and can continue`, async ({ page }) => {
  const { exercise, screen, errors } = await open(page);
  await page.locator('#frogActionBtn').click(); await expect(exercise).toHaveAttribute('data-status', 'running');
  if (reason === 'language') await page.locator('#top-lang-btn-kk').click();
  if (reason === 'hidden') await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  if (reason === 'pagehide') await page.evaluate(() => dispatchEvent(new Event('pagehide')));
  if (reason === 'grade') await page.evaluate(() => (window as FrogApp).CorexGrades.selectJunior(1));
  if (reason === 'resize') await page.setViewportSize({ width: 600, height: 700 });
  if (reason === 'alphabet') { await screen.locator('.alippe-header-button').click(); await screen.locator('[data-alippe-action="toggle"]').click(); }
  await expect(exercise).toHaveAttribute('data-status', reason === 'grade' ? 'idle' : 'paused'); await noMotion(page);
  if (reason === 'language') { await expect(page.locator('#frogTitle')).toHaveText('🐸 Оқы және белгіле'); await expect(page.locator('#frogActionBtn')).toContainText('Жалғастыру'); }
  if (reason === 'hidden') await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.locator('#frogActionBtn').click(); await expect(exercise).toHaveAttribute('data-status', 'between');
  await expect(screen.locator('.frog-syllable-drop.visible')).toHaveCount(1); expect(errors).toEqual([]);
});

for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
  for (const locale of ['kk', 'ru']) test(`frog controls and words fit ${viewport.width}x${viewport.height} ${locale}`, async ({ page }, info) => {
    await page.setViewportSize(viewport); const { screen, exercise, errors } = await open(page, locale, locale === 'ru' ? 'dark' : 'light');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('.frog-board').evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    const controls = screen.locator('.frog-controls button');
    for (const control of await controls.all()) {
      await control.scrollIntoViewIfNeeded();
      expect(await control.evaluate(node => { const box = node.getBoundingClientRect(); const top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2); return top === node || node.contains(top); })).toBe(true);
    }
    await page.evaluate(() => scrollTo(0, 0));
    if (viewport.width < 769) {
      const alphabet = await screen.locator('.alippe-panel').boundingBox(), title = await screen.getByRole('heading').boundingBox();
      expect(title!.y).toBeGreaterThanOrEqual(alphabet!.y + alphabet!.height);
    }
    await page.screenshot({ path: info.outputPath('frog-ready.png') });
    await page.locator('#frogActionBtn').click(); await expect(exercise).toHaveAttribute('data-status', 'between');
    const frog = await page.locator('#frog-character').boundingBox(), buttons = await page.locator('.frog-controls').boundingBox();
    expect(frog!.y).toBeGreaterThanOrEqual(buttons!.y + buttons!.height);
    const syllable = await page.locator('[data-frog-step="1"]').boundingBox();
    expect(syllable!.y + syllable!.height).toBeLessThanOrEqual(viewport.height - (viewport.width <= 768 ? 80 : 0));
    for (const control of await controls.all()) expect(await control.evaluate(node => {
      const box = node.getBoundingClientRect(), top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return top === node || node.contains(top);
    })).toBe(true);
    await page.screenshot({ path: info.outputPath('frog-reading.png') });
    await page.locator('.frog-back').click(); await expect(page.locator('#grade0VoiceMenu')).toHaveClass(/active/); expect(errors).toEqual([]);
  });
}
