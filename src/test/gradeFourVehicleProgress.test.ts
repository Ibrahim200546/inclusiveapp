import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { expect, it } from 'vitest';

it('keeps the earlier grade 4 vehicle IDs until a replay improves coverage', async () => {
  const read = (path: string) => readFileSync('public/original/' + path, 'utf8');
  const dom = new JSDOM(read('index2.html'), { url: 'https://example.test/original/', runScripts: 'outside-only' });
  const w = dom.window;
  try {
    const played: string[] = [];
    class FakeAudio extends (w.EventTarget as typeof EventTarget) {
      constructor(private readonly path: string) { super(); }
      play() { played.push(this.path); this.dispatchEvent(new w.Event('ended')); return Promise.resolve(); }
      pause() { /* no audio hardware in this test */ }
    }
    Object.assign(w, { Audio: FakeAudio, showScreen: () => {},
      CorexExerciseOrbit: { illustrate: () => {}, layout: () => {} } });
    w.Math.random = () => 0.999;
    for (const script of ['learning-session', 'grade-sounds']) w.eval(read('js/' + script + '.js'));
    w.eval(`{
      const original = CorexGradeSounds.profile;
      CorexGradeSounds.profile = (grade, category, stage) => {
        const profile = original(grade, category, stage);
        if (grade === 4 && category === 'technical' && stage === 'vehicles') {
          profile.items.unshift({ id: 'combine', answer: 'combine', kk: 'Комбайн', ru: 'Комбайн', icon: '🚜', audio: 'test-only/combine.mp3' });
        }
        return profile;
      };
    }`);
    w.eval(read('js/learning-work-ui.js'));
    const settled = () => new Promise(resolve => w.setTimeout(resolve, 0));
    await settled();
    const storage = 'eduCorex.learning.v1:guest';
    const key = 'grade:4:table:13:recognition:technical:vehicles';
    const earlier = {
      grade: 4, table: 13, context: 'recognition', objective: 'technical:vehicles',
      stage: 'vehicles', completed: 3, attempts: 4, updatedAt: '2026-11-20T00:00:00.000Z',
      results: [{ id: 'car', attempts: 2 }, { id: 'tractor', attempts: 1 }, { id: 'truck', attempts: 1 }],
    };
    const progress = () => JSON.parse(w.localStorage.getItem(storage)!)[key];
    w.localStorage.setItem(storage, JSON.stringify({ [key]: earlier }));
    w.eval("CorexGrades.select(4); showScreen('g0TaskTech2')");
    const screen = w.document.querySelector('#g0TaskTech2')!;
    screen.querySelectorAll<HTMLButtonElement>('.learning-stages button')[1].click();
    const next = screen.querySelectorAll<HTMLButtonElement>('.learning-actions button')[1];
    for (const [index, id] of ['combine', 'car', 'tractor', 'truck'].entries()) {
      await settled();
      expect(played.at(-1)).toMatch(new RegExp('/' + id + '\\.mp3$'));
      const answer = screen.querySelector<HTMLButtonElement>(`[data-answer="${id}"]`)!;
      expect(answer.disabled).toBe(false);
      answer.click();
      if (index < 3) expect(progress()).toEqual(earlier);
      next.click();
    }
    expect(progress()).toMatchObject({
      completed: 4, attempts: 4, objective: 'technical:vehicles',
      results: ['combine', 'car', 'tractor', 'truck'].map(id => ({ id, attempts: 1 })),
    });
    const summary = screen.querySelector<HTMLElement>('.learning-summary')!;
    expect(summary.hidden).toBe(false);
    expect(summary.textContent).toContain('4');
  } finally {
    w.close();
  }
});
