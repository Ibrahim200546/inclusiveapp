import { test, expect } from './fixtures';

for (const { locale, width, title, practice, contactLink } of [
  { locale: 'ru', width: 1440, title: 'Начать занятия', practice: 'Упражнения', contactLink: 'Открыть на GitHub' },
  { locale: 'kk', width: 320, title: 'Жаттығуды бастау', practice: 'Жаттығулар', contactLink: 'GitHub-та ашу' },
]) {
  test(`local landing, contact and legacy entry (${locale})`, async ({ page }) => {
    const externalRequests: string[] = [];
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(lang => {
      localStorage.setItem('locale', lang);
    }, locale);
    // The landing routes should never require an external API.
    await page.route(url => url.hostname !== '127.0.0.1', route => {
      externalRequests.push(route.request().url());
      return route.abort();
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await expect(page.getByText(/Кіру міндетті|Профильге|Тіркелу|Регистраци|Войти|Авторизаци/i)).toHaveCount(0);
    await expect(page.locator('a[href="/login"], input[type="email"], input[type="password"]')).toHaveCount(0);
    await expect(page.getByRole('link', { name: practice })).toBeVisible();

    await page.goto('/contact');
    await expect(page.getByRole('link', { name: contactLink })).toHaveAttribute('href', 'https://github.com/Ibrahim200546/inclusiveapp');
    await expect(page.locator('main form, a[href="/login"], main input, main textarea')).toHaveCount(0);
    if (width < 400) {
      await page.getByRole('button', { name: 'Навигация мәзірі' }).click();
      await expect(page.locator('#landing-mobile-menu').getByRole('link', { name: practice })).toBeVisible();
      await expect(page.locator('#landing-mobile-menu a[href="/login"]')).toHaveCount(0);
      await page.keyboard.press('Escape');
      await expect(page.locator('#landing-mobile-menu')).toHaveCount(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);

    await page.goto('/');
    expect(externalRequests).toEqual([]);
    await page.getByRole('link', { name: practice }).click();
    await expect(page).toHaveURL(/\/practice$/);
    await expect(page.locator('#levelsScreen')).toHaveClass(/active/);

    await page.goto('/login?email=legacy@example.invalid');
    await expect(page).toHaveURL(/\/practice$/);
    await expect(page.locator('#levelsScreen')).toHaveClass(/active/);
  });
}
