import { test, expect, type Locator, type Page } from '@playwright/test';

const sizes = [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1440, height: 900 }];

async function accessibleClick(control: Locator) {
  await control.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest' }));
  await control.page().waitForTimeout(500);
  await expect.poll(() => control.evaluate(element => {
    const box = element.getBoundingClientRect();
    return element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
  })).toBe(true);
  await control.click();
}

async function settleMenu(page: Page, id: string) {
  await expect(page.locator(`#${id}`)).toHaveClass(/active/);
  await expect.poll(() => page.locator(`#${id}`).evaluate(element => element.getAnimations({ subtree: true })
    .some(animation => animation.playState === 'running' && animation.effect?.getTiming().iterations !== Infinity))).toBe(false);
}

async function enterVoiceMenu(page: Page) {
  await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
  await accessibleClick(page.locator('#mainRadialMenu > .radial-center-btn'));
  await settleMenu(page, 'mainRadialMenu');
  await accessibleClick(page.locator('#mainRadialMenu > [onclick*="grade0Menu"]'));
  await settleMenu(page, 'grade0Menu');
  await accessibleClick(page.locator('#grade0Menu .radial-item[onclick*="grade0DauysShakMenu"]'));
  await settleMenu(page, 'grade0DauysShakMenu');
}

async function readState(page: Page) {
  return page.evaluate(() => {
    const api = (window as unknown as { EduArticulationLessons: { getState: () => {
      selected: string; currentScreen: string; animation?: { progress: number; playing: boolean; speed: number }; game?: { round: number; solved: boolean; completed: boolean };
      autumn?: { round: number; solved: boolean; completed: boolean; listening: boolean; sentence: string; correctChoice: string };
    } } }).EduArticulationLessons;
    return api.getState();
  });
}

