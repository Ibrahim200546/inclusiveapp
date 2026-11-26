import { test, expect } from './fixtures';
import { openGrade, openModule, findRadialEntry } from './radial-navigation';

test('search grade 1 pairs, hear both samples and separately record oral practice', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('profileLang', 'kk'); localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true'); });
  await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
  await openGrade(page, 1);
  await openModule(page, 'grade0Menu', 'phonetics');
  await (await findRadialEntry(page, 'data-lesson', 'pair-0')).click();
  const screen = page.locator('#curriculumPractice'), panel = screen.locator('.curriculum-pair-tools');
  await panel.locator('summary').click();
  await expect(panel.locator('select').first().locator('option')).toHaveCount(33);
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

test('changing the phonetics level stops playback and starts an unheard question', async ({ page }, info) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.addInitScript(() => { localStorage.setItem('profileLang', 'kk'); localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true'); });
  await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
  await openGrade(page, 1);
  await openModule(page, 'grade0Menu', 'phonetics');
  await (await findRadialEntry(page, 'data-lesson', 'pair-0')).click();
  const screen = page.locator('#curriculumPractice'), panel = screen.locator('.curriculum-pair-tools');
  await panel.locator('summary').click();
  await panel.getByRole('searchbox').fill('ө–о');
  await expect(panel.getByLabel('Дыбыс жұбы').locator('option')).toHaveText('О–Ө');
  const level = panel.getByLabel('Деңгей');
  await level.selectOption('sentences');
  await panel.locator('.curriculum-pair-samples button').first().click();
  await expect(screen.locator('.curriculum-feedback')).toHaveText('Тыңдаңыз…');
  await level.selectOption('words');
  await expect(screen.locator('.curriculum-feedback')).toHaveText('Ойнату тоқтатылды. Қайта тыңдауға болады.');
  await expect(panel.locator('.curriculum-pair-samples button')).toHaveText(['🔊 от', '🔊 өт']);
  await panel.getByRole('button', { name: 'Бастау', exact: true }).click();
  await expect(screen.locator('.curriculum-progress')).toHaveText('1 / 2');
  await expect(screen.locator('[data-choice]').first()).toBeDisabled();
  await screen.locator('.curriculum-listen').click();
  await expect(screen.locator('[data-choice]').first()).toBeEnabled();
  await screen.screenshot({ path: info.outputPath('contrast-words-360.png') });
});
