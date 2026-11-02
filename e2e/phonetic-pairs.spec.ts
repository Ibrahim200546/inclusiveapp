import { test, expect } from './fixtures';

test('search grade 1 pairs, hear both samples and separately record oral practice', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('profileLang', 'kk'); localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true'); });
  await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    type App = { CorexCurriculumContent: { lessons: { grade: number; id: string }[] }; CorexCurriculumUI: { openLesson(item: unknown, menu: string): void } };
    const app = window as unknown as App;
    app.CorexCurriculumUI.openLesson(app.CorexCurriculumContent.lessons.find(l => l.grade === 1 && l.id === 'pair-0'), 'grade0SoundsMenu');
  });
  const screen = page.locator('#curriculumPractice'), panel = screen.locator('.curriculum-pair-tools');
  await panel.locator('summary').click();
  await expect(panel.locator('select').first().locator('option')).toHaveCount(30);
  await panel.getByRole('searchbox').fill('о-ө');
  await expect(panel.locator('select').first().locator('option')).toHaveCount(1);
  await panel.getByLabel('Деңгей').selectOption('words');
  const samples = panel.locator('.curriculum-pair-samples button');
  await expect(samples).toHaveCount(2);
  for (const sample of await samples.all()) {
    await sample.click(); await expect(screen.locator('.curriculum-feedback')).toContainText('Енді тапсырманы');
    await expect(screen.locator('[data-choice]').first()).toBeDisabled();
  }
  await panel.getByLabel('Тапсырма', { exact: true }).selectOption('repeat');
  await panel.getByRole('button', { name: 'Бастау', exact: true }).click();
  const repeat = screen.getByRole('button', { name: /Педагог: қайталады/ });
  await expect(repeat).toBeDisabled(); await screen.locator('.curriculum-listen').click(); await expect(repeat).toBeEnabled(); await repeat.click();
  expect(await page.evaluate(() => {
    const progress = JSON.parse(localStorage.getItem('eduCorex.curriculum.v1:guest') || '{}');
    return Object.keys(progress).some(key => key.endsWith('pair-4/words/repeat') && progress[key].results[0].assessment === 'teacher');
  })).toBe(true);
});
