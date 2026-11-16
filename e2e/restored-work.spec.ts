import { test, expect } from './fixtures';
import { tryFindRadialEntry } from './radial-navigation';

for (const locale of ['kk', 'ru']) for (const width of [360, 1440]) {
  test(`landing and practice boundaries ${locale} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(locale => { localStorage.setItem('locale', locale); localStorage.setItem('profileLang', locale); localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true'); }, locale);
    for (const path of ['/', '/materials', '/program', '/contact', '/results', '/download']) {
      await page.goto(path);
      await expect(page.locator('.landing-mobile-bottom-nav')).toHaveCount(0);
      expect(await page.locator('body').innerText()).not.toMatch(/info@course-example|XXX|будут доступны в полной версии|толық нұсқасында қолжетімді болады/);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
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
    const extended = await tryFindRadialEntry(page, 'data-lesson', 'one-breath-extended');
    expect(extended).not.toBeNull();
    await extended!.click();
    expect(await page.evaluate(() => (window as any).CorexCurriculumUI.getState().grade)).toBe(1);
    await page.locator('#curriculumPractice button').first().click();
    await expect(page.locator('#curriculumCatalog')).toHaveClass(/active/);
  });
}
for (const locale of ['kk', 'ru']) {
  test(`breathing restores separate teacher observation and isolates learners ${locale}`, async ({ page }) => {
    await page.addInitScript(locale => { localStorage.setItem('profileLang', locale); localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true'); }, locale);
    await page.goto('/original/index2.html');
    await page.evaluate(() => { eval("currentUserId = 'restore-a'"); (window as any).openEmbeddedTask('g0TynysByOneBreath', 'tasks/bir_tinispen_oku.html'); });
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
    await page.evaluate(() => { eval("currentUserId = 'restore-b'"); });
    await expect(frame.locator('#prog')).toHaveText('0 / 6');
    await page.evaluate(() => { eval("currentUserId = 'restore-a'"); });
    await expect(frame.locator('#prog')).toHaveText('6 / 6');
    state = await frame.locator('body').evaluate(() => (window as any).CorexTaskState.load('one-breath-reading'));
    expect(state.context).toEqual({ learner: 'restore-a', section: '0-1' });
  });
}
for (const [width, locale] of [[360, 'kk'], [1440, 'ru']] as const) test(`rhythm sample, replay, persistence and learner isolation ${locale} ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript(locale => localStorage.setItem('profileLang', locale), locale);
  await page.clock.install();
  await page.addInitScript(() => {
    localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true');
    (window as any).beats = [];
    Object.defineProperty(navigator, 'vibrate', { value: () => { (window as any).beats.push(performance.now()); return true; } });
  });
  await page.goto('/original/index2.html');
  await page.evaluate(() => { eval("currentUserId = 'rhythm-a'"); (window as any).openEmbeddedTask('g0TaskRepeatRhythm', 'tasks/povtori_ritm.html'); });
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
  expect(state.attempts).toHaveLength(1); expect(state.attempts[0].correct).toBe(true); expect(state.rounds['0']).toBe(1);
  await page.evaluate(() => (window as any).openEmbeddedTask('g0TaskRepeatRhythm', 'tasks/povtori_ritm.html'));
  await expect(frame.locator('#prog')).toHaveText('⭐☆☆');
  await page.evaluate(() => { eval("currentUserId = 'rhythm-b'"); });
  await page.clock.runFor(300);
  await expect(frame.locator('#prog')).toHaveText('☆☆☆');
  await page.evaluate(() => { eval("currentUserId = 'rhythm-a'"); });
  await page.clock.runFor(300);
  await expect(frame.locator('#prog')).toHaveText('⭐☆☆');
});
