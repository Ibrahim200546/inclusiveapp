import { test, expect } from './fixtures';
import { openGrade, openModule, returnToGrade, findRadialEntry } from './radial-navigation';
for (const locale of ['kk','ru']) test(`modules are on the class panel and preserve all lessons (${locale})`,async({page})=>{
  test.setTimeout(90000);
  await page.addInitScript(lang=>{localStorage.setItem('profileLang',lang);localStorage.setItem('eduCorexGuestLoginNoticeShown','true');},locale);
  await page.goto('/original/index2.html',{waitUntil:'domcontentloaded'});
  for(const grade of [0,2,3,4]){
    await page.evaluate(g=>(window as any).showScreen('grade'+g+'Menu'),grade);
    await expect(page.locator('#grade'+grade+'Menu .curriculum-entry')).toHaveCount(0);
    const links=page.locator('#grade'+grade+'Menu .curriculum-class-orbit > [data-curriculum-module]');expect(await links.count()).toBeGreaterThan(0);
    const keys=await links.evaluateAll(ns=>ns.map(n=>n.getAttribute('data-curriculum-module')));
    for(const key of keys){await page.locator(`#grade${grade}Menu [data-curriculum-module="${key}"]`).click();await expect(page.locator('#curriculumCatalog')).toHaveClass(/active/);await expect(page.locator('[data-module]')).toHaveCount(0);await page.locator('#curriculumCatalog .curriculum-toolbar button').first().click();}
  }
  for(const grade of [0,2,3,4]){
    const expected=await page.evaluate(destination=>{
      const g = destination === 2 ? 0 : destination;
      const lessons=(window as any).CorexCurriculumContent.lessons;
      return lessons.filter((x:any)=>x.grade===g||(g===0&&x.grade===1))
        .filter((x:any)=>!(g===0&&(x.id==='one-breath'||(x.grade===1&&x.id==='voice-strength'))))
        .map((x:any)=>g===0&&x.id==='voice-strength'?'dybys-azhyratu':g===0&&x.grade===1&&lessons.some((y:any)=>y.grade===0&&y.id===x.id)?x.id+'-variant-1':x.id);
    },grade);
    const found:string[]=[];
    for(const module of ['math','listening','breathing','phonetics','speech','comprehension','sentence','spatial']){
      await page.evaluate(({grade,module})=>(window as any).CorexCurriculumUI.open(grade,'grade'+(grade<2?0:grade)+'Menu',module),{grade,module});
      const walk = async () => {
        await expect(page.locator('#curriculum-lessons .exercise-orbit')).toHaveCount(1);
        expect(await page.locator('#curriculum-lessons .radial-item').count()).toBeLessThanOrEqual(6);
        found.push(...await page.locator('[data-lesson]').evaluateAll(ns=>ns.map(n=>n.getAttribute('data-lesson')!)));
        const keys=await page.locator('[data-topic-group]').evaluateAll(ns=>ns.map(n=>n.getAttribute('data-topic-group')!));
        for(const key of keys){
          await page.locator('[data-topic-group]').evaluateAll((ns,key)=>(ns.find(n=>n.getAttribute('data-topic-group')===key) as HTMLElement).click(),key);
          await walk();
          await page.locator('#curriculumCatalog .curriculum-toolbar button').first().evaluate(n=>(n as HTMLElement).click());
        }
      };
      await walk();
      await expect(page.locator('.curriculum-pager,[role="slider"]')).toHaveCount(0);
    }
    expect(found.sort()).toEqual([...new Set(expected)].sort());expect(new Set(found).size).toBe(found.length);
  }
});
for (const [locale, viewport] of [
  ['kk', { width: 390, height: 844 }],
  ['ru', { width: 1440, height: 900 }]
] as const) test(`grade 2 exposes exactly the shared junior program in ${locale}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize(viewport);
  await page.addInitScript(lang => {
    localStorage.setItem('profileLang', lang); localStorage.setItem('locale', lang);
    localStorage.setItem('eduCorexGuestLoginNoticeShown', 'true');
  }, locale);
  await page.goto('/original/index2.html', { waitUntil: 'domcontentloaded' });
  async function collect(grade: number) {
    const parent = await openGrade(page, grade);
    const panel = page.locator('#'+parent);
    const modules = await panel.locator('[data-curriculum-module]').evaluateAll(items => items.map(el => el.getAttribute('data-curriculum-module')!));
    const catalog: Record<string, string[]> = {};
    for (const module of modules) {
      await openModule(page, parent, module);
      const leaves = new Set<string>(), grid = page.locator('#curriculum-lessons');
      async function visit() {
        await expect(grid.locator('.exercise-orbit')).toHaveCount(1);
        const ids = await grid.locator('[data-activity], [data-lesson]').evaluateAll(items => items.map(el => el.getAttribute('data-activity') || el.getAttribute('data-lesson')!));
        for (const id of ids) { expect(leaves.has(id), id).toBe(false); leaves.add(id); }
        const groups = await grid.locator('[data-topic-group]').evaluateAll(items => items.map(el => el.getAttribute('data-topic-group')!));
        for (const group of groups) {
          await grid.locator(`[data-topic-group="${group}"]`).evaluate((el: HTMLElement) => el.click());
          await visit();
          await page.locator('#curriculumCatalog .curriculum-toolbar button').first().evaluate((el: HTMLElement) => el.click());
        }
      }
      await visit();
      catalog[module] = [...leaves].sort();
      await returnToGrade(page, parent);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await panel.locator('button[onclick*="levelsScreen"]').click();
    return catalog;
  }
  const junior = await collect(0), grade2 = await collect(2);
  expect(grade2).toEqual(junior);
  expect(Object.values(grade2).flat()).not.toEqual(expect.arrayContaining(['g2Task4']));
  expect(Object.values(grade2).flat().some(id => id.startsWith('g2'))).toBe(false);
  await openGrade(page, 2); await openModule(page, 'grade2Menu', 'math');
  await (await findRadialEntry(page, 'data-activity', 'learningHubScreen:0')).click();
  await expect(page.locator('#learningPracticeScreen')).toHaveClass(/active/);
  await expect(page.locator('#learningPracticeScreen .learning-wrap > p').first()).toContainText(locale === 'kk' ? '2-сынып' : 'Класс 2');
  await expect(page.locator('#learningPracticeScreen button[data-number]')).toHaveCount(10);
  await page.locator('#learningPracticeScreen .learning-actions button').last().click();
  await returnToGrade(page, 'grade2Menu');
});
