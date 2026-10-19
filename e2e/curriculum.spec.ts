import { test, expect, type Page, type Locator } from './fixtures';

type App = { CorexCurriculumUI: { open(grade: number, parent: string): void; getState(): { grade: number; lesson: string; heard: boolean; solved: boolean; index: number; order: string[]; records: { assessment: string }[] } }; _activeAudios: HTMLAudioElement[]; showScreen(id: string): void };
async function start(page: Page, grade = 0, locale = 'kk') {
  await page.addInitScript(lang => { localStorage.setItem('profileLang', lang); localStorage.setItem('locale', lang); localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true'); }, locale);
  await page.route('**/api/tts', route => route.abort());
  await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(grade => (window as unknown as App).CorexCurriculumUI.open(grade, grade < 2 ? 'grade0Menu' : `grade${grade}Menu`), grade);
}
async function category(page: Page, name: string) { await page.locator('.curriculum-tabs').getByRole('tab', { name, exact: true }).click(); }
async function open(page: Page, id: string) {
  const target = page.locator(`[data-lesson="${id}"]`);
  // Catalogues show four readable orbit choices at a time.
  while (!await target.count() && await page.locator('.curriculum-pager button').count() && await page.locator('.curriculum-pager button').first().isEnabled()) await page.locator('.curriculum-pager button').first().click();
  for (let attempt = 0; attempt < 12 && !await target.count(); attempt++) {
    const forward = page.locator('.curriculum-pager button').last();
    if (!await forward.count() || await forward.isDisabled()) break;
    await forward.click();
  }
  await target.click();
  const items = page.locator('#curriculumPractice .exercise-orbit > button.radial-item');
  for (const item of await items.all()) {
    await expect(item.locator(':scope > .curriculum-orbit-icon')).toHaveCount(1);
    await expect(item.locator(':scope > .curriculum-orbit-caption')).toHaveCount(1);
    await expect(item).toHaveCSS('border-top-width', '0px');
  }
}
async function hear(page: Page) {
  await page.locator('#curriculumPractice').getByRole('button', { name: '🔊 Қайта тыңдау', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as App).CorexCurriculumUI.getState().heard), { timeout: 90000 }).toBe(true);
}
async function choose(page: Page, label: string) { await page.locator('#curriculumPractice .curriculum-options').getByRole('button', { name: label, exact: true }).click(); }
async function next(page: Page) { await page.locator('#curriculumPractice').getByRole('button', { name: 'Келесі', exact: true }).click(); }
async function hittable(control: Locator) {
  // Short screens scroll. Bring controls into the safe middle above the fixed navigation.
  await control.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest' }));
  await expect.poll(() => control.evaluate(node => { const b = node.getBoundingClientRect(), hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return !!hit && node.contains(hit); })).toBe(true);
}

test('all grade menus expose real curriculum entries and return to their own parent', async ({ page }) => {
  await start(page);
  for (const grade of [0, 2, 3, 4]) {
    const parent = `grade${grade}Menu`;
    await page.evaluate(id => (window as unknown as App).showScreen(id), parent);
    const entry = page.locator(`#${parent} .curriculum-entry`); await hittable(entry); await entry.click();
    await expect(page.locator('#curriculumCatalog')).toHaveClass(/active/);
    await expect(page.locator('#curriculumCatalog select')).toHaveValue(String(grade));
    await page.locator('#curriculumCatalog').getByRole('button', { name: '⬅ Артқа', exact: true }).click();
    await expect(page.locator('#' + parent)).toHaveClass(/active/);
  }
});

test('a real story gates responses, keeps wrong questions and saves a completed cycle once', async ({ page }) => {
  test.setTimeout(90000); await start(page); await open(page, 'g01-school-6');
  await expect(page.locator('[data-choice]').first()).toBeDisabled();
  await hear(page); await choose(page, 'Дүкенге');
  await expect(page.locator('.curriculum-feedback')).toContainText('сәйкес емес');
  await expect(page.locator('#curriculumPractice > .curriculum-panel > p').first()).toHaveText('1 / 2');
  await page.waitForTimeout(400); await choose(page, 'Мектепке');
  await expect(page.locator('[data-choice]').first()).toBeDisabled(); await next(page);
  expect(await page.evaluate(() => (window as unknown as App).CorexCurriculumUI.getState().heard)).toBe(true);
  await choose(page, 'Кітап'); await next(page);
  await expect(page.locator('.curriculum-summary')).toContainText('Орындалды: 2. Таңдау: 2. Педагог белгісі: 0. Әрекет: 3.');
  const result = await page.evaluate(() => JSON.parse(localStorage.getItem('eduCorex.curriculum.v1:guest') || '{}'));
  expect(Object.keys(result)).toHaveLength(1); expect(Object.values(result)[0]).toMatchObject({ completed: true, grade: 0, table: 5 });
});

test('exiting mid lesson resumes the next unanswered question and requires listening again', async ({ page }) => {
  test.setTimeout(90000); await start(page); await open(page, 'g01-school-6'); await hear(page); await choose(page, 'Мектепке');
  await page.locator('#curriculumPractice').getByRole('button', { name: '⬅ Тапсырмалар', exact: true }).click();
  await open(page, 'g01-school-6');
  const state = await page.evaluate(() => (window as unknown as App).CorexCurriculumUI.getState());
  expect(state.index).toBe(1); expect(state.heard).toBe(false); expect(state.records).toHaveLength(1);
  await expect(page.locator('[data-choice]').first()).toBeDisabled();
});

test('word syllable count uses real local speech and accepts the approved two-syllable answer', async ({ page }) => {
  await start(page, 2); await category(page, 'Дыбыстар'); await open(page, 'g2-syllable-count'); await hear(page);
  await choose(page, '3'); await expect(page.locator('.curriculum-feedback')).toContainText('сәйкес емес');
  await page.waitForTimeout(400); await choose(page, '2'); await expect(page.locator('.curriculum-feedback')).toContainText('мек–теп — 2 буын');
});

test('a close pair advances through syllables, words and sentences without remote TTS', async ({ page }) => {
  test.setTimeout(90000); await start(page, 1); await category(page, 'Дыбыстар'); await open(page, 'pair-0');
  for (const [i, answer] of ['ма', 'мо', 'алма', 'орамал', 'Бұл — алма.', 'Бұл — орамал.'].entries()) {
    await expect(page.locator('#curriculumPractice .curriculum-panel > p').first()).toHaveText(`${i + 1} / 6`);
    await hear(page); await choose(page, answer); await next(page);
  }
  await expect(page.locator('.curriculum-summary')).toContainText('Орындалды: 6. Таңдау: 6.');
});

test('intonation remains an explicit teacher assessment without microphone access', async ({ page }) => {
  await start(page, 3); await category(page, 'Сөйлеу'); await open(page, 'grade3-intonation');
  await expect(page.getByRole('button', { name: 'Педагог: қайталады', exact: true })).toBeDisabled();
  await page.locator('#top-lang-btn-ru').click();
  await expect(page.getByRole('button', { name: 'Педагог: образец показан', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Педагог: повторил', exact: true })).toBeDisabled();
  await page.locator('#top-lang-btn-kk').click();
  for (const punctuation of ['.', '?', '!']) {
    await expect(page.locator('.curriculum-display')).toHaveText('Ана келді' + punctuation);
    await page.getByRole('button', { name: 'Педагог: үлгі көрсетілді', exact: true }).click();
    await page.getByRole('button', { name: 'Педагог: қайталады', exact: true }).click(); await next(page);
  }
  await expect(page.locator('.curriculum-summary')).toContainText('Таңдау: 0. Педагог белгісі: 3.');
});

test('math keeps addition and multiplication term recognition separate from calculation', async ({ page }) => {
  test.setTimeout(90000); await start(page, 4); await category(page, 'Математика'); await open(page, 'g4-comparison');
  await hear(page); await choose(page, '+'); await next(page); await choose(page, '10'); await next(page);
  await hear(page); await choose(page, '×'); await next(page); await choose(page, '16'); await next(page);
  expect((await page.evaluate(() => (window as unknown as App).CorexCurriculumUI.getState())).index).toBe(4);
});

test('picture ordering checks the whole sequence and moves with actual accessible controls', async ({ page }) => {
  test.setTimeout(90000); await start(page, 2); await open(page, 'g2-unfamiliar-9-pictures'); await hear(page);
  await page.locator('#curriculumPractice').getByRole('button', { name: 'Тексеру', exact: true }).click();
  await expect(page.locator('.curriculum-feedback')).toContainText('сәйкес емес');
  for (const value of ['0', '1', '2', '3']) {
    const target = Number(value);
    while ((await page.evaluate(() => (window as unknown as App).CorexCurriculumUI.getState())).order.indexOf(value) > target) {
      await page.locator(`[data-order-pick="${value}"]`).click();
      await page.locator(`[data-order-value="${value}"] button`).first().click();
    }
  }
  await page.waitForTimeout(400); await page.locator('#curriculumPractice').getByRole('button', { name: 'Тексеру', exact: true }).click();
  await expect(page.locator('.curriculum-feedback')).toContainText('Дұрыс'); await next(page);
  await expect(page.locator('.curriculum-summary')).toContainText('Орындалды: 1');
});

test('real long narration plays unmuted and stops on exit without enabling the next lesson', async ({ page }) => {
  await start(page, 4); await open(page, 'g4-extended-15');
  await page.getByRole('button', { name: '🔊 Қайта тыңдау', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as App)._activeAudios.some(a => a.currentSrc.includes('/curriculum/') && !a.paused && !a.muted && a.volume > 0 && a.currentTime > .1))).toBe(true);
  await page.locator('#curriculumPractice').getByRole('button', { name: '⬅ Тапсырмалар', exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as App)._activeAudios.filter(a => a.currentSrc.includes('/curriculum/')).every(a => a.paused))).toBe(true);
  await open(page, 'g4-familiar-10'); await expect(page.locator('[data-choice]').first()).toBeDisabled();
});

test('language changes translate controls while keeping the approved Kazakh stimulus intact', async ({ page }) => {
  await start(page, 4); await category(page, 'Сөйлем'); await open(page, 'g4-syntax');
  for (const language of ['ru', 'kk', 'ru']) {
    await page.locator('#top-lang-btn-' + language).click();
    await expect(page.locator('.curriculum-display')).toHaveText('Бала кітап оқыды.');
    await expect(page.locator('.curriculum-step-title')).toHaveText('«Бала» — сөйлемнің қай мүшесі?');
    await expect(page.locator('#curriculumPractice').getByRole('button', { name: language === 'ru' ? '⬅ К заданиям' : '⬅ Тапсырмалар', exact: true })).toBeVisible();
  }
});

test('long narration pauses, resumes and stops without credit for an incomplete model', async ({ page }) => {
  await start(page, 4); await open(page, 'g4-extended-15');
  await page.getByRole('button', { name: '🔊 Қайта тыңдау', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as App)._activeAudios.find(a => a.currentSrc.includes('/curriculum/'))?.currentTime || 0)).toBeGreaterThan(.2);
  // The shared registry intentionally removes paused audio. Retain the same
  // native element to verify its clock while paused and after resuming.
  const recording = await page.evaluateHandle(() => (window as unknown as App)._activeAudios.find(a => a.currentSrc.includes('/curriculum/'))!);
  const time = () => recording.evaluate(audio => audio.currentTime);
  await page.getByRole('button', { name: '⏸ Кідірту', exact: true }).click(); const paused = await time();
  await page.waitForTimeout(300); expect(await time()).toBe(paused);
  expect((await page.evaluate(() => (window as unknown as App).CorexCurriculumUI.getState())).heard).toBe(false);
  await page.getByRole('button', { name: '▶ Жалғастыру', exact: true }).click(); await expect.poll(time).toBeGreaterThan(paused + .1);
  expect(await recording.evaluate(audio => (window as unknown as App)._activeAudios.includes(audio))).toBe(true);
  await page.getByRole('button', { name: '⏹ Тоқтату', exact: true }).click();
  await expect(page.locator('[data-choice]').first()).toBeDisabled(); await expect(page.getByRole('button', { name: '🔊 Қайта тыңдау', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '🔊 Қайта тыңдау', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as App)._activeAudios.some(a => a.currentSrc.includes('/curriculum/') && a.currentTime > .1))).toBe(true);
  await page.evaluate(() => (window as unknown as { stopAllAudio(): void }).stopAllAudio());
  await expect(page.getByRole('button', { name: '🔊 Қайта тыңдау', exact: true })).toBeEnabled();
  await expect(page.locator('[data-choice]').first()).toBeDisabled();
});

test('curriculum category tabs support arrow keys, Home and End', async ({ page }) => {
  await start(page, 4); await page.locator('.curriculum-tabs [aria-selected="true"]').focus();
  await page.keyboard.press('ArrowRight'); await expect(page.getByRole('tab', { name: 'Дыбыстар', exact: true })).toBeFocused();
  await page.keyboard.press('End'); await expect(page.getByRole('tab', { name: 'Сөйлем', exact: true })).toBeFocused();
  await page.keyboard.press('Home'); await expect(page.getByRole('tab', { name: 'Түсіну', exact: true })).toBeFocused();
});

test('a late rejection from an old resume cannot cancel a newer lesson recording', async ({ page }) => {
  await start(page, 4); await open(page, 'g4-extended-15');
  await page.getByRole('button', { name: '🔊 Қайта тыңдау', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as App)._activeAudios.some(a => a.currentSrc.includes('/curriculum/') && a.currentTime > .1))).toBe(true);
  const recording = await page.evaluateHandle(() => (window as unknown as App)._activeAudios.find(a => a.currentSrc.includes('/curriculum/'))!);
  await page.getByRole('button', { name: '⏸ Кідірту', exact: true }).click();
  await recording.evaluate(audio => {
    const app = window as unknown as { rejectOldResume?: (error: Error) => void; restoreMediaPlay?: () => void }, original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      if (this === audio) return new Promise<void>((_resolve, reject) => { app.rejectOldResume = reject; });
      return original.call(this);
    };
    app.restoreMediaPlay = () => { HTMLMediaElement.prototype.play = original; };
  });
  await page.getByRole('button', { name: '▶ Жалғастыру', exact: true }).click();
  expect(await page.evaluate(() => typeof (window as unknown as { rejectOldResume?: unknown }).rejectOldResume)).toBe('function');
  await page.locator('#curriculumPractice').getByRole('button', { name: '⬅ Тапсырмалар', exact: true }).click();
  await page.evaluate(() => (window as unknown as { restoreMediaPlay(): void }).restoreMediaPlay());
  await category(page, 'Сөйлем'); await open(page, 'g4-syntax');
  await page.getByRole('button', { name: '🔊 Қайта тыңдау', exact: true }).click();
  await page.evaluate(() => (window as unknown as { rejectOldResume(error: Error): void }).rejectOldResume(new Error('Delayed old resume')));
  await expect.poll(() => page.evaluate(() => (window as unknown as App).CorexCurriculumUI.getState().heard)).toBe(true);
  await expect(page.locator('[data-choice]').first()).toBeEnabled();
});

