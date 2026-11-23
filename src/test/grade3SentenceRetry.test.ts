import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Step = { kind: string; audio: string; answer: string; stimulus: string; options: { value: string }[] };
type Lesson = { grade: number; id: string; steps: Step[] };
type Session = {
  step: Step;
  retryExplanation: string | null;
  state: { index: number; attempts: number; solved: boolean; records: { supportUsed: boolean; assessment: string }[] };
  hear(): void;
  answer(value: string, time: number): { accepted: boolean; correct?: boolean };
  next(): boolean;
  support(): void;
};
const scope = {} as {
  CorexCurriculum: { create(lesson: Lesson, resume?: object): Session };
  CorexCurriculumContent: { lessons: Lesson[] };
};
for (const file of ['curriculum-session.js', 'curriculum-content.js']) {
  new Function('window', readFileSync(`public/original/js/${file}`, 'utf8'))(scope);
}
const lesson = scope.CorexCurriculumContent.lessons.find(item => item.grade === 3 && item.id === 'g3-sentence-choice')!;
const wrong = lesson.steps[0].options.find(option => option.value !== lesson.steps[0].answer)!.value;

describe('Trello #12 grade 3 heard sentence retry', () => {
  it('requires two accepted errors and does not solve or skip the current step', () => {
    const session = scope.CorexCurriculum.create(lesson);
    expect(session.answer(wrong, 1000).accepted).toBe(false);
    session.hear();
    expect(session.answer(wrong, 1400).correct).toBe(false);
    expect(session.retryExplanation).toBeNull();
    expect(session.answer(wrong, 1450).accepted).toBe(false);
    expect(session.retryExplanation).toBeNull();
    expect(session.answer(wrong, 1800).correct).toBe(false);
    expect(session.retryExplanation).toBe(lesson.steps[0].stimulus);
    expect(session.state).toMatchObject({ index: 0, solved: false, attempts: 2, records: [] });
    expect(session.next()).toBe(false);
    session.support();
    expect(session.answer(lesson.steps[0].answer, 2200).correct).toBe(true);
    expect(session.state.records).toEqual([expect.objectContaining({ assessment: 'choice', supportUsed: true })]);
    expect(session.retryExplanation).toBeNull();
    expect(session.next()).toBe(true);
    expect(session.retryExplanation).toBeNull();
  });
  it('does not reveal before listening on resume or for other lessons or grades', () => {
    for (const item of [lesson, { ...lesson, id: 'control-other' }, { ...lesson, grade: 2 }]) {
      const session = scope.CorexCurriculum.create(item, { index: 0, attempts: 2, results: [] });
      expect(session.retryExplanation).toBeNull();
      session.hear();
      expect(session.retryExplanation).toBe(item === lesson ? item.steps[0].stimulus : null);
    }
  });
});
