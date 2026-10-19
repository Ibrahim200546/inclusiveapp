import { test, expect, type Locator } from './fixtures';

async function clearMotion(orbit: Locator) {
  await expect.poll(() => orbit.evaluate(element => (element.closest('.screen') || element).getAnimations({ subtree: true }).some(a => a.playState === 'running' && a.effect?.getTiming().iterations !== Infinity))).toBe(false);
}
async function geometry(orbit: Locator) {
  await clearMotion(orbit);
  expect(await orbit.locator(':scope > .radial-item, :scope > .radial-center-btn').evaluateAll(items => {
    const boxes = items.map(item => item.getBoundingClientRect());
    return boxes.every((box, i) => box.width >= 47 && box.height >= 47 && box.left >= 0 && box.right <= innerWidth && boxes.every((other, j) => i === j || Math.hypot(box.x + box.width / 2 - other.x - other.width / 2, box.y + box.height / 2 - other.y - other.height / 2) >= Math.min(box.width, box.height) / 2 + Math.min(other.width, other.height) / 2));
  })).toBe(true);
  for (const control of await orbit.locator(':scope > .radial-item, :scope > .radial-center-btn').all()) {
    await control.evaluate(node => node.scrollIntoView({ block: 'center', inline: 'nearest' }));
    expect(await control.evaluate(node => { const b = node.getBoundingClientRect(), hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return !!hit && node.contains(hit); })).toBe(true);
  }
}
for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
  test(`all listening modes and curriculum use readable orbits at ${viewport.width}`, async ({ page }) => {
    test.setTimeout(90000); await page.setViewportSize(viewport);
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => { localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true'); localStorage.setItem('profileLang', 'kk'); });
    await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => (window as unknown as { showScreen(id: string): void }).showScreen('learningHubScreen'));
    await expect(page.locator('#learningHubScreen select')).toHaveCount(0);
    const labels = ['Санды тап', 'Неше рет естідің?', 'Ырғақты таңда', 'Тез / Баяу', 'Дыбыс биіктігі'];
    for (const label of labels) {
      await page.locator('#learningHubScreen .radial-item').filter({ hasText: label }).click();
      const orbit = page.locator('#learningPracticeScreen .exercise-orbit');
      await expect(orbit.locator('.radial-center-btn')).toHaveText(label); await geometry(orbit);
      if (label === 'Санды тап') {
        await expect(orbit).not.toHaveClass(/exercise-picture-orbit/);
        await expect(orbit.locator('svg.handwritten-number')).toHaveCount(10);
        const positions = await orbit.locator('[data-number]').evaluateAll(nodes => nodes.map(n => n.getAttribute('style')));
        await page.screenshot({ path: `docs/trello-verification/numbers-radial-${viewport.width}.png`, fullPage: true });
        await page.getByRole('button', { name: 'Қайта бастау', exact: true }).click();
        expect(await orbit.locator('[data-number]').evaluateAll(nodes => nodes.map(n => n.getAttribute('style')))).not.toEqual(positions);
        const canvas = page.locator('.learning-drawing canvas'); await page.locator('.learning-drawing summary').click();
        await canvas.scrollIntoViewIfNeeded(); const box = (await canvas.boundingBox())!;
        await page.mouse.move(box.x + 30, box.y + 30); await page.mouse.down(); await page.mouse.move(box.x + 65, box.y + 50, { steps: 5 }); await page.mouse.up();
        expect(await canvas.evaluate(c => (c as HTMLCanvasElement).getContext('2d')!.getImageData(0, 0, 640, 260).data.some((value, i) => i % 4 === 3 && value > 0))).toBe(true);
        await page.getByRole('button', { name: 'Тазалау', exact: true }).click();
        expect(await canvas.evaluate(c => (c as HTMLCanvasElement).getContext('2d')!.getImageData(0, 0, 640, 260).data.some((value, i) => i % 4 === 3 && value > 0))).toBe(false);
        // Repeated toggles use the existing droplet animation and retain labels.
        for (let repeat = 0; repeat < 2; repeat++) {
          await orbit.locator('.radial-center-btn').click(); await clearMotion(orbit); await expect(orbit).not.toHaveClass(/active/);
          await orbit.locator('.radial-center-btn').click(); await clearMotion(orbit); await expect(orbit).toHaveClass(/active/);
        }
      } else {
        await expect(orbit).toHaveClass(/exercise-picture-orbit/);
        for (const item of await orbit.locator(':scope > button.radial-item').all()) {
          await expect(item).toHaveCSS('border-top-width', '0px');
          await expect(item.locator(':scope > .exercise-orbit-icon')).toHaveAttribute('aria-hidden', 'true');
          await expect(item.locator(':scope > .exercise-orbit-caption')).toHaveText(await item.getAttribute('aria-label') || '');
          expect(await item.evaluate(n => {
            const picture = n.querySelector('.exercise-orbit-icon')!.getBoundingClientRect(), caption = n.querySelector('.exercise-orbit-caption')!.getBoundingClientRect();
            return caption.top >= picture.bottom && caption.left >= 0 && caption.right <= innerWidth;
          })).toBe(true);
          const caption = item.locator('.exercise-orbit-caption');
          await caption.evaluate(n => n.scrollIntoView({ block: 'center', inline: 'nearest' }));
          expect(await caption.evaluate(n => {
            const b = n.getBoundingClientRect(), y = b.y + b.height / 2;
            return [b.left + 2, b.right - 2].every(x => { const hit = document.elementFromPoint(x, y); return !!hit && n.contains(hit); });
          })).toBe(true);
        }
        await page.evaluate(() => scrollTo(0, 0));
        await clearMotion(orbit);
        await page.screenshot({ path: `docs/trello-verification/listening-pictures-${labels.indexOf(label)}-${viewport.width}.png`, fullPage: true });
      }
      await page.locator('#learningPracticeScreen').getByRole('button', { name: 'Артқа' }).click();
    }
    await page.evaluate(() => (window as unknown as { CorexCurriculumUI: { open(grade: number, from: string): void } }).CorexCurriculumUI.open(1, 'grade0Menu'));
    await page.getByRole('tab', { name: 'Сөйлеу', exact: true }).click();
    const speech = page.locator('#curriculum-lessons'); await geometry(speech);
    for (const card of await speech.locator('[data-lesson]').all()) {
      await expect(card.locator(':scope > .curriculum-orbit-icon')).toBeVisible();
      await expect(card.locator(':scope > .curriculum-orbit-caption')).toBeVisible();
      await expect(card).toHaveCSS('border-top-width', '0px');
      expect(await card.evaluate(n => { const icon = n.querySelector('.curriculum-orbit-icon')!.getBoundingClientRect(), caption = n.querySelector('.curriculum-orbit-caption')!.getBoundingClientRect(); return caption.top >= icon.bottom && caption.left >= 0 && caption.right <= innerWidth; })).toBe(true);
    }
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `docs/trello-verification/curriculum-pictures-menu-${viewport.width}.png`, fullPage: true });
    await page.getByRole('tab', { name: 'Дыбыстар', exact: true }).click();
    const catalog = page.locator('#curriculum-lessons'); await geometry(catalog);
    await expect(catalog.locator('[data-lesson]')).toHaveCount(4);
    const before = await catalog.locator('[data-lesson]').evaluateAll(nodes => nodes.map(n => n.getAttribute('data-lesson')));
    await page.locator('.curriculum-pager button').last().click();
    const after = await catalog.locator('[data-lesson]').evaluateAll(nodes => nodes.map(n => n.getAttribute('data-lesson'))); expect(after).not.toEqual(before);
    await catalog.locator('[data-lesson]').first().click();
    await expect(page.locator('#curriculumPractice .radial-center-btn')).toHaveText(await page.locator('#curriculumPractice h2').innerText());
    await geometry(page.locator('#curriculumPractice .exercise-orbit'));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `docs/trello-verification/curriculum-radial-${viewport.width}.png`, fullPage: true }); expect(errors).toEqual([]);
  });
}

