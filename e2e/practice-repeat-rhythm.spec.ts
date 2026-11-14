import { test, expect, type Page } from './fixtures';

type RhythmApp = Window & typeof globalThis & { showScreen(screen: string): void; CorexGrades: { selectJunior(grade: number): void }; rhythmContexts: AudioContext[]; stopAllAppAudio(): void; rhythmCaptures: number; rhythmRewards: number; showReward(): void };

async function open(page: Page, locale = 'ru', theme = 'light', standalone = false) {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(({ locale, theme }) => {
    localStorage.setItem('locale', locale); localStorage.setItem('profileLang', locale); localStorage.setItem('theme', theme);
    localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true');
    const app = window as RhythmApp, Native = window.AudioContext; app.rhythmContexts = []; app.rhythmCaptures = 0; app.rhythmRewards = 0;
    app.AudioContext = class extends Native { constructor(options?: AudioContextOptions) { super(options); app.rhythmContexts.push(this); } };
    navigator.mediaDevices.getUserMedia = async () => { app.rhythmCaptures++; throw new Error('No recording in rhythm practice'); };
  }, { locale, theme });
  await page.goto(standalone ? '/original/tasks/povtori_ritm.html' : '/original/index2.html', { waitUntil: 'domcontentloaded' });
  if (standalone) await page.waitForURL('**/index2.html?exercise=repeat-rhythm');
  else await page.evaluate(() => (window as RhythmApp).showScreen('g0TaskRepeatRhythm'));
  await page.evaluate(() => { const app = window as RhythmApp; app.showReward = () => { app.rhythmRewards++; }; });
  const screen = page.locator('#g0TaskRepeatRhythm'), exercise = screen.locator('.rhythm-practice');
  await expect(exercise).toHaveAttribute('data-phase', 'idle'); await expect(screen.locator('iframe')).toHaveCount(0);
  return { screen, exercise, errors };
}
async function sample(page: Page) {
  await page.locator('.rhythm-listen').click(); await expect(page.locator('.rhythm-practice')).toHaveAttribute('data-phase', 'playing');
  await page.clock.runFor(6500); await expect(page.locator('.rhythm-practice')).toHaveAttribute('data-phase', 'repeat');
  return page.locator('.rhythm-sample .rhythm-note').evaluateAll(notes => notes.map(note => ({ time: Number((note as HTMLElement).dataset.time), pad: (note as HTMLElement).dataset.pad! })));
}

test('finishes five original levels using keyboard taps without coins or microphone', async ({ page }) => {
  test.setTimeout(90_000); const { exercise, errors } = await open(page); await page.clock.install(); await page.clock.pauseAt(new Date());
  for (let level = 0; level < 5; level++) for (let round = 1; round <= 3; round++) {
    await expect(exercise).toHaveAttribute('data-level', String(level)); const beats = await sample(page);
    for (let index = 0; index < beats.length; index++) {
      if (index) await page.clock.runFor(beats[index].time - beats[index - 1].time);
      const pads = await page.locator('.rhythm-pad').evaluateAll(items => items.map(item => (item as HTMLElement).dataset.pad));
      await page.keyboard.press(String(pads.indexOf(beats[index].pad) + 1));
    }
    await page.clock.runFor(400); await expect(exercise).toHaveAttribute('data-phase', 'result');
    await expect(page.locator('.rhythm-feedback')).toContainText('Молодец!'); await expect(page.locator('.rhythm-progress')).toHaveAttribute('aria-label', `Выполнено заданий: ${round} / 3`);
    await page.clock.runFor(2800);
  }
  await expect(exercise).toHaveAttribute('data-phase', 'free'); await expect(page.locator('.rhythm-levels .done')).toHaveCount(5);
  expect(await page.evaluate(() => { const app = window as RhythmApp; return [app.rhythmCaptures, app.rhythmRewards]; })).toEqual([0, 0]); expect(errors).toEqual([]);
});

