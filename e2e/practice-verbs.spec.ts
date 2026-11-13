import { expect, test, type Page } from './fixtures';
import type { TtsOptions, TtsResult } from '../src/features/practice/audio/types';

type App = { showScreen(id: string): void; setLangProfile(locale: string): void; _activeAudios: HTMLAudioElement[] };
type Harness = App & {
  appTts: { speakText(text: string, lang?: string, options?: TtsOptions): Promise<TtsResult>; stop(): void };
  verbCalls: { text: string; lang?: string; options?: TtsOptions }[];
  finishVerbSpeech(index: number, ok?: boolean): void;
};
const navigate = (page: Page, id = 'g2VerbModule') => page.evaluate(id => (window as unknown as App).showScreen(id), id);
const language = (page: Page, locale: string) => page.evaluate(locale => (window as unknown as App).setLangProfile(locale), locale);
const errors = new WeakMap<Page, string[]>();
async function speechHarness(page: Page) {
  await page.evaluate(() => {
    const app = window as unknown as Harness, pending: ((result: TtsResult) => void)[] = [];
    app.verbCalls = [];
    app.appTts.speakText = (text, lang, options) => {
      app.verbCalls.push({ text, lang, options });
      return new Promise(resolve => { pending.push(resolve); });
    };
    app.appTts.stop = () => {};
    app.finishVerbSpeech = (index, ok = true) => pending[index]?.(ok ? { ok: true, audioEl: new Audio() } : { ok: false, reason: 'request_failed' });
  });
}
const finish = (page: Page, index: number) => page.evaluate(index => (window as unknown as Harness).finishVerbSpeech(index), index);
const calls = (page: Page) => page.evaluate(() => (window as unknown as Harness).verbCalls);
async function target(page: Page, locale: string) {
  const first = (await page.locator('#g2VerbRoundBadge').innerText()).startsWith('1');
  return first ? (locale === 'kk' ? ['boy', 'ball', 'kick'] : ['boy', 'kick', 'ball'])
    : (locale === 'kk' ? ['cat', 'milk', 'drink'] : ['cat', 'drink', 'milk']);
}
test.beforeEach(async ({ page }) => {
  const messages: string[] = []; errors.set(page, messages); page.on('pageerror', error => messages.push(error.message));
  await page.addInitScript(() => { localStorage.setItem('profileLang', 'kk'); localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true'); });
  await page.route('**/api/tts', route => route.fulfill({ status: 503, json: { error: 'test unavailable' } }));
  await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
});
test.afterEach(async ({ page }) => { expect(errors.get(page)).toEqual([]); });

for (const locale of ['kk', 'ru']) test(`verb module retains both pictogram pages, tabs and menu routes in ${locale}`, async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await language(page, locale); await navigate(page, 'sentenceModuleScreen');
  await page.locator('#sentenceModuleScreen [data-destination="g2VerbModule"]').click();
  const root = page.locator('#g2VerbModule[data-react-owned="true"]');
  await expect(root.locator('h2')).toHaveText(locale === 'kk' ? 'Етістік' : 'Глагол');
  await expect(root.locator('[onclick], [ondrop], [ondragover]')).toHaveCount(0);
  await expect(root.locator('.verb-picto-card')).toHaveCount(6);
  await expect(root.locator('[data-verb-card-id="brush-teeth"]')).toContainText(locale === 'kk' ? 'Ойнады' : 'Играл');
  await expect.poll(() => root.locator('#g2VerbButtonGrid img').evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await page.screenshot({ path: info.outputPath('verbs-pictograms-desktop.png'), animations: 'disabled' });
  await root.locator('#g2VerbNextPageBtn').click(); await expect(root.locator('#g2VerbPageBadge')).toHaveText('2 / 2');
  await expect(root.locator('[data-verb-card-id="play-ball"]')).toContainText(locale === 'kk' ? 'Доп ойнады' : 'Играл в мяч');
  await root.locator('#g2VerbTabButtons').focus(); await page.keyboard.press('ArrowRight');
  await expect(root.locator('#g2VerbTabDrag')).toBeFocused(); await expect(root.locator('#g2VerbTabDrag')).toHaveAttribute('aria-selected', 'true');
  await expect(root.locator('#g2VerbPaneButtons')).toBeHidden(); await expect(root.locator('.verb-bank-card')).toHaveCount(12);
  await expect(root.locator('.verb-bank-card').first()).toBeDisabled(); await page.keyboard.press('Home');
  await expect(root.locator('#g2VerbTabButtons')).toBeFocused(); await expect(root.locator('#g2VerbPageBadge')).toHaveText('2 / 2');
  await root.locator('.verb-back').click(); await expect(page.locator('#sentenceModuleScreen')).toHaveClass(/active/);
  await expect(root.locator('.verb-exercise')).toHaveCount(0);
  expect(await page.evaluate(() => ['g2VerbState', 'g2VerbInit', 'g2VerbStopPlayback'].filter(name => name in window))).toEqual([]);
});

test('real Kazakh sentence recording unlocks the bank only at the end and awards ten coins once', async ({ page }) => {
  await navigate(page); await page.locator('#g2VerbTabDrag').click(); await page.locator('#g2VerbStartDragBtn').click();
  await expect(page.locator('.verb-bank-card').first()).toBeDisabled();
  await expect.poll(() => page.evaluate(() => (window as unknown as App)._activeAudios.some(audio => audio.src.includes('/sounds/kk-human/') && !audio.paused && audio.currentTime > 0))).toBe(true);
  await expect(page.locator('.verb-bank-card').first()).toBeEnabled({ timeout: 20000 });
  const answer = await target(page, 'kk'), round = await page.locator('#g2VerbRoundBadge').innerText();
  for (const [index, id] of answer.entries()) {
    await page.locator(`[data-verb-bank-id="${id}"]`).focus(); await page.keyboard.press('Enter');
    await page.locator(`[data-slot-index="${index}"]`).focus(); await page.keyboard.press('Space');
  }
  await expect(page.locator('#rewardModal')).toHaveClass(/active/); await expect(page.locator('#coinCount')).toHaveText('10');
  await page.locator('#rewardModal button').click(); await language(page, 'ru');
  await expect(page.locator('#g2VerbDragStatus')).toContainText('Правильно'); await expect(page.locator('#coinCount')).toHaveText('10');
  await navigate(page, 'sentenceModuleScreen'); await navigate(page); await expect(page.locator('#coinCount')).toHaveText('10');
  await expect(page.locator('#g2VerbStartDragBtn')).toHaveText('Далее'); await language(page, 'kk');
  await page.locator('#g2VerbStartDragBtn').click(); await expect(page.locator('#g2VerbRoundBadge')).not.toHaveText(round);
  await navigate(page, 'sentenceModuleScreen');
  await expect.poll(() => page.evaluate(() => (window as unknown as App)._activeAudios.filter(audio => audio.src.includes('/sounds/kk-human/') && !audio.paused).length)).toBe(0);
  await expect(page.locator('#rewardModal')).not.toHaveClass(/active/);
});

test('failed narration stays locked, retries the same Russian prompt and checks its spoken word order', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1500 }); await language(page, 'ru'); await navigate(page);
  await page.locator('#g2VerbTabDrag').click(); await page.locator('#g2VerbStartDragBtn').click();
  await expect(page.locator('#g2VerbDragStatus')).toContainText('Звук не загрузился'); await expect(page.locator('.verb-bank-card').first()).toBeDisabled();
  const round = await page.locator('#g2VerbRoundBadge').innerText(), requests: Record<string, unknown>[] = [];
  await page.unroute('**/api/tts'); await page.route('**/api/tts', route => {
    requests.push(route.request().postDataJSON());
    return route.fulfill({ contentType: 'audio/mpeg', path: 'public/original/sounds/ru/spatial/hedgehog-on-stump.mp3' });
  });
  await page.locator('#g2VerbStartDragBtn').click(); await expect(page.locator('.verb-bank-card').first()).toBeDisabled();
  await expect(page.locator('.verb-bank-card').first()).toBeEnabled({ timeout: 12000 }); await expect(page.locator('#g2VerbRoundBadge')).toHaveText(round);
  expect(requests).toEqual([{ text: round.startsWith('1') ? 'Мальчик пнул мяч' : 'Кошка пьет молоко', lang: 'ru-RU', speed: .82, provider: 'yandex' }]);
  const incorrect = await target(page, 'kk');
  for (const [index, id] of incorrect.entries()) {
    await page.locator(`[data-verb-bank-id="${id}"]`).click(); await page.locator(`[data-slot-index="${index}"]`).click();
  }
  await expect(page.locator('#g2VerbDragStatus')).toContainText('Ошибка'); await expect(page.locator('.verb-drop-card')).toHaveCount(0);
  await expect(page.locator('#coinCount')).toHaveText('0'); await expect(page.locator('.verb-bank-card').first()).toBeDisabled();
  await page.locator('#g2VerbStartDragBtn').click(); await expect(page.locator('.verb-bank-card').first()).toBeEnabled({ timeout: 12000 });
  for (const [index, id] of (await target(page, 'ru')).entries()) await page.locator(`[data-verb-bank-id="${id}"]`).dragTo(page.locator(`[data-slot-index="${index}"]`));
  await expect(page.locator('#rewardModal')).toHaveClass(/active/); await expect(page.locator('#coinCount')).toHaveText('10');
});

