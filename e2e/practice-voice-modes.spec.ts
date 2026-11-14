import { expect, test, type Page } from './fixtures';

type App = Window & typeof globalThis & {
  showScreen(id: string): void; setLangProfile(locale: string): void; stopAllAppAudio(): void;
  CorexGrades: { selectJunior(grade: number): void }; voiceModeMedia: HTMLAudioElement[];
};
const root = (page: Page) => page.locator('.voice-mode-practice');
const navigate = (page: Page, id: string) => page.evaluate(id => (window as App).showScreen(id), id);
const card = (page: Page, animal: string) => root(page).locator(`[data-animal="${animal}"] button`);
const modes = [
  { screen: 'g0DauyspTask1', folder: 'loud', suffix: 'дауыстап', titles: { kk: '📢 Дауыстап', ru: '📢 Громко' } },
  { screen: 'g0DauyspTask2', folder: 'normal', suffix: 'жай', titles: { kk: '🗣️ Жәй', ru: '🗣️ Обычно' } },
  { screen: 'g0DauyspTask3', folder: 'whisper', suffix: 'сыбырлап', titles: { kk: '🤫 Сыбырлап', ru: '🤫 Шёпотом' } },
] as const;
async function prepare(page: Page, locale = 'ru', theme = 'light') {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  let apiCalls = 0; await page.route('**/api/tts', route => { apiCalls++; return route.abort(); });
  await page.addInitScript(({ locale, theme }) => {
    localStorage.setItem('locale', locale); localStorage.setItem('profileLang', locale); localStorage.setItem('theme', theme);
    localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true');
  }, { locale, theme });
  await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const app = window as App, Original = window.Audio; app.voiceModeMedia = [];
    window.Audio = class extends Original {
      constructor(src?: string) { super(src); if (src && /\/sounds\/(loud|normal|whisper)\//.test(src)) app.voiceModeMedia.push(this); }
    };
  });
  return { errors, apiCalls: () => apiCalls };
}
async function realSound(page: Page, path: string) {
  await expect.poll(() => page.evaluate(() => {
    const media = (window as App).voiceModeMedia.at(-1);
    return media && !media.paused && !media.muted && media.volume > 0 && media.currentTime > .03 ? decodeURIComponent(new URL(media.currentSrc).pathname) : '';
  })).toBe('/original/sounds/' + path);
}
async function silent(page: Page) {
  await expect.poll(() => page.evaluate(() => (window as App).voiceModeMedia.every(audio => audio.paused))).toBe(true);
}

test('React owns the three modes, retains the alphabet and supports keyboard playback and return', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const { errors } = await prepare(page); await navigate(page, 'grade0Menu');
  await page.locator('#grade0Menu [data-destination="grade0DauyspenmMenu"]').click();
  await expect(page.locator('#grade0DauyspenmMenu .radial-center-btn')).toHaveAttribute('aria-expanded', 'false');
  await page.locator('#grade0DauyspenmMenu .radial-center-btn').click();
  for (const mode of modes) {
    await page.locator(`#grade0DauyspenmMenu [data-destination="${mode.screen}"]`).click();
    await expect(root(page)).toHaveAttribute('data-react-owned', 'true');
    await expect(page.locator(`#${mode.screen} [onclick]`)).toHaveCount(0);
    await expect(page.locator(`#${mode.screen} .alippe-header-button`)).toBeVisible();
    await expect(root(page).locator('.dv-card')).toHaveCount(4);
    await card(page, 'bear').focus(); await page.keyboard.press('Enter');
    await realSound(page, `${mode.folder}/Топ-топ ${mode.suffix}.mp4`);
    await expect(card(page, 'bear')).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Space'); await silent(page);
    await expect(card(page, 'bear')).toHaveAttribute('aria-pressed', 'false');
    await root(page).locator('.dv-back').click(); await expect(page.locator('#grade0DauyspenmMenu')).toHaveClass(/active/);
    await expect(root(page)).toHaveCount(0);
  }
  expect(await page.evaluate(() => ['dvCards', 'dvPlayCard', 'dvRenderAll', 'dvCurrentAudio'].some(key => key in window))).toBe(false);
  expect(errors).toEqual([]);
});

for (const mode of modes) test(`${mode.folder} plays all four original recordings to completion without TTS`, async ({ page }) => {
  test.setTimeout(100_000);
  const { errors, apiCalls } = await prepare(page); await navigate(page, mode.screen);
  const coins = await page.locator('#coinCount').textContent();
  for (const [animal, sound] of [['bear', 'Топ-топ'], ['cat', 'Мяу-мяу'], ['frog', 'Бак-бак'], ['dog', 'Аф-аф']]) {
    await card(page, animal).click(); await realSound(page, `${mode.folder}/${sound} ${mode.suffix}.mp4`);
    await expect(card(page, animal)).toHaveAttribute('aria-pressed', 'true');
    await expect(root(page).getByRole('status')).toHaveAttribute('data-status', 'playing');
    await expect(root(page).getByRole('status')).toHaveAttribute('data-status', 'finished', { timeout: 25000 });
    expect(await page.evaluate(() => (window as App).voiceModeMedia.at(-1)!.ended)).toBe(true);
    await expect(card(page, animal)).toHaveAttribute('aria-pressed', 'false');
  }
  await expect(page.locator('#coinCount')).toHaveText(coins!);
  expect(apiCalls()).toBe(0); expect(errors).toEqual([]);
});

