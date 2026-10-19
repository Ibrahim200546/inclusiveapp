import { test, expect, type Locator, type Page } from './fixtures';

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

function destination(page: Page, parent: string, target: string) {
  return page.locator(`#${parent} .radial-item[onclick*="'${target}'"]`);
}

for (const initialLocale of ['kk', 'ru']) {
  test(`voice labels survive language round trips from ${initialLocale}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openHub(page, initialLocale);
    await click(destination(page, 'grade0DauyspenmMenu', 'grade0DauystarMenu'));
    await settled(page, 'grade0DauystarMenu');
    for (const locale of ['ru', 'kk', 'ru', 'kk']) {
      await page.locator(`#top-lang-btn-${locale}`).click();
      await expect(page.locator('#grade0DauystarMenu .radial-item p')).toHaveText(locale === 'kk'
        ? ['Дауыстап', 'Жәй', 'Сыбырлап'] : ['Громко', 'Обычно', 'Шёпотом']);
      await expect(page.locator('#grade0DauyspenmMenu .radial-center-btn')).toHaveText(locale === 'kk'
        ? 'Дауыспен жұмыс' : 'Работа с голосом');
    }
    // Cards are rendered in the selected language before DOM translation runs.
    await page.locator('#top-lang-btn-ru').click();
    await click(destination(page, 'grade0DauystarMenu', 'g0DauyspTask2'));
    await settled(page, 'g0DauyspTask2');
    await expect(page.locator('#g0DauyspTask2 h2')).toHaveText('🗣️ Обычно');
    await page.locator('#top-lang-btn-kk').click();
    await expect(page.locator('#g0DauyspTask2 h2')).toHaveText('🗣️ Жәй');
    await expect(page.locator('#g0DauyspTask2 .dv-card').first()).toContainText('ЖӘЙ 🗣️');
    await expect(page.locator('#g0DauyspTask2 .dv-card').first()).toContainText('Жәй айт!');
  });
}

async function back(page: Page, from: string, to: string) {
  await click(page.locator(`#${from} button[onclick*="'${to}'"]`));
  await settled(page, to);
}

async function openHub(page: Page, locale: string) {
  await page.addInitScript(locale => {
    localStorage.setItem('locale', locale);
    localStorage.setItem('profileLang', locale);
    localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true');
  }, locale);
  await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
  await click(page.locator('#mainRadialMenu > .radial-center-btn'));
  await settled(page, 'mainRadialMenu');
  await click(destination(page, 'mainRadialMenu', 'grade0Menu'));
  await settled(page, 'grade0Menu');
  await expect(page.locator('#grade0Menu .radial-item')).toHaveCount(7); // Existing six plus listening practice.
  await expect(destination(page, 'grade0Menu', 'grade0VoiceMenu')).toHaveCount(0);
  await expect(destination(page, 'grade0Menu', 'grade0DauysShakMenu')).toHaveCount(0);
  await click(destination(page, 'grade0Menu', 'grade0DauyspenmMenu'));
  await settled(page, 'grade0DauyspenmMenu');
}

