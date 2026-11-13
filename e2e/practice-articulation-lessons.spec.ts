import { expect, test, type Page } from './fixtures';

type App = Window & typeof globalThis & {
  showScreen(id: string): void; setLangProfile(locale: string): void; CorexGrades: { selectJunior(grade: number): void };
  appTts: { speakText(): Promise<{ ok: boolean }>; stop(): void }; lessonResolve?(value: { ok: boolean }): void;
};
const navigate = (page: Page, id: string) => page.evaluate(id => (window as App).showScreen(id), id);
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('locale', 'ru'); localStorage.setItem('profileLang', 'ru'); localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true');
  });
  await page.route('**/api/tts', route => route.abort());
  await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
});

test('React owns the voice menu and all three screens without legacy lesson controllers', async ({ page }) => {
  await navigate(page, 'grade0DauysShakMenu');
  const menu = page.locator('#grade0DauysShakMenu [data-grade-menu-root]');
  await expect(menu.locator('button.radial-item')).toHaveCount(5);
  await expect(menu.locator('[onclick]')).toHaveCount(0);
  await menu.locator('.radial-center-btn').click();
  await expect(menu.locator('.radial-item').first()).toHaveAttribute('tabindex', '-1');
  await menu.locator('.radial-center-btn').click();
  for (const id of ['g0ArticulationLessons', 'g0QSoundAdventure', 'g0AutumnStory']) {
    const entry = menu.locator(`[data-destination="${id}"]`);
    await expect(entry).toHaveAttribute('tabindex', '0'); await entry.focus(); await page.keyboard.press('Enter');
    await expect(page.locator(`#${id} [data-react-owned="true"]`)).toBeVisible();
    await page.locator(`#${id} .art-module-back`).click();
    await expect(page.locator(`#${id} .art-module-wrap`)).toHaveCount(0);
  }
  expect(await page.evaluate(() => ['EduArticulationLessons', 'EduArticulationAnimations', 'EduQSoundAdventure', 'EduAutumnStory'].some(key => key in window))).toBe(false);
});

test('language, grade and page visibility cancel pending speech without corrupting a new round', async ({ page }) => {
  await navigate(page, 'g0AutumnStory');
  await page.evaluate(() => {
    const app = window as App;
    app.appTts = { speakText: () => new Promise(resolve => { app.lessonResolve = resolve; }), stop() {} };
  });
  const listen = page.locator('#artAutumnGame [data-action="listen"]');
  await listen.click(); await expect(listen).toBeDisabled();
  await page.evaluate(() => (window as App).setLangProfile('kk')); await expect(listen).toBeEnabled();
  await expect(page.locator('.asg-sentence')).toHaveText('Күз келді.');
  await page.evaluate(() => (window as App).lessonResolve?.({ ok: false })); await expect(page.locator('.asg-status')).toHaveText('');
  await page.locator('[data-choice="autumn"]').click(); await page.locator('#artAutumnGame [data-action="next"]').click();
  await expect(page.locator('.asg-counter')).toContainText('2 / 3');
  await listen.click(); await page.evaluate(() => (window as App).CorexGrades.selectJunior(1));
  await expect(page.locator('.asg-counter')).toContainText('1 / 3'); await expect(listen).toBeEnabled();
  await page.evaluate(() => (window as App).lessonResolve?.({ ok: false })); await expect(page.locator('.asg-status')).toHaveText('');
  await listen.click();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(listen).toBeEnabled();
  await page.evaluate(() => (window as App).lessonResolve?.({ ok: false })); await expect(page.locator('.asg-status')).toHaveText('');
});

test('reduced motion preserves discrete phases and visibility pauses the animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await navigate(page, 'g0ArticulationLessons');
  const range = page.locator('#artModuleProgress'), tongue = page.locator('#artModuleStage [data-art="tongue"]');
  await range.focus(); await page.keyboard.press('Home');
  const start = await tongue.getAttribute('d'); await page.keyboard.press('ArrowRight');
  expect(await tongue.getAttribute('d')).toBe(start);
  await page.keyboard.press('End'); await expect(page.locator('#artModulePhase')).toHaveText('Отдыхаем');
  await page.locator('#artModuleRestart').click(); await expect(page.locator('#artModulePlay')).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.locator('#artModulePlay')).toHaveAttribute('aria-pressed', 'false');
  const progress = await range.inputValue(); await page.waitForTimeout(150); expect(await range.inputValue()).toBe(progress);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.locator('#artModulePlay')).toHaveAttribute('aria-pressed', 'false');
});

for (const [width, height, theme] of [[320, 568, 'light'], [844, 390, 'dark'], [1440, 900, 'light']] as const) {
  test(`lesson and games fit ${width}x${height} ${theme}`, async ({ page }, info) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error' && /Each child|Invalid|Warning:/.test(message.text())) errors.push(message.text()); });
    await page.setViewportSize({ width, height }); await page.emulateMedia({ reducedMotion: 'reduce' });
    if (theme === 'dark') await page.locator('.top-right-controls .switch').click();
    await expect(page.locator('#theme_toggle_input')).toBeChecked({ checked: theme === 'dark' });
    for (const id of ['g0ArticulationLessons', 'g0QSoundAdventure', 'g0AutumnStory']) {
      await navigate(page, id); const screen = page.locator('#' + id);
      await expect(screen.locator('svg[role="img"]').first()).toBeVisible();
      await expect(screen).toHaveCSS('opacity', '1');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const back = screen.locator('.art-module-back'); await back.scrollIntoViewIfNeeded();
      expect(await back.evaluate(element => { const b = element.getBoundingClientRect(); return element.contains(document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)); })).toBe(true);
      await page.screenshot({ path: info.outputPath(`${id}-controls.png`), animations: 'disabled' });
      await screen.evaluate(element => {
        for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) ancestor.scrollTo(0, 0);
        window.scrollTo(0, 0);
      });
      await page.screenshot({ path: info.outputPath(`${id}.png`), animations: 'disabled' });
    }
    expect(errors).toEqual([]);
  });
}
