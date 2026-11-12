import { describe, expect, it } from 'vitest';
import { saveLearningProgress } from './progress';

describe('learning progress compatibility', () => {
  it('keeps learners, grades and syllable contexts separate using the existing keys', () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    saveLearningProgress(storage, null, 0, 'listening', 'count', { completed: 3 });
    saveLearningProgress(storage, 'student', 1, 'voice', 'syllable-reading-2', { listened: true });
    saveLearningProgress(storage, 'student', 1, 'breathing', 'syllable-reading-2', { listened: true });
    expect(Object.keys(JSON.parse(values.get('eduCorex.learning.v1:guest')!))).toEqual(['grade:0:table:5:listening:count']);
    const progress = JSON.parse(values.get('eduCorex.learning.v1:student')!);
    expect(Object.keys(progress)).toEqual(['grade:1:table:8:voice:syllable-reading-2', 'grade:1:table:8:breathing:syllable-reading-2']);
    expect(progress['grade:1:table:8:voice:syllable-reading-2']).toMatchObject({ grade: 1, table: 8, listened: true });
  });
  it('recovers malformed saved data and reports unavailable storage', () => {
    let value = 'null';
    const storage = { getItem: () => value, setItem: (_key: string, next: string) => { value = next; } };
    for (const corrupted of ['null', '[]', '{broken']) {
      value = corrupted;
      expect(saveLearningProgress(storage, null, 0, 'listening', 'numbers', { completed: 10 })).toBe(true);
      expect(JSON.parse(value)['grade:0:table:5:listening:numbers'].completed).toBe(10);
    }
    storage.setItem = () => { throw new Error('Quota exceeded'); };
    expect(saveLearningProgress(storage, null, 0, 'listening', 'numbers', {})).toBe(false);
  });
});
