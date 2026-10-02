import { test, expect, type Locator } from '@playwright/test';

async function expectHittable(control: Locator) {
  // Users can scroll short screens; check the control after bringing it into
  // the usable middle of the viewport, away from persistent navigation.
  await control.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest' }));
  await expect.poll(() => control.evaluate(element => {
    const box = element.getBoundingClientRect();
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return box.width > 0 && box.height > 0 && !!hit && element.contains(hit);
  })).toBe(true);
}

const sizes = [
  { width: 320, height: 568 },
  { width: 390, height: 847 },
  { width: 844, height: 390 },
  { width: 1440, height: 900 },
];

for (const viewport of sizes) for (const locale of ['kk', 'ru']) for (const theme of ['light', 'dark']) {
  test(`radial ${viewport.width}x${viewport.height} ${locale} ${theme}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(({ locale, theme }) => {
      localStorage.setItem('locale', locale);
      localStorage.setItem('theme', theme);
      localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true');
    }, { locale, theme });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/original/index2.html');
    const menu = page.locator('#mainRadialMenu');
    const center = menu.locator(':scope > .radial-center-btn');
    const items = menu.locator(':scope > .radial-item');
    await expect(items).toHaveCount(4);
    for (let cycle = 0; cycle < 3; cycle++) {
      await center.click();
      await expect(menu).toHaveClass(/active/);
      // Measure the final orbit. Scrolling during the droplet animation would
      // align the starting position rather than the button's destination.
      await expect.poll(() => menu.evaluate(element => element.getAnimations({ subtree: true })
        .some(animation => animation.playState === 'running'
          && animation.effect?.getTiming().iterations !== Infinity))).toBe(false);
      for (const item of await items.all()) {
        await expectHittable(item);
        await expect.poll(() => item.evaluate(element => {
          const a = element.getBoundingClientRect();
          const b = element.parentElement!.querySelector('.radial-center-btn')!.getBoundingClientRect();
          return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        })).toBe(false);
      }
      await center.click();
      await expect(menu).not.toHaveClass(/active/);
      for (const item of await items.all()) await expect(item).toHaveCSS('pointer-events', 'none');
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

for (const viewport of sizes.filter(size => size.width < 1280)) {
  test(`navigation ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/about');
    const button = page.getByRole('button', { name: 'Toggle menu' });
    await expectHittable(button);
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    const menu = page.locator('#landing-mobile-menu');
    await expectHittable(menu.getByRole('link').last());
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(button).toBeFocused();
    const bottom = page.locator('nav.fixed');
    for (const link of await bottom.getByRole('link').all()) await expectHittable(link);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