async function expectOrbit(page: Page, id: string) {
  const menu = page.locator(`#${id} .radial-menu-container`);
  // Final items must neither overlap one another nor cover the central control.
  expect(await menu.evaluate(element => {
    const boxes = Array.from(element.querySelectorAll(':scope > .radial-center-btn, :scope > .radial-item'))
      .map(item => ({ label: item.textContent?.trim(), box: item.getBoundingClientRect() }));
    return {
      empty: boxes.filter(({ box }) => box.width <= 0 || box.height <= 0).map(({ label }) => label),
      overlaps: boxes.flatMap((a, i) => boxes.slice(i + 1)
        .filter(b => a.box.left < b.box.right && a.box.right > b.box.left && a.box.top < b.box.bottom && a.box.bottom > b.box.top)
        .map(b => [a.label, b.label])),
    };
  })).toEqual({ empty: [], overlaps: [] });
  for (const item of await menu.locator(':scope > .radial-item').all()) {
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
      await back(page, 'grade0DauyspenmMenu', 'grade0Menu');
      await click(destination(page, 'grade0Menu', 'grade0SoundsMenu'));
      await settled(page, 'grade0SoundsMenu');

      await expect(page.locator('#g0Task7')).toHaveCount(0);
      await expect(page.locator('[onclick*="g0Task7"]')).toHaveCount(0);
      const targets = ['g0Task1', 'g0Task3', 'g0Task4', 'g0Task5', 'g0Task6',
        'g0Task8', 'g0Task9', 'g0TaskWild', 'g0TaskSyllables', 'g0TaskTech2', 'g0TaskEmotion'];
      await expect(page.locator('#grade0SoundsMenu .radial-item')).toHaveCount(targets.length);
      await expectOrbit(page, 'grade0SoundsMenu');
      if (locale === 'kk') await page.screenshot({ path: test.info().outputPath('sound-menu.png'), fullPage: true });
      for (const target of targets) {
        await click(destination(page, 'grade0SoundsMenu', target));
        await settled(page, target);
        if (target === 'g0TaskEmotion') {
          await expect(page.locator('#g0TaskEmotion .option-circle')).toHaveCount(4);
          await expect(page.locator('#g0TaskEmotion [onclick="playRandomHumanSoundG0()"]')).toBeVisible();
        }
        await back(page, target, 'grade0SoundsMenu');
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
      const hub = page.locator('#grade0DauyspenmMenu');
      await expect(hub.locator('.radial-center-btn')).toHaveText(locale === 'kk' ? 'Дауыспен жұмыс' : 'Работа с голосом');
      await expect(hub.locator('.radial-item')).toHaveCount(4); // Reading reuses the existing syllable screen.
      for (const [target, label] of [
        ['grade0VoiceMenu', locale === 'kk' ? 'Дауыс' : 'Голос'],
        ['grade0DauysShakMenu', locale === 'kk' ? 'Дауыс шақыру' : 'Вызов голоса'],
        ['grade0DauystarMenu', locale === 'kk' ? 'Дауыстар' : 'Голоса'],
      ]) await expect(destination(page, 'grade0DauyspenmMenu', target).locator('p')).toHaveText(label);
      await expectOrbit(page, 'grade0DauyspenmMenu');
      if (locale === 'kk') await page.screenshot({ path: test.info().outputPath('voice-hub.png'), fullPage: true });

      // Both activation keys work on the actual central control.
      const center = hub.locator('.radial-center-btn');
      await center.focus();
      await page.keyboard.press('Enter');
      await expect(hub.locator('.radial-menu-container')).not.toHaveClass(/active/);
      await expect(center).toHaveAttribute('aria-expanded', 'false');
      await page.keyboard.press('Space');
      await expect(center).toHaveAttribute('aria-expanded', 'true');
      await settled(page, 'grade0DauyspenmMenu');

      await click(destination(page, 'grade0DauyspenmMenu', 'grade0DauystarMenu'));
      await settled(page, 'grade0DauystarMenu');
      await expect(page.locator('#grade0DauystarMenu .radial-item p')).toHaveText(locale === 'kk'
        ? ['Дауыстап', 'Жәй', 'Сыбырлап'] : ['Громко', 'Обычно', 'Шёпотом']);
      await expectOrbit(page, 'grade0DauystarMenu');
      if (locale === 'kk') await page.screenshot({ path: test.info().outputPath('voice-tasks.png'), fullPage: true });
      for (const id of ['g0DauyspTask1', 'g0DauyspTask2', 'g0DauyspTask3']) {
        await click(destination(page, 'grade0DauystarMenu', id));
        await settled(page, id);
        await expect(page.locator(`#${id} .dv-card`).first()).toBeVisible();
        await back(page, id, 'grade0DauystarMenu');
      }
      await back(page, 'grade0DauystarMenu', 'grade0DauyspenmMenu');

      await click(destination(page, 'grade0DauyspenmMenu', 'grade0VoiceMenu'));
      await settled(page, 'grade0VoiceMenu');
      await expect(page.locator('#grade0VoiceMenu .radial-item')).toHaveCount(3);
      for (const id of ['g0Task2', 'g0TaskFrog']) {
        await click(destination(page, 'grade0VoiceMenu', id));
        await settled(page, id);
        await back(page, id, 'grade0VoiceMenu');
      }
      await back(page, 'grade0VoiceMenu', 'grade0DauyspenmMenu');

      await click(destination(page, 'grade0DauyspenmMenu', 'grade0DauysShakMenu'));
      await settled(page, 'grade0DauysShakMenu');
      await expect(page.locator('#grade0DauysShakMenu .radial-item')).toHaveCount(5);
      await expectOrbit(page, 'grade0DauysShakMenu');
      for (const id of ['g0DShakJattugu', 'g0DShakTapsyrma']) {
        await click(destination(page, 'grade0DauysShakMenu', id));
        await settled(page, id);
        await back(page, id, 'grade0DauysShakMenu');
      }
      for (const id of ['g0ArticulationLessons', 'g0QSoundAdventure', 'g0AutumnStory']) {
        await click(page.locator(`[data-art-module-target="${id}"]`));
        await settled(page, id);
        await click(page.locator(`#${id} .art-module-back`));
        await settled(page, 'grade0DauysShakMenu');
      }
      await back(page, 'grade0DauysShakMenu', 'grade0DauyspenmMenu');
      await back(page, 'grade0DauyspenmMenu', 'grade0Menu');
      expect(errors).toEqual([]);
    });
  }
}
