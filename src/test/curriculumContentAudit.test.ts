import { readFileSync, existsSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
const scope: any = {};
new Function('window', readFileSync('public/original/js/curriculum-content.js', 'utf8'))(scope);
const lessons = scope.CorexCurriculumContent.lessons;
describe('all curriculum tasks content audit', () => {
  it('retains 118 lessons / 574 steps with usable prompts and one unambiguous choice answer', () => {
    expect(lessons).toHaveLength(118);
    expect(lessons.reduce((n: number,l: any) => n + l.steps.length,0)).toBe(574);
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
  it('retains existing pair IDs and adds the three card 30 contrasts with matching recordings', () => {
    const drafts = JSON.parse(readFileSync('docs/trello-verification/contrast-drafts.json', 'utf8'));
    const additions = JSON.parse(readFileSync('docs/trello-verification/contrast-card30-additions.json', 'utf8'));
    const recordings = JSON.parse(readFileSync('public/original/sounds/curriculum/manifest.json', 'utf8'));
    const bank = lessons.filter((lesson: any) => lesson.grade === 1 && /^pair-\d+$/.test(lesson.id));
    expect(bank).toHaveLength(33);
    for (const [index, pair] of [...drafts.pairs, ...additions.pairs].entries()) {
      const lesson = bank.find((item: any) => item.id === `pair-${index}`);
      expect(lesson.title).toBe(pair.pair.toUpperCase());
      for (const level of ['syllables', 'words', 'sentences']) {
        for (const [side, text] of pair[level].entries()) {
          const step = lesson.steps.find((item: any) => item.id === `${level}-${side}`);
          expect(step.stimulus).toBe(text);
          expect(step.answer).toBe(text);
          expect(recordings.find((item: any) => item.file === step.audio)?.text).toBe(text);
          expect(existsSync('public/original/' + step.audio)).toBe(true);
        }
      }
    }
    expect(additions.pairs.map((item: any) => item.pair)).toEqual(['ұ–у', 'қ–х', 'қ–һ']);
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
