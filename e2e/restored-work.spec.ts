import { test, expect } from './fixtures';
import { tryFindRadialEntry } from './radial-navigation';

for (const locale of ['kk', 'ru']) for (const width of [320, 360, 1440]) {
  test(`landing and practice boundaries ${locale} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(locale => { localStorage.setItem('locale', locale); localStorage.setItem('profileLang', locale); localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true'); }, locale);
    for (const path of ['/', '/materials', '/program', '/contact', '/results', '/download']) {
      await page.goto(path);
      await expect(page.locator('.landing-mobile-bottom-nav')).toHaveCount(0);
      expect(await page.locator('body').innerText()).not.toMatch(/info@course-example|XXX|будут доступны в полной версии|толық нұсқасында қолжетімді болады/);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${locale} ${width} ${path}`).toBeLessThanOrEqual(width + 1);
    }
    await page.goto('/materials');
    await expect(page.locator('a[href="/original/tasks/povtori_ritm.html"]')).toBeVisible();
    await page.goto('/original/index2.html');
    await expect(page.locator('.mobile-bottom-nav')).toHaveCount(1);
    await expect(page.getByRole('combobox', { name: /^(Сынып|Класс)$/ })).toHaveCount(0);
    for (const grade of [0, 2, 3, 4]) {
      await page.evaluate(grade => (window as any).showScreen(`grade${grade}Menu`), grade);
      await expect(page.locator(`#grade${grade}Menu`)).toHaveClass(/active/);
    }
    await page.evaluate(() => (window as any).CorexCurriculumUI.open(0, 'grade0Menu', 'breathing'));
    // 1-деңгей «Тыныс» offers only «Бір тыныспен оқу».
    const breathing = page.locator('#curriculum-lessons .radial-item');
    await expect(breathing).toHaveCount(1);
    await expect(breathing).toHaveAttribute('data-activity', /g0TynysByOneBreath/);
    await breathing.click();
    await expect(page.locator('#g0TynysByOneBreath')).toHaveClass(/active/);
    await page.locator('#g0TynysByOneBreath button').click();
    await expect(page.locator('#curriculumCatalog')).toHaveClass(/active/);
  });
}
for (const locale of ['kk', 'ru']) {
  test(`breathing restores local teacher observations without reading old profile records ${locale}`, async ({ page }) => {
    await page.addInitScript(locale => { localStorage.setItem('profileLang', locale); localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true'); }, locale);
    await page.goto('/original/index2.html');
    await page.evaluate(() => {
      localStorage.setItem('eduCorex.task.v1:' + JSON.stringify(['restore-a', '0-1', 'one-breath-reading']), JSON.stringify({ marker: 'historic' }));
      (window as any).openEmbeddedTask('g0TynysByOneBreath', 'tasks/bir_tinispen_oku.html');
    });
    const frame = page.frameLocator('#g0TynysByOneBreath iframe');
    await expect(frame.locator('html')).toHaveAttribute('lang', locale);
    for (let i = 0; i < 6; i++) await frame.locator('#goBtn').click();
    let state = await frame.locator('body').evaluate(() => (window as any).CorexTaskState.load('one-breath-reading'));
    expect(state.viewed['ТА']).toBe(true); expect(state.reviewed).toEqual({});
    await frame.locator('#teacherBtn').click();
    await expect(frame.locator('#teacherBtn')).toBeDisabled();
    const review = await frame.locator('body').evaluate(() => (window as any).CorexTaskState.load('one-breath-reading').reviewed);
    await page.evaluate(() => (window as any).openEmbeddedTask('g0TynysByOneBreath', 'tasks/bir_tinispen_oku.html'));
    await expect(frame.locator('#prog')).toHaveText('6 / 6');
    await expect(frame.locator('#teacherBtn')).toBeDisabled();
    expect(await frame.locator('body').evaluate(() => (window as any).CorexTaskState.load('one-breath-reading').reviewed)).toEqual(review);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('eduCorex.task.v1:' + JSON.stringify(['restore-a', '0-1', 'one-breath-reading']))!))).toEqual({ marker: 'historic' });
    state = await frame.locator('body').evaluate(() => (window as any).CorexTaskState.load('one-breath-reading'));
    expect(state.context).toEqual({ learner: 'guest', section: '0-1' });
  });
}
for (const [width, locale] of [[360, 'kk'], [1440, 'ru']] as const) test(`local rhythm sample, replay and persistence ${locale} ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript(locale => localStorage.setItem('profileLang', locale), locale);
  await page.clock.install();
  await page.addInitScript(() => {
    localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true');
    (window as any).beats = [];
    Object.defineProperty(navigator, 'vibrate', { value: () => { (window as any).beats.push(performance.now()); return true; } });
  });
  await page.goto('/original/index2.html');
  await page.evaluate(() => (window as any).openEmbeddedTask('g0TaskRepeatRhythm', 'tasks/povtori_ritm.html'));
  const frame = page.frameLocator('#g0TaskRepeatRhythm iframe');
  await frame.locator('#listenBtn').click();
  await page.clock.runFor(5000);
  const beats = await frame.locator('body').evaluate(() => (window as any).beats);
  expect(beats).toHaveLength(3);
  await frame.locator('#replay').click();
  await page.clock.runFor(5000);
  expect(await frame.locator('body').evaluate(() => (window as any).beats.length)).toBe(6);
  for (let i = 0; i < 3; i++) {
    if (i) await page.clock.runFor(beats[i] - beats[i - 1]);
    await frame.locator('.pad').first().click();
  }
  await page.clock.runFor(450);
  const state = await frame.locator('body').evaluate(() => (window as any).CorexTaskState.load('repeat-rhythm'));
  expect(state.context).toEqual({ learner: 'guest', section: '0', grade: 0 });
  expect(state.objectiveLinks).toEqual([{ table: 5, code: '0.1.1.6', coverage: 'supporting' }]);
  expect(state.attempts).toHaveLength(1); expect(state.attempts[0].correct).toBe(true); expect(state.rounds['0']).toBe(1);
  await page.evaluate(() => (window as any).openEmbeddedTask('g0TaskRepeatRhythm', 'tasks/povtori_ritm.html'));
  await expect(frame.locator('#prog')).toHaveText('⭐☆☆');

});

test('embedded rhythm preserves legacy shared history and isolates selected grades', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true');
    localStorage.setItem('eduCorex.task.v1:' + JSON.stringify(['guest', '0-1', 'repeat-rhythm']), JSON.stringify({ marker: 'legacy' }));
  });
  await page.goto('/original/index2.html');
  const frame = page.frameLocator('#g0TaskRepeatRhythm iframe');
  for (const grade of [0, 1, 2]) {
    await page.evaluate(grade => {
      (window as any).CorexGrades.select(grade);
      (window as any).openEmbeddedTask('g0TaskRepeatRhythm', 'tasks/povtori_ritm.html');
    }, grade);
    await expect.poll(() => frame.locator('body').evaluate(() => (window as any).CorexTaskState.context.grade)).toBe(grade);
    await frame.locator('body').evaluate((_, grade) => (window as any).CorexTaskState.save('repeat-rhythm', { rounds: { '0': grade } }), grade);
  }
  for (const grade of [2, 1, 0]) {
    await page.evaluate(grade => { (window as any).CorexGrades.select(grade); }, grade);
    await expect.poll(() => frame.locator('body').evaluate(() => (window as any).CorexTaskState.load('repeat-rhythm').rounds?.['0'])).toBe(grade);
  }
  const legacy = await page.evaluate(() => JSON.parse(localStorage.getItem('eduCorex.task.v1:' + JSON.stringify(['guest', '0-1', 'repeat-rhythm']))!));
  expect(legacy).toEqual({ marker: 'legacy' });
});
