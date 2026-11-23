import { test, expect } from './fixtures';
test('legacy rounds reward only once and never reward empty answers', async ({ page }) => {
 await page.goto('/original/index2.html');
 const result = await page.evaluate(() => {
  // Exercise the classic-script state and handlers in the actual browser runtime.
  return (0, eval)(`(() => {
   let rewards=0; window.showReward=()=>rewards++;
   showScreen('g0Task1'); checkSound(false); const before=rewards;
   soundDetectionReady=true; isSoundPlaying=true; checkSound(false); const wrong=rewards;
   soundDetectionReady=true; checkSound(true); checkSound(true); const sound=rewards;
   animTarget=[]; animUserSlots=[]; checkAnimalCompletion(); const empty=rewards;
   animTarget=['cat']; animUserSlots=[{animal:'cat'}]; animSequenceRewarded=false;
   checkAnimalCompletion(); checkAnimalCompletion(); const animals=rewards;
   initSpatialGame(); checkSpatialWin(); const partial=rewards;
   for (const card of [...document.getElementById('spatialCardsArea').children]) {
    document.getElementById('spatial_'+card.dataset.origRow+'_'+card.dataset.origCol).appendChild(card);
   }
   checkSpatialWin(); checkSpatialWin();
   return {before,wrong,sound,empty,animals,partial,spatial:rewards};
  })()`);
 });
 expect(result).toEqual({before:0,wrong:0,sound:1,empty:1,animals:2,partial:2,spatial:3});
});
