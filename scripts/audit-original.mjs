import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { JSDOM, VirtualConsole } from 'jsdom';
const root = path.resolve('public/original');
const html = fs.readFileSync(path.join(root, 'index2.html'), 'utf8');
const issues = [], warnings = [], runtimeErrors = [], played = new Set(), virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', error => runtimeErrors.push(error.message));
const dom = new JSDOM(html, { url: 'https://example.test/original/index2.html', runScripts:'outside-only', pretendToBeVisual:true, virtualConsole });
const { window: w } = dom;
w.alert = () => {}; w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {};
w.matchMedia = () => ({matches:false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){}});
w.fetch = async () => ({ok:false,status:503,text:async()=> 'Offline audit',json:async()=>({}),blob:async()=>new w.Blob()});
w.HTMLMediaElement.prototype.play = function() { if (this.src) played.add(this.src); this.dispatchEvent(new w.Event('play')); return Promise.resolve(); };
w.HTMLMediaElement.prototype.pause = function() { this.dispatchEvent(new w.Event('pause')); };
w.HTMLMediaElement.prototype.load = function() {};
w.HTMLCanvasElement.prototype.getContext = function() {return null;};
w.localStorage.setItem('eduCorexGuestLoginNoticeShown', '1');
w.addEventListener('error', e => runtimeErrors.push(e.message));
let classicSyntaxFiles = 0;
for (const entry of fs.readdirSync(root, {recursive:true})) {
  if (!entry.endsWith('.js')) continue;
  try { new vm.Script(fs.readFileSync(path.join(root,entry),'utf8')); classicSyntaxFiles++; }
  catch (error) { issues.push(`Classic syntax ${entry}: ${error.message}`); }
}
let scriptCount = 0;
for (const script of w.document.scripts) {
  if (script.type === 'application/ld+json') continue;
  let code = script.textContent;
  if (script.src) {
    const url = new URL(script.src);
    if (url.origin !== w.location.origin) { warnings.push(`External script skipped: ${url.origin}`); continue; }
    const file = path.resolve('public', decodeURIComponent(url.pathname.slice(1)));
    if (!fs.existsSync(file)) {issues.push(`Missing script: ${url.pathname}`);continue;}
    code = fs.readFileSync(file,'utf8');
  }
  try {new vm.Script(code).runInContext(dom.getInternalVMContext());scriptCount++;} catch(e) {issues.push(`Script execution: ${script.src||'inline'}: ${e.message}`);}
}
await new Promise(resolve => setTimeout(resolve, 100));
const seen = new Set();
for (const element of w.document.querySelectorAll('[id]')) {
  if (seen.has(element.id)) issues.push(`Duplicate id: ${element.id}`);
  seen.add(element.id);
}
for (const element of w.document.querySelectorAll('audio[src],img[src],script[src],link[href]')) {
  const raw = element.getAttribute('src') || element.getAttribute('href');
  if (/^(https?:|data:|blob:|#)/.test(raw)) continue;
  const url = new URL(raw,w.location.href);
  const file = path.resolve('public',decodeURIComponent(url.pathname.slice(1)));
  if (!fs.existsSync(file)) issues.push(`Missing ${element.tagName}: ${raw}`);
}
const handlerNames = new Set();
for (const element of w.document.querySelectorAll('[onclick]')) {
  for (const m of element.getAttribute('onclick').matchAll(/(?<![.\w])([A-Za-z_$][\w$]*)\s*\(/g)) {
    const name = m[1]; if (['if','function','switch'].includes(name)) continue;
    handlerNames.add(name);
    try { if (w.eval(`typeof ${name}`) !== 'function') issues.push(`Undefined click handler: ${name}`); } catch(e) {issues.push(`Handler scope error: ${name}`);}
  }
}
const screens = [...w.document.querySelectorAll('.screen[id]')].map(s=>s.id);
for (const id of screens) {
  try {w.showScreen(id);if (!w.document.getElementById(id).classList.contains('active'))issues.push(`Navigation failed: ${id}`);}catch(e){issues.push(`Navigation ${id}: ${e.message}`);}
}
const soundTypes = [...new Set([...html.matchAll(/playSound\('([^']+)'/g)].map(match => match[1]))];
const soundActions = ['playInstrumentSound','playRandomHumanSound','playRandomHumanSoundG4','playRandomVehicle','playRandomAnimal','playRandomNature','playRandomHomeSound','startVehicleGame','playRandomRhythm'];
for (const fraction of [0, .25, .5, .75, .999]) {
  w.Math.random = () => fraction;
  for (const type of soundTypes.filter(type => type !== 'direction')) {
    try { await w.playSound(type); } catch (e) { issues.push(`Sound route ${type}: ${e.message}`); }
  }
  for (const action of soundActions) {
    try { await w[action](); } catch (e) { issues.push(`Sound action ${action}: ${e.message}`); }
  }
}
for (const letter of w.eval('[...new Set([...ARTIC_RING_1, ...ARTIC_RING_2, ...ARTIC_RING_3])]')) {
  try {w.playArticulationSound(letter);}catch(error){issues.push(`Articulation ${letter}: ${error.message}`);}
}
for (const src of played) {
  const url = new URL(src,w.location.href);
  if (url.origin !== w.location.origin || /^(blob|data):/.test(src)) continue;
  if (!fs.existsSync(path.resolve('public',decodeURIComponent(url.pathname.slice(1))))) issues.push(`Missing played audio: ${url.pathname}`);
}
const report = {classicSyntaxFiles,scriptCount,soundTypes,playedAudioCount:played.size,screenCount:screens.length,handlerCount:handlerNames.size,issues:[...new Set(issues)],runtimeErrors:[...new Set(runtimeErrors)],warnings:[...new Set(warnings)], note:'DOM/syntax/asset/navigation smoke only. Audio output, actual browser rendering, real microphone, network and private auth are not tested.'};
console.log(JSON.stringify(report,null,2));
w.close();
if (report.issues.length || report.runtimeErrors.length) process.exitCode = 1;
