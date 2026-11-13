import { expect, test, type Page } from './fixtures';

// Exercise the browser media pipeline with Chromium's synthetic microphone.
test.use({ launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] }, permissions: ['microphone'] });

type App = Window & typeof globalThis & {
  showScreen(id: string): void; openArticulationMap(from?: string): void; setLangProfile(locale: string): void;
  stopAllAppAudio(): void; _activeAudios: HTMLAudioElement[]; mapStreams: MediaStream[]; mapContexts: AudioContext[];
  mapReads: number;
  releaseMapPermission?(): void;
};
const errors = new WeakMap<Page, string[]>();
const navigate = (page: Page, id = 'g0ArticulationMap') => page.evaluate(id => (window as App).showScreen(id), id);
const language = (page: Page, locale: string) => page.evaluate(locale => (window as App).setLangProfile(locale), locale);
const node = (page: Page, ring: number, letter: string) => page.locator(`#articulationCircle [data-artic-ring="${ring}"][data-artic-letter="${letter}"]`);
async function openLesson(page: Page) {
  await navigate(page); await page.locator('.artic-center-group').click();
  await node(page, 1, 'А').click(); await node(page, 1, 'А').click(); await expect(page.locator('#articulationModal')).toBeVisible();
}
async function probeMicrophone(page: Page) {
  await page.evaluate(() => {
    const app = window as App; app.mapStreams = []; app.mapContexts = []; app.mapReads = 0;
    const Original = window.AudioContext;
    window.AudioContext = class extends Original {
      constructor(options?: AudioContextOptions) { super(options); app.mapContexts.push(this); }
      createAnalyser() {
        const analyser = super.createAnalyser(), read = analyser.getByteFrequencyData.bind(analyser);
        analyser.getByteFrequencyData = bins => { app.mapReads++; read(bins); }; return analyser;
      }
    };
    const request = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async constraints => { const stream = await request(constraints); app.mapStreams.push(stream); return stream; };
  });
}
async function released(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const app = window as App;
    return app.mapContexts.every(context => context.state === 'closed') && app.mapStreams.every(stream => stream.getTracks().every(track => track.readyState === 'ended'));
  })).toBe(true);
}
test.beforeEach(async ({ page }) => {
  const messages: string[] = []; errors.set(page, messages); page.on('pageerror', error => messages.push(error.message));
  await page.addInitScript(() => { localStorage.setItem('profileLang', 'kk'); localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true'); });
  await page.route('**/api/tts', route => route.fulfill({ status: 503, json: { error: 'test unavailable' } }));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
});
test.afterEach(async ({ page }) => { expect(errors.get(page)).toEqual([]); });

for (const locale of ['kk', 'ru']) test(`React sound map preserves rings, keyboard lessons and the menu return in ${locale}`, async ({ page }, info) => {
  await language(page, locale); await navigate(page, 'grade0Menu');
  await page.locator('#grade0Menu').getByRole('button', { name: locale === 'kk' ? 'Дыбыс картасы' : 'Карта звуков', exact: true }).click();
  const screen = page.locator('#g0ArticulationMap');
  await expect(screen).toHaveAttribute('data-react-owned', 'true'); await expect(screen.locator('[onclick]')).toHaveCount(0);
  await expect(page.locator('.artic-map-node[tabindex="0"]')).toHaveCount(0);
  await page.locator('.artic-center-group').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('.ring-1[tabindex="0"]')).toHaveCount(18);
  await node(page, 1, 'К').click(); await expect(page.locator('.ring-2[tabindex="0"]')).toHaveCount(3);
  await expect(page.locator('.ring-3[tabindex="0"]')).toHaveCount(2);
  await node(page, 2, 'Х').focus(); await page.keyboard.press('Enter');
  await expect(node(page, 3, 'Һ')).toHaveAttribute('tabindex', '0');
  await page.screenshot({ path: info.outputPath('map-desktop.png'), fullPage: true, animations: 'disabled' });
  await page.keyboard.press('Space');
  const modal = page.locator('#articulationModal'); await expect(modal).toHaveAttribute('role', 'dialog');
  await expect(page.locator('#lessonLetter')).toHaveText('Х'); await expect(page.locator('#lessonMouth')).toHaveAttribute('data-mouth-index', '4');
  await expect(modal.locator('[onclick]')).toHaveCount(0); await expect(modal.locator('.artic-lesson-close')).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(page.locator('#articRecord')).toBeFocused();
  await page.keyboard.press('Tab'); await expect(modal.locator('.artic-lesson-close')).toBeFocused();
  expect(await page.locator('.container').evaluate(element => (element as HTMLElement).inert)).toBe(true);
  await page.keyboard.press('Escape'); await expect(modal).toHaveCount(0); await expect(node(page, 2, 'Х')).toBeFocused();
  expect(await page.locator('.container').evaluate(element => (element as HTMLElement).inert)).toBe(false);
  await page.locator('#articResetBtn').click(); await expect(page.locator('.artic-map-node[tabindex="0"]')).toHaveCount(0);
  await page.locator('.artic-back').click(); await expect(page.locator('#grade0Menu')).toHaveClass(/active/); await expect(screen.locator('svg')).toHaveCount(0);
  expect(await page.evaluate(() => ['initArticulationMap', 'closeArticulationModal', 'startMicrophoneCheck', 'playLessonAudio'].filter(name => name in window))).toEqual([]);
});

test('the real letter sample plays locally, retries failures and stops on language changes and exit', async ({ page }) => {
  await language(page, 'ru'); await openLesson(page);
  await expect.poll(() => page.evaluate(() => (window as App)._activeAudios.some(audio => audio.src.includes('/sounds/letters/') && !audio.paused && audio.currentTime > .02))).toBe(true);
  await expect(page.locator('#articListen')).toContainText('Послушать', { timeout: 12000 });
  await page.route('**/sounds/letters/**', route => route.abort()); await page.locator('#articListen').click();
  await expect(page.locator('#aiFeedback')).toContainText('Не удалось загрузить');
  await page.unroute('**/sounds/letters/**'); await page.locator('#articListen').click(); await language(page, 'kk');
  await expect(page.locator('#aiFeedback')).toContainText('тоқтатылды');
  await expect.poll(() => page.evaluate(() => (window as App)._activeAudios.filter(audio => audio.src.includes('/sounds/letters/') && !audio.paused).length)).toBe(0);
  await page.locator('#articListen').click(); await navigate(page, 'grade2Menu'); await expect(page.locator('#articulationModal')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (window as App)._activeAudios.filter(audio => audio.src.includes('/sounds/letters/') && !audio.paused).length)).toBe(0);
  await page.evaluate(() => (window as App).openArticulationMap('grade2Menu')); await page.locator('.artic-back').click();
  await expect(page.locator('#grade2Menu')).toHaveClass(/active/);
});