test('replays the same sample, rejects rushed input, and supports native keyboard buttons', async ({ page }) => {
  const { exercise, errors } = await open(page); await page.clock.install(); await page.clock.pauseAt(new Date());
  const beats = await sample(page); await page.keyboard.press('Enter'); await expect(page.locator('.rhythm-answer .rhythm-note')).toHaveCount(1);
  await page.locator('.rhythm-replay').click(); await page.clock.runFor(6500);
  await expect(page.locator('.rhythm-answer .rhythm-note')).toHaveCount(0);
  expect(await page.locator('.rhythm-sample .rhythm-note').evaluateAll(notes => notes.map(note => ({ time: Number((note as HTMLElement).dataset.time), pad: (note as HTMLElement).dataset.pad! })))).toEqual(beats);
  for (const beat of beats) { await page.locator(`.rhythm-pad[data-pad="${beat.pad}"]`).focus(); await page.keyboard.press('Space'); }
  await page.clock.runFor(400); await expect(exercise).toHaveAttribute('data-phase', 'result');
  await expect(page.locator('.rhythm-feedback')).toContainText('Попробуем ещё раз'); await page.clock.runFor(3200);
  await expect(page.locator('.rhythm-listen')).toBeFocused(); expect(errors).toEqual([]);
});

test('touch-style pointer activation produces one beat and free play resets its strip', async ({ page }) => {
  const { exercise, errors } = await open(page); await page.clock.install(); await page.clock.pauseAt(new Date());
  await page.getByRole('button', { name: 'Свободная игра', exact: true }).click();
  for (const pad of await page.locator('.rhythm-pad').all()) await pad.click();
  await expect(page.locator('.rhythm-answer .rhythm-note')).toHaveCount(4); await expect(exercise).toHaveAttribute('data-phase', 'free');
  await page.clock.runFor(6001); await page.locator('.rhythm-pad').first().click(); await expect(page.locator('.rhythm-answer .rhythm-note')).toHaveCount(1); expect(errors).toEqual([]);
});

test('keeps a real sounding context until leaving, then opens a fresh exercise from the menu', async ({ page }) => {
  const { exercise, errors } = await open(page); await page.locator('.rhythm-listen').click();
  await expect(exercise).toHaveAttribute('data-phase', 'repeat'); await expect(page.locator('.rhythm-silent')).toHaveCount(0);
  await page.locator('.rhythm-pad').first().click();
  expect(await page.evaluate(() => (window as RhythmApp).rhythmContexts.at(-1)?.state)).toBe('running');
  await page.locator('.rhythm-back').click(); await expect(exercise).toHaveCount(0);
  expect(await page.evaluate(() => (window as RhythmApp).rhythmContexts.at(-1)?.state)).toBe('closed');
  const menu = page.locator('#grade0SoundsMenu'); await expect(menu).toHaveClass(/active/);
  const next = menu.getByRole('button', { name: 'Следующая страница', exact: true });
  while (!await menu.locator('[data-destination="g0TaskRepeatRhythm"]').isVisible()) await next.click();
  await menu.locator('[data-destination="g0TaskRepeatRhythm"]').click(); await expect(exercise).toHaveAttribute('data-phase', 'idle'); expect(errors).toEqual([]);
});

for (const reason of ['hidden', 'pagehide', 'grade', 'global-stop', 'content', 'level']) test(`cancels a sample on ${reason}`, async ({ page }) => {
  const { exercise, errors } = await open(page); await page.clock.install(); await page.clock.pauseAt(new Date()); await page.locator('.rhythm-listen').click();
  await expect(exercise).toHaveAttribute('data-phase', 'playing'); await page.clock.runFor(400);
  if (reason === 'hidden') await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  if (reason === 'pagehide') await page.evaluate(() => dispatchEvent(new Event('pagehide')));
  if (reason === 'grade') await page.evaluate(() => (window as RhythmApp).CorexGrades.selectJunior(1));
  if (reason === 'global-stop') await page.evaluate(() => (window as RhythmApp).stopAllAppAudio());
  if (reason === 'content') await page.evaluate(() => new Audio('/original/sounds/rhythm/big_drum.mp3').play());
  if (reason === 'level') await page.getByRole('button', { name: 'Уровень 3', exact: true }).click();
  await page.clock.runFor(10_000); await expect(exercise).toHaveAttribute('data-phase', 'idle'); await expect(page.locator('.rhythm-sample .rhythm-note')).toHaveCount(0);
  expect(await page.evaluate(() => (window as RhythmApp).rhythmContexts.at(-1)?.state)).toBe('closed'); expect(errors).toEqual([]);
});

