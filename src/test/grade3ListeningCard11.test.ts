import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Sample = { id: string; audio: string; answer: string };
type Profile = { table: number; grade: number; items: Sample[]; objectiveCodes: string[] };

const scope = {} as {
  CorexGradeSounds: {
    profile(grade: number, category: string): Profile;
    options(items: Sample[], target: Sample): Sample[];
  };
};
for (const script of ['learning-session', 'grade-sounds']) {
  new Function('window', readFileSync('public/original/js/' + script + '.js', 'utf8'))(scope);
}

const { CorexGradeSounds: sounds } = scope;
const fingerprint = (item: Sample) => createHash('sha256').update(readFileSync('public/original/' + item.audio)).digest('hex');

describe('grade 3 listening — existing Table 11 assets', () => {
  it('keeps eight distinct timbre recordings without claiming melody recognition', () => {
    const profile = sounds.profile(3, 'instruments');
    expect([profile.grade, profile.table, profile.objectiveCodes]).toEqual([3, 11, ['3.1.1.18']]);
    expect(profile.items.map(item => item.id)).toEqual([
      'dombra', 'guitar', 'drum', 'asatayak', 'sazsyrnai', 'violin', 'sybyzgy', 'trumpet',
    ]);
    expect(new Set(profile.items.map(fingerprint)).size).toBe(8);
    for (const sample of profile.items) {
      const choices = sounds.options(profile.items, sample);
      expect(choices.map(item => item.id)).toContain(sample.answer);
      expect(new Set(choices.map(item => item.id)).size).toBe(3);
    }
  });

  it('maps refrigerator and vacuum to their own distinct local recordings', () => {
    const profile = sounds.profile(3, 'household');
    expect(profile.objectiveCodes).toEqual(['3.1.1.17']);
    const items = profile.items.filter(item => ['fridge', 'vacuum'].includes(item.id));
    expect(items.map(({ answer, audio }) => [answer, audio])).toEqual([
      ['vacuum', 'sounds/appliances/vacuum.mp3'],
      ['fridge', 'sounds/appliances/fridge.mp3'],
    ]);
    expect(new Set(items.map(fingerprint)).size).toBe(2);
  });
});
