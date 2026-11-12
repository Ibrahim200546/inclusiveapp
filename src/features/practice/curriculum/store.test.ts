import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCurriculumStore } from './store';
import { createCurriculumProgress } from './progress';
import { identity } from './session';
import type { CurriculumPlayback, PlaybackResult } from './playback';
import type { Lesson } from './types';

const lesson: Lesson = { id: 'story', title: 'Story', grade: 0, table: 5, strand: 'listening', objectiveCodes: [], category: 'comprehension', steps: [
  { id: 'first', kind: 'choice', audio: 'story.mp3', questionAudio: 'question.mp3', answer: 'yes', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }] },
  { id: 'second', kind: 'choice', audio: 'story.mp3', answer: 'no', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }] },
] };
function setup() {
  let learner: string | null = null;
  const pending: ((result: PlaybackResult) => void)[] = [];
  const player: CurriculumPlayback = { play: vi.fn(() => new Promise<PlaybackResult>(resolve => pending.push(resolve))), stop: vi.fn(), pause: vi.fn(), resume: vi.fn() };
  const progress = createCurriculumProgress(() => localStorage), reward = vi.fn(), navigate = vi.fn();
  const store = createCurriculumStore({ lessons: [lesson, { ...lesson, grade: 1 }], player, progress, reward, navigate,
    getLearner: () => learner, getLocale: () => 'kk' });
  const state = () => store.getSnapshot().practice!;
  return { store, state, pending, player, progress, reward, navigate, setLearner: (value: string | null) => { learner = value; } };
}
beforeEach(() => localStorage.clear());

