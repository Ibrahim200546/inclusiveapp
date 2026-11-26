import { test, expect } from './fixtures';

test('frontend-only host does not expose former application API routes', async ({ request }) => {
  for (const route of ['/api', '/api/ai-chat', '/api/ai-evaluate', '/api/tts']) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(404);
  }
  const lesson = await request.get('/original/index2.html');
  expect(lesson.ok()).toBe(true);
  expect(await lesson.text()).toContain('levelsScreen');
  const sample = await request.get('/original/sounds/instruments/drum.mp3');
  expect(sample.ok()).toBe(true);
  expect((await sample.body()).byteLength).toBeGreaterThan(1000);
});