for (const viewport of sizes) for (const locale of ['kk', 'ru']) for (const theme of ['light', 'dark']) {
  test(`articulation ${viewport.width}x${viewport.height} ${locale} ${theme}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(({ locale, theme }) => {
      localStorage.setItem('locale', locale);
      localStorage.setItem('profileLang', locale);
      localStorage.setItem('theme', theme);
      localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true');
    }, { locale, theme });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await enterVoiceMenu(page);
    await accessibleClick(page.locator('[data-art-module-target="g0ArticulationLessons"]'));
    const screen = page.locator('#g0ArticulationLessons');
    await expect(screen).toHaveClass(/active/);
    const names = locale === 'kk' ? ['Тіс тазалау', 'Доп', 'Төбешік'] : ['Чистим зубы', 'Мяч', 'Горка'];
    for (let index = 0; index < names.length; index++) {
      await expect(screen.locator('.art-module-guide h3')).toHaveText(names[index]);
      await expect(screen.locator('#artModuleStage svg')).toHaveCount(1);
      if (index === 0) await expect(screen.locator('#artModulePrev')).toBeDisabled();
      if (index > 0) await expect(screen.locator('#artModulePrev')).toBeEnabled();
      const play = screen.locator('#artModulePlay');
      await accessibleClick(play);
      await expect.poll(async () => (await readState(page)).animation?.progress || 0).toBeGreaterThan(0.025);
      await accessibleClick(play);
      await expect(play).toHaveAttribute('aria-pressed', 'false');
      const paused = (await readState(page)).animation!.progress;
      await page.waitForTimeout(150);
      expect((await readState(page)).animation!.progress).toBe(paused);
      await screen.locator('#artModuleSpeed').selectOption('0.5');
      expect((await readState(page)).animation!.speed).toBe(0.5);
      const timeline = screen.locator('#artModuleProgress');
      await timeline.evaluate(element => element.scrollIntoView({ block: 'center' }));
      await timeline.focus();
      await page.keyboard.press('End');
      await expect(timeline).toHaveValue('100');
      expect((await readState(page)).animation!.progress).toBe(1);
      await accessibleClick(screen.locator('#artModuleRestart'));
      expect((await readState(page)).animation!.progress).toBeLessThan(0.05);
      await expect(play).toHaveAttribute('aria-pressed', 'true');
      if (index < 2) await accessibleClick(screen.locator('#artModuleNext'));
      else await expect(screen.locator('#artModuleNext')).toBeDisabled();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await accessibleClick(screen.locator('.art-module-back'));
    await settleMenu(page, 'grade0DauysShakMenu');
    expect((await readState(page)).animation).toBeUndefined();
    await expect(screen.locator('#artModuleStage svg')).toHaveCount(0);
    await accessibleClick(page.locator('[data-art-module-target="g0ArticulationLessons"]'));
    await expect(screen.locator('#artModulePlay')).toHaveAttribute('aria-pressed', 'false');
    expect(errors).toEqual([]);
  });
}

test('missing Қ adventure rejects wrong answer and completes only after three rounds', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true'));
  await enterVoiceMenu(page);
  await page.evaluate(() => {
    const app = window as unknown as { appTts: { speakText: () => Promise<void>; stop: () => void }; showReward: () => void; __artRewards: number };
    app.appTts = { speakText: async () => {}, stop: () => {} };
    app.__artRewards = 0;
    app.showReward = () => { app.__artRewards++; };
  });
  await accessibleClick(page.locator('[data-art-module-target="g0QSoundAdventure"]'));
  const game = page.locator('#artQGame');
  for (let round = 0; round < 3; round++) {
    expect((await readState(page)).game!.round).toBe(round);
    await accessibleClick(game.locator('[data-letter="К"]'));
    expect((await readState(page)).game!.solved).toBe(false);
    await expect(game.locator('[data-action="next"]')).toHaveCount(0);
    await accessibleClick(game.locator('[data-letter="Қ"]'));
    expect((await readState(page)).game!.solved).toBe(true);
    await accessibleClick(game.locator('[data-action="next"]'));
  }
  expect((await readState(page)).game!.completed).toBe(true);
  await accessibleClick(game.locator('[data-action="result"]'));
  expect(await page.evaluate(() => (window as unknown as { __artRewards: number }).__artRewards)).toBe(1);
  await accessibleClick(page.locator('#g0QSoundAdventure .art-module-back'));
  expect((await readState(page)).game).toBeUndefined();
  await expect(game.locator('.qsa-root')).toHaveCount(0);
});

for (const [viewport, locale] of [[sizes[0], 'kk'], [sizes[2], 'ru']] as const) {
  test(`autumn story ${viewport.width}x${viewport.height} ${locale}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(locale => {
      localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true');
      localStorage.setItem('profileLang', locale);
      localStorage.setItem('locale', locale);
    }, locale);
    await enterVoiceMenu(page);
    await page.evaluate(() => {
      const app = window as unknown as {
        appTts: { speakText: (text: string) => Promise<boolean>; stop: () => void };
        showReward: () => void; __artRewards: number; __artSpeech: string[];
      };
      app.__artSpeech = [];
      app.appTts = { speakText: async text => { app.__artSpeech.push(text); return true; }, stop: () => {} };
      app.__artRewards = 0;
      app.showReward = () => { app.__artRewards++; };
    });
    await accessibleClick(page.locator('[data-art-module-target="g0AutumnStory"]'));
    const game = page.locator('#artAutumnGame');
    for (let round = 0; round < 3; round++) {
      const state = (await readState(page)).autumn!;
      expect(state.round).toBe(round);
      await accessibleClick(game.locator('[data-action="listen"]'));
      await expect.poll(async () => (await readState(page)).autumn!.listening).toBe(false);
      await accessibleClick(game.locator(`[data-choice]:not([data-choice="${state.correctChoice}"])`).first());
      expect((await readState(page)).autumn!.solved).toBe(false);
      await expect(game.locator('[data-action="next"]')).toHaveCount(0);
      await accessibleClick(game.locator(`[data-choice="${state.correctChoice}"]`));
      expect((await readState(page)).autumn!.solved).toBe(true);
      await accessibleClick(game.locator('[data-action="next"]'));
    }
    expect((await readState(page)).autumn!.completed).toBe(true);
    await accessibleClick(game.locator('[data-action="result"]'));
    expect(await page.evaluate(() => (window as unknown as { __artRewards: number }).__artRewards)).toBe(1);
    expect(await page.evaluate(() => (window as unknown as { __artSpeech: string[] }).__artSpeech)).toHaveLength(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await accessibleClick(page.locator('#g0AutumnStory .art-module-back'));
    expect((await readState(page)).autumn).toBeUndefined();
    await expect(game.locator('.asg-root')).toHaveCount(0);
  });
}

test('pending autumn narration cannot affect a later screen or new game', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true'));
  await enterVoiceMenu(page);
  await page.evaluate(() => {
    const app = window as unknown as {
      appTts: { speakText: () => Promise<boolean>; stop: () => void };
      __artResolve?: (value: boolean) => void;
    };
    app.appTts = { speakText: () => new Promise(resolve => { app.__artResolve = resolve; }), stop: () => {} };
  });
  const entry = page.locator('[data-art-module-target="g0AutumnStory"]');
  await accessibleClick(entry);
  const game = page.locator('#artAutumnGame');
  await accessibleClick(game.locator('[data-action="listen"]'));
  await expect(game.locator('[data-action="listen"]')).toBeDisabled();
  await accessibleClick(page.locator('#top-lang-btn-ru'));
  expect((await readState(page)).autumn!.round).toBe(0);
  await expect(game.locator('.asg-sentence')).toHaveText('Наступила осень.');
  await accessibleClick(page.locator('#g0AutumnStory .art-module-back'));
  expect((await readState(page)).autumn).toBeUndefined();
  await accessibleClick(entry);
  await expect(game.locator('[data-action="listen"]')).toBeEnabled();
  await page.evaluate(() => (window as unknown as { __artResolve: (value: boolean) => void }).__artResolve(false));
  await page.waitForTimeout(200);
  await expect(game.locator('.asg-status')).toHaveText('');
  expect((await readState(page)).autumn!.round).toBe(0);
  expect((await readState(page)).autumn!.solved).toBe(false);
});
