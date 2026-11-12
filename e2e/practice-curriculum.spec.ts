import { test, expect } from './fixtures';

test('React owns curriculum screens, retains choices on translation and ignores a closed recording', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => { localStorage.setItem('profileLang', 'kk'); localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true'); });
  await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    type App = { CorexCurriculumUI: { open(grade: number, parent: string): void } };
    (window as unknown as App).CorexCurriculumUI.open(0, 'grade0Menu');
  });
  const catalog = page.locator('#curriculumCatalog'), practice = page.locator('#curriculumPractice');
  await expect(catalog.locator('.curriculum-panel')).toHaveAttribute('data-react-owned', 'true');
  await expect(page.locator('script[src*="curriculum-session.js"], script[src*="curriculum-ui.js"]')).toHaveCount(0);
  await catalog.locator('[data-lesson="g01-objects"]').click();
  await expect(practice.locator('.curriculum-panel')).toHaveAttribute('data-react-owned', 'true');
  const choices = await practice.locator('[data-choice]').evaluateAll(nodes => nodes.map(node => [node.getAttribute('data-choice'), node.getAttribute('style')]));
  const firstPrompt = await practice.locator('.curriculum-step-title').innerText();
  for (const locale of ['ru', 'kk', 'ru']) {
    await page.locator('#top-lang-btn-' + locale).click();
    await expect(practice.locator('.curriculum-step-title')).toHaveText(firstPrompt);
    expect(await practice.locator('[data-choice]').evaluateAll(nodes => nodes.map(node => [node.getAttribute('data-choice'), node.getAttribute('style')]))).toEqual(choices);
  }
  await practice.locator('.curriculum-listen').click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { _activeAudios: HTMLAudioElement[] })._activeAudios.some(audio => audio.currentSrc.includes('/curriculum/') && !audio.paused))).toBe(true);
  const recording = await page.evaluateHandle(() => (window as unknown as { _activeAudios: HTMLAudioElement[] })._activeAudios.find(audio => audio.currentSrc.includes('/curriculum/'))!);
  await practice.locator('.curriculum-toolbar button').first().click();
  await expect(practice.locator('.curriculum-panel')).toHaveCount(0);
  await catalog.locator('[data-lesson="g01-objects"]').click();
  await recording.evaluate(audio => { audio.dispatchEvent(new Event('ended')); audio.dispatchEvent(new Event('error')); });
  await expect(practice.locator('[data-choice]').first()).toBeDisabled();
  await expect(practice.locator('.curriculum-feedback')).toHaveText('Сначала полностью прослушайте образец.');
  await expect(practice.locator('h2')).toBeFocused();
  await page.locator('#top-lang-btn-kk').click();
  await practice.locator('.curriculum-listen').click();
  await expect(practice.locator('[data-choice]').first()).toBeEnabled();
  await practice.locator('[data-choice="кітап"]').click();
  await practice.getByRole('button', { name: 'Келесі', exact: true }).click();
  await expect(practice.locator('h2')).toBeFocused();
  await expect(practice.locator('[data-choice]').first()).toBeDisabled();
  expect(errors).toEqual([]);
});

test('a teacher control that does not apply to an audio lesson stays hidden during orbit animation', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('profileLang', 'kk'); localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true'); });
  await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    type Lesson = { steps: { kind: string; audio?: string; teacherModel?: boolean }[] };
    const app = window as unknown as { CorexCurriculumContent: { lessons: Lesson[] }; CorexCurriculumUI: { openLesson(lesson: Lesson): void } };
    app.CorexCurriculumUI.openLesson(app.CorexCurriculumContent.lessons.find(lesson => lesson.steps[0].kind === 'teacher' && lesson.steps[0].audio && !lesson.steps[0].teacherModel)!);
  });
  const orbit = page.locator('#curriculumPractice .exercise-orbit'), model = orbit.locator('[aria-label="Педагог: үлгі көрсетілді"]');
  await expect(model).toBeHidden();
  await orbit.locator('.radial-center-btn').click();
  expect(await model.evaluate(node => getComputedStyle(node).display)).toBe('none');
  await expect(orbit).not.toHaveClass(/active/);
  await orbit.locator('.radial-center-btn').click();
  expect(await model.evaluate(node => getComputedStyle(node).display)).toBe('none');
  await expect(orbit).toHaveClass(/active/);
  await expect(model).toHaveAttribute('tabindex', '-1');
});
