import { expect, test, type Page } from './fixtures';

type App = { showScreen(id: string): void; CorexGrades: { current: number; parent: string } };
const navigate = (page: Page, id: string) => page.evaluate(id => (window as unknown as App).showScreen(id), id);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('profileLang', 'kk');
    localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true');
  });
  await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
});

test('React owns ten menus and preserves grade, page and lesson routes through translation', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await expect(page.locator('[data-grade-menu-root] .radial-menu-container[data-react-owned]')).toHaveCount(10);
  await expect(page.locator('[data-grade-menu-root] [onclick]')).toHaveCount(0);
  await expect(page.locator('script[src*="/js/grade-menu.js"]')).toHaveCount(0);
  await expect(page.locator('[data-curriculum-id]')).toHaveCount(115);
  await navigate(page, 'grade0Menu');
  await page.locator('#grade0Menu select').selectOption('1');
  await page.locator('#grade0Menu [data-destination="learningHubScreen"]').click();
  const hub = page.locator('#learningHubScreen');
  await expect(hub.locator('select')).toHaveValue('1');
  const next = hub.locator('.grade-menu-pages button').last();
  await next.click();
  const ids = await hub.locator('.radial-item:visible').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-curriculum-id')));
  const position = await hub.locator('.grade-menu-pages span').textContent();
  await page.locator('#top-lang-btn-ru').click();
  await expect(hub.locator('.grade-menu-pages span')).toHaveText(position!);
  expect(await hub.locator('.radial-item:visible').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-curriculum-id')))).toEqual(ids);
  const lesson = hub.locator('[data-curriculum-id]:visible').first();
  const title = await lesson.locator('p').textContent();
  await lesson.click();
  await expect(page.locator('#curriculumPractice')).toHaveClass(/active/);
  await page.locator('#curriculumPractice .curriculum-toolbar button').first().click();
  await expect(hub).toHaveClass(/active/);
  await expect(hub.locator('.grade-menu-pages span')).toHaveText(position!);
  await expect(lesson.locator('p')).toHaveText(title!);
  await hub.locator('select').selectOption('0');
  await expect(hub.locator('.grade-menu-pages span')).toHaveText(/^1 \/ /);
  await hub.locator('select').selectOption('1');
  await expect(hub.locator('.grade-menu-pages span')).toHaveText(position!);
  await navigate(page, 'grade3Menu');
  await navigate(page, 'grade0SoundsMenu');
  expect(await page.evaluate(() => (window as unknown as App).CorexGrades.current)).toBe(3);
  await page.locator('#grade0SoundsMenu > .task-flex-container > .task-content-wrapper > button').click();
  await expect(page.locator('#grade3Menu')).toHaveClass(/active/);
  await navigate(page, 'grade0Menu');
  await expect(page.locator('#grade0Menu select')).toHaveValue('1');
  expect(await page.evaluate(() => (window as unknown as App).CorexGrades.current)).toBe(1);
  expect(errors).toEqual([]);
});

test('collapsed, hidden and inactive menu choices stay out of keyboard navigation', async ({ page }) => {
  await navigate(page, 'grade0Menu');
  await page.locator('#grade0Menu [data-destination="grade0DauyspenmMenu"]').click();
  const voice = page.locator('#grade0DauyspenmMenu');
  const center = voice.locator('.radial-center-btn');
  await expect(center).toHaveAttribute('aria-expanded', 'false');
  expect(await voice.locator('.radial-item').evaluateAll(nodes => nodes.every(node => node.getAttribute('tabindex') === '-1'))).toBe(true);
  await center.focus(); await page.keyboard.press('Enter');
  await expect(voice.locator('.radial-item[tabindex="0"]')).toHaveCount(5);
  const next = voice.locator('.grade-menu-pages button').last();
  await next.click();
  expect(await voice.locator('.radial-item[hidden]').evaluateAll(nodes => nodes.every(node => node.getAttribute('tabindex') === '-1' && node.getAttribute('aria-hidden') === 'true'))).toBe(true);
  await voice.locator('button[data-destination="grade0Menu"]').click();
  await expect(voice.locator('[tabindex="0"]')).toHaveCount(0);
  await page.locator('#grade0Menu [data-destination="grade0DauyspenmMenu"]').click();
  await expect(center).toHaveAttribute('aria-expanded', 'false');
  await expect(voice.locator('.grade-menu-pages span')).toHaveText(/^1 \/ /);
});

test('switching grade during a menu animation cancels stale choices', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await navigate(page, 'learningHubScreen');
  const hub = page.locator('#learningHubScreen');
  await hub.locator('.radial-center-btn').click();
  await hub.locator('select').selectOption('1');
  await expect(hub.locator('.radial-center-btn')).toHaveAttribute('aria-expanded', 'false');
  await hub.locator('.radial-center-btn').click();
  await expect(hub.locator('.radial-item[tabindex="0"]')).toHaveCount(5);
  await hub.locator('.grade-menu-pages button').last().click();
  expect(await hub.locator('[data-curriculum-id]:visible').evaluateAll(nodes => nodes.every(node => node.getAttribute('data-grade') === '1'))).toBe(true);
  await expect(hub.locator('.radial-item[hidden]:visible')).toHaveCount(0);
});