test('spatial and sentence exercise panels have transparent surfaces in both themes', async ({ page }) => {
  await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => (window as unknown as { initSpatialGame(): void }).initSpatialGame());
  for (const dark of [false, true]) for (const screen of ['grade0SpatialMatrixScreen', 'sentenceBuilderScreen']) {
    await page.evaluate(({ dark, screen }) => { document.body.classList.toggle('theme-dark', dark); (window as unknown as { showScreen(id: string): void }).showScreen(screen); }, { dark, screen });
    const wrapper = page.locator('#' + screen + ' .task-flex-container');
    await expect(wrapper).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    if (screen === 'grade0SpatialMatrixScreen') await expect(page.locator('.spatial-cell').first()).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    const whites = await wrapper.locator('div').evaluateAll(nodes => nodes.filter(n => {
      const s = getComputedStyle(n); return s.backgroundColor === 'rgb(255, 255, 255)' && n.getBoundingClientRect().width > 100;
    }).length); expect(whites).toBe(0);
  }
});

test('all 115 approved lessons remain reachable through the paginated radial catalogue', async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
  const expected = await page.evaluate(() => (window as unknown as { CorexCurriculumContent: { lessons: { id: string; grade: number }[] } }).CorexCurriculumContent.lessons.map(({ id, grade }) => ({ id, grade })));
  const found: string[] = [];
  for (const grade of [0, 1, 2, 3, 4]) {
    await page.evaluate(grade => (window as unknown as { CorexCurriculumUI: { open(grade: number, from: string): void } }).CorexCurriculumUI.open(grade, 'grade0Menu'), grade);
    for (const tab of await page.locator('.curriculum-tabs button').all()) {
      // Rendering a category recreates the tab buttons, so retain their name.
      const name = await tab.textContent(); await page.getByRole('tab', { name: name!, exact: true }).click();
      for (;;) {
        await clearMotion(page.locator('#curriculum-lessons'));
        for (const card of await page.locator('[data-lesson]').all()) {
          await expect(card.locator(':scope > .curriculum-orbit-icon')).toHaveAttribute('aria-hidden', 'true');
          await expect(card.locator(':scope > .curriculum-orbit-caption')).toHaveText(await card.getAttribute('aria-label') || '');
          await expect(card).toHaveCSS('border-top-width', '0px');
          expect(await card.evaluate(n => {
            const picture = n.querySelector('.curriculum-orbit-icon')!.getBoundingClientRect(), label = n.querySelector('.curriculum-orbit-caption')!.getBoundingClientRect();
            return label.top >= picture.bottom && label.left >= 0 && label.right <= innerWidth;
          })).toBe(true);
        }
        // A shared lesson intentionally has the same id in different grades.
        found.push(...(await page.locator('[data-lesson]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-lesson')!))).map(id => `${grade}:${id}`));
        const next = page.locator('.curriculum-pager button').last();
        if (!await next.count() || await next.isDisabled()) break;
        await next.click();
      }
    }
  }
  expect(found.length).toBe(115); expect(new Set(found).size).toBe(115); expect(found.sort()).toEqual(expected.map(l => `${l.grade}:${l.id}`).sort());
});
