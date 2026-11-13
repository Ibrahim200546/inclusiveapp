import { sentenceCards, sentenceCard, type CardIdentity } from './content';
import type { CardPlayback } from './playback';

export interface SentenceSnapshot extends CardIdentity {
  active: boolean; available: number[]; sentence: number[]; status: '' | 'playing' | 'audioError';
}
export function createSentenceStore(player: CardPlayback, identity: () => CardIdentity) {
  let snapshot: SentenceSnapshot = { ...identity(), active: false, available: sentenceCards.map(card => card.id), sentence: [], status: '' };
  let version = 0;
  const listeners = new Set<() => void>();
  const update = (changes: Partial<SentenceSnapshot>) => { snapshot = { ...snapshot, ...changes }; listeners.forEach(listener => listener()); };
  function stop() { version++; player.stop(); update({ status: '' }); }
  function reset() { stop(); update({ available: sentenceCards.map(card => card.id), sentence: [] }); }
  function syncIdentity() {
    const next = identity();
    if (next.locale === snapshot.locale && next.learner === snapshot.learner && next.grade === snapshot.grade) return;
    const changedOwner = next.learner !== snapshot.learner || next.grade !== snapshot.grade;
    stop(); update(next); if (changedOwner) reset();
  }
  function move(id: number, toSentence: boolean) {
    if (!snapshot.active || !sentenceCard(id)) return false;
    const source = toSentence ? snapshot.available : snapshot.sentence;
    if (!source.includes(id)) return false;
    stop();
    update(toSentence
      ? { available: source.filter(value => value !== id), sentence: [...snapshot.sentence, id] }
      : { sentence: source.filter(value => value !== id), available: [...snapshot.available, id] });
    return true;
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    start() { syncIdentity(); stop(); update({ active: true }); },
    close() { stop(); update({ active: false }); },
    syncIdentity, stop, reset, move,
    async play() {
      if (!snapshot.active || !snapshot.sentence.length) return;
      stop(); const token = version, locale = snapshot.locale;
      const text = snapshot.sentence.map(id => sentenceCard(id)![locale]).join(' ');
      update({ status: 'playing' });
      try {
        const result = await player.speak(text, locale);
        if (token === version) update({ status: result === 'error' ? 'audioError' : '' });
      } catch { if (token === version) update({ status: 'audioError' }); }
    },
    dispose() { stop(); listeners.clear(); snapshot = { ...snapshot, active: false }; },
  };
}
export type SentenceStore = ReturnType<typeof createSentenceStore>;
