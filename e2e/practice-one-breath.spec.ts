import { expect, test, type Page } from './fixtures';

type BreathApp = Window & typeof globalThis & {
  showScreen(screen: string): void;
  CorexGrades: { selectJunior(grade: number): void };
  appTts: { speakText(): Promise<{ ok: boolean }> };
  showReward(): void;
  breathCalls: { microphone: number; speech: number; reward: number };
};
async function open(page: Page, locale = 'ru', theme = 'light', standalone = false) {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(({ locale, theme }) => {
    localStorage.setItem('locale', locale); localStorage.setItem('profileLang', locale); localStorage.setItem('theme', theme);
    localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true');
    const app = window as BreathApp; app.breathCalls = { microphone: 0, speech: 0, reward: 0 };
    navigator.mediaDevices.getUserMedia = async () => { app.breathCalls.microphone++; throw new Error('No microphone in one-breath reading'); };
  }, { locale, theme });
  await page.goto(standalone ? '/original/tasks/bir_tinispen_oku.html' : '/original/index2.html', { waitUntil: 'domcontentloaded' });
  if (standalone) await page.waitForURL('**/index2.html?exercise=one-breath');
  else await page.evaluate(() => (window as BreathApp).showScreen('g0TynysByOneBreath'));
  const screen = page.locator('#g0TynysByOneBreath'), exercise = screen.locator('.breath-practice');
  await expect(exercise).toHaveAttribute('data-step', '0'); await expect(screen.locator('iframe')).toHaveCount(0);
  await page.evaluate(() => {
    const app = window as BreathApp;
    app.appTts.speakText = async () => { app.breathCalls.speech++; return { ok: false }; };
    app.showReward = () => { app.breathCalls.reward++; };
  });
  return { screen, exercise, errors };
}

test('reads all six rows manually with keyboard, keeps completion, and repeats without microphone or rewards', async ({ page }) => {
  const { exercise, errors } = await open(page); const advance = exercise.locator('.breath-go'), rows = exercise.locator('.breath-row');
  await expect(page.locator('#breathTitle')).toBeFocused(); await expect(rows).toHaveCount(6);
  await expect(rows).toHaveText(['ТА', 'ТАТА', 'ТАТАТА', 'ТАТАТАТА', 'ТАТАТАТАТА', 'ТАТАТАТАТАТА']);
  const before = await page.evaluate(() => ({ coins: document.getElementById('coinCount')?.textContent, progress: localStorage.getItem('eduCorex.learning.v1:guest') }));
  await advance.focus();
  for (let row = 1; row <= 6; row++) {
    await page.keyboard.press(row % 2 ? 'Enter' : 'Space'); await expect(exercise).toHaveAttribute('data-step', String(row));
    await expect(rows.nth(row - 1)).toHaveAttribute('aria-current', 'step');
    await expect(rows.filter({ hasText: /^\s*$/ })).toHaveCount(6 - row);
    await expect(exercise).toHaveAttribute('data-complete', 'false'); await expect(advance).toBeFocused();
  }
  await page.keyboard.press('Enter'); await expect(exercise).toHaveAttribute('data-complete', 'true');
  await expect(exercise.getByRole('status')).toContainText('Все шесть строк'); await expect(rows.last()).toContainText('ТАТАТАТАТАТА');
  await expect(exercise.locator('.breath-celebration')).toBeVisible();
  await expect(exercise.locator('.breath-celebration')).toHaveCount(0); await expect(exercise).toHaveAttribute('data-complete', 'true');
  await page.keyboard.press('Space'); await expect(exercise).toHaveAttribute('data-step', '0'); await expect(exercise).toHaveAttribute('data-complete', 'false');
  expect(await page.evaluate(() => ({ coins: document.getElementById('coinCount')?.textContent, progress: localStorage.getItem('eduCorex.learning.v1:guest') }))).toEqual(before);
  expect(await page.evaluate(() => (window as BreathApp).breathCalls)).toEqual({ microphone: 0, speech: 0, reward: 0 }); expect(errors).toEqual([]);
});

test('keeps original presets, applies custom text safely, validates empty input, and resets on selection', async ({ page }) => {
  const { exercise, errors } = await open(page); const input = exercise.getByLabel('Свой слог'), chips = exercise.locator('.breath-chip');
  await expect(chips).toHaveText(['ТА', 'МА', 'ПА', 'КО', 'БА', 'КА', 'НА', 'ЗА', 'ЛА', 'РА']);
  await chips.last().click(); await exercise.getByRole('button', { name: '➡️ Следующий слог', exact: true }).click();
  await expect(chips.first()).toHaveAttribute('aria-pressed', 'true');
  await exercise.locator('.breath-go').click(); await input.fill('   '); await input.press('Enter');
  await expect(exercise.getByRole('alert')).toContainText('Введите слог'); await expect(input).toBeFocused();
  await expect(exercise).toHaveAttribute('data-step', '1');
  for (const [draft, result] of [['құ', 'ҚҰ'], ['өң', 'ӨҢ'], ['үй', 'ҮЙ'], ['<b>', '<B>']]) {
    await input.fill(draft); await input.press('Enter'); await expect(input).toHaveValue(result);
    await expect(chips.first()).toHaveText(result); await expect(exercise.locator('.breath-row').last()).toHaveText(result.repeat(6));
  }
  await expect(chips).toHaveCount(12); await expect(exercise.locator('.breath-row b')).toHaveCount(0);
  await expect(exercise).toHaveAttribute('data-step', '0');
  await exercise.getByRole('button', { name: '🎲 Случайный', exact: true }).click();
  expect(await chips.allTextContents()).toContain(await input.inputValue());
  await expect(exercise.locator('.breath-chip[aria-pressed="true"]')).toHaveCount(1); expect(errors).toEqual([]);
});

