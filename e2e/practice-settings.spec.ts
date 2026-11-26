import { test, expect } from './fixtures';

for (const [width, height] of [[320, 568], [1021, 697]] as const) {
  test(`one gear opens only language and theme, with no account or coins at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.addInitScript(() => { if (!localStorage.getItem('locale')) localStorage.setItem('locale', 'kk'); });
    await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
    const gear = page.locator('#settingsToggle');
    const panel = page.locator('.practice-settings-panel');
    await expect(gear).toBeVisible();
    await expect(gear).toHaveAccessibleName('Баптаулар');
    await expect(panel).toBeHidden();
    await expect(page.locator('#profileModal, #topProfileImg, .coins-display, [data-mobile-nav="profile"]')).toHaveCount(0);
    await expect(page.locator('#rewardModal')).not.toContainText(/🪙|\+10/);
    await gear.focus();
    await page.keyboard.press('Enter');
    await expect(panel).toBeVisible();
    const bounds = await panel.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    await expect(panel.locator('input,button')).toHaveCount(3);
    await panel.getByRole('checkbox', { name: 'Қараңғы тақырып' }).check();
    await expect(page.locator('body')).toHaveClass(/theme-dark/);
    await panel.getByRole('button', { name: 'Русский', exact: true }).click();
    await expect(panel).toBeHidden();
    await expect(gear).toHaveAccessibleName('Настройки');
    await expect(gear).toBeFocused();
    await gear.click();
    await expect(panel.getByRole('button', { name: 'Русский' })).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    await expect(page.locator('body')).toHaveClass(/theme-dark/);
    await expect(panel).toBeHidden();
  });
}
