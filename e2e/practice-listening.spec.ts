import { test, expect } from './fixtures';

type ListeningProbe = Window & {
  practiceListening: { open(mode: string): void };
  showScreen(id: string): void;
  clips: { audio: HTMLMediaElement; resolve(): void; reject(error: Error): void }[];
};

test('React listening keeps the question on language change and ignores media from a closed screen', async ({ page }) => {
  const errors: string[] = [], scripts: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.resourceType() === 'script') scripts.push(request.url()); });
  await page.addInitScript(() => {
    localStorage.setItem('profileLang', 'kk'); localStorage.setItem('locale', 'kk');
    localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true');
    const app = window as ListeningProbe; app.clips = [];
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (!this.src.includes('/find-number/')) return play.call(this);
      return new Promise<void>((resolve, reject) => app.clips.push({ audio: this, resolve, reject }));
    };
  });
  await page.route('**/api/tts', route => route.abort());
  await page.goto('/original/index2.html');
  await page.evaluate(() => (window as ListeningProbe).practiceListening.open('numbers'));
  const lesson = page.locator('#learningPracticeScreen'), choices = lesson.locator('[data-answer]');
  await expect(lesson.locator('.learning-wrap')).toHaveAttribute('data-react-owned', 'true');
  await expect(choices).toHaveCount(10); await expect(choices.first()).toBeDisabled();
  const original = await choices.evaluateAll(nodes => nodes.map(node => ({ value: node.getAttribute('data-answer'), style: node.getAttribute('style') })));
  await page.locator('#practiceTopControlsRoot [data-lang="ru"]').click();
  await expect(lesson.getByRole('heading')).toHaveText('Найди число');
  await page.evaluate(() => {
    const clip = (window as ListeningProbe).clips[0];
    clip.audio.dispatchEvent(new Event('ended')); clip.reject(new Error('Old language request failed'));
  });
  await expect(choices.first()).toBeDisabled();
  await expect(lesson.getByRole('status')).toHaveText('Послушайте и выберите.');
  expect(await choices.evaluateAll(nodes => nodes.map(node => ({ value: node.getAttribute('data-answer'), style: node.getAttribute('style') })))).toEqual(original);
  await lesson.getByRole('button', { name: /Слушать ещё раз/ }).click();
  const target = await page.evaluate(() => {
    const clip = (window as ListeningProbe).clips.at(-1)!;
    const match = clip.audio.src.match(/ru-(\d+)\.mp3$/);
    if (!match) throw new Error('Expected the Russian recording');
    clip.resolve(); clip.audio.dispatchEvent(new Event('ended'));
    return match[1];
  });
  await expect(choices.first()).toBeEnabled();
  await lesson.locator(`[data-answer="${target}"]`).click();
  await expect(lesson.getByRole('button', { name: 'Далее', exact: true })).toBeEnabled();
  await expect(choices.first()).toBeDisabled();
  await lesson.getByRole('button', { name: 'Далее', exact: true }).click();
  await expect(choices.first()).toBeDisabled();
  await lesson.getByRole('button', { name: /Назад/ }).click();
  await expect(lesson.locator('.learning-wrap')).toHaveCount(0);
  await page.evaluate(() => (window as ListeningProbe).practiceListening.open('numbers'));
  await page.evaluate(() => {
    const clip = (window as ListeningProbe).clips.at(-2)!;
    clip.audio.dispatchEvent(new Event('ended')); clip.reject(new Error('Closed screen failed'));
  });
  await expect(lesson.getByRole('status')).toHaveText('Слушайте…');
  await expect(choices.first()).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem('eduCorex.learning.v1:guest'))).toBeNull();
  await page.evaluate(() => (window as ListeningProbe).showScreen('levelsScreen'));
  await expect(page.locator('[data-react-owned] .learning-number-grid')).toHaveCount(0);
  expect(scripts.some(url => /\/learning-session\.js/.test(url))).toBe(false);
  expect(errors).toEqual([]);
});
