/* Run against a local preview with Playwright available (no microphone needed):
   BASE_URL=http://127.0.0.1:8080 QA_OUTPUT=/tmp/inclusive-layout node scripts/check-responsive-layout.cjs
   Optionally set CHROMIUM_PATH to an installed Chromium executable. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');

const output = process.env.QA_OUTPUT || '/tmp/inclusive-layout';
const base = process.env.BASE_URL || 'http://127.0.0.1:8080';
const widths = [375, 768, 1366, 1920, 2560];
(async function () {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  });
  const measurements = [];
  try {
    for (const width of widths) {
      const page = await browser.newPage({ viewport: { width, height: width === 375 ? 812 : width === 768 ? 1024 : Math.round(width * 9 / 16) } });
      await page.addInitScript(() => localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true'));
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${base}/original/index2.html`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => typeof window.showScreen === 'function' && document.querySelector('#voicePracticeNote'));
      const assertInViewport = async selector => {
        const boxes = await page.locator(selector).evaluateAll(elements => elements.map(el => {
          const rect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, hidden: style.display === 'none' || style.visibility === 'hidden' };
        }));
        for (const box of boxes.filter(box => !box.hidden && box.width && box.height)) {
          assert.ok(box.x >= -1 && box.x + box.width <= width + 1, `${width}px: ${selector} overflows: ${JSON.stringify(box)}`);
        }
        return boxes;
      };
      await page.locator('#mainRadialMenu .radial-center-btn').click();
      await page.waitForTimeout(600);
      await assertInViewport('#mainRadialMenu .radial-item');
      await page.screenshot({ path: path.join(output, `levels-${width}.png`), fullPage: true });
      await page.evaluate(() => window.showScreen('grade0Menu'));
      await page.waitForTimeout(300);
      await assertInViewport('#grade0Menu .radial-item');
      await page.screenshot({ path: path.join(output, `menu-${width}.png`), fullPage: true });
      await page.evaluate(() => window.showScreen('g0Task2'));
      await page.waitForTimeout(300);
      const center = page.locator('#voiceCenterBtn');
      const centered = async state => {
        const box = await center.boundingBox();
        const parent = await page.locator('#voiceGameContainer').boundingBox();
        assert.ok(box && parent);
        const dx = box.x + box.width / 2 - parent.x - parent.width / 2;
        const dy = box.y + box.height / 2 - parent.y - parent.height / 2;
        if (width > 768) assert.ok(Math.abs(dx) < 1 && Math.abs(dy) < 1, `${width}px ${state} center drift: ${dx}, ${dy}`);
        return { state, box, parent, dx, dy };
      };
      const idle = await centered('idle');
      await center.hover();
      await page.waitForTimeout(200);
      const hover = await centered('hover');
      await page.mouse.down();
      await page.waitForTimeout(200);
      const active = await centered('active');
      // Release outside the control, then activate via keyboard.
      await page.mouse.move(0, 0);
      await page.mouse.up();
      await center.focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
      assert.ok(await page.locator('#voiceGameContainer .small-bubble').count() >= 6);
      const choices = await assertInViewport('#voiceGameContainer .small-bubble');
      await page.screenshot({ path: path.join(output, `voice-${width}.png`), fullPage: true });
      await page.locator('#voiceGameContainer .small-bubble').first().press('Enter');
      await page.locator('#voiceChooseBtn').click();
      await page.waitForTimeout(100);
      assert.equal(await page.locator('#voiceGameContainer .small-bubble[aria-pressed="true"]').count(), 0);
      // Back is in normal document flow and remains reachable above fixed nav.
      const back = page.locator('#g0Task2 .voice-game-wrapper > .btn');
      await back.scrollIntoViewIfNeeded();
      await back.click();
      await page.waitForFunction(() => document.querySelector('#grade0VoiceMenu.screen.active'));
      const body = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
      assert.ok(body.scroll <= body.client + 1, `${width}px page overflow`);
      for (const screen of ['g0Task3', 'g0TaskSyllables']) {
        await page.evaluate(id => window.showScreen(id), screen);
        await page.waitForTimeout(200);
        await assertInViewport(`#${screen} .task-box`);
        await page.screenshot({ path: path.join(output, `${screen}-${width}.png`), fullPage: true });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
        assert.equal(overflow, false, `${width}px ${screen} overflow`);
      }
      assert.deepEqual(errors, [], `${width}px browser page errors`);
      measurements.push({ width, idle, hover, active, choices, body, errors });
      await page.close();
    }
    await fs.writeFile(path.join(output, 'measurements.json'), JSON.stringify(measurements, null, 2));
    console.log(`Responsive layout checks passed for ${widths.join(', ')}px; screenshots and measured bounds: ${output}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
