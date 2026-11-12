import { test, expect } from './fixtures';
import { openGrade, openModule, findRadialEntry, returnToGrade } from './radial-navigation';
const pageErrors = new WeakMap<import('@playwright/test').Page, string[]>();
test.afterEach(async ({ page }) => { expect(pageErrors.get(page) || []).toEqual([]); });

async function enter(page: import('@playwright/test').Page, locale = 'kk') {
  const errors: string[] = []; pageErrors.set(page, errors); page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(lang => { localStorage.setItem('profileLang', lang); localStorage.setItem('locale', lang); localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true'); }, locale);
  await page.route('**/api/tts', route => route.abort());
  await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
  await openGrade(page, 0);
}

async function openLearningMode(page: import('@playwright/test').Page, index: number) {
  await openModule(page, 'grade0Menu', index < 2 ? 'math' : 'listening');
  await (await findRadialEntry(page, 'data-activity', `learningHubScreen:${index}`)).click();
  await expect(page.locator('#learningPracticeScreen')).toHaveClass(/active/);
}

for (const locale of ['kk', 'ru']) test(`ten numbers play real bundled audio, preserve the question on retry and finish once in ${locale}`, async ({ page }) => {
  test.setTimeout(120000);
  await enter(page, locale);
  await openLearningMode(page, 0);
  const heard = new Set<number>();
  for (let round = 0; round < 10; round++) {
    const source = await expect.poll(async () => page.evaluate(() => {
      const a = (window as unknown as { _activeAudios: HTMLAudioElement[] })._activeAudios?.find(a => a.currentSrc.includes('find-number'));
      return a && !a.muted && a.volume > 0 && a.currentTime > 0 ? a.currentSrc : '';
    })).not.toBe('');
    void source;
    const url = await page.evaluate(() => (window as unknown as { _activeAudios: HTMLAudioElement[] })._activeAudios.find(a => a.currentSrc.includes('find-number'))!.currentSrc);
    const answer = Number(url.match(new RegExp(locale + '-(\\d+)\\.mp3'))![1]); heard.add(answer);
    await expect(page.locator('.learning-number-grid button').first()).toBeEnabled({ timeout: 15000 });
    const before = await page.locator('#learningPracticeScreen > div > p').first().textContent();
    if (round === 0) {
      await page.locator('.learning-number-grid button').filter({ hasText: new RegExp('^' + (answer === 1 ? 2 : 1) + '$') }).click();
      await expect(page.locator('#learningPracticeScreen .learning-feedback')).toContainText(locale === 'kk' ? 'Қайта көр' : 'Попробуйте');
      await expect(page.locator('#learningPracticeScreen > div > p').first()).toHaveText(before!);
      await page.waitForTimeout(400);
    }
    await page.locator('.learning-number-grid button').filter({ hasText: new RegExp('^' + answer + '$') }).click();
    await page.locator('#learningPracticeScreen').getByRole('button', { name: locale === 'kk' ? 'Келесі' : 'Далее', exact: true }).click();
  }
  expect(heard.size).toBe(10);
  await expect(page.locator('.learning-summary')).toContainText(locale === 'kk' ? 'Орындалды: 10. Әрекет саны: 11.' : 'Выполнено: 10. Попыток: 11.');
});

for (const locale of ['kk', 'ru']) {
  test(`radial entries and all syllable contexts remain reachable in ${locale}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); await enter(page, locale);
    for (const parent of ['grade0VoiceMenu', 'grade0DauyspenmMenu']) {
      await page.evaluate(id => (window as unknown as { showScreen(id: string): void }).showScreen(id), parent);
      const section = page.locator('#' + parent);
      const entry = section.getByRole('button', { name: locale === 'kk' ? 'Буындап оқу' : 'Чтение по слогам', exact: true, includeHidden: true });
      if (!await section.locator('.radial-menu-container').evaluate(node => node.classList.contains('active'))) await section.locator('.radial-center-btn').click();
      if (!await entry.isVisible()) await section.locator('.grade-menu-pages button').last().click();
      await entry.click();
      await expect(page.locator('#g0TynysByTask2')).toHaveClass(/active/);
      await expect(page.locator('#learningSyllableContext')).toBeVisible();
      await page.locator('#g0TynysByTask2 > .task-flex-container > .task-content-wrapper > button').click();
      await expect(page.locator('#' + parent)).toHaveClass(/active/);
    }
    await page.screenshot({ path: `docs/trello-verification/contexts-${locale}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('replaying an acoustic question retains the target and navigating away stops audio', async ({ page }) => {
  await enter(page);
  await openLearningMode(page, 1);
  await expect(page.locator('#learningPracticeScreen [data-answer]').first()).toBeEnabled();
  const counter = await page.locator('#learningPracticeScreen > div > p').first().textContent();
  await page.locator('#learningPracticeScreen').getByRole('button', { name: 'Қайта тыңдау' }).click();
  await expect(page.locator('#learningPracticeScreen > div > p').first()).toHaveText(counter!);
  await page.locator('#learningPracticeScreen').getByRole('button', { name: 'Артқа' }).click();
  await expect(page.locator('#curriculumCatalog')).toHaveClass(/active/);
  await expect(page.locator('[data-activity="learningHubScreen:1"]')).toBeVisible();
});

test('syllable playback and teacher confirmation are separate and work with remote TTS blocked', async ({ page }) => {
  await enter(page);
  await page.evaluate(() => (window as unknown as { showScreen(id: string): void }).showScreen('grade0VoiceMenu'));
  const voiceMenu = page.locator('#grade0VoiceMenu');
  const reading = voiceMenu.getByRole('button', { name: 'Буындап оқу', exact: true });
  if (!await voiceMenu.locator('.radial-menu-container').evaluate(el => el.classList.contains('active'))) await voiceMenu.locator('.radial-center-btn').click();
  if (!await reading.isVisible()) await voiceMenu.locator('.grade-menu-pages button').last().click();
  await reading.click();
  const confirm = page.locator('#learningSyllableContext').getByRole('button', { name: 'Педагог: қайталады' });
  await confirm.click(); await expect(page.locator('.learning-context-progress')).toContainText('Алдымен');
  await page.locator('#tynsbyPresets2').getByRole('button', { name: 'ТА', exact: true }).click();
  await page.locator('#tynsbyPyramid2 button').first().click();
  await expect(page.locator('.learning-context-progress')).toContainText('Үлгі тыңдалды', { timeout: 15000 });
  await confirm.click(); await expect(page.locator('.learning-context-progress')).toContainText('белгісі сақталды');
});

for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
  test(`all five learning modes remain reachable in radial modules at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize(viewport); await enter(page);
    const found: string[] = [];
    for (let index = 0; index < 5; index++) {
      await openModule(page, 'grade0Menu', index < 2 ? 'math' : 'listening');
      const entry = await findRadialEntry(page, 'data-activity', `learningHubScreen:${index}`);
      await expect(entry).toBeVisible();
      found.push(await entry.getAttribute('data-activity') || '');
      const orbit = page.locator('#curriculum-lessons .exercise-orbit');
      await expect(orbit).toHaveCount(1);
      await expect.poll(() => orbit.evaluate(element => element.getAnimations({ subtree: true })
        .some(animation => animation.playState === 'running' && animation.effect?.getTiming().iterations !== Infinity))).toBe(false);
      const items = orbit.locator('.radial-item:visible');
      expect(await items.count()).toBeGreaterThan(0);
      expect(await items.count()).toBeLessThanOrEqual(6);
      for (const item of await items.all()) {
        await item.scrollIntoViewIfNeeded();
        const centerHit = await item.evaluate(node => {
          const bounds = node.getBoundingClientRect();
          const hit = document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
          return { reachable: !!hit && node.contains(hit), label: node.textContent,
            bounds: bounds.toJSON(), obstruction: hit?.outerHTML.slice(0, 500) || null };
        });
        expect(centerHit.reachable, JSON.stringify(centerHit)).toBe(true);
        const caption = item.locator('.curriculum-orbit-caption');
        await caption.scrollIntoViewIfNeeded();
        expect(await caption.evaluate(node => {
          const b = node.getBoundingClientRect(), x = b.x + b.width / 2, y = b.y + b.height / 2;
          return b.left >= 0 && b.right <= innerWidth && [[b.left + 2, y], [b.right - 2, y], [x, b.top + 2], [x, b.bottom - 2]]
            .every(([left, top]) => { const hit = document.elementFromPoint(left, top); return !!hit && node.contains(hit); });
        })).toBe(true);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const back = page.locator('#curriculumCatalog .curriculum-toolbar button').first();
      await back.scrollIntoViewIfNeeded(); await expect(back).toBeVisible();
      expect(await back.evaluate(node => { const b = node.getBoundingClientRect(), hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return !!hit && node.contains(hit); })).toBe(true);
      await returnToGrade(page, 'grade0Menu');
    }
    expect(found).toEqual(Array.from({ length: 5 }, (_, index) => `learningHubScreen:${index}`));
    await page.screenshot({ path: `docs/trello-verification/hub-${viewport.width}.png`, fullPage: true });
  });
}

for (const locale of ['kk', 'ru']) for (const mode of ['count', 'rhythm', 'tempo', 'pitch']) {
  test(`pictured listening ${mode} preserves real Web Audio and answers in ${locale}`, async ({ page }) => {
    await page.addInitScript(() => {
      type PlayedEvent = { frequency: number; start: number };
      const probe = window as unknown as { __learningAudioClips: PlayedEvent[][]; __learningAudioContexts: AudioContext[] };
      probe.__learningAudioClips = []; probe.__learningAudioContexts = [];
      const NativeAudioContext = window.AudioContext;
      class ObservedAudioContext extends NativeAudioContext {
        readonly events: PlayedEvent[] = [];
        constructor(options?: AudioContextOptions) { super(options); probe.__learningAudioClips.push(this.events); probe.__learningAudioContexts.push(this); }
        createOscillator() {
          const oscillator = super.createOscillator(), start = oscillator.start.bind(oscillator);
          oscillator.start = (when = 0) => { this.events.push({ frequency: oscillator.frequency.value, start: when }); start(when); };
          return oscillator;
        }
      }
      Object.defineProperty(window, 'AudioContext', { value: ObservedAudioContext, configurable: true });
    });
    await enter(page, locale);
    const position = ['count', 'rhythm', 'tempo', 'pitch'].indexOf(mode) + 1;
    await openLearningMode(page, position);
    const answers = page.locator('#learningPracticeScreen [data-answer]'); await expect(answers.first()).toBeEnabled();
    const events = await page.evaluate(() => (window as unknown as { __learningAudioClips: { frequency: number; start: number }[][] }).__learningAudioClips.at(-1)!);
    expect(events.length).toBeGreaterThan(0);
    const target = mode === 'count' ? String(events.length) : mode === 'rhythm' ? events.length === 1 ? 'one' : 'two'
      : mode === 'tempo' ? events[1].start - events[0].start < .5 ? 'fast' : 'slow'
      : events[0].frequency === 220 ? 'low' : events[0].frequency === 440 ? 'mid' : 'high';
    const correct = page.locator(`#learningPracticeScreen [data-answer="${target}"]`);
    const other = await answers.evaluateAll((nodes, value) => nodes.find(n => n.getAttribute('data-answer') !== value)!.getAttribute('data-answer')!, target);
    const counter = page.locator('#learningPracticeScreen > div > p').first(), before = await counter.textContent();
    await page.locator(`#learningPracticeScreen [data-answer="${other}"]`).click(); await expect(page.locator('#learningPracticeScreen .learning-feedback')).toContainText(locale === 'kk' ? 'Қайта көр' : 'Попробуйте');
    await expect(counter).toHaveText(before!); await page.waitForTimeout(400);
    if (mode === 'rhythm') {
      await expect(page.locator('.learning-rhythm-samples button')).toHaveCount(2);
      await page.locator('.learning-rhythm-samples button').first().click(); await expect(correct).toBeEnabled(); await expect(counter).toHaveText(before!);
    }
    await correct.click(); await expect(page.locator('#learningPracticeScreen .learning-feedback')).toContainText(locale === 'kk' ? 'Дұрыс' : 'Правильно');
    await page.locator('#learningPracticeScreen').getByRole('button', { name: locale === 'kk' ? 'Келесі' : 'Далее', exact: true }).click();
    await expect(counter).not.toHaveText(before!);
    await page.locator('#learningPracticeScreen').getByRole('button', { name: locale === 'kk' ? 'Артқа' : 'Назад' }).click();
    // The app keeps an empty shared warm-up context alive across screens.
    // Check only contexts that actually played an exercise oscillator.
    await expect.poll(() => page.evaluate(() => (window as unknown as { __learningAudioContexts: (AudioContext & { events: unknown[] })[] }).__learningAudioContexts
      .filter(ctx => ctx.events.length > 0).every(ctx => ctx.state === 'closed'))).toBe(true);
  });
}
