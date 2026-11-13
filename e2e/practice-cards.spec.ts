import { expect, test, type Page } from './fixtures';

type App = { showScreen(id: string): void; setLangProfile(lang: string): void; _activeAudios: HTMLAudioElement[] };
const navigate = (page: Page, id: string) => page.evaluate(id => (window as unknown as App).showScreen(id), id);
const language = (page: Page, lang: string) => page.evaluate(lang => (window as unknown as App).setLangProfile(lang), lang);
const errors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const messages: string[] = []; errors.set(page, messages); page.on('pageerror', error => messages.push(error.message));
  await page.addInitScript(() => { localStorage.setItem('profileLang', 'kk'); localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true'); });
  await page.route('**/api/tts', route => route.fulfill({ status: 503, json: { error: 'test unavailable' } }));
  await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
});
test.afterEach(async ({ page }) => { expect(errors.get(page)).toEqual([]); });

for (const locale of ['kk', 'ru']) test(`card exercises use React and retain menu routes in ${locale}`, async ({ page }) => {
  await language(page, locale); await navigate(page, 'sentenceModuleScreen');
  await page.locator('#sentenceModuleScreen [data-destination="sentenceBuilderScreen"]').click();
  const sentence = page.locator('#sentenceBuilderScreen');
  await expect(sentence).toHaveAttribute('data-react-owned', 'true'); await expect(sentence.locator('#sbAvailableCards button')).toHaveCount(9);
  await expect(sentence.locator('h2')).toHaveText(locale === 'kk' ? '🧩 Сөйлем құрастыру' : '🧩 Составление предложения');
  await expect(sentence.locator('[onclick], [ondrop], [ondragover]')).toHaveCount(0);
  await sentence.locator('.card-exercise-back').click(); await expect(page.locator('#sentenceModuleScreen')).toHaveClass(/active/);
  await expect(sentence.locator('.card-exercise')).toHaveCount(0);
  await navigate(page, 'grade0Menu'); await page.locator('#grade0Menu [data-destination="grade0SpatialMatrixScreen"]').click();
  const spatial = page.locator('#grade0SpatialMatrixScreen');
  await expect(spatial).toHaveAttribute('data-react-owned', 'true'); await expect(spatial.locator('#spatialCardsArea button')).toHaveCount(16);
  await expect(spatial.locator('[onclick], [ondrop], [ondragover]')).toHaveCount(0);
  await spatial.locator('.card-exercise-back').click(); await expect(page.locator('#grade0Menu')).toHaveClass(/active/);
  await expect(spatial.locator('.card-exercise')).toHaveCount(0);
  expect(await page.evaluate(() => ['sbRender', 'sbPlaySentence', 'sbResetCards', 'initSpatialGame', 'spatialDrop', 'checkSpatialWin'].filter(name => name in window))).toEqual([]);
});

test('sentence cards support keyboard, drag and drop, translation, return and reset', async ({ page }) => {
  await navigate(page, 'sentenceBuilderScreen'); const area = page.locator('#sbSentenceArea');
  await expect(page.locator('#sbPlay')).toBeDisabled();
  const mother = page.locator('#sb-card-9'); await mother.focus(); await page.keyboard.press('Enter');
  await expect(area.locator('#sb-card-9')).toBeFocused();
  await page.locator('#sb-card-2').dragTo(area); await page.locator('#sb-card-8').click();
  await expect(area.locator('.sb-card-text')).toHaveText(['Ана', 'жеді', 'сорпа']);
  await language(page, 'ru'); await expect(area.locator('.sb-card-text')).toHaveText(['Мама', 'ест', 'суп']);
  await area.locator('#sb-card-2').press('Space'); await expect(page.locator('#sbAvailableCards #sb-card-2')).toBeFocused();
  await area.locator('#sb-card-8').dragTo(page.locator('#sbAvailableCards'));
  await expect(area.locator('.sb-card')).toHaveCount(1);
  await page.locator('.card-exercise-back').click(); await navigate(page, 'sentenceBuilderScreen');
  await expect(area.locator('.sb-card-text')).toHaveText(['Мама']);
  await page.locator('#sbReset').click(); await expect(area.locator('.sb-card')).toHaveCount(0); await expect(page.locator('#sbAvailableCards .sb-card')).toHaveCount(9);
});

