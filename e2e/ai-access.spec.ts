import { test, expect } from './fixtures';
import { openGrade, openModule, findRadialEntry } from './radial-navigation';

test('legacy practice does not use old cloud credentials and works with all backend requests denied', async ({ page }) => {
  test.setTimeout(120_000);
  const blocked: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/') || (['https:', 'http:'].includes(url.protocol) && !['127.0.0.1', 'localhost'].includes(url.hostname))) {
      blocked.push(url.origin + url.pathname);
      return route.abort();
    }
    return route.fallback();
  });
  await page.addInitScript(() => {
    localStorage.setItem('profileLang', 'ru');
    localStorage.setItem('locale', 'ru');
    localStorage.setItem('sb-mmugalgqdapidqqxekqt-auth-token', JSON.stringify({
      access_token: 'unused-mock-token',
      user: { id: 'cloud-fixture', email: 'cloud-fixture@example.invalid' },
      expires_at: 2147483647,
    }));
    if (!localStorage.getItem('eduCorex.learning.v1:guest')) {
      localStorage.setItem('eduCorex.learning.v1:guest', JSON.stringify({
        'grade:1:table:7:listening:weak-strong': { grade: 1, completed: 3 },
      }));
    }
  });
  await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-mobile-nav="ai"], [data-mobile-nav="reports"], #profileLoginBtn, #profileLogoutBtn, #aiChatToggle, #leaderboardModal')).toHaveCount(0);
  await expect(page.locator('#coinCount, #profileModal, [data-mobile-nav="profile"]')).toHaveCount(0);
  await page.locator('[data-mobile-nav="progress"]').click();
  await expect(page.locator('#localProgressModal')).toBeVisible();
  await expect(page.locator('#localProgressList')).toContainText('1 класс: 1');
  await page.locator('#localProgressClose').click();

  await openGrade(page, 0);
  await openModule(page, 'grade0Menu', 'math');
  await (await findRadialEntry(page, 'data-activity', 'learningHubScreen:0')).click();
  const practice = page.locator('#learningPracticeScreen');
  const numberButtons = practice.locator('.learning-number-grid button[data-number]');
  await expect(numberButtons).toHaveCount(10);
  for (let i = 0; i < 10; i++) {
    let correct = 0;
    await expect.poll(async () => {
      correct = await page.evaluate(() => {
        const audios = (window as unknown as { _activeAudios: HTMLAudioElement[] })._activeAudios;
        const audio = audios?.find(item => item.currentSrc.includes('/find-number/') && !item.paused && !item.ended);
        return Number(audio?.currentSrc.match(/ru-(\d+)\.mp3/)?.[1] || 0);
      });
      return correct;
    }).toBeGreaterThan(0);
    await expect(numberButtons.first()).toBeEnabled({ timeout: 15000 });
    await practice.locator(`button[data-number="${correct}"]`).click();
    await practice.getByRole('button', { name: 'Далее', exact: true }).click();
  }
  await expect(practice.locator('.learning-summary')).toContainText('Выполнено: 10');
  await expect(page.locator('#rewardModal')).toBeVisible();
  expect(await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('eduCorex.learning.v1:guest') || '{}');
    return Object.values(saved).filter((v): v is { objective: string; grade: number; completed: number } =>
      !!v && (v as { objective?: string }).objective === 'numbers');
  })).toEqual([expect.objectContaining({ grade: 0, completed: 10 })]);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-mobile-nav="progress"]').click();
  await expect(page.locator('#localProgressList')).toContainText('0 класс: 1');
  await expect(page.locator('#localProgressList')).toContainText('1 класс: 1');
  await expect(page.locator('#localProgressSummary')).toContainText('Записи прогресса: 2');
  expect(await page.evaluate(() => localStorage.getItem('sb-mmugalgqdapidqqxekqt-auth-token'))).toContain('unused-mock-token');
  const localTts = await page.evaluate(async () => {
    const app = window as unknown as { appTts: { speakText(s: string): Promise<{ reason: string }> } };
    return (await app.appTts.speakText('Тестовая строка, которой нет в локальных материалах')).reason;
  });
  expect(localTts).toBe('missing_local_audio');
  expect(blocked).toEqual([]);
  expect(errors).toEqual([]);
});
