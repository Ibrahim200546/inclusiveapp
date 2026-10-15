import { test, expect, type Page } from './fixtures';

async function prepare(page: Page, locale: 'kk' | 'ru', screen: string) {
  await page.addInitScript(locale => {
    localStorage.setItem('locale', locale);
    localStorage.setItem('profileLang', locale);
    localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true');
  }, locale);
  let apiCalls = 0;
  await page.route('**/api/tts', route => { apiCalls++; return route.abort(); });
  await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const app = window as unknown as {
      showScreen: (id: string) => void;
      __lessonMedia: HTMLAudioElement[];
      appTts: { speakText: (text: string, lang: string, options: Record<string, unknown>) => Promise<unknown> };
    };
    app.__lessonMedia = [];
    const original = app.appTts.speakText;
    // Observe the real audio element; synthesis/playback is not mocked.
    app.appTts.speakText = (text, lang, options) => original(text, lang, {
      ...options, onReady: (audio: HTMLAudioElement) => app.__lessonMedia.push(audio),
    });
    app.showScreen('grade0DauysShakMenu');
  });
  await page.locator(`[data-art-module-target="${screen}"]`).click();
  return () => apiCalls;
}

async function expectRealAudio(page: Page, listenSelector: string, file: string) {
  const listen = page.locator(listenSelector);
  await listen.click();
  await expect(listen).toBeDisabled();
  await expect.poll(() => page.evaluate(() => {
    const audio = (window as unknown as { __lessonMedia: HTMLAudioElement[] }).__lessonMedia.at(-1);
    return audio && !audio.paused && !audio.muted && audio.volume > 0 && audio.currentTime > 0.03
      ? new URL(audio.currentSrc).pathname : '';
  })).toBe(`/original/sounds/articulation-lessons/${file}`);
  expect(await page.evaluate(() => (window as unknown as { __lessonMedia: HTMLAudioElement[] }).__lessonMedia.at(-1)!.duration)).toBeGreaterThan(0.5);
  await expect(listen).toBeEnabled();
}

test('all three Қ words play bundled audio with TTS API unavailable', async ({ page }) => {
  const apiCalls = await prepare(page, 'kk', 'g0QSoundAdventure');
  for (const file of ['q-wolf-kk.mp3', 'q-rabbit-kk.mp3', 'q-tortoise-kk.mp3']) {
    await expectRealAudio(page, '#artQGame [data-action="listen"]', file);
    await page.locator('#artQGame [data-letter="Қ"]').click();
    await page.locator('#artQGame [data-action="next"]').click();
  }
  expect(apiCalls()).toBe(0);
});

for (const locale of ['kk', 'ru'] as const) {
  test(`all autumn ${locale} sentences play bundled audio with TTS API unavailable`, async ({ page }) => {
    const apiCalls = await prepare(page, locale, 'g0AutumnStory');
    for (const key of ['arrived', 'cold', 'leaves']) {
      await expectRealAudio(page, '#artAutumnGame [data-action="listen"]', `autumn-${key}-${locale}.mp3`);
      const choice = await page.evaluate(() => (window as unknown as { EduArticulationLessons: { getState: () => { autumn: { correctChoice: string } } } }).EduArticulationLessons.getState().autumn.correctChoice);
      await page.locator(`#artAutumnGame [data-choice="${choice}"]`).click();
      await page.locator('#artAutumnGame [data-action="next"]').click();
    }
    expect(apiCalls()).toBe(0);
  });
}

test('leaving an exercise stops real narration', async ({ page }) => {
  await prepare(page, 'kk', 'g0AutumnStory');
  await page.locator('#artAutumnGame [data-action="listen"]').click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __lessonMedia: HTMLAudioElement[] }).__lessonMedia.at(-1)?.paused)).toBe(false);
  await page.locator('#g0AutumnStory .art-module-back').click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __lessonMedia: HTMLAudioElement[] }).__lessonMedia.at(-1)?.paused)).toBe(true);
});
