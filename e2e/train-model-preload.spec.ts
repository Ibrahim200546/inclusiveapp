import { test, expect, type Page } from '@playwright/test';

async function prepare(page: Page, locale: string, failFirst = false, path = '/original/index2.html', transient = false) {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(locale => {
    Object.defineProperty(window, 'SharedWorker', { value: undefined, configurable: true });
    localStorage.setItem('locale', locale); localStorage.setItem('profileLang', locale);
    localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true');
  }, locale);
  await page.route('**/js/phoneme-worker.js*', route => route.fulfill({
    contentType: 'text/javascript',
    body: `self.loads = 0; self.onmessage = ({ data }) => {
      if (data.type !== 'load') return;
      self.loads++; self.loadId = data.id;
      if (${failFirst} && self.loads === 1) { self.postMessage({id:data.id,error:${JSON.stringify(transient ? 'Failed to fetch' : 'Invalid model configuration')}}); return; }
      self.postMessage({type:'download',progress:27,loaded:30,total:100});
      if (${failFirst}) setTimeout(() => self.postMessage({id:data.id,ready:true}),300);
    };`,
  }));
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  return errors;
}

for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
  test(`background model progress remains accessible ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors = await prepare(page, viewport.width === 844 ? 'ru' : 'kk');
    const status = page.locator('#trainModelStatus');
    await expect(status).toHaveAttribute('data-state', 'loading');
    await expect(status.locator('progress')).toHaveAttribute('value', '27');
    await expect(status).toContainText('27%');
    await expect(status).toBeVisible();
    expect(await page.workers()[0].evaluate(() => (self as unknown as { loads: number }).loads)).toBe(1);
    // One quiet indicator sits at the bottom, outside all central controls.
    expect(await status.evaluate(element => element.parentElement === document.body)).toBe(true);
    expect(await status.evaluate(element => {
      const box = element.getBoundingClientRect();
      return box.height <= 32 && box.top > innerHeight * 0.65;
    })).toBe(true);
    expect(await page.locator('#mainRadialMenu > .radial-center-btn').evaluate(element => {
      const a = element.getBoundingClientRect(), b = document.getElementById('trainModelStatus')!.getBoundingClientRect();
      return a.top < b.bottom && b.top < a.bottom && a.left < b.right && b.left < a.right;
    })).toBe(false);
    await page.evaluate(() => (window as unknown as { showScreen(id: string): void }).showScreen('g0Task2'));
    await expect(status).toBeVisible();
    await expect(status).toContainText('27%');
    await expect(page.locator('#trainModelExerciseStatus')).toHaveCount(0);
    await page.workers()[0].evaluate(() => {
      const worker = self as unknown as { loadId: number; postMessage(value: unknown): void };
      worker.postMessage({ id: worker.loadId, ready: true });
    });
    await expect(status).toHaveAttribute('data-state', 'ready');
    await expect(status.locator('progress')).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('interrupted preload recovers through the keyboard retry button', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  const errors = await prepare(page, 'ru', true);
  const status = page.locator('#trainModelStatus');
  await expect(status).toHaveAttribute('data-state', 'error');
  const retry = status.getByRole('button', { name: 'Загрузить снова' });
  await expect(retry).toBeVisible(); await retry.focus(); await page.keyboard.press('Enter');
  await expect(status).toHaveAttribute('data-state', 'ready'); await expect(retry).toBeHidden();
  expect(await page.workers()[0].evaluate(() => (self as unknown as { loads: number }).loads)).toBe(2);
  await expect(page.locator('#voiceFeedback')).not.toContainText('Тану моделі қолжетімсіз');
  expect(errors).toEqual([]);
});

test('preparation begins on the landing page before practice is opened', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await prepare(page, 'kk', false, '/');
  const status = page.locator('#trainModelStatus');
  await expect(status).toHaveAttribute('data-state', 'loading');
  await expect(status).toContainText('27%');
  const nav = page.locator('.landing-mobile-bottom-nav');
  await expect(nav).toBeVisible();
  const indicatorBox = await status.boundingBox(), navBox = await nav.boundingBox();
  expect(indicatorBox!.y).toBeGreaterThanOrEqual(navBox!.y + navBox!.height);
  expect(errors).toEqual([]);
});

test('a transient fetch failure recovers without a persistent error panel', async ({ page }) => {
  const errors = await prepare(page, 'ru', true, '/', true);
  const status = page.locator('#trainModelStatus');
  await expect(status).toHaveAttribute('data-state', 'ready');
  await expect(status.getByRole('button')).toBeHidden();
  await expect(page.locator('body')).not.toContainText('Жүктеу үзілді. Қайталап көріңіз.');
  expect(await page.workers()[0].evaluate(() => (self as unknown as { loads: number }).loads)).toBe(2);
  await expect(status).toBeHidden({ timeout: 6000 });
  expect(errors).toEqual([]);
});
