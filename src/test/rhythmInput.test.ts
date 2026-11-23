import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const source = (path: string) => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
const pattern = [[0, 0], [450, 3], [900, 0], [1350, 3]];

function rhythm() {
  const dom = new JSDOM(source('public/original/tasks/povtori_ritm.html'), {
    url: 'https://example.test/original/tasks/', runScripts: 'outside-only',
  });
  const w = dom.window;
  let context = { learner: 'a', section: '0-1' };
  Object.defineProperty(w, 'parent', { value: { CorexTaskContext: () => context } });
  w.setInterval = (() => 0) as typeof w.setInterval;
  w.setTimeout = ((callback: () => void, ms: number) => setTimeout(callback, ms)) as unknown as typeof w.setTimeout;
  w.clearTimeout = ((id: ReturnType<typeof setTimeout>) => clearTimeout(id)) as unknown as typeof w.clearTimeout;
  w.performance.now = () => Date.now();
  w.localStorage.setItem('profileLang', 'ru');
  w.eval(source('public/original/js/task-local-state.js'));
  w.CorexTaskState.save('repeat-rhythm', { level: 1, rounds: {}, done: [], attempts: [], pattern });
  w.document.querySelectorAll('script:not([src])').forEach(script => w.eval(script.textContent || ''));
  const get = (id: string) => w.document.getElementById(id) as HTMLButtonElement;
  const pad = (i: number) => w.document.querySelectorAll<HTMLButtonElement>('#pads button')[i];
  const key = (target: EventTarget, name: string, code = name) => {
    const event = new w.KeyboardEvent('keydown', { key: name, code, bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    return event.defaultPrevented;
  };
  const state = () => w.CorexTaskState.load('repeat-rhythm');
  return { w, get, pad, key, state, switchLearner: () => { context = { ...context, learner: 'b' }; } };
}

describe('embedded rhythm input and retry', () => {
  let h: ReturnType<typeof rhythm>;
  beforeEach(() => { vi.useFakeTimers(); h = rhythm(); });
  afterEach(() => { h.w.close(); vi.useRealTimers(); });

  it('lets focused native controls activate and counts one tap per pointer/click sequence', () => {
    const { w, get, key, pad } = h;
    for (const button of [get('listenBtn'), w.document.querySelector<HTMLButtonElement>('#levels button')!]) {
      button.focus();
      expect(key(button, 'Enter')).toBe(false);
      expect(key(button, ' ', 'Space')).toBe(false);
    }
    get('listenBtn').click();
    vi.advanceTimersByTime(2650);
    get('replay').focus();
    expect(key(get('replay'), 'Enter')).toBe(false);
    expect(key(get('replay'), ' ', 'Space')).toBe(false);
    get('replay').click();
    vi.advanceTimersByTime(2650);
    expect(get('laneA').children).toHaveLength(4);
    const button = pad(0);
    button.focus();
    expect(key(button, 'Enter')).toBe(false);
    expect(key(button, ' ', 'Space')).toBe(false);
    button.dispatchEvent(new w.MouseEvent('pointerdown', { bubbles: true, cancelable: true }));
    expect(get('laneB').children).toHaveLength(0);
    button.dispatchEvent(new w.MouseEvent('click', { bubbles: true, detail: 1 }));
    expect(get('laneB').children).toHaveLength(1);
    button.click(); // zero-detail native keyboard/programmatic activation
    expect(get('laneB').children).toHaveLength(2);
    expect(key(w.document.body, '2', 'Digit2')).toBe(false);
    expect(get('laneB').children).toHaveLength(3);
  });

  it('replays the precise failed pattern without awarding progress', () => {
    const { get, pad, state } = h;
    get('listenBtn').click();
    vi.advanceTimersByTime(2650);
    pad(1).click(); // wrong first pad, then stop
    vi.advanceTimersByTime(4000);
    expect(state().attempts).toMatchObject([{ correct: false, pattern }]);
    expect(state().rounds).toEqual({});
    vi.advanceTimersByTime(3200);
    expect(state().pattern).toEqual(pattern);
    expect(get('listenBtn').hidden).toBe(false);
    get('listenBtn').click();
    vi.advanceTimersByTime(2650);
    expect([...get('laneA').children].map(note => note.textContent)).toEqual(['🥁', '👣', '🥁', '👣']);
    for (const [index, padIndex] of [0, 1, 0, 1].entries()) {
      if (index) vi.advanceTimersByTime(450);
      pad(padIndex).click();
    }
    vi.advanceTimersByTime(400);
    expect(state().attempts).toMatchObject([{ correct: false, pattern }, { correct: true, pattern }]);
    expect(state().rounds).toEqual({ 1: 1 });
    expect(state().context).toEqual({ learner: 'a', section: '0-1' });
  });

  it('does not write an in-flight attempt after the active learner changes', () => {
    const { get, pad, state, switchLearner } = h;
    get('listenBtn').click();
    vi.advanceTimersByTime(2650);
    pad(0).click();
    switchLearner();
    vi.advanceTimersByTime(4000);
    expect(state().attempts).toEqual([]);
    expect(state().rounds).toEqual({});
  });
});
