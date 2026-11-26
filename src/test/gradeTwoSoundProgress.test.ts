import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { expect, it } from 'vitest';

it('keeps completed Grade 2 junior-copy progress on partial replay without changing prior grades or stages', async () => {
  const file = (path: string) => readFileSync('public/original/' + path, 'utf8');
  const dom = new JSDOM(file('index2.html'), { url: 'https://example.test/original/', runScripts: 'outside-only' });
  const w = dom.window;
  try {
    const played: string[] = [];
    class FakeAudio extends (w.EventTarget as typeof EventTarget) {
      constructor(private readonly src: string) { super(); }
      play() { played.push(this.src); this.dispatchEvent(new w.Event('ended')); return Promise.resolve(); }
      pause() { /* no audio hardware in this test */ }
    }
    Object.assign(w, {
      Audio: FakeAudio,
      showScreen: () => {},
      CorexExerciseOrbit: { illustrate: () => {}, layout: () => {} },
    });
    for (const path of ['learning-session', 'grade-sounds', 'learning-work-ui']) w.eval(file('js/' + path + '.js'));
    await new Promise(resolve => w.setTimeout(resolve, 0));
    w.eval("CorexGrades.select(2); showScreen('g0Task3')");
    const screen = w.document.querySelector('#g0Task3')!;
    const settled = () => new Promise(resolve => w.setTimeout(resolve, 0));
    const answer = async () => {
      await settled();
      const id = played.at(-1)!.split('/').at(-1)!.replace('.mp3', '');
      const button = screen.querySelector<HTMLButtonElement>(`[data-answer="${id}"]`)!;
      expect(button.disabled).toBe(false);
      button.click();
    };
    const progress = () => JSON.parse(w.localStorage.getItem('eduCorex.learning.v1:guest')!);
    const start = 'grade:2:table:9:recognition:instruments:start';
    const extended = 'grade:2:table:9:recognition:instruments:extended';
    const junior = 'grade:0:table:5:recognition:instruments:standard';
    const copied = 'grade:2:table:5:recognition:instruments:standard:junior-copy';
    const original = { [start]: { completed: 4 }, [extended]: { completed: 6 }, [junior]: { completed: 2 } };
    w.localStorage.setItem('eduCorex.learning.v1:guest', JSON.stringify(original));
    const actions = screen.querySelector('.learning-actions')!;
    const next = actions.children[1] as HTMLButtonElement;
    const restart = actions.children[2] as HTMLButtonElement;
    expect(screen.querySelectorAll('[data-answer]')).toHaveLength(2);
    expect(screen.querySelector<HTMLElement>('.learning-stages')!.hidden).toBe(true);
    for (let i = 0; i < 2; i++) { await answer(); next.click(); }
    expect(progress()[copied]).toMatchObject({ completed: 2, grade: 2, sourceGrade: 0, table: 5, progressScope: 'junior-copy' });
    restart.click();
    await answer();
    expect(progress()[copied].completed).toBe(2);
    expect(progress()).toMatchObject(original);
    w.eval("CorexGrades.select(3); showScreen('g0Task3')");
    await answer();
    const gradeThree = 'grade:3:table:11:recognition:instruments:standard';
    expect(progress()[gradeThree].completed).toBe(1);
    expect(progress()).toMatchObject(original);
  } finally {
    w.close();
  }
});
