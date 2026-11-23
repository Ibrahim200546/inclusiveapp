import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const source = readFileSync('public/original/js/voice-presence.js', 'utf8');
const index = readFileSync('public/original/index2.html', 'utf8');
const markup = index.slice(index.indexOf('<div id="voicePresenceScreen"'), index.indexOf('<div id="g0Task1"'));
async function setup() {
  const dom = new JSDOM(markup, { runScripts: 'outside-only' });
  const w = dom.window;
  const screen = w.document.getElementById('voicePresenceScreen')!;
  screen.classList.add('active');
  let owner = { learner: 'a', grade: 1 };
  const record = vi.fn((objective, result) => ({ objective, owner: { ...owner }, result }));
  w.CorexTaskContext = () => ({ learner: owner.learner, section: '0-1' });
  w.CorexGrades = { get current() { return owner.grade; }, recordListening: record };
  w.getProfileLang = () => 'ru';
  w.HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
  w.HTMLMediaElement.prototype.pause = vi.fn();
  w.HTMLMediaElement.prototype.load = vi.fn();
  Object.defineProperties(w.HTMLVideoElement.prototype, { videoWidth: { get: () => 64 }, videoHeight: { get: () => 48 } });
  w.URL.createObjectURL = vi.fn(() => 'blob:teacher-local');
  w.URL.revokeObjectURL = vi.fn();
  w.cancelAnimationFrame = vi.fn();
  w.AudioContext = class {
    state = 'running';
    createMediaElementSource() { return { connect() {} }; }
    createAnalyser() { return { fftSize: 4, connect() {}, getByteTimeDomainData(buffer: Uint8Array) { buffer.fill(140); } }; }
    createGain() { return { connect() {}, gain: { value: 0 } }; }
    close() { return Promise.resolve(); }
  };
  w.Math.random = () => 0;
  const check = (name: string) => screen.querySelector<HTMLButtonElement>(`[data-act="${name}"]`)!;
  const video = () => screen.querySelector<HTMLVideoElement>('[data-part="video"]')!;
  const file = screen.querySelector<HTMLInputElement>('input')!;
  Object.defineProperty(file, 'files', { value: [{ type: 'video/webm' }] });
  const load = () => {
    file.dispatchEvent(new w.Event('change'));
    video().dispatchEvent(new w.Event('loadedmetadata'));
  };
  const play = () => {
    check('play').click();
    const element = video();
    const mode = { muted: element.muted, src: element.src };
    element.dispatchEvent(new w.Event('ended'));
    return mode;
  };
  const questions = () => {
    load();
    play(); check('continue').click(); // teacher confirms visibility and speech
    expect(play()).toEqual({ muted: false, src: 'blob:teacher-local' });
    check('continue').click();
    expect(play()).toEqual({ muted: true, src: 'blob:teacher-local' });
    check('continue').click();
  };
  w.eval(source);
  await new Promise<void>(resolve => w.document.addEventListener('DOMContentLoaded', () => resolve(), { once: true }));
  return { w, check, video, play, questions, record, switchLearner: () => { owner = { ...owner, learner: 'b' }; },
    switchGrade: () => { owner = { ...owner, grade: 0 }; w.dispatchEvent(new w.Event('learning-grade-change')); } };
}

describe('local teacher demonstration identity', () => {
  let h: Awaited<ReturnType<typeof setup>>;
  beforeEach(async () => { h = await setup(); });
  afterEach(() => h.w.close());

  it('plays the same voiced/silent clip, repeats a wrong target and records only two listening choices', () => {
    const { check, play, questions, record } = h;
    questions();
    const first = play();
    check('no').click();
    expect(check('yes').disabled).toBe(true);
    expect(play()).toEqual(first);
    check('yes').click();
    check('continue').click();
    expect(play()).toEqual({ muted: true, src: first.src });
    check('no').click();
    expect(record).toHaveBeenCalledExactlyOnceWith('voice-presence', { completed: 2, attempts: 3,
      results: [{ id: 'voiced', attempts: 2 }, { id: 'silent', attempts: 1 }] });
  });

  it('does not attribute an existing attempt or media to a different learner', () => {
    const { check, play, questions, record, switchLearner, w, video } = h;
    questions(); play(); check('yes').click(); check('continue').click(); play();
    switchLearner(); check('no').click();
    expect(record).not.toHaveBeenCalled();
    expect(w.URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:teacher-local');
    expect(video().getAttribute('src')).toBeNull();
  });

  it('clears media when the selected grade changes within the shared junior section', () => {
    const { questions, switchGrade, video, check, record, w } = h;
    questions(); switchGrade();
    expect(video().getAttribute('src')).toBeNull();
    expect(check('play').hidden).toBe(true);
    expect(w.URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:teacher-local');
    expect(record).not.toHaveBeenCalled();
  });
});