describe('curriculum store', () => {
  it('gates answers, reuses completed narration and awards one completed cycle', async () => {
    const { store, state, pending, progress, reward } = setup();
    store.openLesson(lesson); store.answer('yes'); expect(state().state.solved).toBe(false);
    const heard = store.listen(); store.answer('yes'); expect(state().state.attempts).toBe(0);
    pending[0]('ended'); await heard;
    store.answer('no', 1000); store.answer('yes', 1100); expect(state().state.attempts).toBe(1);
    store.answer('yes', 1400); store.answer('yes', 1800); store.next();
    expect(state().state).toMatchObject({ index: 1, heard: true });
    store.answer('no', 2000); store.next(); store.next(); store.setLocale('ru');
    expect(reward).toHaveBeenCalledTimes(1);
    expect(progress.read(null)[identity(lesson)]).toMatchObject({ completed: true, everCompleted: true, results: [{ attempts: 2 }, { attempts: 1 }] });
    store.restart(); expect(state().state).toMatchObject({ index: 0, heard: false, complete: false });
    expect(progress.read(null)[identity(lesson)]).toMatchObject({ completed: false, everCompleted: true, results: [] });
  });
  it('ignores an old recording after exit, replacement, restart or language change', async () => {
    const { store, state, pending } = setup(); store.openLesson(lesson);
    const first = store.listen(); store.leave(); store.openLesson(lesson);
    const second = store.listen(); pending[0]('ended'); await first;
    expect(state()).toMatchObject({ playing: true, state: { heard: false } });
    store.restart(); pending[1]('ended'); await second; expect(state().state.heard).toBe(false);
    const choices = state().choices;
    const third = store.listen(); store.setLocale('ru'); pending[2]('error'); await third;
    expect(state()).toMatchObject({ playing: false, feedback: 'prompt', state: { heard: false } });
    expect(state().choices).toBe(choices);
  });
  it('samples and questions do not unlock the model; pauses and errors never count as listening', async () => {
    const { store, state, pending, player } = setup(); store.openLesson(lesson);
    const question = store.question(); pending[0]('ended'); await question; expect(state().state.heard).toBe(false);
    const sample = store.sample('other.mp3'); pending[1]('ended'); await sample; expect(state().state.heard).toBe(false);
    const heard = store.listen(); store.togglePause(); expect(state()).toMatchObject({ paused: true, playing: true });
    expect(player.pause).toHaveBeenCalledOnce(); store.answer('yes'); expect(state().state.attempts).toBe(0);
    store.togglePause(); expect(player.resume).toHaveBeenCalledOnce(); pending[2]('error'); await heard;
    expect(state()).toMatchObject({ playing: false, paused: false, feedback: 'error', state: { heard: false } });
    const retry = store.listen(); pending[3]('ended'); await retry; expect(state().state.heard).toBe(true);
  });
  it('resumes the next unanswered question with saved attempts and requires a new listening event', async () => {
    const { store, state, pending } = setup(); store.openLesson(lesson);
    const played = store.listen(); pending[0]('ended'); await played;
    store.support(); store.answer('yes'); store.leave(); store.openLesson(lesson);
    expect(state().state).toMatchObject({ index: 1, heard: false, attempts: 0, supportUsed: false, records: [{ supportUsed: true }] });
    const next = store.listen(); pending[1]('ended'); await next; store.answer('yes'); store.leave(); store.openLesson(lesson);
    expect(state().state).toMatchObject({ index: 1, heard: false, attempts: 1 });
  });
  it('isolates accounts and refuses actions when the learner has changed', async () => {
    const { store, pending, setLearner, progress, navigate } = setup(); store.openLesson(lesson);
    const playing = store.listen(); setLearner('another'); pending[0]('ended'); await playing;
    store.answer('yes'); store.support(); expect(progress.read('another')).toEqual({});
    store.changeLearner(); expect(store.getSnapshot().practice).toBeNull(); expect(navigate).toHaveBeenLastCalledWith('curriculumCatalog');
    store.openLesson(lesson); const next = store.listen(); pending[1]('ended'); await next; store.answer('yes');
    expect(progress.read(null)).toEqual({}); expect(progress.read('another')[identity(lesson)].results).toHaveLength(1);
  });
  it('keeps teacher assessment, help and participation separate from automatic choices', () => {
    const { store, state, progress, reward } = setup();
    const oral: Lesson = { ...lesson, steps: [{ id: 'oral', kind: 'teacher', teacherModel: true }] };
    store.openLesson(oral); store.setParticipation('independent'); store.support(); store.answer('teacher-confirmed');
    expect(state().state.records).toEqual([]); store.model(); store.answer('teacher-confirmed'); store.next();
    expect(progress.read(null)[identity(oral)]).toMatchObject({ participation: 'independent', assessment: 'mixed-or-teacher',
      results: [{ assessment: 'teacher', modelledByTeacher: true, supportUsed: true }] });
    expect(reward).toHaveBeenCalledOnce();
  });
  it('retains the result when storage is blocked or corrupt', async () => {
    const { store, state, pending } = setup();
    localStorage.setItem('eduCorex.curriculum.v1:guest', 'invalid'); store.openLesson({ ...lesson, steps: [lesson.steps[0]] });
    const written = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    try {
      const heard = store.listen(); pending[0]('ended'); await heard; store.answer('yes'); store.next();
      expect(state()).toMatchObject({ persisted: false, state: { complete: true, records: [{ step: 'first' }] } });
    } finally { written.mockRestore(); }
  });
  it('restores a pair sequence and records oral variants under a separate identity', async () => {
    const { store, state, pending, progress } = setup();
    const pair: Lesson = { ...lesson, id: 'pair-0', steps: lesson.steps.map((step, index) => ({ ...step, id: 'words-' + index })) };
    store.openLesson(pair); store.startPair(pair, 'words', 'repeat');
    const sequence = state().lesson.steps.map(step => step.id), variant = state().lesson;
    const playing = store.listen(); pending[0]('ended'); await playing; store.answer('teacher-confirmed');
    expect(progress.read(null)[identity(variant)]).toMatchObject({ sequence, results: [{ assessment: 'teacher' }] });
    store.leave(); store.openLesson(pair); store.startPair(pair, 'words', 'repeat');
    expect(state().lesson.steps.map(step => step.id)).toEqual(sequence); expect(state().state.index).toBe(1);
    expect(state().state.heard).toBe(false); expect(progress.read(null)[identity(pair)]).toBeUndefined();
  });
});
