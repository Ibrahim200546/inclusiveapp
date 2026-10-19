import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript(() => { Object.defineProperty(window, 'SharedWorker', { value: undefined, configurable: true }); localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true'); });
  await page.route('**/js/phoneme-worker.js*', route => route.fulfill({ contentType: 'text/javascript', body: 'self.onmessage=({data})=>self.postMessage({id:data.id,ready:true});' }));
  await page.goto('http://127.0.0.1:8322/original/index2.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    window.initSpatialGame();
    for (const id of ['g0ArticulationLessons', 'g0QSoundAdventure', 'g0AutumnStory']) window.showScreen(id);
  });
  const result = await page.evaluate(() => {
    const surfaces = [], screens = [...document.querySelectorAll('.screen')], initiallyActive = screens.filter(s => s.classList.contains('active'));
    screens.forEach(s => s.classList.remove('active'));
    for (const screen of screens) {
      screen.classList.add('active');
      for (const element of screen.querySelectorAll('div,section,article,main,table,td,li')) {
        const b = element.getBoundingClientRect(), style = getComputedStyle(element), rgba = style.backgroundColor.match(/[\d.]+/g)?.map(Number);
        if (b.width < 35 || b.height < 35 || !rgba || rgba.length < 3 || (rgba.length > 3 && rgba[3] < .6)) continue;
        if (rgba.slice(0, 3).every(v => v >= 244)) surfaces.push({ screen: screen.id, id: element.id, className: element.className, color: style.backgroundColor, width: Math.round(b.width), height: Math.round(b.height) });
      }
      screen.classList.remove('active');
    }
    initiallyActive.forEach(s => s.classList.add('active')); return { screens: screens.length, surfaces };
  });
  await page.evaluate(() => { window.initSpatialGame(); window.showScreen('grade0SpatialMatrixScreen'); scrollTo(0, 0); });
  await page.screenshot({ path: 'docs/trello-verification/spatial-transparent.png', fullPage: true });
  await writeFile('docs/trello-verification/exercise-surface-audit.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
} finally { await browser.close(); }
