import { expect, test, type Page } from './fixtures';

type App = Window & typeof globalThis & {
  showScreen(id: string): void; setLangProfile(locale: string): void; stopAllAppAudio(): void;
  CorexGrades: { selectJunior(grade: number): void }; vowelMedia: HTMLAudioElement[];
};
const navigate = (page: Page, id: string) => page.evaluate(id => (window as App).showScreen(id), id);
const root = (page: Page) => page.locator('.vowel-practice');
async function prepare(page: Page, locale = 'ru', theme = 'light') {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  let apiCalls = 0; await page.route('**/api/tts', route => { apiCalls++; return route.abort(); });
  await page.addInitScript(({ locale, theme }) => {
    localStorage.setItem('locale', locale); localStorage.setItem('profileLang', locale); localStorage.setItem('theme', theme);
    localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true');
  }, { locale, theme });
  await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const app = window as App, Original = window.Audio; app.vowelMedia = [];
    window.Audio = class extends Original {
      constructor(src?: string) { super(src); if (src?.includes('/sounds/letter-line/') || src?.includes('/sounds/kk-human/')) app.vowelMedia.push(this); }
    };
  });
  return { errors, apiCalls: () => apiCalls };
}
async function realSound(page: Page, path: string) {
  await expect.poll(() => page.evaluate(() => {
    const media = (window as App).vowelMedia.at(-1);
    return media && !media.paused && !media.muted && media.volume > 0 && media.currentTime > .03 ? decodeURIComponent(new URL(media.currentSrc).pathname) : '';
  })).toBe('/original/sounds/' + path);
}
async function silent(page: Page) {
  await expect.poll(() => page.evaluate(() => (window as App).vowelMedia.every(audio => audio.paused))).toBe(true);
}

test('React owns both screens and retains the alphabet and keyboard-accessible controls', async ({ page }) => {
  const { errors } = await prepare(page); await navigate(page, 'g0DShakJattugu');
  await expect(root(page)).toHaveAttribute('data-react-owned', 'true');
  await expect(page.locator('#g0DShakJattugu [onclick]')).toHaveCount(0);
  await expect(page.locator('#g0DShakJattugu .alippe-header-button')).toBeVisible();
  await expect(page.locator('#jat-chain-btns button')).toHaveCount(6);
  await page.locator('#jat-chain-btns button').nth(3).focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#jat-chain-btns button').nth(3)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.vowel-cell')).toHaveCount(12);
  await page.locator('.vowel-cell').first().focus(); await page.keyboard.press('Enter');
  await realSound(page, 'letter-line/У.mp3');
  await root(page).locator('.vowel-back').click(); await silent(page);
  await expect(root(page)).toHaveCount(0);
  await page.locator('#grade0DauysShakMenu [data-destination="g0DShakTapsyrma"]').click();
  await expect(root(page)).toHaveAttribute('data-react-owned', 'true'); await expect(page.locator('#g0DShakTapsyrma [onclick]')).toHaveCount(0);
  expect(await page.evaluate(() => ['jatPlayAll', 'jatSpeakVowel', 'dshakTapStart', 'dshakTapCheck'].some(key => key in window))).toBe(false);
  expect(errors).toEqual([]);
});

test('all six chain recordings play locally and keep the stop control until completion', async ({ page }) => {
  test.setTimeout(150_000);
  const { errors, apiCalls } = await prepare(page); await navigate(page, 'g0DShakJattugu');
  const files = ['ауауа', 'уауауау', 'аоаоаоа', 'уоуоуоуо', 'аоуоа', 'уоаоу'];
  for (let index = 0; index < files.length; index++) {
    await page.locator('#jat-chain-btns button').nth(index).click(); await page.locator('#jat-play-all-btn').click();
    await expect(page.locator('#jat-play-all-btn')).toHaveAttribute('aria-pressed', 'true');
    await realSound(page, `kk-human/${files[index]}.mp4`);
    await expect(page.locator('#jat-play-all-btn')).toHaveAttribute('aria-pressed', 'false', { timeout: 25000 });
    expect(await page.evaluate(() => (window as App).vowelMedia.at(-1)!.ended)).toBe(true);
  }
  expect(apiCalls()).toBe(0); expect(errors).toEqual([]);
});