test('picture ordering remains reachable on a 320px screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 }); await start(page, 2); await open(page, 'g2-unfamiliar-9-pictures');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await hear(page); for (const control of await page.locator('.curriculum-order button:not(:disabled)').all()) await hittable(control);
  await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: 'docs/trello-verification/curriculum-pictures-320.png', fullPage: true });
});

test('dark curriculum uses contrasting text and keeps primary controls reachable', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  await page.setViewportSize({ width: 390, height: 844 }); await start(page, 1); await open(page, 'g01-objects');
  await expect(page.locator('body')).toHaveClass(/theme-dark/);
  await expect(page.locator('#curriculumPractice .curriculum-panel')).toHaveCSS('color', 'rgb(238, 244, 255)');
  await hittable(page.getByRole('button', { name: '🔊 Қайта тыңдау', exact: true }));
  await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: 'docs/trello-verification/curriculum-dark.png', fullPage: true });
});

for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
  test(`curriculum layout and translated controls ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport); await start(page, 4, 'ru');
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    for (const tab of await page.locator('.curriculum-tabs button').all()) await hittable(tab);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await category(page, 'Предложение'); await open(page, 'g4-syntax');
    await expect(page.locator('.curriculum-display')).toHaveText('Бала кітап оқыды.');
    await page.waitForTimeout(200);
    await expect(page.locator('.curriculum-display')).toHaveText('Бала кітап оқыды.');
    await expect(page.locator('.curriculum-step-title')).toContainText('«Бала»');
    for (const control of await page.locator('#curriculumPractice button:visible:not(:disabled)').all()) await hittable(control);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `docs/trello-verification/curriculum-${viewport.width}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); expect(errors).toEqual([]);
  });
}
