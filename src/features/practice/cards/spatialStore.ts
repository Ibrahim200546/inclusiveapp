import { spatialCard, spatialCards, spatialMedia, type CardIdentity, type SpatialAudioKey, type SpatialKey } from './content';
import type { CardPlayback } from './playback';

export interface SpatialSnapshot extends CardIdentity {
  active: boolean; round: number; order: SpatialKey[]; placed: SpatialKey[]; selected: SpatialKey | null;
  status: '' | 'selected' | 'wrong' | 'correct' | 'complete'; playing: SpatialAudioKey | null; audioError: boolean;
}
export function createSpatialStore(player: CardPlayback, identity: () => CardIdentity,
  effect: (result: 'correct' | 'wrong' | 'complete') => void, random = Math.random) {
  let snapshot: SpatialSnapshot = { ...identity(), active: false, round: 0, order: [], placed: [], selected: null, status: '', playing: null, audioError: false };
  let version = 0;
  const listeners = new Set<() => void>();
  const update = (changes: Partial<SpatialSnapshot>) => { snapshot = { ...snapshot, ...changes }; listeners.forEach(listener => listener()); };
  function stop() { version++; player.stop(); update({ playing: null, audioError: false }); }
  function reset() {
    stop();
    const order = spatialCards.map(card => card.key);
    for (let index = order.length - 1; index > 0; index--) {
      const other = Math.floor(random() * (index + 1));
      [order[index], order[other]] = [order[other], order[index]];
    }
    update({ round: snapshot.round + 1, order, placed: [], selected: null, status: '' });
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    start() { update({ ...identity(), active: true }); reset(); },
    close() { stop(); update({ active: false, selected: null }); },
    syncIdentity() {
      const next = identity();
      if (next.locale === snapshot.locale && next.learner === snapshot.learner && next.grade === snapshot.grade) return;
      const changedOwner = next.learner !== snapshot.learner || next.grade !== snapshot.grade;
      stop(); update(next); if (changedOwner) reset();
    },
    stop, reset,
    select(key: string) {
      const card = spatialCard(key);
      if (!snapshot.active || !card || snapshot.placed.includes(card.key)) return;
      update({ selected: card.key, status: 'selected' });
    },
    place(key: string, row: number, col: number) {
      const card = spatialCard(key), target = spatialCard(`${row}_${col}`);
      if (!snapshot.active || !card || !target || snapshot.placed.includes(card.key) || snapshot.placed.includes(target.key)) return false;
      if (card.row !== row || card.col !== col) { update({ status: 'wrong' }); effect('wrong'); return false; }
      const placed = [...snapshot.placed, card.key];
      const status = placed.length === spatialCards.length ? 'complete' : 'correct';
      update({ placed, selected: null, status }); effect(status);
      return true;
    },
    async listen(key: SpatialAudioKey) {
      const sample = spatialMedia(key);
      if (!snapshot.active || snapshot.locale !== 'ru' || !sample) return;
      stop(); const token = version; update({ playing: key });
      try {
        const result = await player.recording(sample.audio);
        if (token === version) update({ playing: null, audioError: result === 'error' });
      } catch { if (token === version) update({ playing: null, audioError: true }); }
    },
    dispose() { stop(); listeners.clear(); snapshot = { ...snapshot, active: false }; },
  };
}
export type SpatialStore = ReturnType<typeof createSpatialStore>;