test('individual vowels use the three local MP3s and replace a playing chain', async ({ page }) => {
  const { apiCalls } = await prepare(page); await navigate(page, 'g0DShakJattugu');
  await page.locator('#jat-play-all-btn').click(); await realSound(page, 'kk-human/ауауа.mp4');
  await page.locator('.vowel-cell[data-vowel="А"]').first().click(); await realSound(page, 'letter-line/А .mp3');
  expect(await page.evaluate(() => (window as App).vowelMedia[0].paused)).toBe(true);
  await page.locator('.vowel-cell[data-vowel="У"]').first().click(); await realSound(page, 'letter-line/У.mp3');
  await page.locator('#jat-chain-btns button').nth(2).click(); await silent(page);
  await page.locator('.vowel-cell[data-vowel="О"]').first().click(); await realSound(page, 'letter-line/О.mp3');
  await page.evaluate(() => (window as App).stopAllAppAudio()); await silent(page);
  await expect(page.locator('.vowel-cell[aria-pressed="true"]')).toHaveCount(0);
  await expect(root(page).getByRole('status')).toContainText('остановлен'); expect(apiCalls()).toBe(0);
});

for (const locale of ['kk', 'ru']) test(`nine picture rounds wait for audio and count each answer once in ${locale}`, async ({ page }) => {
  test.setTimeout(90_000);
  const { errors, apiCalls } = await prepare(page, locale); const coins = await page.locator('#coinCount').textContent();
  await navigate(page, 'g0DShakTapsyrma');
  const choices = page.locator('.vowel-choice'), ids = ['baby', 'wolf', 'hurt'], files = ['А ', 'У', 'О'];
  for (let round = 0; round < 9; round++) {
    await expect(page.locator('#dshakTapRoundInfo')).toContainText(`${round + 1} / 9`);
    await expect(choices.first()).toBeDisabled(); await realSound(page, `letter-line/${files[round % 3]}.mp3`);
    await expect(choices.first()).toBeEnabled({ timeout: 15000 });
    const correct = ids[round % 3]; await page.locator(`.vowel-choice[data-choice="${round === 0 ? 'wolf' : correct}"]`).click();
    await expect(choices.first()).toBeDisabled();
    await expect(page.locator(`.vowel-choice[data-choice="${correct}"]`)).toHaveAttribute('data-correct', 'true');
    await expect(page.locator('#dshakTapScore')).toContainText(`${round} / 9`);
    await page.locator('[data-vowel-action="next"]').click();
  }
  await expect(page.locator('#vowelQuizResult')).toBeVisible(); await expect(choices).toHaveCount(0);
  await expect(page.locator('#dshakTapScore')).toContainText('8 / 9'); await expect(page.locator('#coinCount')).toHaveText(coins!);
  await page.locator('[data-vowel-action="restart"]').click(); await expect(page.locator('#dshakTapRoundInfo')).toContainText('1 / 9');
  await expect(page.locator('#dshakTapScore')).toContainText('0 / 9'); expect(apiCalls()).toBe(0); expect(errors).toEqual([]);
});

test('leaving, changing locale or stopping immediately cancels scheduled autoplay', async ({ page }) => {
  await prepare(page);
  for (const action of ['leave', 'locale', 'stop'] as const) {
    await page.evaluate(action => {
      const app = window as App; app.showScreen('g0DShakTapsyrma');
      if (action === 'leave') app.showScreen('grade0DauysShakMenu');
      else if (action === 'locale') app.setLangProfile('kk');
      else app.stopAllAppAudio();
    }, action);
    await page.waitForTimeout(600); expect(await page.evaluate(() => (window as App).vowelMedia.length)).toBe(0);
  }
});

test('an error leaves answers locked and a retry recovers the same round', async ({ page }) => {
  await prepare(page); await page.route('**/sounds/letter-line/*', route => route.abort()); await navigate(page, 'g0DShakTapsyrma');
  await expect(page.locator('#dshakTapFeedback')).toHaveAttribute('data-feedback', 'error'); await expect(page.locator('.vowel-choice').first()).toBeDisabled();
  await expect(page.locator('#dshakTapScore')).toContainText('0 / 9'); await page.unroute('**/sounds/letter-line/*');
  await page.locator('#dshakTapSoundBtn').click(); await realSound(page, 'letter-line/А .mp3');
  await expect(page.locator('.vowel-choice').first()).toBeEnabled({ timeout: 15000 }); await expect(page.locator('#dshakTapRoundInfo')).toContainText('1 / 9');
});

