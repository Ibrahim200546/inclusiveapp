import { expect, test } from './fixtures';

for (const width of [320, 1440]) test('spatial matrix can place cards at ' + width + ' px', async ({ page }, info) => {
  await page.setViewportSize({ width, height: width === 320 ? 568 : 900 });
  await page.addInitScript(() => { localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true'); });
  await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#mainRadialMenu .radial-center-btn').click();
  await page.locator('#mainRadialMenu [onclick*="grade0Menu"]').click();
  await page.locator('#grade0Menu [onclick*="initSpatialGame"]').click();
  const screen = page.locator('#grade0SpatialMatrixScreen'), pool = screen.locator('#spatialCardsArea');
  await expect(pool.locator('.spatial-card')).toHaveCount(16);
  await screen.locator('.spatial-table').scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('after-' + width + '.png'), fullPage: true });
  const card = pool.locator('#spcard_0_0');
  await card.focus(); await page.keyboard.press('Enter');
  await expect(card).toHaveAttribute('aria-pressed', 'true');
  const wrong = screen.locator('#spatial_0_1');
  await wrong.click(); await expect(card).toHaveAttribute('aria-pressed', 'true');
  await screen.locator('#spatial_0_0').focus(); await page.keyboard.press('Enter');
  await expect(screen.locator('#spatial_0_0 #spcard_0_0')).toBeVisible();
  await expect(pool.locator('.spatial-card')).toHaveCount(15);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});