test('page narration is sequential and page changes or replacement cards cancel the old sequence', async ({ page }) => {
  await speechHarness(page); await navigate(page); await page.locator('#g2VerbPlayPageBtn').click();
  await expect.poll(() => calls(page)).toHaveLength(1); await expect(page.locator('[data-verb-card-id="wash-hands"]')).toHaveClass(/speaking/);
  expect((await calls(page))[0]).toMatchObject({ text: 'Қол жуды', lang: 'kk-KZ', options: { speed: .82, timeoutMs: 8000, exactMatch: true, waitUntilEnd: true } });
  await finish(page, 0); await expect.poll(() => calls(page)).toHaveLength(2);
  expect((await calls(page))[1].text).toBe('Тамақ ішті'); await page.locator('#g2VerbNextPageBtn').click(); await finish(page, 1);
  await expect(page.locator('#g2VerbPageBadge')).toHaveText('2 / 2'); await expect(page.locator('.verb-picto-card.speaking')).toHaveCount(0);
  await page.locator('[data-verb-card-id="play-ball"]').click(); await expect.poll(() => calls(page)).toHaveLength(3);
  await page.locator('[data-verb-card-id="build"]').click(); await finish(page, 2);
  await expect(page.locator('[data-verb-card-id="build"]')).toHaveClass(/speaking/); await finish(page, 3);
  await expect(page.locator('.verb-picto-card.speaking')).toHaveCount(0); expect(await calls(page)).toHaveLength(4);
});

