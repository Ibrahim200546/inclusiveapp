import { expect, type Page } from './fixtures';

export async function openGrade(page: Page, grade: number) {
  await page.locator('#mainRadialMenu .radial-center-btn').click();
  const parent = `grade${grade < 2 ? 0 : grade}Menu`;
  await page.locator(`#mainRadialMenu [onclick*="${parent}"]`).click();
  if (grade < 2) await page.locator('#grade0Menu select').selectOption(String(grade));
  await expect(page.locator(`#${parent}`)).toHaveClass(/active/);
  return parent;
}

export async function openModule(page: Page, parent: string, module: string) {
  await page.locator(`#${parent} [data-curriculum-module="${module}"]`).click();
  await expect(page.locator('#curriculumCatalog')).toHaveClass(/active/);
}

// Walk real, visible controls, never showScreen/openLesson: a missing doorway
// must fail the test even when the underlying exercise still exists in the DOM.
export async function tryFindRadialEntry(page: Page, attribute: 'data-activity' | 'data-lesson', id: string) {
  async function search(): Promise<boolean> {
    const grid = page.locator('#curriculum-lessons');
    await expect(grid.locator('.exercise-orbit')).toHaveCount(1);
    expect(await grid.locator('.radial-item').count()).toBeLessThanOrEqual(6);
    await expect(page.locator('#curriculumCatalog .curriculum-pager, #curriculumCatalog [role="slider"]')).toHaveCount(0);
    const entry = grid.locator(`[${attribute}="${id}"]`);
    if (await entry.count()) { await expect(entry).toBeVisible(); return true; }
    const groups = await grid.locator('[data-topic-group]').evaluateAll(nodes => nodes.map(n => n.getAttribute('data-topic-group')!));
    for (const key of groups) {
      const group = grid.locator('[data-topic-group]');
      const index = await group.evaluateAll((nodes, value) => nodes.findIndex(n => n.getAttribute('data-topic-group') === value), key);
      await group.nth(index).click();
      if (await search()) return true;
      await page.locator('#curriculumCatalog .curriculum-toolbar button').first().click();
    }
    return false;
  }
  return await search() ? page.locator(`#curriculum-lessons [${attribute}="${id}"]`) : null;
}

export async function findRadialEntry(page: Page, attribute: 'data-activity' | 'data-lesson', id: string) {
  const entry = await tryFindRadialEntry(page, attribute, id);
  expect(entry, `Missing radial entry ${attribute}=${id}`).not.toBeNull();
  return entry!;
}

export async function returnToGrade(page: Page, parent: string) {
  for (let depth = 0; depth < 8 && await page.locator('#curriculumCatalog.active').count(); depth++) {
    await page.locator('#curriculumCatalog .curriculum-toolbar button').first().click();
  }
  await expect(page.locator(`#${parent}`)).toHaveClass(/active/);
}
