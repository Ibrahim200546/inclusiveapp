import { test, expect, type Page } from '@playwright/test';

async function prepare(page: Page, locale: string, failFirst = false) {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(locale => {
    localStorage.setItem('locale', locale); localStorage.setItem('profileLang', locale);
    localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true');
  }, locale);
  await page.route('**/js/phoneme-worker.js*', route => route.fulfill({
    contentType: 'text/javascript',
    body: `self.loads = 0; self.onmessage = ({ data }) => {
      if (data.type !== 'load') return;
      self.loads++; self.loadId = data.id;
      if (${failFirst} && self.loads === 1) { self.postMessage({id:data.id,error:'Failed to fetch'}); return; }
      self.postMessage({type:'download',progress:27,loaded:30,total:100});
      if (${failFirst}) setTimeout(() => self.postMessage({id:data.id,ready:true}),300);
    };`,
  }));
  await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
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
    // The status stays in the normal header flow, outside the central control.
    expect(await page.locator('#mainRadialMenu > .radial-center-btn').evaluate(element => {
      const a = element.getBoundingClientRect(), b = document.getElementById('trainModelStatus')!.getBoundingClientRect();
      return a.top < b.bottom && b.top < a.bottom && a.left < b.right && b.left < a.right;
    })).toBe(false);
    await page.evaluate(() => (window as unknown as { showScreen(id: string): void }).showScreen('g0Task2'));
    await expect(page.locator('#trainModelExerciseStatus')).toBeVisible();
    await expect(page.locator('#trainModelExerciseStatus')).toContainText('27%');
    await page.workers()[0].evaluate(() => {
      const worker = self as unknown as { loadId: number; postMessage(value: unknown): void };
      worker.postMessage({ id: worker.loadId, ready: true });
    });
    await expect(page.locator('#trainModelExerciseStatus')).toHaveAttribute('data-state', 'ready');
    await expect(page.locator('#trainModelExerciseStatus progress')).toBeHidden();
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
