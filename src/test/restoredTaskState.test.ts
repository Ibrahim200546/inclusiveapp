import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';

const source = (path: string) => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
function task(name: string, saved?: Record<string, string>, learner = 'a') {
  const dom = new JSDOM(source(`public/original/tasks/${name}.html`), { url: 'https://example.test/original/tasks/', runScripts: 'outside-only' });
  const w = dom.window;
  let context = { learner, section: '0-1' };
  Object.defineProperty(w, 'parent', { value: { CorexTaskContext: () => context } });
  w.setInterval = (() => 0) as any;
  w.localStorage.setItem('profileLang', 'ru');
  Object.entries(saved || {}).forEach(([key, value]) => w.localStorage.setItem(key, value));
  w.eval(source('public/original/js/task-local-state.js'));
  w.document.querySelectorAll('script:not([src])').forEach(script => w.eval(script.textContent || ''));
  return { w, close: () => w.close(), switchLearner: () => { context = { ...context, learner: 'b' }; }, snapshot: () => Object.fromEntries(Object.keys(w.localStorage).map(key => [key, w.localStorage.getItem(key)!])) };
}
describe('reconstructed local practice', () => {
  it('restores viewed rows independently from an idempotent teacher observation', () => {
    const a = task('bir_tinispen_oku');
    const click = (id: string) => (a.w.document.getElementById(id) as HTMLButtonElement).click();
    for (let i = 0; i < 6; i++) click('goBtn');
    expect(a.w.CorexTaskState.load('one-breath-reading').reviewed).toEqual({});
    expect(a.w.CorexTaskState.load('one-breath-reading').viewed['ТА']).toBe(true);
    click('teacherBtn');
    const review = a.w.CorexTaskState.load('one-breath-reading').reviewed;
    click('teacherBtn');
    expect(a.w.CorexTaskState.load('one-breath-reading').reviewed).toEqual(review);
    const b = task('bir_tinispen_oku', a.snapshot());
    expect(b.w.document.getElementById('prog')!.textContent).toBe('6 / 6');
    expect((b.w.document.getElementById('teacherBtn') as HTMLButtonElement).disabled).toBe(true);
    const c = task('bir_tinispen_oku', a.snapshot(), 'b');
    expect(c.w.document.getElementById('prog')!.textContent).toBe('0 / 6');
    a.switchLearner(); expect(a.w.CorexTaskState.current()).toBe(false);
    a.close(); b.close(); c.close();
  });
  it('keeps rhythm level and completed attempts across reload without fabricating a grade', () => {
    const a = task('povtori_ritm');
    a.w.CorexTaskState.save('repeat-rhythm', { level: 2, rounds: { 2: 1 }, done: [0], attempts: [{ correct: true }] });
    const b = task('povtori_ritm', a.snapshot());
    expect(b.w.document.querySelector('#levels .on')!.textContent).toBe('3');
    expect(b.w.document.getElementById('prog')!.textContent).toBe('⭐☆☆');
    expect(b.w.CorexTaskState.load('repeat-rhythm').context).toEqual({ learner: 'a', section: '0-1' });
    expect(b.w.CorexTaskState.load('repeat-rhythm').attempts).toHaveLength(1);
    const c = task('povtori_ritm', a.snapshot(), 'b');
    expect(c.w.document.getElementById('prog')!.textContent).toBe('☆☆☆');
    a.close(); b.close(); c.close();
  });
});

it('exposes both junior lesson variants while preserving their original storage identities', () => {
  const w = new JSDOM('', { runScripts: 'outside-only' });
  w.window.eval(source('public/original/js/curriculum-content.js'));
  w.window.eval(source('public/original/js/curriculum-session.js'));
  const ui = source('public/original/js/curriculum-ui.js');
  const fn = ui.slice(ui.indexOf('  function lessonsForGrade('), ui.indexOf('  function topicPath('));
  const list = new Function('content', 'tr', fn + '; return lessonsForGrade(0);')(w.window.CorexCurriculumContent, (kk: string) => kk);
  expect(list.some((lesson: any) => lesson.id === 'one-breath')).toBe(false);
  const breaths = list.filter((lesson: any) => lesson.id === 'word-stress');
  expect(breaths).toHaveLength(2);
  expect(breaths[1].navigationId).toBe('word-stress-variant-1');
  expect(w.window.CorexCurriculum.identity(breaths[0])).not.toBe(w.window.CorexCurriculum.identity(breaths[1]));
  for (const lesson of list.filter((lesson: any) => !lesson.embed)) {
    const original = w.window.CorexCurriculumContent.lessons.find((item: any) => item.id === lesson.id && item.grade === lesson.grade);
    expect(w.window.CorexCurriculum.identity(lesson)).toBe(w.window.CorexCurriculum.identity(original));
    expect(lesson.steps).toEqual(original.steps);
  }
  w.window.close();
});
