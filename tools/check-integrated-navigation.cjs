const {JSDOM}=require(process.cwd()+'/node_modules/jsdom');const fs=require('fs');
const html=fs.readFileSync('public/original/index2.html','utf8').replace(/<script\b[\s\S]*?<\/script>/gi,'');
const dom=new JSDOM(html,{url:'http://localhost',runScripts:'dangerously',pretendToBeVisual:true});const w=dom.window;
// Layout and actual playback are intentionally outside this DOM-only regression.
w.HTMLMediaElement.prototype.play=function(){return Promise.resolve();};w.HTMLMediaElement.prototype.pause=function(){};
w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.getProfileLang=()=> 'ru';w.showScreen=id=>{w.document.querySelectorAll('.screen').forEach(n=>n.classList.toggle('active',n.id===id));};w.showReward=()=>{};w.CorexAudio={stop(){}};
const observers=[];const OriginalObserver=w.MutationObserver;w.MutationObserver=class extends OriginalObserver{constructor(callback){super(callback);observers.push(this);}};
w.eval(fs.readFileSync('public/original/i18n-profile.js','utf8'));
for(const f of ['grade-sounds','learning-session','exercise-orbit-ui','learning-work-ui','extra-learning-content','extra-learning-ui','curriculum-content','curriculum-session','grade-menu','curriculum-ui']){try{w.eval(fs.readFileSync('public/original/js/'+f+'.js','utf8'))}catch(e){console.error(f,e);process.exitCode=1}}
setTimeout(()=>{try{
const assert=require('node:assert/strict');
for(const grade of [0,1,2,3,4]) {
 w.CorexGrades.select(grade); const parent='grade'+(grade<2?0:grade)+'Menu';w.showScreen(parent);
 w.document.querySelector('#'+parent+' [data-curriculum-module=listening]').click();assert.equal(w.CorexGrades.current,grade);
 const visit=()=>{assert.equal(w.document.querySelectorAll('#curriculum-lessons .exercise-orbit').length,1);if(w.document.querySelectorAll("#curriculum-lessons .radial-item").length>6)console.log([...w.document.querySelectorAll("[data-activity]")].map(x=>[x.dataset.activity,x.title]));assert.ok(w.document.querySelectorAll('#curriculum-lessons .radial-item').length<=6);const group=w.document.querySelector('[data-topic-group="music"]');if(group)group.click();};visit();
 const instrument=w.document.querySelector('[data-activity="g0Task3"]');assert.ok(instrument,'graded instrument remains reachable');instrument.click();assert.equal(w.CorexGrades.current,grade);assert.ok(w.document.querySelector('#g0Task3.active'));
 w.showScreen('grade0SoundsMenu');assert.ok(w.document.querySelector('#curriculumCatalog.active'));assert.equal(w.CorexGrades.current,grade);visit();
}
let screens=0;
for(const grade of [0,1,2,3,4]) {
 const found=[];
 for(const topic of ['math','listening','breathing','phonetics','speech','comprehension','sentence','spatial']) {
  w.CorexCurriculumUI.open(grade,'grade'+(grade<2?0:grade)+'Menu',topic);
  const walk=()=>{
   screens++;assert.equal(w.document.querySelectorAll('#curriculum-lessons .exercise-orbit').length,1);
   if(w.document.querySelectorAll("#curriculum-lessons .radial-item").length>6)console.log([...w.document.querySelectorAll("[data-activity]")].map(x=>[x.dataset.activity,x.title]));assert.ok(w.document.querySelectorAll('#curriculum-lessons .radial-item').length<=6,`${grade}/${topic} exceeds six choices`);
   found.push(...[...w.document.querySelectorAll('[data-lesson]')].map(x=>x.dataset.lesson));
   const keys=[...w.document.querySelectorAll('[data-topic-group]')].map(x=>x.dataset.topicGroup);
   for(const key of keys){[...w.document.querySelectorAll('[data-topic-group]')].find(x=>x.dataset.topicGroup===key).click();walk();w.document.querySelector('#curriculumCatalog .curriculum-toolbar button').click();}
  };walk();
 }
 const expected=[...new Set(w.CorexCurriculumContent.lessons.filter(x=>x.grade===grade||(grade===0&&x.grade===1)).map(x=>x.id))];
 assert.deepEqual(found.sort(),expected.sort());
}
w.CorexCurriculumUI.open(0,'grade0Menu','comprehension');
w.CorexCurriculumUI.openLesson(w.CorexCurriculumContent.lessons.find(item=>item.grade===1));
w.document.querySelector('#curriculumPractice .curriculum-toolbar button').click();
assert.equal(w.CorexCurriculumUI.getState().grade,0,'shared grade1 lesson returns to original grade0 catalogue');
for(const lang of ['ru','kk','ru']) {
 w.setLangProfile(lang);w.CorexCurriculumUI.open(0,'grade0Menu','speech');
 const findVoice=()=>{let leaf=w.document.querySelector('[data-activity="g0DauyspTask1"]');if(leaf)return leaf;const group=w.document.querySelector('[data-topic-group="voice"]');if(group)group.click();return w.document.querySelector('[data-activity="g0DauyspTask1"]');};
 const leaf=findVoice();assert.ok(leaf);assert.equal(leaf.getAttribute('aria-label'),lang==='ru'?'Громко, обычно, шёпотом':'Дауыстап, жай, сыбырлап');
}
console.log('Single-orbit DOM traversal:',screens,'screens; all curriculum lessons retained without duplicate entries.');
assert.equal(w.document.querySelectorAll('.grade-menu-pages').length,0);
console.log('PASS: five graded listening routes, junior selection, original recognition setup, single-circle return, no pagination. DOM integration only; not browser rendering/audio.');
}catch(e){console.error(e);process.exitCode=1}observers.forEach(observer=>observer.disconnect());dom.window.close();},100);
