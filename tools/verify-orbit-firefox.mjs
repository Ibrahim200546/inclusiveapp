import { firefox, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const browser = await firefox.launch({ executablePath: 'C:/Users/user/AppData/Local/ms-playwright/firefox-1543/firefox/firefox.exe', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 320, height: 568 } }), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => { Object.defineProperty(window, 'SharedWorker', { value: undefined, configurable: true }); localStorage.setItem('profileLang', 'kk'); localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true'); });
  await page.route('**/js/phoneme-worker.js*', route => route.fulfill({ contentType: 'text/javascript', body: 'self.onmessage=({data})=>self.postMessage({id:data.id,ready:true});' }));
  await page.goto('http://127.0.0.1:8322/original/index2.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.showScreen('learningHubScreen'));
  await expect(page.locator('#learningHubScreen select')).toHaveCount(0);
  await page.locator('#learningHubScreen .radial-item').filter({ hasText: 'Санды тап' }).click();
  await expect.poll(() => page.evaluate(() => window._activeAudios.some(audio => audio.currentSrc.includes('find-number') && !audio.paused && !audio.muted && audio.currentTime > 0))).toBe(true);
  const orbit = page.locator('#learningPracticeScreen .exercise-orbit');
  await expect(orbit.locator('svg.handwritten-number')).toHaveCount(10);
  await expect(orbit.locator('.radial-center-btn')).toHaveText('Санды тап');
  await expect(orbit.locator('[data-number]').first()).toBeEnabled();
  await page.screenshot({ path: 'docs/trello-verification/numbers-firefox.png', fullPage: true });
  const centre = orbit.locator('.radial-center-btn');
  for (let cycle = 0; cycle < 2; cycle++) {
    await centre.click(); await expect(orbit).not.toHaveClass(/active/);
    await centre.click(); await expect(orbit).toHaveClass(/active/);
  }
  const layouts = await page.evaluate(() => {
    const found = [...document.querySelectorAll('#learningPracticeScreen [data-number]')].map(n => n.getBoundingClientRect());
    return found.every(b => b.left >= 0 && b.right <= innerWidth) && document.documentElement.scrollWidth <= innerWidth;
  }); expect(layouts).toBe(true);
  await page.evaluate(() => { window.initSpatialGame(); window.showScreen('grade0SpatialMatrixScreen'); });
  await expect(page.locator('.spatial-cell').first()).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  expect(errors).toEqual([]);
  const result = { passed: true, browserVersion: browser.version(), realLocalAudio: true, handwrittenDigits: 10, repeatedDropletCycles: 2, horizontalOverflow: false, transparentSpatialCells: true, pageErrors: errors, scope: 'New exercise UI and real bundled MP3; phoneme worker stubbed' };
  await writeFile('docs/trello-verification/orbit-firefox.json', JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify(result));
} finally { await browser.close(); }
