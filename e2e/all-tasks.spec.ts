import { test, expect } from './fixtures';
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
  for(const grade of [0,1,2,3,4]){
    const expected=await page.evaluate(g=>(window as any).CorexCurriculumContent.lessons.filter((x:any)=>x.grade===g||(g===0&&x.grade===1)).map((x:any)=>x.id),grade);
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
test('existing grade2 mathematics entry is reused and original signs exercise retained',async({page})=>{
  await page.goto('/original/index2.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>(window as any).showScreen('grade2Menu'));
  const math=page.locator('#grade2Menu [data-curriculum-module="math"]');await expect(math).toHaveCount(1);await math.click();
  await expect(page.locator('#curriculumCatalog .curriculum-topic-orbit').first()).toBeVisible();
  await page.locator('[data-activity="g2Task4"]').click();await expect(page.locator('#g2Task4')).toHaveClass(/active/);
});