test('replacing a card, changing mode, locale, grade, leaving and hiding stop playback', async ({ page }) => {
  const { errors } = await prepare(page); await navigate(page, 'g0DauyspTask1');
  await card(page, 'bear').click(); await realSound(page, 'loud/Топ-топ дауыстап.mp4');
  await card(page, 'cat').click(); await realSound(page, 'loud/Мяу-мяу дауыстап.mp4');
  expect(await page.evaluate(() => (window as App).voiceModeMedia[0].paused)).toBe(true);
  await expect(root(page).locator('button[aria-pressed="true"]')).toHaveCount(1);
  await navigate(page, 'g0DauyspTask2'); await silent(page);
  await expect(root(page).getByRole('status')).toHaveAttribute('data-status', 'idle');
  for (const action of ['locale', 'grade', 'stop', 'hidden', 'pagehide', 'leave'] as const) {
    await card(page, 'bear').click(); await realSound(page, 'normal/Топ-топ жай.mp4');
    await page.evaluate(action => {
      const app = window as App;
      if (action === 'locale') app.setLangProfile('kk');
      else if (action === 'grade') app.CorexGrades.selectJunior(1);
      else if (action === 'stop') app.stopAllAppAudio();
      else if (action === 'hidden') { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }
      else if (action === 'pagehide') window.dispatchEvent(new Event('pagehide'));
      else app.showScreen('grade0DauyspenmMenu');
    }, action);
    await silent(page); await expect(root(page).locator('button[aria-pressed="true"]')).toHaveCount(0);
    if (action === 'hidden') await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  }
  expect(errors).toEqual([]);
});

test('a failed recording exposes a retry and never reports completion', async ({ page }) => {
  const { errors, apiCalls } = await prepare(page); await page.route('**/sounds/loud/*', route => route.abort());
  await navigate(page, 'g0DauyspTask1'); await card(page, 'bear').click();
  await expect(root(page).getByRole('status')).toHaveAttribute('data-status', 'error');
  await expect(card(page, 'bear')).toHaveAttribute('aria-pressed', 'false');
  await page.unroute('**/sounds/loud/*'); await card(page, 'bear').click(); await realSound(page, 'loud/Топ-топ дауыстап.mp4');
  await expect(root(page).getByRole('status')).toHaveAttribute('data-status', 'finished', { timeout: 25000 });
  expect(errors).toEqual([]); expect(apiCalls()).toBe(0);
});

test('the alphabet interrupts a card and labels survive repeated language changes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); const { errors } = await prepare(page); await navigate(page, 'g0DauyspTask2');
  for (const locale of ['kk', 'ru', 'kk', 'ru'] as const) {
    await page.locator(`#top-lang-btn-${locale}`).click();
    await expect(root(page).locator('h2')).toHaveText(modes[1].titles[locale]);
    await expect(root(page).locator('.dv-badge').first()).toHaveText(locale === 'kk' ? 'ЖӘЙ 🗣️' : 'ОБЫЧНО 🗣️');
    await expect(root(page).locator('.dv-hint').first()).toHaveText(locale === 'kk' ? '🗣️ Жәй айт!' : '🗣️ Говори обычным голосом!');
  }
  await card(page, 'bear').click(); await realSound(page, 'normal/Топ-топ жай.mp4');
  await page.locator('#g0DauyspTask2 .alippe-item').first().click(); await silent(page);
  await expect(root(page).getByRole('status')).toHaveAttribute('data-status', 'interrupted');
  expect(errors).toEqual([]);
});

for (const [width, height, locale, theme] of [[320, 568, 'kk', 'light'], [320, 568, 'ru', 'dark'], [844, 390, 'kk', 'light'], [844, 390, 'ru', 'dark'], [1440, 900, 'kk', 'dark'], [1440, 900, 'ru', 'light']] as const) {
  test(`three voice modes fit ${width}x${height} ${locale} ${theme}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height }); await page.emulateMedia({ reducedMotion: 'reduce' }); const { errors } = await prepare(page, locale, theme);
    for (const mode of modes) {
      await navigate(page, mode.screen); await expect(root(page)).toBeVisible(); await expect(page.locator('#' + mode.screen)).toHaveCSS('opacity', '1');
      await expect(root(page).locator('h2')).toHaveText(mode.titles[locale]);
      await expect.poll(() => root(page).locator('img').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
      expect(await root(page).locator('.dv-animal-frame').evaluateAll(elements => elements.every(element => getComputedStyle(element).animationName === 'none'))).toBe(true);
      expect(await root(page).locator('.dv-card').evaluateAll(elements => elements.flatMap((element, index) => {
        const box = element.getBoundingClientRect();
        return elements.slice(index + 1).some(other => { const b = other.getBoundingClientRect(); return box.left < b.right && box.right > b.left && box.top < b.bottom && box.bottom > b.top; }) ? [index] : [];
      }))).toEqual([]);
      for (const button of await root(page).locator('button').all()) {
        const size = await button.boundingBox(); expect(size?.width).toBeGreaterThanOrEqual(44); expect(size?.height).toBeGreaterThanOrEqual(44);
        await button.evaluate(element => element.scrollIntoView({ block: 'center' }));
        await expect.poll(() => button.evaluate(element => { const b = element.getBoundingClientRect(); return element.contains(document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)); })).toBe(true);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: info.outputPath(`${mode.folder}.png`), fullPage: true, animations: 'disabled' });
      await card(page, 'dog').evaluate(element => element.scrollIntoView({ block: 'center' }));
      await page.screenshot({ path: info.outputPath(`${mode.folder}-last-card.png`), animations: 'disabled' });
      await root(page).locator('.dv-instruction').evaluate(element => element.scrollIntoView({ block: 'center' }));
      await page.screenshot({ path: info.outputPath(`${mode.folder}-instruction.png`), animations: 'disabled' });
      await root(page).locator('.dv-back').click(); await expect(page.locator('#grade0DauyspenmMenu')).toHaveClass(/active/);
    }
    expect(errors).toEqual([]);
  });
}
