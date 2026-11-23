import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { expect, it } from 'vitest';

it('keeps instrument starter choices separate from the expanded junior sound banks', async () => {
  const read = (path: string) => readFileSync('public/original/' + path, 'utf8');
  const dom = new JSDOM(read('index2.html'), { url: 'https://example.test/original/', runScripts: 'outside-only' });
  const w = dom.window;
  try {
    class FakeAudio extends (w.EventTarget as typeof EventTarget) {
      play() { this.dispatchEvent(new w.Event('ended')); return Promise.resolve(); }
      pause() { /* no audio hardware in this test */ }
    }
    Object.assign(w, {
      Audio: FakeAudio,
      showScreen: () => {},
      CorexExerciseOrbit: { illustrate: () => {}, layout: () => {} },
    });
    for (const path of ['learning-session', 'grade-sounds', 'learning-work-ui']) w.eval(read('js/' + path + '.js'));
    await new Promise(resolve => w.setTimeout(resolve, 0));
    expect(w.document.getElementById('g0Task7')).toBeNull();
    expect(w.document.getElementById('g4Task7')).not.toBeNull();
    const ids = (grade: number, screen: string) => {
      w.eval(`CorexGrades.select(${grade}); showScreen('${screen}')`);
      return [...w.document.querySelectorAll<HTMLElement>(`#${screen} [data-answer]`)].map(b => b.dataset.answer).sort();
    };
    expect(ids(0, 'g0Task3')).toEqual(['dombra', 'guitar']);
    expect(ids(1, 'g0Task3')).toEqual(['dombra', 'drum', 'guitar']);
    expect(ids(0, 'g0Task8')).toEqual(['car', 'fire-engine', 'motorcycle', 'train']);
    expect(ids(1, 'g0Task8')).toEqual(['bus', 'car', 'fire-engine', 'motorcycle', 'train']);
    expect(ids(0, 'g0Task6')).toEqual(['bird', 'rain', 'thunder', 'water']);
    expect(ids(1, 'g0Task6')).toEqual(['bird', 'rain', 'thunder', 'water', 'wind']);
    expect(ids(0, 'g0TaskEmotion')).toEqual(['cough', 'cry', 'laugh', 'yawn']);
    expect(ids(1, 'g0TaskEmotion')).toEqual(['cough', 'cry', 'laugh', 'sneeze', 'yawn']);
  } finally {
    w.close();
  }
});
