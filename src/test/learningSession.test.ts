import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Item = { id: string; answer: number; audio: string; audioRu: string; prompt: string };
type Session = { current: Item | null; markHeard(): void; answer(value: number, now?: number): { accepted: boolean; correct?: boolean }; next(): boolean; restart(): void; state: { complete: boolean; index: number; heard: boolean; answered: boolean; results: { id: string; attempts: number }[]; attempts: number } };
const scope: { CorexLearning?: { create(items: Item[], options?: { random(): number }): Session; numbers: Item[]; pairs: { pair: string; teacherApproved: boolean }[]; soundItems(mode: string): { answer: number | string; events: { start: number; duration: number; frequency: number }[] }[]; progressKey(grade: number, strand: string, objective: string): string } } = {};
new Function('window', readFileSync('public/original/js/learning-session.js', 'utf8'))(scope);
const data = scope.CorexLearning!;

describe('listening practice rounds', () => {
  it('uses a real bundled bilingual instruction for every number from one to ten', () => {
    expect(data.numbers.map(item => item.answer)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (const item of data.numbers) {
      expect(item.prompt).toContain('санын тап');
      for (const file of [item.audio, item.audioRu]) expect(readFileSync('public/original/' + file).length).toBeGreaterThan(1000);
    }
  });
  it('requires listening, retains a wrong question, debounces presses and locks a correct answer', () => {
    const s = data.create(data.numbers), target = s.current!;
    expect(s.answer(target.answer).accepted).toBe(false);
    expect(s.next()).toBe(false); s.markHeard();
    expect(s.answer(99, 1000)).toEqual({ accepted: true, correct: false });
    expect(s.current).toBe(target);
    expect(s.answer(99, 1100).accepted).toBe(false);
    expect(s.answer(target.answer, 1500).correct).toBe(true);
    expect(s.answer(target.answer, 2000).accepted).toBe(false);
    expect(s.state.attempts).toBe(2);
    expect(s.next()).toBe(true); expect(s.state.heard).toBe(false);
  });
  it('covers all targets once, records attempts and avoids an immediate repeat between cycles', () => {
    const s = data.create(data.numbers, { random: () => .5 }); const seen = [];
    while (s.current) { seen.push(s.current.answer); s.markHeard(); s.answer(s.current.answer); s.next(); }
    expect(new Set(seen).size).toBe(10); expect(s.state.complete).toBe(true); expect(s.state.attempts).toBe(10);
    const last = seen.at(-1); s.restart(); expect(s.current!.answer).not.toBe(last); expect(s.state.results).toEqual([]);
  });
  it('keeps the prescribed thirty pairs in order without publishing unapproved examples', () => {
    expect(data.pairs).toHaveLength(30); expect(data.pairs[0].pair).toBe('а–о'); expect(data.pairs.at(-1)!.pair).toBe('х–һ');
    expect(data.pairs.every(pair => !pair.teacherApproved)).toBe(true);
  });
  it('separates grade and direction in progress identities', () => {
    expect(data.progressKey(0, 'voice', 'syllables')).not.toBe(data.progressKey(1, 'voice', 'syllables'));
    expect(data.progressKey(0, 'voice', 'syllables')).not.toBe(data.progressKey(0, 'breathing', 'syllables'));
  });
});

describe('deterministic acoustic stimuli', () => {
  it('contains exactly the specified number of events with fixed intervals on replay', () => {
    for (const item of data.soundItems('count')) {
      expect(item.events).toHaveLength(Number(item.answer));
      expect(item.events.every(event => event.frequency === 440 && event.duration === .14)).toBe(true);
    }
    expect(data.soundItems('count')).toEqual(data.soundItems('count'));
  });
  it('varies pitch independently of duration and varies tempo independently of pitch', () => {
    const pitch = data.soundItems('pitch'); expect(new Set(pitch.map(item => item.events[0].frequency)).size).toBe(3);
    expect(new Set(pitch.map(item => item.events[0].duration)).size).toBe(1);
    const tempo = data.soundItems('tempo'); expect(new Set(tempo.flatMap(item => item.events.map(event => event.frequency))).size).toBe(1);
    expect(tempo[0].events[1].start).not.toBe(tempo[1].events[1].start);
  });
});
