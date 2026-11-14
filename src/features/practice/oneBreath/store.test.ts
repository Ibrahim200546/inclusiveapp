import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CardIdentity } from '../cards/content';
import { breathPresets } from './content';
import { createBreathStore } from './store';

function setup() {
  let identity: CardIdentity = { locale: 'kk', grade: 0, learner: null };
  const store = createBreathStore({ identity: () => identity, random: () => .55 });
  store.open();
  return { store, change(next: Partial<CardIdentity>) { identity = { ...identity, ...next }; store.syncIdentity(); } };
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe('one-breath pyramid', () => {
  it('waits for manual progression through six rows and a separate completion action', () => {
    const { store } = setup();
    expect(store.getSnapshot()).toMatchObject({ syllable: 'ТА', presets: breathPresets, step: 0, complete: false });
    for (let row = 1; row <= 6; row++) {
      store.advance(); vi.advanceTimersByTime(10_000);
      expect(store.getSnapshot()).toMatchObject({ step: row, complete: false, celebrating: false });
    }
    store.advance(); expect(store.getSnapshot()).toMatchObject({ step: 6, complete: true, celebrating: true });
    vi.advanceTimersByTime(2800); expect(store.getSnapshot()).toMatchObject({ complete: true, celebrating: false });
    store.advance(); expect(store.getSnapshot()).toMatchObject({ step: 0, complete: false, syllable: 'ТА' });
    expect(vi.getTimerCount()).toBe(0);
  });
  it('wraps the next syllable and selects from the current custom list at random', () => {
    const { store } = setup(); store.select('РА'); store.nextSyllable(); expect(store.getSnapshot().syllable).toBe('ТА');
    store.randomSyllable(); expect(store.getSnapshot().syllable).toBe('КА');
    store.advance(); store.select('МА'); expect(store.getSnapshot()).toMatchObject({ syllable: 'МА', step: 0 });
    store.select('missing'); expect(store.getSnapshot().syllable).toBe('МА');
  });
  it('normalizes custom syllables and keeps only twelve without duplicating a preset', () => {
    const { store } = setup(); store.edit(' ә '); store.apply();
    expect(store.getSnapshot()).toMatchObject({ syllable: 'Ә', draft: 'Ә', presets: ['Ә', ...breathPresets] });
    store.edit('құң'); store.apply(); store.edit('үй'); store.apply();
    expect(store.getSnapshot().presets).toEqual(['ҮЙ', 'ҚҰҢ', 'Ә', ...breathPresets.slice(0, 9)]);
    store.edit('ма'); store.apply(); expect(store.getSnapshot().presets).toHaveLength(12);
    expect(store.getSnapshot().syllable).toBe('МА');
    store.edit('long'); store.apply(); expect(store.getSnapshot().syllable).toBe('LON');
  });
  it('rejects empty input without losing the current row or submitting a new syllable', () => {
    const { store } = setup(); store.advance(); store.edit('   '); store.apply();
    expect(store.getSnapshot()).toMatchObject({ syllable: 'ТА', step: 1, invalid: true });
    store.edit('на'); expect(store.getSnapshot().invalid).toBe(false); store.apply();
    expect(store.getSnapshot()).toMatchObject({ syllable: 'НА', step: 0, invalid: false });
  });
  it('flashes a row without advancing, replaces the flash timer, and keeps future rows concealed', () => {
    const { store } = setup(); store.flash(2); vi.advanceTimersByTime(400); store.flash(3);
    expect(vi.getTimerCount()).toBe(1); vi.advanceTimersByTime(200); expect(store.getSnapshot().flashed).toBe(3);
    vi.advanceTimersByTime(400); expect(store.getSnapshot()).toMatchObject({ flashed: null, step: 0 });
    store.advance(); store.flash(2); store.flash(0); store.flash(1.5); store.flash(7);
    expect(store.getSnapshot().flashed).toBeNull(); store.flash(1); expect(store.getSnapshot().flashed).toBe(1);
  });
  it.each(['select', 'next', 'apply', 'advance', 'pause', 'close', 'locale', 'grade', 'learner', 'dispose'] as const)(
    'cancels pending row effects on %s', action => {
      const h = setup(); h.store.flash(1);
      if (action === 'select') h.store.select('МА');
      else if (action === 'next') h.store.nextSyllable();
      else if (action === 'apply') { h.store.edit('Ә'); h.store.apply(); }
      else if (action === 'locale') h.change({ locale: 'ru' });
      else if (action === 'grade') h.change({ grade: 1 });
      else if (action === 'learner') h.change({ learner: 'another' });
      else h.store[action]();
      const snapshot = h.store.getSnapshot(); expect(snapshot.flashed).toBeNull(); expect(vi.getTimerCount()).toBe(0);
      vi.runAllTimers(); expect(h.store.getSnapshot()).toBe(snapshot);
    },
  );
  it('preserves the selected syllable and progress on language change or hiding', () => {
    const h = setup(); h.store.edit('құ'); h.store.apply(); h.store.advance(); h.store.advance(); h.store.flash(1);
    h.change({ locale: 'ru' }); h.store.pause();
    expect(h.store.getSnapshot()).toMatchObject({ syllable: 'ҚҰ', step: 2, locale: 'ru', active: true, flashed: null });
    for (let i = 0; i < 5; i++) h.store.advance(); h.change({ locale: 'kk' });
    expect(h.store.getSnapshot()).toMatchObject({ complete: true, celebrating: false }); expect(vi.getTimerCount()).toBe(0);
  });
  it.each(['grade', 'learner'] as const)('clears custom text and progress for a different %s', key => {
    const h = setup(); h.store.edit('құ'); h.store.apply(); h.store.advance();
    h.change(key === 'grade' ? { grade: 1 } : { learner: 'next' });
    expect(h.store.getSnapshot()).toMatchObject({ syllable: 'ТА', draft: 'ТА', presets: breathPresets, step: 0, active: true });
  });
  it('clears celebration on exit and starts a new visit without old custom text', () => {
    const { store } = setup(); store.edit('құ'); store.apply();
    for (let i = 0; i < 7; i++) store.advance(); store.flash(1); expect(vi.getTimerCount()).toBe(2);
    store.close(); expect(vi.getTimerCount()).toBe(0);
    store.advance(); store.flash(1); store.edit('a'); store.apply(); store.randomSyllable();
    expect(store.getSnapshot()).toMatchObject({ active: false, step: 0, complete: false, presets: breathPresets });
    store.open(); expect(store.getSnapshot()).toMatchObject({ active: true, syllable: 'ТА', step: 0 });
  });
  it('leaves an unchanged identity alone and stops notifying after unsubscribe or disposal', () => {
    const h = setup(), listener = vi.fn(), release = h.store.subscribe(listener); h.store.flash(1); listener.mockClear();
    h.change({}); expect(listener).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(1);
    release(); vi.runAllTimers(); expect(listener).not.toHaveBeenCalled();
    h.store.subscribe(listener); h.store.dispose(); h.store.open(); h.store.advance(); h.store.flash(1);
    h.store.apply(); h.store.select('МА'); h.store.edit('на'); h.store.close(); h.store.pause();
    expect(listener).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  });
});