test('answer timers and audio are cancelled on return, language, grade and page hiding', async ({ page }) => {
  await prepare(page); await navigate(page, 'g0DShakTapsyrma');
  await expect(page.locator('.vowel-choice').first()).toBeEnabled({ timeout: 15000 }); await page.locator('[data-choice="baby"]').click();
  await page.evaluate(() => (window as App).setLangProfile('kk'));
  await page.waitForTimeout(1600); await expect(page.locator('#dshakTapRoundInfo')).toContainText('1 / 9'); await expect(page.locator('#dshakTapScore')).toContainText('1 / 9');
  await page.locator('[data-vowel-action="next"]').click(); await realSound(page, 'letter-line/У.mp3');
  await page.evaluate(() => (window as App).CorexGrades.selectJunior(1)); await silent(page);
  await expect(page.locator('#dshakTapRoundInfo')).toContainText('1 / 9'); await expect(page.locator('#dshakTapScore')).toContainText('0 / 9');
  await expect(page.locator('.vowel-choice').first()).toBeDisabled(); await page.locator('#dshakTapSoundBtn').click(); await realSound(page, 'letter-line/А .mp3');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await silent(page); await expect(page.locator('.vowel-choice').first()).toBeDisabled();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.locator('#dshakTapSoundBtn').click(); await expect(page.locator('.vowel-choice').first()).toBeEnabled({ timeout: 15000 });
  await page.locator('[data-choice="baby"]').click(); await root(page).locator('.vowel-back').click();
  await navigate(page, 'g0DShakTapsyrma'); await page.waitForTimeout(1700);
  await expect(page.locator('#dshakTapRoundInfo')).toContainText('1 / 9'); await expect(page.locator('#dshakTapScore')).toContainText('0 / 9');
});

for (const [width, height, locale, theme] of [[320, 568, 'kk', 'light'], [320, 568, 'ru', 'dark'], [844, 390, 'ru', 'dark'], [1440, 900, 'ru', 'light']] as const) {
  test(`vowel screens fit ${width}x${height} ${locale} ${theme}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height }); await page.emulateMedia({ reducedMotion: 'reduce' }); const { errors } = await prepare(page, locale, theme);
    for (const screen of ['g0DShakJattugu', 'g0DShakTapsyrma']) {
      await navigate(page, screen); await expect(root(page)).toBeVisible(); await expect(page.locator('#' + screen)).toHaveCSS('opacity', '1');
      if (screen === 'g0DShakJattugu') await page.locator('#jat-chain-btns button').nth(3).click();
      const buttons = root(page).locator(screen === 'g0DShakJattugu' ? '.vowel-cell' : '.vowel-choice');
      expect(await buttons.evaluateAll(elements => elements.flatMap((element, index) => {
        const b = element.getBoundingClientRect(), parent = element.parentElement!.getBoundingClientRect();
        const overlaps = elements.slice(index + 1).filter(other => {
          const c = other.getBoundingClientRect(); return b.left < c.right && b.right > c.left && b.top < c.bottom && b.bottom > c.top;
        }).length;
        return overlaps || b.left < parent.left - 1 || b.right > parent.right + 1 ? [index] : [];
      }))).toEqual([]);
      for (const button of await buttons.all()) {
        const size = await button.boundingBox(); expect(size?.width).toBeGreaterThanOrEqual(44); expect(size?.height).toBeGreaterThanOrEqual(44);
        await button.evaluate(element => element.scrollIntoView({ block: 'center' }));
        await expect.poll(() => button.evaluate(element => { const b = element.getBoundingClientRect(); return element.contains(document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)); })).toBe(true);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`${screen}-choices.png`), animations: 'disabled' });
      if (screen === 'g0DShakJattugu') {
        await page.locator('#jat-play-all-btn').evaluate(element => element.scrollIntoView({ block: 'center' }));
        await page.screenshot({ path: info.outputPath(`${screen}-play.png`), animations: 'disabled' });
      }
      await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: info.outputPath(`${screen}.png`), animations: 'disabled' });
      await root(page).locator('.vowel-back').click(); await expect(page.locator('#grade0DauysShakMenu')).toHaveClass(/active/);
    }
    expect(errors).toEqual([]);
  });
}
