import { readFileSync, existsSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

type Item = { id: string; audio: string; kk: string; ru: string; icon: string };
const windowScope = {};
const load = (name: string) => new Function('window', readFileSync('public/original/js/' + name + '.js', 'utf8'))(windowScope);
load('learning-session'); load('grade-sounds');
const { CorexGradeSounds: sounds, CorexLearning: engine } = windowScope as {
  CorexGradeSounds: {
    categories: Record<string, { sounds: unknown[] }>;
    stages(g: number, c: string): string[];
    profile(g: number, c: string, stage?: string): { items: Item[]; grade: number; table: number; objectiveCodes: string[] };
    options(items: Item[], target: Item, count?: number): Item[];
  };
  CorexLearning: { create(items: Item[]): { current: Item; markHeard(): void; answer(id: string): { correct: boolean }; next(): void } };
};

describe('class sound banks', () => {
  for (const category of Object.keys(sounds.categories)) it(category + ' only offers local, allowed answers and covers its bank once per cycle', () => {
    let previous: string[] = [];
    for (let grade = 0; grade < 5; grade++) {
      for (const stage of sounds.stages(grade, category)) {
        const p = sounds.profile(grade, category, stage);
        expect([p.grade, p.table]).toEqual([grade, 5 + 2 * grade]);
        const ids = p.items.map(item => item.id);
        expect(new Set(ids).size).toBe(ids.length);
        if (!['vehicles', 'weather', 'familiar'].includes(stage)) {
          for (const id of previous) expect(ids).toContain(id);
          previous = ids;
        }
        const session = engine.create(p.items), covered = [];
        while (session.current) {
          const target = session.current;
          expect(existsSync('public/original/' + target.audio)).toBe(true);
          expect([target.kk, target.ru, target.icon].every(Boolean)).toBe(true);
          const choices = sounds.options(p.items, target).map(item => item.id);
          expect(choices).toContain(target.id);
          expect(choices.every(id => ids.includes(id))).toBe(true);
          expect(new Set(choices).size).toBe(Math.min(3, ids.length));
          covered.push(target.id); session.markHeard();
          expect(session.answer(target.id).correct).toBe(true); session.next();
        }
        expect(covered.sort()).toEqual([...ids].sort());
      }
    }
  });
  it('expands the instrument bank through both second-grade stages', () => {
    expect([0,1,2,3,4].flatMap(g => sounds.stages(g, 'instruments').map(s => sounds.profile(g,'instruments',s).items.length))).toEqual([2,3,4,6,8,10]);
  });
});

describe('level 1 everyday sounds', () => {
  it('offers four or more sounds per everyday lesson and shows every one as a choice', () => {
    for (const category of ['animals', 'wild', 'nature', 'transport', 'household', 'technical', 'emotion']) {
      const items = sounds.profile(0, category).items;
      expect(items.length).toBeGreaterThanOrEqual(4);
      expect(sounds.options(items, items[0], items.length).map(item => item.id).sort()).toEqual(items.map(item => item.id).sort());
    }
  });
});

describe('Table 9 targeted grade-2 banks', () => {
  it('keeps supplementary banks and separates exact weather and familiar sound examples', () => {
    const weather = sounds.profile(2, 'nature', 'weather');
    const familiar = sounds.profile(2, 'household', 'familiar');
    expect(weather.objectiveCodes).toEqual(['2.1.1.6']);
    expect(weather.items.map(x => x.id)).toEqual(['wind', 'rain', 'thunder', 'storm']);
    expect(familiar.objectiveCodes).toEqual(['2.1.1.5']);
    expect(familiar.items.map(x => x.id)).toEqual(['clock', 'phone', 'schoolbell', 'bike']);
    expect(sounds.profile(2, 'household').items.map(x => x.id)).toContain('doorbell');
    expect(sounds.profile(2, 'nature').items.map(x => x.id)).toContain('bird');
    expect(sounds.profile(2, 'household').objectiveCodes).toEqual([]);
    expect(sounds.profile(2, 'nature').objectiveCodes).toEqual([]);
    expect(sounds.profile(2, 'transport').objectiveCodes).toEqual(['2.1.1.13']);
    for (const grade of [0, 1, 3, 4]) for (const category of ['nature', 'household']) {
      expect(sounds.stages(grade, category)).toEqual(['standard']);
    }
  });
});
