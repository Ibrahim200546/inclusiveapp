import { test, expect, type Locator, type Page } from './fixtures';
import { openGrade, openModule, findRadialEntry, returnToGrade } from './radial-navigation';

// Exercise real controls so navigation cannot pass solely because showScreen
// accepts the expected IDs. Scrolling is allowed on short mobile screens.
async function click(control: Locator) {
  await control.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest' }));
  await expect.poll(() => control.evaluate(element => {
    const box = element.getBoundingClientRect();
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return box.width > 0 && box.height > 0 && !!hit && element.contains(hit);
  })).toBe(true);
  await control.click();
}

async function settled(page: Page, id: string) {
  const screen = page.locator(`#${id}`);
  await expect(screen).toHaveClass(/active/);
  await expect.poll(() => screen.evaluate(element => element.getAnimations({ subtree: true })
    .some(animation => animation.playState === 'running' && animation.effect?.getTiming().iterations !== Infinity))).toBe(false);
}

for (const initialLocale of ['kk', 'ru']) {
  test(`voice labels survive language round trips from ${initialLocale}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openHub(page, initialLocale);

    for (const locale of ['ru', 'kk', 'ru', 'kk']) {
      await page.locator(`#top-lang-btn-${locale}`).click();
      await expect(page.locator('#curriculumCatalog [data-activity="g0DauyspTask1"]')).toHaveAttribute('aria-label', locale === 'kk'
        ? 'Дауыстап, жай, сыбырлап' : 'Громко, обычно, шёпотом');
      await expect(page.locator('#curriculumCatalog h2')).toHaveText(locale === 'kk' ? '🗣️ Сөйлеу' : '🗣️ Речь');
    }
    // Cards are rendered in the selected language before DOM translation runs.
    await page.locator('#top-lang-btn-ru').click();
    await click(await findRadialEntry(page, 'data-activity', 'g0DauyspTask1'));
    await settled(page, 'g0DauyspTask1');
    const lesson = page.locator('#g0DauyspTask1');
    await expect(lesson.locator('h2')).toHaveText('🎙️ Громко, обычно, шёпотом');
    await expect(lesson.locator('.dv-mode-btn')).toHaveText(['📢 Громко', '🗣️ Обычно', '🤫 Шёпотом']);
    await click(lesson.locator('.dv-mode-btn[data-dv-mode="zhay"]'));
    await expect(lesson.locator('.dv-mode-btn[data-dv-mode="zhay"]')).toHaveAttribute('aria-selected', 'true');
    await expect(lesson.locator('.dv-card').first()).toContainText('ОБЫЧНО 🗣️');
    await page.locator('#top-lang-btn-kk').click();
    await expect(lesson.locator('h2')).toHaveText('🎙️ Дауыстап, жай, сыбырлап');
    await expect(lesson.locator('.dv-card').first()).toContainText('ЖӘЙ 🗣️');
    await expect(lesson.locator('.dv-card').first()).toContainText('Жәй айт!');
    await click(lesson.locator('.dv-mode-btn[data-dv-mode="sybyr"]'));
    await expect(lesson.locator('.dv-card')).toHaveCount(4);
    await expect(lesson.locator('.dv-card').first()).toContainText('СЫБЫРЛАП 🤫');
    await expect(lesson.locator('#dv-instruction')).toContainText('Сыбырлап айт');
  });
}

async function openHub(page: Page, locale: string) {
  await page.addInitScript(locale => {
    localStorage.setItem('locale', locale);
    localStorage.setItem('profileLang', locale);
    localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true');
  }, locale);
  await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
  await openGrade(page, 0);
  await openModule(page, 'grade0Menu', 'speech');
  await findRadialEntry(page, 'data-activity', 'g0DauyspTask1');
  await settled(page, 'curriculumCatalog');
  await expect(page.locator('#curriculumCatalog .radial-center-btn')).toHaveAttribute('aria-expanded', 'true');
}

