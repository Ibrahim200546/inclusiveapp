import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Item = { id: string; answer: string; audio: string; kk: string; ru: string };
type Profile = { grade: number; table: number; objectiveCodes: string[]; items: Item[] };
type Bank = {
  stages: (grade: number, category: string) => string[];
  profile: (grade: number, category: string, stage?: string) => Profile;
  options: (items: Item[], target: Item) => Item[];
};
type SessionEngine = { progressKey: (grade: number, strand: string, objective: string, table: number) => string };
const scope: { CorexGradeSounds?: Bank; CorexLearning?: SessionEngine } = {};
for (const script of ['learning-session', 'grade-sounds']) {
  new Function('window', readFileSync(`public/original/js/${script}.js`, 'utf8'))(scope);
}
const bank = scope.CorexGradeSounds!;
const learning = scope.CorexLearning!;
function distinctAudio(items: Item[]) {
  const hashes = items.map(({ audio }) => {
    const bytes = readFileSync('public/original/' + audio);
    expect(bytes.length, audio).toBeGreaterThan(500);
    expect(bytes.subarray(0, 3).toString() === 'ID3' || (bytes[0] === 255 && (bytes[1] & 224) === 224), audio).toBe(true);
    return createHash('sha256').update(bytes).digest('hex');
  });
  expect(new Set(hashes).size).toBe(items.length);
}

describe('Card 14 grade 4 Table 13 sound profiles', () => {
  it('offers ten distinct instruments without changing other class instrument ranges', () => {
    expect([0, 1, 2, 3, 4].map(grade => bank.stages(grade, 'instruments')
      .map(stage => bank.profile(grade, 'instruments', stage).items.length))).toEqual([[2], [3], [4, 6], [8], [10]]);
    const profile = bank.profile(4, 'instruments');
    expect(profile.table).toBe(13);
    expect(profile.objectiveCodes).toEqual(['4.1.1.18']);
    expect(profile.items.slice(-2).map(item => item.id)).toEqual(['kobyz', 'zhetigen']);
    distinctAudio(profile.items);
    for (const target of profile.items) {
      const choices = bank.options(profile.items, target);
      expect(choices).toHaveLength(3);
      expect(choices.filter(item => item.id === target.answer)).toHaveLength(1);
    }
  });

  it('keeps the partial machines stage separate and never substitutes a recording for a missing combine', () => {
    expect([0, 1, 2, 3].every(grade => !bank.stages(grade, 'technical').includes('vehicles'))).toBe(true);
    const machines = bank.profile(4, 'technical', 'vehicles');
    expect(machines.objectiveCodes).toEqual(['4.1.1.17']);
    // This is the current partial practice, not proof of full objective coverage.
    expect(machines.items.map(item => item.id).sort()).toEqual(['car', 'tractor', 'truck']);
    expect(bank.profile(4, 'technical').items.some(item => machines.items.some(machine => machine.id === item.id))).toBe(false);
    distinctAudio(machines.items);
    expect(learning.progressKey(4, 'listening', 'technical:vehicles', 13))
      .not.toBe(learning.progressKey(4, 'listening', 'technical:standard', 13));
  });
});
