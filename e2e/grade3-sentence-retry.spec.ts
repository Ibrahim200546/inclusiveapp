import { test, expect } from './fixtures';
import { tryFindRadialEntry } from './radial-navigation';

type Data = { grade: number; id: string; steps: { answer: string; stimulus: string }[] };
type App = {
  CorexCurriculumContent: { lessons: Data[] };
  CorexCurriculumUI: {
    open(grade: number, parent: string, category: string): void;
    getState(): { heard: boolean; attempts: number; index: number; solved: boolean };
  };
};

test('grade 3 sentence choice explains the second wrong answer without advancing', async ({ page }) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => {
    localStorage.setItem('profileLang', 'kk');
    localStorage.setItem('locale', 'kk');
    localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true');
  });
  await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
  const targetSentence = await page.evaluate(() => {
    const app = window as unknown as App;
    app.CorexCurriculumUI.open(3, 'grade3Menu', 'comprehension');
    return app.CorexCurriculumContent.lessons.find(lesson => lesson.grade === 3 && lesson.id === 'g3-sentence-choice')!.steps[0].stimulus;
  });
  const entry = await tryFindRadialEntry(page, 'data-lesson', 'g3-sentence-choice');
  expect(entry).not.toBeNull();
  await entry!.click();
  const screen = page.locator('#curriculumPractice');
  const status = screen.locator('.curriculum-feedback');
  const wrong = screen.locator('[data-choice]').filter({ hasNotText: targetSentence }).first();
  const state = () => page.evaluate(() => (window as unknown as App).CorexCurriculumUI.getState());
  await expect(wrong).toBeDisabled();
  await screen.getByRole('button', { name: '🔊 Тыңдау', exact: true }).click();
  await expect.poll(async () => (await state()).heard, { timeout: 60_000 }).toBe(true);
  await wrong.click();
  await expect(status).toContainText('сәйкес емес');
  await expect(status).not.toContainText(targetSentence);
  await page.waitForTimeout(375);
  await wrong.click();
  await expect(status).toContainText(targetSentence);
  await expect.poll(state).toMatchObject({ attempts: 2, index: 0, solved: false });
  await expect(screen.locator('.curriculum-next')).toBeHidden();
  await page.waitForTimeout(375);
  await screen.locator('[data-choice]').filter({ hasText: targetSentence }).click();
  await expect.poll(state).toMatchObject({ attempts: 3, index: 0, solved: true });
});
