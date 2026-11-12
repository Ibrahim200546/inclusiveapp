import { test, expect } from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true');
    localStorage.setItem('profileLang', 'ru');
    localStorage.setItem('locale', 'ru');
  });
});

test('profile opens the React rating with safe rows and returns with Escape', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  let requests = 0;
  await page.route('**/rest/v1/game_progress?*', async route => {
    requests++;
    await route.fulfill({ json: [
      { coins: 30, profiles: { full_name: '<img src=x onerror="alert(1)">', avatar_url: 'javascript:alert(1)' } },
      { coins: 20, profiles: { full_name: 'Алия' } },
      { coins: 10, profiles: null },
    ] });
  });
  await page.goto('/original/index2.html');
  await page.locator('.top-right-controls .profile-btn').click();
  await page.locator('#profileModal .profile-action-row').filter({ hasText: 'Рейтинг' }).click();
  const dialog = page.locator('#leaderboardModal[data-react-owned="true"]');
  await expect(dialog).toBeVisible();
  await expect(page.locator('#profileModal')).not.toHaveClass(/active/);
  await expect(dialog.locator('.leaderboard-item')).toHaveCount(3);
  await expect(dialog.locator('.lb-rank').first()).toHaveText('🥇');
  await expect(dialog.locator('.lb-name').first()).toHaveText('<img src=x onerror="alert(1)">');
  await expect(dialog.locator('img')).toHaveCount(0);
  await expect(dialog.locator('.lb-coins').first()).toHaveText('🪙 30');
  await expect(dialog.getByRole('button', { name: '← Назад' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('#profileModal')).toHaveClass(/active/);
  await page.locator('#lang-btn-kk').click();
  await page.locator('#profileModal .profile-action-row').filter({ hasText: 'Рейтинг' }).click();
  await expect(dialog.getByText('Көшбасшылар', { exact: true })).toBeVisible();
  await expect(dialog.locator('.leaderboard-item')).toHaveCount(3);
  expect(requests).toBe(2);
  expect(errors).toEqual([]);
});

test('mobile rating retries errors, shows empty state and closes on navigation', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  let requests = 0;
  await page.route('**/rest/v1/game_progress?*', async route => {
    requests++;
    await route.fulfill(requests === 1 ? { status: 503, json: {} } : { json: [] });
  });
  await page.goto('/original/index2.html');
  await page.locator('[data-mobile-nav="reports"]').click();
  const dialog = page.getByRole('dialog', { name: '🏆 Рейтинг' });
  await expect(dialog.getByRole('alert')).toContainText('Ошибка загрузки данных.');
  await dialog.getByRole('button', { name: 'Повторить' }).click();
  await expect(dialog.getByRole('status')).toHaveText('Рейтинга пока нет.');
  expect(requests).toBe(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await dialog.getByRole('button', { name: '← Назад' }).click();
  await page.locator('#profileModal .profile-close-btn').click();
  await page.locator('[data-mobile-nav="progress"]').click();
  await expect(dialog.getByRole('status')).toHaveText('Рейтинга пока нет.');
  expect(requests).toBe(3);
  await page.screenshot({ path: test.info().outputPath('leaderboard-mobile.png') });
  await page.evaluate(() => (window as unknown as { showScreen(id: string): void }).showScreen('grade0Menu'));
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('#grade0Menu')).toHaveClass(/active/);
  await expect(page.locator('#profileModal')).not.toHaveClass(/active/);
});
