import { test, expect } from './fixtures';
for (const width of [320, 375, 768]) {
  test(`graded instrument controls do not overlap at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.addInitScript(() => localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true'));
    await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      (window as unknown as { showScreen(id: string): void }).showScreen('g0Task3');
    });
    const controls = page.locator('#g0Task3 [data-answer]');
    await expect(controls).toHaveCount(3);
    await page.waitForTimeout(1200);
    const result = await controls.evaluateAll(nodes => {
      const boxes = nodes.map(node => node.getBoundingClientRect());
      const intersects = (a: DOMRect, b: DOMRect) => Math.min(a.right,b.right)-Math.max(a.left,b.left)>0.5 && Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>0.5;
      return {
        widths: boxes.map(b => b.width),
        inViewport: boxes.every(b => b.left >= 0 && b.right <= innerWidth),
        overlaps: boxes.some((a,i) => boxes.some((b,j) => i !== j && intersects(a,b))),
        captionsFit: nodes.every(node => { const p=node.querySelector('.exercise-choice-label') || node.lastElementChild!; const b=node.getBoundingClientRect(), r=p.getBoundingClientRect(); return r.left>=b.left && r.right<=b.right && r.top>=b.top && r.bottom<=b.bottom; }),
      };
    });
    expect(result.widths.every(width => width >= 44)).toBe(true);
    expect(result.inViewport).toBe(true);
    expect(result.overlaps).toBe(false);
    expect(result.captionsFit).toBe(true);
    await page.screenshot({ path: `docs/trello-verification/instruments-${width}.png`, fullPage: true });
  });
}
