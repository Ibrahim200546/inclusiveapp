import { test, expect } from './fixtures';

test.beforeEach(async ({ page }) => {
  // All remote services stay blocked; only the local mocked API may run.
  await page.route('https://**', route => route.abort());
  await page.addInitScript(() => localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true'));
  await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
});

test('legacy evaluation sends the signed-in session to the local API', async ({ page }) => {
  const authorizations: string[] = [];
  await page.route('**/api/ai-evaluate', route => {
    authorizations.push(route.request().headers().authorization);
    return route.fulfill({ json: { score: 90, feedback: 'Test feedback' } });
  });
  const result = await page.evaluate(async () => {
    const app = window as any;
    localStorage.setItem(app.INCLUSIVE_SUPABASE_AUTH_STORAGE_KEY || 'sb-mmugalgqdapidqqxekqt-auth-token', JSON.stringify({
      access_token: 'test-session-token', user: { id: 'test-user' }, expires_at: Math.floor(Date.now() / 1000) + 3600,
    }));
    return app.getAIEvaluation('Hi', 'Hi');
  });
  expect(result.score).toBe(90);
  expect(authorizations).toEqual(['Bearer test-session-token']);
});

test('legacy signed-out evaluation cannot reach the API', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/ai-evaluate', route => { requests++; return route.abort(); });
  const result = await page.evaluate(async () => {
    try { await (window as any).getAIEvaluation('Hi', 'Hi'); return ''; }
    catch (error) { return (error as Error).message; }
  });
  expect(result).toContain('Войдите'); expect(requests).toBe(0);
});
