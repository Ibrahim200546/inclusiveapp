import { test, expect } from './fixtures';
type PracticeApp = Window & {
  CorexCurriculumUI: { open(grade: number, parent: string, module: string): void; getState(): {heard: boolean} };
  _activeAudios?: HTMLAudioElement[];
  showReward: () => void;
  practiceRewardCalls: number;
};
for (const width of [320, 768]) {
  test(`minimal practice shows full choices and immediate reward at ${width}px`, async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({width,height:900});
    await page.addInitScript(() => { localStorage.setItem('eduCorexGuestLoginNoticeShown','true'); localStorage.setItem('profileLang','kk'); });
    await page.goto('/original/index2.html',{waitUntil:'domcontentloaded'});
    await page.evaluate(() => {
      const app=window as unknown as PracticeApp;
      const original=app.showReward;
      app.practiceRewardCalls=0;
      app.showReward=()=>{app.practiceRewardCalls++; original();};
      app.CorexCurriculumUI.open(0,'grade0Menu','comprehension');
    });
    await page.locator('[data-lesson="g01-school-6"]').click();
    const screen=page.locator('#curriculumPractice');
    const modal=page.locator('#rewardModal');
    const rewardCount=()=>page.evaluate(()=>(window as unknown as PracticeApp).practiceRewardCalls);
    await expect(screen.locator('.curriculum-simple-choices')).toBeVisible();
    await expect(screen.locator('.radial-center-btn')).toHaveCount(0);
    await expect(screen.locator('.curriculum-next')).toBeHidden();
    await expect(screen.getByRole('button',{name:'Қайта бастау',exact:true})).toBeHidden();
    const choices=screen.locator('[data-choice]');
    await expect(choices.first()).toBeDisabled();
    const boxes=await choices.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,height:r.height,overflow:n.scrollWidth>n.clientWidth+1};}));
    expect(boxes.every(b=>b.left>=0&&b.right<=width&&b.width>=44&&b.height>=44&&!b.overflow)).toBe(true);
    await page.screenshot({path:`docs/trello-verification/practice-minimal-${width}.png`,fullPage:true});
    await screen.locator('.curriculum-listen').click();
    await page.evaluate(()=>{for(const a of (window as unknown as PracticeApp)._activeAudios||[]) a.playbackRate=4;});
    await expect.poll(()=>page.evaluate(()=>(window as unknown as PracticeApp).CorexCurriculumUI.getState().heard),{timeout:60000}).toBe(true);
    await screen.getByRole('button',{name:'Дүкенге',exact:true}).click();
    expect(await rewardCount()).toBe(0);
    await expect(modal).toBeHidden();
    // Session intentionally debounces answers for 350 ms after a wrong attempt.
    await page.waitForTimeout(400);
    await screen.getByRole('button',{name:'Мектепке',exact:true}).click();
    await expect(modal).toBeVisible();
    expect(await rewardCount()).toBe(1);
    await modal.getByRole('button').click();
    await screen.getByRole('button',{name:'Мектепке',exact:true}).evaluate(button=>(button as HTMLButtonElement).click());
    await page.locator('#top-lang-btn-ru').click();
    await page.locator('#top-lang-btn-kk').click();
    expect(await rewardCount()).toBe(1);
    await expect(modal).toBeHidden();
    await screen.locator('.curriculum-next').click();
    expect(await rewardCount()).toBe(1);
    await screen.getByRole('button',{name:'Кітап',exact:true}).click();
    await expect(modal).toBeVisible();
    expect(await rewardCount()).toBe(2);
    await modal.getByRole('button').click();
    await screen.locator('.curriculum-next').click();
    await expect(screen.locator('.curriculum-summary')).toContainText('Орындалды: 2');
    await expect(modal).toBeHidden();
    expect(await rewardCount()).toBe(2);
  });
}
