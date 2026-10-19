import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

type Step = { id: string; kind: 'choice' | 'teacher' | 'order'; audio?: string; questionAudio?: string; teacherModel?: boolean; answer?: string; options?: { value: string; label: string }[]; expectedOrder?: string[]; initialOrder?: string[] };
type Lesson = { id: string; grade: number; table: number; strand: string; objectiveCodes: string[]; category: string; steps: Step[]; approvedBy?: string };
type Result = { step: string; attempts: number; assessment: string; supportUsed: boolean; modelledByTeacher: boolean };
type State = { index: number; total: number; complete: boolean; solved: boolean; heard: boolean; attempts: number; supportUsed: boolean; order: string[]; records: Result[] };
type Session = { step: Step | null; state: State; hear(): boolean; model(): boolean; support(): void; move(a: number, b: number): boolean; answer(value: string, now?: number): { accepted: boolean; correct?: boolean }; next(): boolean; restart(): void };
type Engine = { create(lesson: Lesson, resume?: Record<string, unknown>): Session; identity(lesson: Lesson): string };
const scope: { CorexCurriculum?: Engine; CorexCurriculumContent?: { lessons: Lesson[] } } = {};
new Function('window', readFileSync('public/original/js/curriculum-session.js', 'utf8'))(scope);
new Function('window', readFileSync('public/original/js/curriculum-content.js', 'utf8'))(scope);
const engine = scope.CorexCurriculum!, lessons = scope.CorexCurriculumContent!.lessons;
const example: Lesson = { id: 'sample', grade: 2, table: 9, strand: 'comprehension', category: 'comprehension', objectiveCodes: ['2.2.1.3'], steps: [
  { id: 'one', kind: 'choice', audio: 'story.mp3', answer: 'yes', options: [{ value: 'yes', label: 'yes' }, { value: 'no', label: 'no' }] },
  { id: 'two', kind: 'choice', audio: 'story.mp3', answer: 'no', options: [{ value: 'yes', label: 'yes' }, { value: 'no', label: 'no' }] },
] };

describe('approved curriculum progression', () => {
  it('requires completed listening, keeps a wrong question and locks repeated answers', () => {
    const session = engine.create(example);
    expect(session.answer('yes').accepted).toBe(false); expect(session.next()).toBe(false);
    session.hear(); expect(session.answer('unknown', 1000).accepted).toBe(false);
    expect(session.answer('no', 1000).correct).toBe(false); expect(session.state.index).toBe(0);
    expect(session.answer('yes', 1100).accepted).toBe(false);
    expect(session.answer('yes', 1400).correct).toBe(true); expect(session.answer('yes', 1900).accepted).toBe(false);
    expect(session.next()).toBe(true); expect(session.state.heard).toBe(true);
    expect(session.answer('no', 2000).correct).toBe(true); session.next();
    expect(session.state.complete).toBe(true); expect(session.state.records.map(r => r.attempts)).toEqual([2, 1]);
    session.restart(); expect(session.state.records).toEqual([]); expect(session.state.heard).toBe(false);
  });
  it('records assistance and resumes completed steps without inventing a new listening event', () => {
    const session = engine.create(example); session.hear(); session.support(); session.answer('yes');
    const resumed = engine.create(example, { results: session.state.records, solved: true, index: 0, attempts: 2 });
    expect(resumed.state.index).toBe(1); expect(resumed.state.attempts).toBe(0); expect(resumed.state.heard).toBe(false);
    expect(resumed.state.records[0].supportUsed).toBe(true);
    expect(resumed.state.supportUsed).toBe(false);
    const corrupted = engine.create(example, { results: [null] }); expect(corrupted.state.index).toBe(0);
  });
  it('keeps oral assessment separate and requires a teacher demonstration for intonation', () => {
    const oral: Lesson = { ...example, steps: [{ id: 'voice', kind: 'teacher', teacherModel: true }] };
    const session = engine.create(oral); expect(session.hear()).toBe(false); expect(session.answer('teacher-confirmed').accepted).toBe(false);
    session.model(); expect(session.answer('teacher-confirmed').correct).toBe(true);
    expect(session.state.records[0]).toMatchObject({ assessment: 'teacher', modelledByTeacher: true });
  });
  it('checks the full ordering and refuses moves before listening or after success', () => {
    const ordering: Lesson = { ...example, steps: [{ id: 'order', kind: 'order', audio: 'story.mp3', initialOrder: ['2', '0', '1'], expectedOrder: ['0', '1', '2'] }] };
    const session = engine.create(ordering); expect(session.move(0, 2)).toBe(false); session.hear();
    expect(session.answer('check-order', 1000).correct).toBe(false); expect(session.move(-1, 0)).toBe(false);
    session.move(0, 2); expect(session.answer('check-order', 1500).correct).toBe(true); expect(session.move(0, 1)).toBe(false);
  });
  it('separates repeated source codes by table, grade, direction and lesson', () => {
    const identities = [example, { ...example, grade: 3 }, { ...example, table: 10 }, { ...example, strand: 'pronunciation' }, { ...example, id: 'another' }].map(engine.identity);
    expect(new Set(identities).size).toBe(5);
  });
});

describe('published curriculum integrity', () => {
  it('has user approval, distinct identities and valid choices for every published lesson', () => {
    expect(new Set(lessons.map(engine.identity)).size).toBe(lessons.length);
    for (const lesson of lessons) {
      expect(lesson.approvedBy).toBe('user'); expect(lesson.steps.length).toBeGreaterThan(0);
      expect(new Set(lesson.steps.map(s => s.id)).size).toBe(lesson.steps.length);
      for (const step of lesson.steps) {
        expect(Boolean(step.audio || step.teacherModel)).toBe(true);
        if (step.kind === 'choice') {
          expect(step.options!.some(option => option.value === step.answer)).toBe(true);
          expect(new Set(step.options!.map(o => o.value)).size).toBe(step.options!.length);
        }
      }
    }
    expect(lessons.filter(l => l.grade === 1 && l.id.startsWith('pair-'))).toHaveLength(30);
    expect(lessons.filter(l => l.grade === 2 && l.id.startsWith('pair-'))).toHaveLength(6);
  });
  it('ships each referenced recording with the expected SHA-256', () => {
    const manifest: { file: string; sha256: string; text: string; segmentTexts?: string[] }[] = JSON.parse(readFileSync('public/original/sounds/curriculum/manifest.json', 'utf8'));
    const paths = new Set(manifest.map(item => item.file));
    for (const lesson of lessons) for (const step of lesson.steps) for (const file of [step.audio, step.questionAudio].filter(Boolean)) {
      expect(paths.has(file!)).toBe(true); expect(existsSync('public/original/' + file)).toBe(true);
    }
    for (const item of manifest) {
      const bytes = readFileSync('public/original/' + item.file); expect(bytes.length).toBeGreaterThan(1000);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(item.sha256);
      if (item.segmentTexts) expect(item.segmentTexts.join(' ')).toBe(item.text);
    }
  });
  it('covers multiplication 2–9 exactly and preserves integer division answers', () => {
    const multiplication = lessons.filter(l => l.id.startsWith('g4-times-'));
    expect(multiplication).toHaveLength(8);
    for (let a = 2; a <= 9; a++) for (let b = 2; b <= 9; b++) expect(multiplication.find(l => l.id === 'g4-times-' + a)!.steps.find(s => s.id === 'times-' + b)!.answer).toBe(String(a * b));
    const divide = lessons.find(l => l.id === 'g4-division')!; expect(divide.steps.map(s => s.answer)).toEqual(['4', '6', '4']);
  });
});