test('keeps visual rhythm available when Web Audio is unsupported', async ({ page }) => {
  const { exercise, errors } = await open(page); await page.clock.install(); await page.clock.pauseAt(new Date());
  await page.evaluate(() => {
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: undefined });
    Object.defineProperty(window, 'webkitAudioContext', { configurable: true, value: undefined });
  });
  const beats = await sample(page); await expect(page.locator('.rhythm-silent')).toContainText('Звук недоступен');
  for (let index = 0; index < beats.length; index++) {
    if (index) await page.clock.runFor(beats[index].time - beats[index - 1].time);
    await page.locator(`.rhythm-pad[data-pad="${beats[index].pad}"]`).click();
  }
  await page.clock.runFor(400); await expect(exercise).toHaveAttribute('data-phase', 'result'); await expect(page.locator('.rhythm-feedback')).toContainText('Молодец!'); expect(errors).toEqual([]);
});

test('changes language during a sample without resetting it, and old task links still work', async ({ page }) => {
  const { exercise, errors } = await open(page, 'ru', 'light', true); await page.clock.install(); await page.clock.pauseAt(new Date());
  await page.locator('.rhythm-listen').click(); await expect(exercise).toHaveAttribute('data-phase', 'playing');
  await page.locator('#top-lang-btn-kk').click(); await expect(page.locator('#rhythmTitle')).toHaveText('Ырғақты қайталау');
  await expect(exercise).toHaveAttribute('data-phase', 'playing'); await page.clock.runFor(6500);
  await expect(page.locator('.rhythm-feedback')).toContainText('Енді сен'); expect(errors).toEqual([]);
});

for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) for (const locale of ['kk', 'ru']) {
  test(`rhythm fits ${viewport.width}x${viewport.height} ${locale}`, async ({ page }, info) => {
    await page.setViewportSize(viewport); await page.emulateMedia({ reducedMotion: 'reduce' }); const { screen, errors } = await open(page, locale, locale === 'ru' ? 'dark' : 'light');
    const initialListen = await page.locator('.rhythm-listen').boundingBox();
    expect(initialListen!.y + initialListen!.height).toBeLessThanOrEqual(viewport.height - (viewport.width <= 768 ? 80 : 0));
    await page.locator('.rhythm-levels button').last().click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const control of await screen.locator('button:not(:disabled)').all()) {
      await control.scrollIntoViewIfNeeded(); expect(await control.evaluate(node => { const box = node.getBoundingClientRect(), hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2); return hit === node || node.contains(hit); })).toBe(true);
    }
    await page.locator('.rhythm-pad').first().click(); await expect(screen.locator('.rhythm-answer .rhythm-note')).toHaveCount(1);
    if (viewport.width <= 768) {
      const pads = await screen.locator('.rhythm-pads').boundingBox(), helper = await page.locator('#aiSpeechToggle').boundingBox();
      if (helper) expect(pads!.x + pads!.width).toBeLessThanOrEqual(helper.x);
    }
    await page.screenshot({ path: info.outputPath('rhythm-free.png') });
    await page.locator('.rhythm-levels button').first().click(); await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: info.outputPath('rhythm-ready.png') });
    await page.screenshot({ path: info.outputPath('rhythm-full.png'), fullPage: true });
    await page.locator('.rhythm-listen').click(); await expect(screen.locator('.rhythm-practice')).toHaveAttribute('data-phase', 'repeat'); expect(errors).toEqual([]);
  });
}
