import { test, expect } from './fixtures';
import { openGrade, openModule, findRadialEntry } from './radial-navigation';

for (const [locale, width, sourceGrade] of [['kk', 360, 0], ['ru', 1440, 1]] as const) {
  test(`junior intonation distinguishes . and ? with a teacher and no microphone ${locale}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(lang => {
      localStorage.setItem('profileLang', lang);
      localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true');
      let micRequests = 0;
      Object.defineProperty(window, 'card07MicRequests', { get: () => micRequests });
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async () => {
        micRequests++; throw new Error('test: microphone should not be requested');
      } });
    }, locale);
    await page.goto('/original/index2.html');
    const menu = await openGrade(page, 0);
    await openModule(page, menu, 'speech');
    const id = sourceGrade === 0 ? 'junior-intonation' : 'junior-intonation-variant-1';
    await (await findRadialEntry(page, 'data-lesson', id)).click();
    const practice = page.locator('#curriculumPractice');
    await expect(practice).toHaveClass(/active/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    const response = practice.locator('.curriculum-options > button');
    const model = response.nth(0), confirmation = response.nth(1);
    const next = practice.locator('.curriculum-next');
    for (const text of ['Ана келді.', 'Ана келді?']) {
      await expect(practice.locator('.curriculum-display')).toHaveText(text);
      await expect(confirmation).toBeDisabled();
      await expect(practice.locator('.curriculum-listen')).toBeHidden();
      await model.click();
      await expect(confirmation).toBeEnabled();
      await expect(next).toBeHidden();
      await confirmation.click();
      const reward = page.locator('#rewardModal');
      if (await reward.isVisible()) await reward.locator('button').first().click();
      await next.click();
    }
    await expect(practice.locator('.curriculum-summary')).toContainText(locale === 'ru' ? 'Отметка педагога: 2' : 'Педагог белгісі: 2');
    expect(await page.evaluate(() => (window as unknown as { card07MicRequests: number }).card07MicRequests)).toBe(0);
    await page.screenshot({ path: info.outputPath('junior-intonation.png') });
    await practice.locator('.curriculum-toolbar button').first().click();
    await expect(page.locator('#curriculumCatalog')).toHaveClass(/active/);
  });
}

test('junior breathing menu shows only the paced contiguous rows and keeps teacher review separate', async ({ page }, info) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.addInitScript(() => {
    localStorage.setItem('profileLang', 'kk');
    localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true');
  });
  await page.goto('/original/index2.html');
  const menu = await openGrade(page, 0);
  await openModule(page, menu, 'breathing');
  const breathing = page.locator('#curriculum-lessons [data-activity]');
  await expect(breathing).toHaveCount(1);
  await breathing.click();
  const frame = page.frameLocator('#g0TynysByOneBreath iframe');
  await expect(frame.locator('html')).toHaveAttribute('lang', 'kk');
  const review = frame.locator('#teacherBtn');
  for (const row of ['ТА', 'ТАТА', 'ТАТАТА']) {
    await frame.locator('#goBtn').click();
    await expect(frame.locator('[aria-current="step"]')).toHaveText(row);
    await expect(review).toBeDisabled();
  }
  await page.screenshot({ path: info.outputPath('junior-breathing.png') });
  await page.locator('#g0TynysByOneBreath button').click();
  await expect(page.locator('#curriculumCatalog')).toHaveClass(/active/);
});
