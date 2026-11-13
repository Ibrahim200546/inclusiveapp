import { expect, test, type Page } from './fixtures';

type App = { showScreen(id: string): void; setLangProfile(lang: string): void; _activeAudios: HTMLAudioElement[] };
const navigate = (page: Page, id: string) => page.evaluate(id => (window as unknown as App).showScreen(id), id);
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const messages: string[] = []; errors.set(page, messages); page.on('pageerror', error => messages.push(error.message));
  await page.addInitScript(() => { localStorage.setItem('profileLang', 'kk'); localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true'); });
  await page.route('**/api/tts', route => route.abort());
  await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
});
test.afterEach(async ({ page }) => { expect(errors.get(page)).toEqual([]); });

for (const locale of ['kk', 'ru']) test(`all reading screens are React-owned and retain their content and routes in ${locale}`, async ({ page }) => {
  await page.evaluate(locale => (window as unknown as App).setLangProfile(locale), locale);
  await expect(page.locator('[data-reading-mode][data-react-owned]')).toHaveCount(4);
  const cases = [
    ['g0TynysByTask', '', locale === 'kk' ? 'Ана бала' : 'Мама мыла', '.tynsby-syllable', 4, 'grade0VoiceMenu'],
    ['g0TynysByTask2', '2', 'ТА', '.tynsby-pyramid-syl2', 8, 'grade0TynysByMenu'],
    ['g0TynysByTask3', '3', locale === 'kk' ? 'Балалар' : 'Машина', '.tynsby-word-row3', 3, 'grade0TynysByMenu'],
    ['g0TynysByTask4', '4', locale === 'kk' ? 'Бала кітап оқыды' : 'Мама читала книгу', '.tynsby-sentence-row4', 3, 'grade0TynysByMenu'],
  ] as const;
  for (const [id, suffix, input, selector, count, back] of cases) {
    await navigate(page, back);
    await navigate(page, id);
    const section = page.locator('#' + id);
    await section.locator(`#tynsbyInput${suffix}`).fill(input);
    await section.locator(`#tynsbyInput${suffix}`).press('Enter');
    await expect(section.locator(selector)).toHaveCount(count);
    await expect(section.locator('[onclick], [oninput], [onkeydown]')).toHaveCount(0);
    await expect(section.locator('.alippe-grid button')).toHaveCount(locale === 'kk' ? 42 : 33);
    if (suffix === '3') await page.screenshot({ path: `test-results/reading-words-${locale}-desktop.png`, animations: 'disabled' });
    await section.locator('.reading-back').click(); await expect(page.locator('#' + back)).toHaveClass(/active/);
    await expect(section.locator('.reading-screen')).toHaveCount(0);
  }
  expect(await page.evaluate(() => ['tynsbyGenerate2', 'tynsbyGenerate3', 'tynsbyGenerate4', 'initAlippe', 'initAlippeLocal', 'CorexSyllableContext']
    .filter(key => key in window))).toEqual([]);
});

test('bundled syllables play to completion and changing class invalidates the teacher mark', async ({ page }) => {
  await navigate(page, 'grade0VoiceMenu'); await navigate(page, 'g0TynysByTask2');
  const section = page.locator('#g0TynysByTask2');
  await section.locator('#tynsbyPresets2 button').first().click();
  await section.locator('#tynsbyPyramid2 button').first().click();
  await expect(section.locator('.learning-context-progress')).toContainText('Үлгі тыңдалды', { timeout: 15000 });
  const confirm = section.getByRole('button', { name: 'Педагог: қайталады' }); await confirm.click();
  await expect(confirm).toBeDisabled(); await expect(section.locator('.learning-context-progress')).toContainText('белгісі сақталды');
  await section.locator('select').selectOption('1'); await expect(confirm).toBeEnabled(); await confirm.click();
  await expect(section.locator('.learning-context-progress')).toContainText('Алдымен');
  await section.locator('#tynsbyListenBtn2').click();
  await navigate(page, 'grade0VoiceMenu');
  await expect.poll(() => page.evaluate(() => (window as unknown as App)._activeAudios.filter(audio => !audio.paused && /syllable-reading/.test(audio.src)).length)).toBe(0);
});