async function expectOrbit(page: Page, id: string) {
  // Topic navigation starts the same 650 ms fly-out transition as the main
  // menus. Visibility alone is true while items are still crossing the center;
  // measure the final layout, not an intermediate animation frame.
  await settled(page, id);
  const menu = page.locator(`#${id} .radial-menu-container`);
  // Final items must neither overlap one another nor cover the central control.
  expect(await menu.evaluate(element => {
    const boxes = Array.from(element.querySelectorAll(':scope > .radial-center-btn, :scope > .radial-item:not([hidden])'))
      .map(item => ({ label: item.textContent?.trim(), box: item.getBoundingClientRect() }));
    return {
      empty: boxes.filter(({ box }) => box.width <= 0 || box.height <= 0).map(({ label }) => label),
      overlaps: boxes.flatMap((a, i) => boxes.slice(i + 1)
        .filter(b => a.box.left < b.box.right && a.box.right > b.box.left && a.box.top < b.box.bottom && a.box.bottom > b.box.top)
        .map(b => [a.label, b.label])),
    };
  })).toEqual({ empty: [], overlaps: [] });
  for (const item of await menu.locator(':scope > .radial-item:visible').all()) {
    await item.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest' }));
    await expect.poll(() => item.evaluate(element => {
      const b = element.getBoundingClientRect();
      const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
      return !!hit && element.contains(hit);
    })).toBe(true);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
  for (const locale of ['kk', 'ru']) {
    test(`sound menu excludes removed human duplicate ${viewport.width}x${viewport.height} ${locale}`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize(viewport);
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await openHub(page, locale);
      await returnToGrade(page, 'grade0Menu');
      await expect(page.locator('#g0Task7')).toHaveCount(0);
      await expect(page.locator('[onclick*="g0Task7"]')).toHaveCount(0);
      const targets = ['g0Task1', 'g0Task3', 'g0Task4', 'g0Task5', 'g0Task6',
        'g0Task8', 'g0Task9', 'g0TaskWild', 'g0TaskSyllables', 'g0TaskTech2', 'g0TaskEmotion'];
      for (const target of targets) {
        await openModule(page, 'grade0Menu', target === 'g0TaskSyllables' ? 'phonetics' : 'listening');
        const entry = await findRadialEntry(page, 'data-activity', target);
        await expectOrbit(page, 'curriculumCatalog');
        if (locale === 'kk') await page.screenshot({ path: test.info().outputPath(target + '-menu.png'), fullPage: true });
        await click(entry);
        await settled(page, target);
        if (['g0Task1', 'g0TaskSyllables'].includes(target)) {
          await click(page.locator(`#${target} button[onclick*="grade0SoundsMenu"]`));
        } else {
          await expect(page.locator('#' + target + ' [data-answer]')).toHaveCount(2);
          await click(page.locator('#' + target + ' .learning-actions button').last());
        }
        await settled(page, 'curriculumCatalog');
        await expect(entry).toBeVisible();
        await returnToGrade(page, 'grade0Menu');
      }
      expect(errors).toEqual([]);
    });
  }
}

for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
  for (const locale of ['kk', 'ru']) {
    test(`voice hierarchy and task returns ${viewport.width}x${viewport.height} ${locale}`, async ({ page }) => {
      // This scenario follows every branch and waits for each real animation.
      test.setTimeout(90_000);
      await page.setViewportSize(viewport);
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await openHub(page, locale);
      const hub = page.locator('#curriculumCatalog');
      await expectOrbit(page, 'curriculumCatalog');
      if (locale === 'kk') await page.screenshot({ path: test.info().outputPath('voice-hub.png'), fullPage: true });
      const center = hub.locator('.radial-center-btn');
      await center.focus(); await page.keyboard.press('Enter');
      await expect(hub.locator('.radial-menu-container')).not.toHaveClass(/active/);
      await expect(center).toHaveAttribute('aria-expanded', 'false');
      await page.keyboard.press('Space');
      await expect(center).toHaveAttribute('aria-expanded', 'true');
      await settled(page, 'curriculumCatalog');
      await click(await findRadialEntry(page, 'data-activity', 'g0DauyspTask1'));
      await settled(page, 'g0DauyspTask1');
      for (const mode of ['tap', 'zhay', 'sybyr']) {
        await click(page.locator(`#g0DauyspTask1 .dv-mode-btn[data-dv-mode="${mode}"]`));
        await expect(page.locator(`#g0DauyspTask1 .dv-card [data-mode="${mode}"]`)).toHaveCount(4);
        await expect(page.locator('#g0DauyspTask1 .dv-card').first()).toBeVisible();
      }
      if (locale === 'kk') await page.screenshot({ path: test.info().outputPath('voice-lesson.png'), fullPage: true });
      await click(page.locator('#g0DauyspTask1 button[onclick*="grade0DauyspenmMenu"]'));
      await settled(page, 'curriculumCatalog');
      await returnToGrade(page, 'grade0Menu');
      for (const [id, module, oldParent] of [
        ['g0Task2', 'speech', 'grade0VoiceMenu'],
        ['g0TaskFrog', 'speech', 'grade0VoiceMenu'],
        ['g0DShakJattugu', 'speech', 'grade0DauysShakMenu'],
        ['g0DShakTapsyrma', 'speech', 'grade0DauysShakMenu'],
        ['g0ArticulationLessons', 'phonetics', ''],
        ['g0QSoundAdventure', 'phonetics', ''],
        ['g0AutumnStory', 'comprehension', ''],
      ]) {
        await openModule(page, 'grade0Menu', module);
        const entry = await findRadialEntry(page, 'data-activity', id);
        await expectOrbit(page, 'curriculumCatalog');
        await click(entry); await settled(page, id);
        await click(oldParent ? page.locator(`#${id} button[onclick*="${oldParent}"]`) : page.locator(`#${id} .art-module-back`));
        await settled(page, 'curriculumCatalog');
        await expect(entry).toBeVisible();
        await returnToGrade(page, 'grade0Menu');
      }
      expect(errors).toEqual([]);
    });
  }
}
