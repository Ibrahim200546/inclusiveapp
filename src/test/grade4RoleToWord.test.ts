import { existsSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

type Step = { prompt: string; stimulus: string; audio: string; options: { value: string }[]; answer: string; display?: string };
type Lesson = { id: string; grade: number; table: number; objectiveCodes: string[]; steps: Step[] };
const scope = {} as { CorexCurriculumContent: { lessons: Lesson[] } };
new Function('window', readFileSync('public/original/js/curriculum-content.js', 'utf8'))(scope);

it('offers role-to-word listening from the existing nine human-authored mappings without changing the old direction', () => {
  const { lessons } = scope.CorexCurriculumContent;
  const old = lessons.find(item => item.id === 'g4-syntax')!;
  const lesson = lessons.find(item => item.id === 'g4-syntax-role-to-word')!;
  expect([lesson.grade, lesson.table, lesson.objectiveCodes]).toEqual([4, 13, ['4.2.1.11', '4.3.1.11']]);
  const { syntax } = JSON.parse(readFileSync('docs/trello-verification/content-drafts.json', 'utf8'));
  const expected = syntax.items.flatMap((item: { text: string; roles: { word: string; role: string }[] }) =>
    item.roles.map(role => ({ text: item.text, role, words: item.roles.map(r => r.word) })));
  expect(lesson.steps).toHaveLength(9);
  expect(old.steps).toHaveLength(9);
  for (const [i, step] of lesson.steps.entries()) {
    const { text, role, words } = expected[i];
    expect(step.stimulus).toBe(text);
    expect(step.prompt).toContain(role.role);
    expect(step.answer).toBe(role.word);
    expect(step.options.map(o => o.value)).toEqual(words);
    expect(step.display).toBeUndefined();
    expect(old.steps[i].answer).toBe(role.role);
    expect(step.audio).toBe(old.steps[i].audio);
    expect(existsSync('public/original/' + step.audio)).toBe(true);
  }
});

it('maps the exact math rows without losing old progress or treating additive comparisons as multiplicative', () => {
  type MathLesson = Omit<Lesson, 'steps'> & { progressObjectiveCodes?: string[]; steps: (Step & { objectiveCodes?: string[] })[] };
  const engineScope = {} as { CorexCurriculum: { identity(lesson: Lesson): string } };
  new Function('window', readFileSync('public/original/js/curriculum-session.js', 'utf8'))(engineScope);
  const { identity } = engineScope.CorexCurriculum;
  const find = (id: string) => scope.CorexCurriculumContent.lessons.find(lesson => lesson.id === id)! as MathLesson;
  const comparison = find('g4-comparison');
  expect(comparison.objectiveCodes).toEqual(['4.3.1.6']);
  expect(comparison.steps.map(step => step.objectiveCodes)).toEqual([
    ['4.3.1.6'], ['4.3.1.6'], ['4.3.1.6', '4.2.1.14', '4.3.1.13'], ['4.3.1.6', '4.2.1.14', '4.3.1.13'],
    ['4.3.1.6'], ['4.3.1.6'], ['4.3.1.6', '4.2.1.14', '4.3.1.13'], ['4.3.1.6', '4.2.1.14', '4.3.1.13'],
  ]);
  expect(find('g4-division').objectiveCodes).toEqual(['4.3.1.6']);
  for (const digit of [2, 3, 4, 5, 6, 7, 8, 9]) expect(find('g4-times-' + digit).objectiveCodes).toEqual(['4.2.1.14', '4.3.1.13']);
  for (const id of ['g4-comparison', 'g4-division', ...Array.from({ length: 8 }, (_, i) => 'g4-times-' + (i + 2))]) {
    expect(identity(find(id))).toBe('4:13:speech-comprehension:unmapped:' + id);
  }
});

it('restores all 15 sentences in three reordered parts with the original bundled audio', () => {
  type OrderLesson = Omit<Lesson, 'steps'> & { sentenceCount: number; steps: (Step & {
    kind: string; supportText?: string; orderItems: { value: string; label: string }[]; expectedOrder: string[]; initialOrder: string[];
  })[] };
  const { lessons } = scope.CorexCurriculumContent;
  const narration = lessons.find(lesson => lesson.id === 'g4-extended-15')!;
  const order = lessons.find(lesson => lesson.id === 'g4-extended-15-order')! as OrderLesson;
  expect([order.grade, order.table, order.objectiveCodes, order.sentenceCount]).toEqual([4, 13, ['4.3.1.8'], 15]);
  const step = order.steps[0];
  expect(step.kind).toBe('order');
  expect(step.supportText).toBeUndefined();
  expect(step.audio).toBe(narration.steps[0].audio);
  expect(step.initialOrder).toEqual(['2', '0', '1']);
  expect(step.expectedOrder.map(value => step.orderItems.find(item => item.value === value)!.label).join(' ')).toBe(narration.steps[0].stimulus);
  expect(step.orderItems.map(item => item.label.split('. ').length)).toEqual([6, 5, 4]);
});