test('AI generation is retryable and a late response cannot replace edited input', async ({ page }) => {
  let release!: () => void; const pending = new Promise<void>(resolve => { release = resolve; });
  let requested = false;
  await page.route('**/api/ai-chat', async route => { requested = true; await pending; await route.fulfill({ json: { reply: '["Бала","Бала ойнады"]' } }).catch(() => {}); });
  await navigate(page, 'g0TynysByTask4');
  await page.locator('#tynsbyPresets4 button').first().click();
  await expect.poll(() => requested).toBe(true); await expect(page.locator('#tynsbyBtn4')).toBeDisabled();
  await page.locator('#tynsbyInput4').fill('Қыз кітап оқыды'); await page.locator('#tynsbyInput4').press('Enter');
  release();
  await expect(page.locator('.tynsby-sentence-row4').last()).toHaveText('Қызкітапоқыды');
  await page.unroute('**/api/ai-chat'); await page.route('**/api/ai-chat', route => route.fulfill({ status: 503, json: {} }));
  await page.locator('#tynsbyPresets4 button').first().click();
  await expect(page.locator('#tynsbyStatus4')).toContainText('ЖИ сөйлем құра алмады'); await expect(page.locator('#tynsbyBtn4')).toBeEnabled();
  await page.unroute('**/api/ai-chat'); await page.route('**/api/ai-chat', route => route.fulfill({ json: { reply: '["Бала","Бала ойнады"]' } }));
  await page.locator('#tynsbyBtn4').click(); await expect(page.locator('.tynsby-sentence-row4')).toHaveCount(2);
});

test('alphabet popup preserves words, keyboard focus and language without duplicate legacy renderers', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await navigate(page, 'grade0Menu');
  const first = page.locator('#grade0Menu .alippe-item').first(); await first.focus(); await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'А', exact: true }); await expect(dialog).toBeVisible();
  await expect(dialog.locator('.alippe-popup-word')).toHaveText(['Алма🔊', 'Ата🔊', 'Ана🔊']);
  await expect(dialog.locator('img')).toHaveAttribute('src', 'assets/mouth/mouth4.png');
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(first).toBeFocused();
  await page.locator('#top-lang-btn-ru').click();
  await expect(page.locator('#grade0Menu .alippe-item')).toHaveCount(33);
  await page.locator('#grade0Menu .alippe-item').first().click();
  await expect(dialog.locator('.alippe-popup-word').first()).toContainText('Арбуз');
  await navigate(page, 'grade0VoiceMenu'); await expect(page.locator('#alippeWordDisplay')).toHaveCount(0);
  await expect(page.locator('#grade0Menu .alippe-panel')).toHaveCount(0);
});

for (const locale of ['kk', 'ru']) test(`reading and alphabet fit a narrow phone in ${locale}`, async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.evaluate(locale => (window as unknown as App).setLangProfile(locale), locale);
  for (const suffix of ['', '2', '3', '4']) {
    await navigate(page, `g0TynysByTask${suffix}`);
    const presets = page.locator(`#tynsbyPresets${suffix} button`);
    await (suffix === '4' ? presets.nth(1) : presets.first()).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const input = await page.locator(`#tynsbyInput${suffix}`).boundingBox();
    expect(input && input.x >= 0 && input.x + input.width <= 320).toBeTruthy();
    if (suffix === '2') await page.screenshot({ path: `test-results/reading-syllables-${locale}-320.png`, animations: 'disabled' });
  }
  await navigate(page, 'g0TynysByTask2');
  await page.locator('.screen.active .alippe-header-button').focus();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('.alippe-grid')))).toBe(false);
  await page.locator('.screen.active .alippe-header-button').click();
  await expect(page.locator('.alippe-focus-card')).toBeVisible();
  await page.locator('[data-alippe-action="next"]').click();
  await expect(page.locator('.alippe-focus-letter')).toHaveText(locale === 'kk' ? 'Ә' : 'Б');
  for (const action of ['back', 'toggle', 'next']) {
    const box = await page.locator(`[data-alippe-action="${action}"]`).boundingBox();
    expect(box && box.x >= 0 && box.x + box.width <= 320 && box.y + box.height <= 568).toBeTruthy();
  }
  await page.screenshot({ path: `test-results/reading-alphabet-${locale}-320.png`, animations: 'disabled' });
  await page.locator('[data-alippe-action="toggle"]').click();
  await expect(page.locator('body')).not.toHaveClass(/alippe-focus-active/);
  await page.locator('.reading-back').click(); await expect(page.locator('#grade0TynysByMenu')).toHaveClass(/active/);
});
