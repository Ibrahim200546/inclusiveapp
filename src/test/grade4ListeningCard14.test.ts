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
type SessionEngine = {
  progressKey: (grade: number, strand: string, objective: string, table: number) => string;
  create: (items: Item[], options: { random: () => number }) => {
    current: Item | null;
    markHeard: () => void;
    answer: (id: string) => { accepted: boolean; correct?: boolean };
    next: () => boolean;
    state: { complete: boolean; results: { id: string }[] };
  };
};
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
    expect(learning.progressKey(4, 'recognition', 'technical:vehicles', 13))
      .not.toBe(learning.progressKey(4, 'recognition', 'technical:standard', 13));
  });

  it('keeps every ID reachable in a future four-recording vehicles bank without changing round size', () => {
    const legacy = bank.profile(4, 'technical', 'vehicles').items;
    // Test-only stimulus: no candidate path is added to the app while the audio awaits verification.
    const combine: Item = { id: 'combine', answer: 'combine', kk: 'Комбайн', ru: 'Комбайн', audio: 'test-only' };
    const session = learning.create([...legacy, combine], { random: () => 0.999 });
    while (session.current) {
      const target = session.current;
      const choices = bank.options([...legacy, combine], target);
      expect(choices).toHaveLength(3);
      expect(new Set(choices.map(item => item.id)).size).toBe(3);
      expect(choices.filter(item => item.id === target.answer)).toHaveLength(1);
      expect(session.answer(target.answer).accepted).toBe(false);
      session.markHeard();
      expect(session.answer(target.answer)).toEqual({ accepted: true, correct: true });
      expect(session.next()).toBe(true);
    }
    expect(session.state.complete).toBe(true);
    expect(session.state.results.map(item => item.id).sort()).toEqual(['car', 'combine', 'tractor', 'truck']);
    expect(learning.progressKey(4, 'recognition', 'technical:vehicles', 13)).toBe('grade:4:table:13:recognition:technical:vehicles');
  });
});