test('microphone permission errors close their context and can be retried', async ({ page }) => {
  await language(page, 'ru'); await openLesson(page); await probeMicrophone(page);
  await page.evaluate(() => { navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Denied', 'NotAllowedError'); }; });
  await page.locator('#articRecord').click(); await expect(page.locator('#aiFeedback')).toContainText('Разрешите доступ'); await released(page);
  await page.locator('#articRecord').click(); await expect.poll(() => page.evaluate(() => (window as App).mapContexts.length)).toBe(2);
  await released(page); await expect(page.locator('#coinCount')).toHaveText('0'); await page.keyboard.press('Escape');
});

test.describe('browser microphone', () => {
  test('recording uses Web Audio, auto-stops and releases the device on every interruption', async ({ page }) => {
    await language(page, 'ru'); await openLesson(page); await probeMicrophone(page);
    await page.locator('#articRecord').click(); await expect(page.locator('#articRecord')).toContainText('Завершить');
    await expect.poll(() => page.evaluate(() => (window as App).mapStreams.some(stream => stream.getAudioTracks().some(track => track.readyState === 'live')))).toBe(true);
    // A valid capture can contain silence; the controlled-spectrum test checks bars.
    await expect.poll(() => page.evaluate(() => (window as App).mapReads)).toBeGreaterThanOrEqual(6);
    await expect(page.locator('#articRecord')).toContainText('Попробуй', { timeout: 6000 }); await released(page);
    const coins = await page.locator('#coinCount').innerText();
    for (const change of ['sample', 'language', 'pagehide', 'close', 'navigation']) {
      if (!await page.locator('#articulationModal').count()) await openLesson(page);
      await page.locator('#articRecord').click(); await expect(page.locator('#articRecord')).toContainText(/Завершить|Аяқтау/);
      if (change === 'sample') await page.locator('#articListen').click();
      if (change === 'language') await language(page, 'kk');
      if (change === 'pagehide') await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
      if (change === 'close') await page.keyboard.press('Escape');
      if (change === 'navigation') await navigate(page, 'grade0Menu');
      await released(page); await expect(page.locator('#coinCount')).toHaveText(coins);
    }
  });
  test('a delayed permission grant cannot restart capture after closing the lesson', async ({ page }) => {
    await openLesson(page); await probeMicrophone(page);
    await page.evaluate(() => {
      const request = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = async constraints => {
        await new Promise<void>(resolve => { (window as App).releaseMapPermission = resolve; }); return request(constraints);
      };
    });
    await page.locator('#articRecord').click(); await expect(page.locator('#aiFeedback')).toContainText('қосылуда');
    await page.keyboard.press('Escape'); await page.evaluate(() => (window as App).releaseMapPermission!());
    await expect.poll(() => page.evaluate(() => (window as App).mapStreams.length)).toBe(1); await released(page);
    await expect(page.locator('#articulationModal')).toHaveCount(0); await expect(page.locator('#coinCount')).toHaveText('0');
  });
  test('a controlled matching spectrum awards ten coins once and keeps the feedback visible in the lesson', async ({ page }) => {
    await language(page, 'ru'); await openLesson(page); await probeMicrophone(page);
    await page.evaluate(() => {
      const app = window as App & { mapFrames: number }; app.mapFrames = 0;
      const create = AudioContext.prototype.createAnalyser;
      AudioContext.prototype.createAnalyser = function () {
        const analyser = create.call(this);
        // The device and Web Audio lifecycle are real; only spectral bins are controlled.
        analyser.getByteFrequencyData = bins => { bins.fill(0); bins.fill(255, 0, 128); app.mapFrames++; };
        return analyser;
      };
    });
    await page.locator('#articRecord').click();
    await expect.poll(() => page.evaluate(() => (window as App & { mapFrames: number }).mapFrames)).toBeGreaterThanOrEqual(6);
    await expect.poll(() => page.locator('.artic-level').evaluateAll(nodes => nodes.some(node => Number((node as HTMLElement).style.transform.match(/[\d.]+/)?.[0]) > .05))).toBe(true);
    await page.locator('#articRecord').click(); await released(page);
    await expect(page.locator('#aiFeedback')).toContainText('Звук похож на образец'); await expect(page.locator('.artic-earned')).toHaveText('+10 🪙');
    await expect(page.locator('#coinCount')).toHaveText('10'); await expect(page.locator('#rewardModal')).not.toHaveClass(/active/);
    await language(page, 'kk'); await expect(page.locator('#coinCount')).toHaveText('10');
    await page.keyboard.press('Escape'); await openLesson(page); await expect(page.locator('#coinCount')).toHaveText('10');
    await expect(page.locator('.artic-earned')).toHaveCount(0);
  });
});

test.describe('touch controls', () => {
  test.use({ hasTouch: true });
  for (const locale of ['kk', 'ru']) test(`sound map and lesson fit a 320 px phone in ${locale}`, async ({ page }, info) => {
    await page.setViewportSize({ width: 320, height: 568 }); await language(page, locale); await navigate(page);
    await page.locator('.artic-mobile-center').tap(); const map = page.locator('.artic-mobile-map');
    await expect(map.locator('[data-artic-ring="1"]')).toHaveCount(18);
    await map.locator('[data-artic-letter="К"]').tap(); await map.locator('[data-artic-letter="Қ"]').tap();
    await expect(map.locator('[data-artic-letter="Ғ"]')).toHaveCount(1);
    const boxes = await map.locator('button').evaluateAll(buttons => buttons.map(button => { const box = button.getBoundingClientRect(); return { x: box.x, right: box.right, width: box.width, height: box.height }; }));
    expect(boxes.every(box => box.x >= 0 && box.right <= 320 && box.width >= 44 && box.height >= 44)).toBe(true);
    for (const dark of [false, true]) {
      if (await page.locator('#theme_toggle_input').isChecked() !== dark) await page.locator('.top-right-controls .switch').click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`map-${dark ? 'dark' : 'light'}.png`), fullPage: true, animations: 'disabled' });
    }
    await map.locator('[data-artic-letter="Қ"]').tap(); await expect(page.locator('#articulationModal')).toBeVisible();
    await expect(page.locator('#lessonMouth')).toHaveAttribute('data-mouth-index', '4');
    await page.locator('#articRecord').scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath('lesson-phone.png'), animations: 'disabled' });
    expect(await page.locator('.lesson-card').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.setViewportSize({ width: 844, height: 390 }); await page.locator('#articRecord').scrollIntoViewIfNeeded();
    expect(await page.locator('.artic-lesson-close').evaluate(element => { const box = element.getBoundingClientRect(); return box.top >= 0 && box.bottom <= innerHeight; })).toBe(true);
    await page.screenshot({ path: info.outputPath('lesson-landscape.png'), animations: 'disabled' });
    await page.locator('.artic-lesson-close').tap(); await page.locator('.artic-back').tap();
    await expect(page.locator('#levelsScreen')).toHaveClass(/active/);
  });
});