test('late sentence audio cannot unlock answers after language, tab, pagehide or navigation changes', async ({ page }) => {
  await speechHarness(page); await navigate(page); await page.locator('#g2VerbTabDrag').click();
  for (const [index, change] of ['language', 'tab', 'pagehide', 'navigation'].entries()) {
    await page.locator('#g2VerbStartDragBtn').click(); await expect.poll(() => calls(page)).toHaveLength(index + 1);
    if (change === 'language') await language(page, 'ru');
    if (change === 'tab') { await page.locator('#g2VerbTabButtons').click(); await page.locator('#g2VerbTabDrag').click(); }
    if (change === 'pagehide') await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    if (change === 'navigation') { await navigate(page, 'sentenceModuleScreen'); await navigate(page); }
    await finish(page, index); await expect(page.locator('.verb-bank-card').first()).toBeDisabled();
    await expect(page.locator('#g2VerbDragStatus')).toContainText('Дослушайте'); await expect(page.locator('#coinCount')).toHaveText('0');
  }
  await expect(page.locator('#rewardModal')).not.toHaveClass(/active/);
});

test.describe('touch controls', () => {
test.use({ hasTouch: true });
for (const locale of ['kk', 'ru']) test(`verb cards and controls fit a 320 px phone in ${locale}`, async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 568 }); await language(page, locale); await speechHarness(page); await navigate(page);
  for (const dark of [false, true]) {
    if (await page.locator('#theme_toggle_input').isChecked() !== dark) await page.locator('.top-right-controls .switch').click();
    await expect(page.locator('#theme_toggle_input')).toBeChecked({ checked: dark });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`verbs-buttons-${dark ? 'dark' : 'light'}.png`), fullPage: true, animations: 'disabled' });
  }
  await page.locator('[data-verb-card-id="wake-up"]').tap();
  await expect(page.locator('[data-verb-card-id="wake-up"]')).toHaveClass(/speaking/); await finish(page, 0);
  await page.locator('#g2VerbTabDrag').click(); await page.locator('#g2VerbStartDragBtn').click(); await finish(page, 1);
  await expect(page.locator('.verb-bank-card').first()).toBeEnabled();
  const answer = await target(page, locale);
  await page.locator(`[data-verb-bank-id="${answer[0]}"]`).tap();
  await page.locator('[data-slot-index="0"]').tap(); await expect(page.locator('[data-verb-placed-id]')).toHaveCount(1);
  const cells = await page.locator('.verb-drop-slot').evaluateAll(nodes => nodes.map(node => { const b = node.getBoundingClientRect(); return { x: b.x, right: b.right, width: b.width }; }));
  expect(cells.every(cell => cell.x >= 0 && cell.right <= 320 && cell.width >= 44)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('verbs-arrangement.png'), fullPage: true, animations: 'disabled' });
  await page.locator('.verb-back').click(); await expect(page.locator('#sentenceModuleScreen')).toHaveClass(/active/);
});
});