test('sentence narration retries after errors, waits for audio, and stops when cards change', async ({ page }) => {
  await language(page, 'ru'); await navigate(page, 'sentenceBuilderScreen');
  for (const id of [9, 2, 8]) await page.locator(`#sb-card-${id}`).click();
  await page.locator('#sbPlay').click(); await expect(page.locator('#sbPlaybackStatus')).toContainText('Звук не загрузился');
  const requests: unknown[] = [];
  await page.unroute('**/api/tts'); await page.route('**/api/tts', route => {
    requests.push(route.request().postDataJSON());
    return route.fulfill({ contentType: 'audio/mpeg', path: 'public/original/sounds/ru/spatial/hedgehog-on-stump.mp3' });
  });
  await page.locator('#sbPlay').click();
  await expect(page.locator('#sbPlay')).toContainText('Остановить');
  await expect.poll(() => page.evaluate(() => (window as unknown as App)._activeAudios.some(audio => !audio.paused && audio.src.startsWith('blob:')))).toBe(true);
  await expect(page.locator('#sbPlaybackStatus')).toBeEmpty({ timeout: 12000 });
  expect(requests).toEqual([{ text: 'Мама ест суп', lang: 'ru-RU', speed: .85, provider: 'yandex' }]);
  await page.locator('#sbPlay').click(); await page.locator('#sbSentenceArea #sb-card-8').click();
  await expect(page.locator('#sbPlaybackStatus')).toBeEmpty();
  await expect.poll(() => page.evaluate(() => (window as unknown as App)._activeAudios.filter(audio => !audio.paused && audio.src.startsWith('blob:')).length)).toBe(0);
});

test('late sentence responses cannot affect another screen or a reopened draft', async ({ page }) => {
  let release!: () => void; const pending = new Promise<void>(yes => { release = yes; }); let requested = false;
  await page.unroute('**/api/tts'); await page.route('**/api/tts', async route => { requested = true; await pending; await route.fulfill({ status: 503, json: {} }).catch(() => {}); });
  await navigate(page, 'sentenceBuilderScreen'); await page.locator('#sb-card-9').click(); await page.locator('#sb-card-2').click();
  await page.locator('#sbPlay').click(); await expect.poll(() => requested).toBe(true);
  await navigate(page, 'grade0SpatialMatrixScreen'); release();
  await expect(page.locator('#sentenceBuilderScreen .card-exercise')).toHaveCount(0);
  await navigate(page, 'sentenceBuilderScreen'); await expect(page.locator('#sbSentenceArea .sb-card')).toHaveCount(2);
  await expect(page.locator('#sbPlaybackStatus')).toBeEmpty(); await expect(page.locator('#sbPlay')).toContainText('Оқу');
});

test('spatial placements survive translation, finish once, and restart only on request', async ({ page }) => {
  // Keep the board and the entire shuffled pool visible during native dragging.
  await page.setViewportSize({ width: 1440, height: 1800 }); await navigate(page, 'grade0SpatialMatrixScreen');
  const pool = page.locator('#spatialCardsArea');
  await expect(pool.locator('.spatial-card')).toHaveCount(16);
  await expect(page.locator('#grade0SpatialMatrixScreen')).toHaveCSS('opacity', '1');
  const order = await pool.locator('.spatial-card').evaluateAll(cards => cards.map(card => card.id));
  await pool.locator('#spcard_0_0').dragTo(page.locator('#spatial_0_1'));
  await expect(page.locator('#spatialResult')).toContainText('Басқа'); await expect(pool.locator('.spatial-card')).toHaveCount(16);
  await pool.locator('#spcard_0_0').dragTo(page.locator('#spatial_0_0'));
  await expect(page.locator('#spatial_0_0 #spcard_0_0')).toBeVisible();
  await pool.locator('#spcard_1_1').click(); await language(page, 'ru');
  await expect(page.locator('#spatial_0_0 #spcard_0_0')).toBeVisible(); await expect(pool.locator('#spcard_1_1')).toHaveAttribute('aria-pressed', 'true');
  expect(await pool.locator('.spatial-card').evaluateAll(cards => cards.map(card => card.id))).toEqual(order.filter(id => id !== 'spcard_0_0'));
  for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
    if (row === 0 && col === 0) continue;
    await pool.locator(`#spcard_${row}_${col}`).click(); await page.locator(`#spatial_${row}_${col}`).click();
  }
  await expect(pool.locator('.spatial-card')).toHaveCount(0); await expect(page.locator('#spatialResult')).toContainText('Все животные на своих местах');
  await page.locator('#spatial_0_0 #spcard_0_0').click(); await expect(page.locator('#spatialResult')).toContainText('Все животные');
  await page.locator('.spatial-restart').click(); await expect(pool.locator('.spatial-card')).toHaveCount(16); await expect(page.locator('#spatialResult')).toBeEmpty();
});

