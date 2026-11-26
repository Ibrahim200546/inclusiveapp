import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface Lesson {
  id: string; grade: number; table: number; strand: string; objectiveCodes: string[];
  progressObjectiveCodes?: string[]; sourceMappingPending?: boolean;
  conditionalObjectiveCodes?: string[]; sourceRange?: number[]; sentenceCount?: number;
  steps: { kind: string; stimulus: string; audio: string; questionAudio?: string; answer?: string }[];
}
const scope: { CorexCurriculumContent?: { lessons: Lesson[] }; CorexCurriculum?: { identity(l: Lesson): string } } = {};
for (const file of ['curriculum-content', 'curriculum-session']) {
  new Function('window', readFileSync('public/original/js/' + file + '.js', 'utf8'))(scope);
}
const junior = scope.CorexCurriculumContent!.lessons.filter(l => l.grade < 2 && ['g01-objects', 'g01-school-6', 'g0-walk-7', 'g1-apple-7', 'g01-pencil'].includes(l.id));
const entry = (grade: number, id: string) => junior.find(l => l.grade === grade && l.id === id)!;

describe('card 10 scoped curriculum references', () => {
  it('maps seven published variants and documents the conditional eighth without assigning familiarity', () => {
    expect(junior).toHaveLength(8);
    expect(junior.filter(l => l.objectiveCodes.length)).toHaveLength(7);
    expect(entry(0, 'g01-objects').objectiveCodes).toEqual(['0.2.1.2']);
    expect(entry(1, 'g01-objects').objectiveCodes).toEqual(['1.2.1.7']);
    expect(entry(0, 'g01-school-6').objectiveCodes).toEqual(['0.2.1.13', '0.3.1.7']);
    for (const id of ['g01-school-6', 'g1-apple-7']) {
      const text = entry(1, id);
      expect(text.objectiveCodes).toEqual(['1.2.1.5']);
      expect(text.sourceRange).toEqual([6, 7]);
    }
    expect(entry(0, 'g0-walk-7')).toMatchObject({
      objectiveCodes: [], conditionalObjectiveCodes: ['0.3.1.9'], sourceMappingPending: true,
    });
    expect(junior.flatMap(l => l.objectiveCodes)).not.toContain('1.3.1.3');
    expect(junior.flatMap(l => l.objectiveCodes)).not.toContain('1.3.1.10');
  });

  it('matches the recorded text and expected length and keeps scripted oral turns separate', () => {
    const manifest = JSON.parse(readFileSync('public/original/sounds/curriculum/manifest.json', 'utf8')) as { file: string; text: string }[];
    const clips = new Map(manifest.map(({ file, text }) => [file, text]));
    for (const lesson of junior) {
      if (lesson.sourceRange) {
        expect(lesson.sentenceCount!).toBeGreaterThanOrEqual(lesson.sourceRange[0]);
        expect(lesson.sentenceCount!).toBeLessThanOrEqual(lesson.sourceRange[1]);
        expect(lesson.steps[0].stimulus.match(/[.!?](?=\s|$)/g)).toHaveLength(lesson.sentenceCount!);
      }
      for (const step of lesson.steps) {
        expect(clips.get(step.audio)).toBe(step.stimulus);
        if (step.questionAudio) expect(clips.has(step.questionAudio)).toBe(true);
      }
    }
    for (const [grade, code, conditional] of [[0, '0.2.1.11', '0.2.1.8'], [1, '1.2.1.2', '1.3.1.5']] as const) {
      const lesson = entry(grade, 'g01-pencil');
      expect(lesson.objectiveCodes).toEqual([code]);
      expect(lesson.conditionalObjectiveCodes).toEqual([conditional]);
      expect(lesson.steps.map(step => step.kind)).toEqual(['choice', 'teacher', 'teacher', 'teacher', 'teacher']);
    }
  });

  it('keeps every prior progress key intact and separate from grade 2 copies', () => {
    for (const lesson of junior) {
      const oldKey = [lesson.grade, lesson.table, lesson.strand, 'unmapped', lesson.id].join(':');
      const identity = scope.CorexCurriculum!.identity;
      expect(identity(lesson)).toBe(oldKey);
      const copied = { ...lesson, grade: 2, progressScope: 'junior-copy', sourceGrade: lesson.grade };
      expect(identity(copied)).toBe([2, lesson.table, lesson.strand, 'unmapped', lesson.id, 'junior-copy', lesson.grade].join(':'));
    }
  });
});
