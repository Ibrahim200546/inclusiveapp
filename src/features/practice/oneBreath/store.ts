import type { CardIdentity } from '../cards/content';
import { breathLevels, breathPresets, normalizeSyllable } from './content';

export interface BreathSnapshot extends CardIdentity {
  active: boolean;
  presets: readonly string[];
  syllable: string;
  draft: string;
  invalid: boolean;
  step: number;
  complete: boolean;
  flashed: number | null;
  celebrating: boolean;
}

export function createBreathStore({ identity, random = Math.random }: { identity(): CardIdentity; random?: () => number }) {
  const initial = () => ({ ...identity(), active: false, presets: [...breathPresets], syllable: 'ТА', draft: 'ТА', invalid: false,
    step: 0, complete: false, flashed: null, celebrating: false });
  let snapshot: BreathSnapshot = initial(), disposed = false;
  let flashTimer: ReturnType<typeof setTimeout> | undefined, celebrationTimer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();
  const update = (changes: Partial<BreathSnapshot>) => { snapshot = { ...snapshot, ...changes }; listeners.forEach(listener => listener()); };
  const clearTimers = () => { clearTimeout(flashTimer); clearTimeout(celebrationTimer); flashTimer = celebrationTimer = undefined; };
  function pause() {
    if (disposed) return;
    clearTimers();
    if (snapshot.flashed !== null || snapshot.celebrating) update({ flashed: null, celebrating: false });
  }
  function syncIdentity() {
    if (disposed) return;
    const next = identity();
    if (next.locale === snapshot.locale && next.grade === snapshot.grade && next.learner === snapshot.learner) return;
    clearTimers();
    const ownerChanged = next.grade !== snapshot.grade || next.learner !== snapshot.learner;
    update({ ...(ownerChanged ? { ...initial(), active: snapshot.active } : next), flashed: null, celebrating: false });
  }
  function select(syllable: string) {
    syncIdentity();
    if (disposed || !snapshot.active || !snapshot.presets.includes(syllable)) return;
    clearTimers();
    update({ syllable, draft: syllable, invalid: false, step: 0, complete: false, flashed: null, celebrating: false });
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    open() { if (!disposed) { clearTimers(); update({ ...initial(), active: true }); } },
    close() { if (!disposed) { clearTimers(); update(initial()); } },
    pause, syncIdentity, select,
    edit(value: string) {
      syncIdentity();
      if (!disposed && snapshot.active) update({ draft: Array.from(value).slice(0, 3).join(''), invalid: false });
    },
    apply() {
      syncIdentity();
      if (disposed || !snapshot.active) return;
      const syllable = normalizeSyllable(snapshot.draft);
      if (!syllable) { update({ invalid: true }); return; }
      if (!snapshot.presets.includes(syllable)) update({ presets: [syllable, ...snapshot.presets].slice(0, 12) });
      select(syllable);
    },
    nextSyllable() {
      syncIdentity();
      if (!disposed && snapshot.active) select(snapshot.presets[(snapshot.presets.indexOf(snapshot.syllable) + 1) % snapshot.presets.length]);
    },
    randomSyllable() {
      syncIdentity();
      if (!disposed && snapshot.active) select(snapshot.presets[Math.floor(random() * snapshot.presets.length)]);
    },
    advance() {
      syncIdentity();
      if (disposed || !snapshot.active) return;
      clearTimers();
      if (snapshot.complete) { update({ step: 0, complete: false, flashed: null, celebrating: false }); return; }
      if (snapshot.step < breathLevels) { update({ step: snapshot.step + 1, flashed: null }); return; }
      // Completion is the reader's explicit action, not an assessment of breathing or pronunciation.
      update({ complete: true, flashed: null, celebrating: true });
      celebrationTimer = setTimeout(() => { celebrationTimer = undefined; update({ celebrating: false }); }, 2800);
    },
    flash(row: number) {
      syncIdentity();
      if (disposed || !snapshot.active || !Number.isInteger(row) || row < 1 || row > breathLevels
        || (snapshot.step > 0 && !snapshot.complete && row > snapshot.step)) return;
      clearTimeout(flashTimer);
      update({ flashed: row });
      flashTimer = setTimeout(() => { flashTimer = undefined; update({ flashed: null }); }, 600);
    },
    dispose() { if (!disposed) { clearTimers(); disposed = true; snapshot = initial(); listeners.clear(); } },
  };
}
export type BreathStore = ReturnType<typeof createBreathStore>;