test('spatial recordings play locally and stop on language change and navigation', async ({ page }) => {
  await language(page, 'ru'); await navigate(page, 'grade0SpatialMatrixScreen');
  await page.locator('#spatialHeaderCol1').click();
  await expect(page.locator('#spatialHeaderCol1')).toHaveClass(/spatial-audio-playing/);
  await expect.poll(() => page.evaluate(() => (window as unknown as App)._activeAudios.some(audio => !audio.paused && audio.src.endsWith('ball-behind-bucket.mp3')))).toBe(true);
  await expect(page.locator('#spatialHeaderCol1')).not.toHaveClass(/spatial-audio-playing/, { timeout: 12000 });
  await page.locator('#spatialHeaderCol1').click(); await language(page, 'kk');
  await expect(page.locator('.spatial-audio-playing')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (window as unknown as App)._activeAudios.filter(audio => !audio.paused && /sounds\/ru\/spatial/.test(audio.src)).length)).toBe(0);
  await language(page, 'ru'); await page.locator('#spcard_0_0').click(); await navigate(page, 'grade0Menu');
  await expect(page.locator('#grade0SpatialMatrixScreen .spatial-card')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (window as unknown as App)._activeAudios.filter(audio => !audio.paused && /sounds\/ru\/spatial/.test(audio.src)).length)).toBe(0);
});

test('touch dragging places cards and removes its preview when cancelled or leaving', async ({ page, context }) => {
  await page.setViewportSize({ width: 900, height: 1500 }); await navigate(page, 'grade0SpatialMatrixScreen');
  await expect(page.locator('#grade0SpatialMatrixScreen')).toHaveCSS('opacity', '1');
  const client = await context.newCDPSession(page);
  const card = page.locator('#spatialCardsArea .spatial-card').first(); const id = await card.getAttribute('id');
  const target = page.locator('#spatial_' + id!.replace('spcard_', ''));
  const start = (await card.boundingBox())!, end = (await target.boundingBox())!;
  const x = start.x + start.width / 2, y = start.y + start.height / 2;
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 12, y: y - 12 }] });
  await expect(page.locator('.spatial-drag-ghost')).toHaveCount(1);
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: end.x + end.width / 2, y: end.y + end.height / 2 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(target.locator('.spatial-card')).toHaveCount(1); await expect(page.locator('.spatial-drag-ghost')).toHaveCount(0);
  const next = (await page.locator('#spatialCardsArea .spatial-card').first().boundingBox())!;
  for (const leave of [false, true]) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: next.x + 20, y: next.y + 20 }] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: next.x + 35, y: next.y + 35 }] });
    await expect(page.locator('.spatial-drag-ghost')).toHaveCount(1);
    if (leave) await navigate(page, 'grade0Menu');
    await client.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await expect(page.locator('.spatial-drag-ghost')).toHaveCount(0); await expect(page.locator('.card-dragging')).toHaveCount(0);
  }
  await client.detach();
});

for (const locale of ['kk', 'ru']) test(`card exercises fit a narrow phone in ${locale}`, async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 568 }); await language(page, locale);
  for (const screen of ['sentenceBuilderScreen', 'grade0SpatialMatrixScreen']) {
    await navigate(page, screen); const root = page.locator('#' + screen);
    await expect(root).toHaveCSS('opacity', '1');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(screen + '.png'), fullPage: true, animations: 'disabled' });
    if (screen === 'sentenceBuilderScreen') {
      await page.locator('#sb-card-9').click(); await expect(page.locator('#sbSentenceArea .sb-card')).toHaveCount(1);
      const button = (await page.locator('#sbPlay').boundingBox())!; expect(button.x).toBeGreaterThanOrEqual(0); expect(button.x + button.width).toBeLessThanOrEqual(320);
    } else {
      await root.locator('#spcard_0_3').click(); await root.locator('#spatial_0_3').click(); await expect(root.locator('#spatial_0_3 #spcard_0_3')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await root.locator('.card-exercise-back').click();
  }
});
