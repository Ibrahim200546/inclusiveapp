import { readFileSync, existsSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
const scope: any = {};
new Function('window', readFileSync('public/original/js/curriculum-content.js', 'utf8'))(scope);
const lessons = scope.CorexCurriculumContent.lessons;
describe('all curriculum tasks content audit', () => {
  it('retains 115 lessons / 556 steps with usable prompts and one unambiguous choice answer', () => {
    expect(lessons).toHaveLength(115);
    expect(lessons.reduce((n: number,l: any) => n + l.steps.length,0)).toBe(556);
    for (const l of lessons) for (const s of l.steps) {
      expect(s.prompt.trim().length, l.id + '/' + s.id).toBeGreaterThan(0);
      expect(JSON.stringify(s)).not.toContain('\uFFFD');
      if (s.kind === 'choice') {
        expect(s.options.filter((o: any) => o.value === s.answer)).toHaveLength(1);
        expect(new Set(s.options.map((o: any) => o.label)).size).toBe(s.options.length);
      }
      if (s.kind === 'order') {
        const values = s.orderItems.map((i: any) => i.value).sort();
        expect([...s.initialOrder].sort()).toEqual(values);
        expect([...s.expectedOrder].sort()).toEqual(values);
      }
      for (const path of [s.audio, s.questionAudio].filter(Boolean)) expect(existsSync('public/original/' + path), path).toBe(true);
    }
  });
  it('checks every published arithmetic reveal against its answer', () => {
    let count = 0;
    for (const l of lessons.filter((l: any) => l.category === 'math')) for (const s of l.steps) {
      const m = s.reveal?.match(/^(\d+) ([+*/-]) (\d+) = (\d+)$/);
      if (!m) continue;
      const a=Number(m[1]), b=Number(m[3]);
      const result = m[2]==='+' ? a+b : m[2]==='-' ? a-b : m[2]==='*' ? a*b : a/b;
      expect(Number(s.answer), l.id + '/' + s.id).toBe(result);
      expect(Number(m[4])).toBe(result); count++;
    }
    expect(count).toBe(78);
  });
  it('explains breathing and emphasis actions without inventing an audio model', () => {
    for (const l of lessons.filter((l: any) => l.id === 'one-breath')) for (const s of l.steps) {
      expect(s.prompt).toContain('Бір дем шығарғанда');
      expect(s.prompt).toContain('тоқтап, демал');
    }
    for (const l of lessons.filter((l: any) => l.id === 'logical-stress')) for (const s of l.steps) {
      expect(s.prompt).toContain('Сөйлемді қайтала');
      expect(s.teacherModel).toBe(true);
      expect(s.audio).toBeUndefined();
    }
  });
});
