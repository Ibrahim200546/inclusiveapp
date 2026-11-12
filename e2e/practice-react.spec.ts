import { test, expect } from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true');
    localStorage.setItem('profileLang', 'kk');
    localStorage.setItem('locale', 'kk');
  });
});

test('React class menu keeps four choices and responds to the existing language controls', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/original/index2.html');

  const menu = page.locator('#mainRadialMenu[data-react-owned="true"]');
  const center = menu.locator(':scope > .radial-center-btn');
  const choices = menu.locator(':scope > .radial-item');
  await expect(menu).toHaveCount(1);
  await expect(choices).toHaveCount(4);
  await expect(center).toContainText('Сыныпты');
  await center.click();
  await expect(menu).toHaveClass(/active/);
  await expect(choices.first()).toContainText('Дайындық');

  await page.locator('#top-lang-btn-ru').click();
  await expect(center).toContainText('Выберите');
  await expect(choices.first()).toContainText('Подготовка');
  await expect(choices.nth(1)).toContainText('2 класс');
  await expect(menu).toHaveClass(/active/);

  await page.locator('#top-lang-btn-kk').click();
  await expect(center).toContainText('Сыныпты');
  await expect(choices.first()).toContainText('Дайындық');
  await expect(choices.nth(1)).toContainText('2-сынып');
  expect(errors).toEqual([]);
});

test('keyboard activation opens a legacy grade and returns to the React class menu', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/original/index2.html');

  const menu = page.locator('#mainRadialMenu[data-react-owned="true"]');
  const center = menu.locator(':scope > .radial-center-btn');
  await center.focus();
  await page.keyboard.press('Enter');
  await expect(menu).toHaveClass(/active/);
  await expect(center).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Space');
  await expect(menu).not.toHaveClass(/active/);
  await expect(center).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Enter');

  const firstGrade = menu.locator(':scope > .radial-item').first();
  // Choices become interactive after the opening animation completes.
  await expect(firstGrade).toHaveAttribute('tabindex', '0');
  await firstGrade.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#grade0Menu')).toHaveClass(/active/);
  await expect(page.locator('#levelsScreen')).not.toHaveClass(/active/);

  const back = page.locator('#grade0Menu > .task-flex-container > .task-content-wrapper > .btn-secondary');
  await back.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#levelsScreen')).toHaveClass(/active/);
  await expect(page.locator('#grade0Menu')).not.toHaveClass(/active/);
  await expect(menu).toHaveCount(1);
  await expect(menu.locator(':scope > .radial-item')).toHaveCount(4);
  expect(errors).toEqual([]);
});

test('reloading mounts one React menu with one set of handlers', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/original/index2.html');

  for (let load = 0; load < 3; load++) {
    if (load) await page.reload();
    const menu = page.locator('#mainRadialMenu');
    await expect(menu).toHaveCount(1);
    await expect(menu).toHaveAttribute('data-react-owned', 'true');
    await expect(menu.locator(':scope > .radial-item')).toHaveCount(4);
    const center = menu.locator(':scope > .radial-center-btn');
    await center.click();
    await expect(menu).toHaveClass(/active/);
    await center.click();
    await expect(menu).not.toHaveClass(/active/);
  }
  expect(errors).toEqual([]);
});

test('typed navigation owns showScreen, validates targets and stops audio on leave', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/original/index2.html');

  const result = await page.evaluate(() => {
    type Legacy = Window & { showScreen: (id: string) => void; _activeAudios: HTMLAudioElement[] };
    const app = window as Legacy;
    const audio = new Audio();
    let paused = 0;
    audio.pause = () => { paused++; };
    app._activeAudios.push(audio);

    let reassignment = '';
    try { app.showScreen = () => undefined; } catch (error) { reassignment = (error as Error).message; }
    let unknown = '';
    try { app.showScreen('missingScreen'); } catch (error) { unknown = (error as Error).message; }
    const activeAfterUnknown = document.querySelector('.screen.active')?.id;

    app.showScreen('grade0Menu');
    return {
      paused,
      reassignment,
      unknown,
      activeAfterUnknown,
      active: Array.from(document.querySelectorAll('.screen.active')).map(screen => screen.id),
      header: (document.querySelector('.header') as HTMLElement | null)?.style.display ?? null,
    };
  });

  expect(result.reassignment).toContain('owned by practice navigation');
  expect(result.unknown).toBe('Unknown practice screen: missingScreen');
  expect(result.activeAfterUnknown).toBe('levelsScreen');
  expect(result.paused).toBeGreaterThan(0);
  expect(result.active).toEqual(['grade0Menu']);
  if (result.header !== null) expect(result.header).toBe('none');

  await page.evaluate(() => (window as unknown as { showScreen(id: string): void }).showScreen('levelsScreen'));
  const menu = page.locator('#mainRadialMenu');
  await expect(page.locator('#levelsScreen')).toHaveClass(/active/);
  await expect(menu.locator(':scope > .radial-center-btn')).toHaveAttribute('tabindex', '0');
  expect(errors).toEqual([]);
});
