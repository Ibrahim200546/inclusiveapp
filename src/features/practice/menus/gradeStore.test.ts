import { describe, expect, it, vi } from 'vitest';
import { createGradeStore, gradeParent } from './gradeStore';

describe('grade selection', () => {
  it('remembers the junior grade across older grades and nested exercises', () => {
    const store = createGradeStore();
    store.selectJunior(1);
    store.prepare({ from: 'grade0Menu', to: 'grade3Menu' });
    expect(store.getSnapshot()).toMatchObject({ current: 3, junior: 1 });
    store.prepare({ from: 'grade3Menu', to: 'grade0SoundsMenu' });
    expect(gradeParent(store.getSnapshot().current)).toBe('grade3Menu');
    store.prepare({ from: 'grade0SoundsMenu', to: 'grade0Menu' });
    expect(store.getSnapshot()).toMatchObject({ current: 1, junior: 1 });
  });

  it('only resets the voice menu when entering from the junior main menu', () => {
    const store = createGradeStore();
    store.prepare({ from: 'grade0Menu', to: 'grade0DauyspenmMenu' });
    expect(store.getSnapshot().voiceEntry).toBe(1);
    store.prepare({ from: 'g0DauyspTask2', to: 'grade0DauyspenmMenu' });
    expect(store.getSnapshot().voiceEntry).toBe(1);
    store.prepare({ from: 'grade0Menu', to: 'grade0DauyspenmMenu' });
    expect(store.getSnapshot().voiceEntry).toBe(2);
  });

  it('keeps unchanged snapshots stable and removes subscriptions', () => {
    const store = createGradeStore(), listener = vi.fn();
    const initial = store.getSnapshot(), release = store.subscribe(listener);
    store.selectJunior(0);
    store.prepare({ from: 'grade0Menu', to: 'g0Task3' });
    expect(store.getSnapshot()).toBe(initial);
    expect(listener).not.toHaveBeenCalled();
    store.selectJunior(1);
    expect(listener).toHaveBeenCalledOnce();
    release(); store.selectJunior(0);
    expect(listener).toHaveBeenCalledOnce();
  });
});
