import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Step = { id: string; answer: string; options: { value: string }[] };
type Lesson = { grade: number; id: string; steps: Step[] };
type Record = { step: string; attempts: number; assessment: string };
type Count = { total: number; completed: number; firstTry: number };
type Session = {
  state: { records: Record[] };
  comparisonResults: { recognition: Count; calculation: Count } | null;
  hear(): void;
  answer(value: string, now: number): { correct?: boolean };
  next(): boolean;
};
const scope = {} as {
  CorexCurriculum: { create(lesson: Lesson, resume?: object): Session };
  CorexCurriculumContent: { lessons: Lesson[] };
};
for (const f of ['curriculum-session.js', 'curriculum-content.js']) {
  new Function('window', readFileSync(`public/original/js/${f}`, 'utf8'))(scope);
}
const lessons = scope.CorexCurriculumContent.lessons;
const lesson = lessons.find(l => l.grade === 4 && l.id === 'g4-comparison')!;
const engine = scope.CorexCurriculum;
const group = (completed: number, firstTry: number) => ({ total: 4, completed, firstTry });

describe('Trello #15 comparison results', () => {
  it('keeps recognition distinct from calculation without expanding saved records', () => {
    const session = engine.create(lesson);
    expect(session.comparisonResults).toEqual({ recognition: group(0, 0), calculation: group(0, 0) });
    lesson.steps.forEach((step, index) => {
      session.hear();
      if (index === 0) expect(session.answer(step.options.find(o => o.value !== step.answer)!.value, 1000).correct).toBe(false);
      expect(session.answer(step.answer, 1400).correct).toBe(true);
      if (index === 0) expect(session.comparisonResults).toEqual({ recognition: group(1, 0), calculation: group(0, 0) });
      expect(session.next()).toBe(true);
    });
    expect(session.comparisonResults).toEqual({ recognition: group(4, 3), calculation: group(4, 4) });
    const restored = engine.create(lesson, { results: JSON.parse(JSON.stringify(session.state.records)) });
    expect(restored.comparisonResults).toEqual(session.comparisonResults);
    expect(session.state.records[0]).toMatchObject({ step: 'operation-0', attempts: 2, assessment: 'choice' });
  });
  it('does not expose the card-specific report for other curricula', () => {
    for (const id of ['g2-comparison', 'g4-times-2']) {
      expect(engine.create(lessons.find(l => l.id === id)!).comparisonResults).toBeNull();
    }
  });
});