test('opens from the old address, returns to the breathing menu, and reopens a clean React session', async ({ page }) => {
  const { exercise, screen, errors } = await open(page, 'ru', 'light', true);
  await exercise.getByLabel('Свой слог').fill('ҚҰ'); await exercise.getByLabel('Свой слог').press('Enter');
  await exercise.locator('.breath-row').last().click(); await expect(exercise.locator('.flashed')).toHaveCount(1);
  await exercise.getByRole('button', { name: /Назад/ }).click(); await expect(exercise).toHaveCount(0);
  const menu = page.locator('#grade0TynysByMenu'); await expect(menu).toHaveClass(/active/);
  await menu.locator('[data-destination="g0TynysByOneBreath"]').click();
  await expect(screen.locator('.breath-practice')).toHaveAttribute('data-step', '0');
  await expect(screen.locator('.breath-chip')).toHaveCount(10); await expect(screen.locator('.breath-row').first()).toHaveText('ТА');
  await expect(page.locator('#breathTitle')).toBeFocused();
  expect(await page.evaluate(() => ['openEmbeddedTask', 'closeEmbeddedTask'].some(key => key in window))).toBe(false); expect(errors).toEqual([]);
});

test('changes language without losing a custom syllable or the current row', async ({ page }) => {
  const { exercise, errors } = await open(page); await exercise.getByLabel('Свой слог').fill('ҚҰ'); await exercise.getByLabel('Свой слог').press('Enter');
  await exercise.locator('.breath-go').click(); await exercise.locator('.breath-go').click();
  await page.locator('#top-lang-btn-kk').click(); await expect(page.locator('#breathTitle')).toHaveText('🌬️ Бір тыныспен оқу');
  await expect(exercise).toHaveAttribute('data-step', '2'); await expect(exercise.getByRole('status')).toContainText('Жол 2 / 6');
  await expect(exercise.getByLabel('Өз буыныңыз')).toHaveValue('ҚҰ'); await expect(exercise.locator('.breath-row').nth(1)).toHaveText('ҚҰҚҰ');
  await expect(exercise.locator('.breath-go')).toContainText('Келесі жол'); expect(errors).toEqual([]);
});

for (const reason of ['hidden', 'pagehide', 'grade']) test(`clears temporary row highlighting on ${reason}`, async ({ page }) => {
  const { exercise, errors } = await open(page); await page.clock.install(); await page.clock.pauseAt(new Date());
  await exercise.locator('.breath-go').click(); await exercise.locator('.breath-go').click(); await exercise.locator('.breath-row').first().click();
  await expect(exercise.locator('.flashed')).toHaveCount(1);
  if (reason === 'hidden') await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  if (reason === 'pagehide') await page.evaluate(() => dispatchEvent(new Event('pagehide')));
  if (reason === 'grade') await page.evaluate(() => (window as BreathApp).CorexGrades.selectJunior(1));
  await expect(exercise.locator('.flashed')).toHaveCount(0); await page.clock.runFor(3000);
  await expect(exercise).toHaveAttribute('data-step', reason === 'grade' ? '0' : '2'); expect(errors).toEqual([]);
});

for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) for (const locale of ['kk', 'ru']) {
  test(`one-breath layout fits ${viewport.width}x${viewport.height} ${locale}`, async ({ page }, info) => {
    await page.setViewportSize(viewport); await page.emulateMedia({ reducedMotion: 'reduce' });
    const { exercise, errors } = await open(page, locale, locale === 'ru' ? 'dark' : 'light');
    await exercise.locator('input').fill('ҚҰҢ'); await exercise.locator('input').press('Enter');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const control of await exercise.locator('button:not(:disabled), input').all()) {
      await control.scrollIntoViewIfNeeded();
      const target = await control.evaluate(node => {
        const box = node.getBoundingClientRect(), hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        return { label: node.textContent || node.getAttribute('id'), hit: hit?.outerHTML.slice(0, 200), width: box.width, height: box.height,
          available: box.width >= 44 && box.height >= 44 && (hit === node || node.contains(hit)) };
      });
      expect(target.available, JSON.stringify(target)).toBe(true);
    }
    await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: info.outputPath('breath-ready.png') });
    await exercise.locator('.breath-go').click(); await expect(exercise).toHaveAttribute('data-step', '1');
    await page.screenshot({ path: info.outputPath('breath-reading.png') });
    for (let i = 0; i < 6; i++) await exercise.locator('.breath-go').click();
    await expect(exercise).toHaveAttribute('data-complete', 'true'); await expect(exercise.locator('.breath-row').last()).toHaveText('ҚҰҢ'.repeat(6));
    await page.screenshot({ path: info.outputPath('breath-complete.png'), fullPage: true });
    await exercise.locator('.breath-row').first().click(); await expect(exercise.locator('.breath-row').first()).toHaveClass(/flashed/);
    expect(errors).toEqual([]);
  });
}
