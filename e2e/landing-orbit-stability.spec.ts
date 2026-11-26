import { test, expect } from './fixtures';

for (const { width, height } of [{ width: 1021, height: 697 }, { width: 360, height: 740 }, { width: 1021, height: 540 }]) {
  test(`home navigation has stable hit targets at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.addInitScript(() => localStorage.setItem('locale', 'kk'));
    await page.goto('/');
    const cards = page.locator('.landing-nav-card');
    const practice = page.locator('.landing-practice-btn');
    await expect(cards).toHaveCount(7);
    await expect(practice).toBeVisible();

    const layout = () => page.locator('.landing-nav-card, .landing-practice-btn').evaluateAll(elements =>
      elements.map(element => {
        const box = element.getBoundingClientRect();
        return { x: box.x, y: box.y, width: box.width, height: box.height };
      }));
    const initial = await layout();
    await page.waitForTimeout(750);
    expect(await layout()).toEqual(initial);

    const first = await cards.first().boundingBox();
    if (!first) throw new Error('First navigation card is missing');
    if (width > 768 && height > 560) {
      const center = await page.locator('.landing-center-circle').boundingBox();
      if (!center) throw new Error('Practice circle is missing');
      expect(center.x + center.width / 2).toBeCloseTo(width / 2, 1);
      expect(center.y + center.height / 2).toBeCloseTo(height / 2, 1);
      expect(first.y + first.height).toBeLessThan(center.y);
      expect(initial.every(box => box.x >= 0 && box.y >= 0 && box.x + box.width <= width && box.y + box.height <= height)).toBe(true);
    }
    await page.mouse.move(first.x + first.width / 2, first.y + 2);
    await page.waitForTimeout(350);
    expect(await layout()).toEqual(initial);
    await page.mouse.click(first.x + first.width / 2, first.y + 2);
    await expect(page).toHaveURL(/\/about$/);
  });
}
