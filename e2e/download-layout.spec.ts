import { test, expect } from './fixtures';

const releaseBase = 'https://github.com/Ibrahim200546/inclusiveapp/releases';
const release = {
  tag_name: 'apps-latest', name: 'Edu CoreX v1.1.137',
  html_url: `${releaseBase}/tag/apps-latest`, published_at: '2026-11-12T00:00:00Z',
  draft: false, prerelease: false,
  body: `Latest build: v1.1.137\nCommit: 404ca73c5e986f0b8c71f0330dd587d97dfcf32a\nFull versioned release: ${releaseBase}/tag/v1.1.137`,
  assets: ['Edu-CoreX-Android.apk', 'Edu-CoreX-Setup.exe'].map(name => ({
    name, browser_download_url: `${releaseBase}/download/apps-latest/${name}`, size: 91 * 1024 * 1024,
  })),
};

for (const locale of ['kk', 'ru']) for (const width of [320, 360, 1440]) {
  test(`download release content fits ${locale} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(locale => localStorage.setItem('locale', locale), locale);
    await page.route('https://api.github.com/repos/Ibrahim200546/inclusiveapp/releases**', route =>
      route.fulfill({ json: route.request().url().endsWith('/tags/apps-latest') ? release : [{ ...release, tag_name: 'v1.1.137' }] }));
    await page.goto('/download');
    await expect(page.locator('section[aria-busy]')).toHaveAttribute('aria-busy', 'false');
    await expect(page.locator('#latest-download-title')).toHaveText(release.name);
    await expect(page.getByText(`Commit: 404ca73c5e986f0b8c71f0330dd587d97dfcf32a`, { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    // Check inner boxes too: hiding document overflow must not make this pass.
    for (const element of await page.locator('main section, main aside, main a, main aside .grid > div').all()) {
      const bounds = await element.evaluate(el => {
        const rect = el.getBoundingClientRect();
        return { left: rect.left, right: rect.right, scroll: el.scrollWidth, client: el.clientWidth };
      });
      expect(bounds.left).toBeGreaterThanOrEqual(0);
      expect(bounds.right).toBeLessThanOrEqual(width + 1);
      expect(bounds.scroll).toBeLessThanOrEqual(bounds.client + 1);
    }
    for (const asset of release.assets) await expect(page.locator(`main a[href="${asset.browser_download_url}"]`)).toBeVisible();
    if (width < 1280) {
      const button = page.getByRole('button', { name: locale === 'kk' ? 'Навигация мәзірі' : 'Меню навигации', exact: true });
      await expect(button).toHaveAttribute('aria-controls', 'landing-mobile-menu');
      await expect(button).toHaveAttribute('aria-expanded', 'false');
      await button.click();
      await expect(button).toHaveAttribute('aria-expanded', 'true');
      await page.locator('#landing-mobile-menu a[href="/materials"]').click();
      await expect(page).toHaveURL(/\/materials$/);
      await expect(page.locator('#landing-mobile-menu')).toHaveCount(0);
    }
  });
}
