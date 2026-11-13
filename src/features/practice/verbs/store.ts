import type { CardIdentity } from '../cards/content';
import type { CardPlayback } from '../cards/playback';
import type { PlaybackResult } from '../curriculum/playback';
import { findVerbCard, pagePictograms, rounds } from './content';

export type VerbPane = 'buttons' | 'drag';
export type VerbButtonStatus = 'hint' | 'card' | 'page' | 'pageChanged' | 'finished' | 'audioError' | 'interrupted';
export type VerbRoundStatus = 'idle' | 'listening' | 'ready' | 'wrong' | 'correct' | 'audioError' | 'interrupted';
export interface VerbSnapshot extends CardIdentity {
  active: boolean; pane: VerbPane; page: number; playing: 'card' | 'page' | 'round' | null; activeCard: string | null;
  buttonsStatus: VerbButtonStatus; roundStatus: VerbRoundStatus; roundIndex: number | null;
  slots: (string | null)[]; selected: string | null;
}
interface Dependencies { player: CardPlayback; identity(): CardIdentity; reward(): void; error(): void; random?: () => number }

export function createVerbStore({ player, identity, reward, error, random = Math.random }: Dependencies) {
  const initial = (): VerbSnapshot => ({ ...identity(), active: false, pane: 'buttons', page: 0, playing: null, activeCard: null,
    buttonsStatus: 'hint', roundStatus: 'idle', roundIndex: null, slots: [null, null, null], selected: null });
  let snapshot = initial(), version = 0, lastRound = -1;
  let cancelDelay: (() => void) | undefined;
  const listeners = new Set<() => void>();
  const update = (changes: Partial<VerbSnapshot>) => { snapshot = { ...snapshot, ...changes }; listeners.forEach(listener => listener()); };
  function stop() {
    version++; cancelDelay?.(); cancelDelay = undefined; player.stop();
    update({ playing: null, activeCard: null, selected: null,
      ...(snapshot.playing === 'round' ? { roundStatus: 'interrupted' } : {}),
      ...(snapshot.playing === 'card' || snapshot.playing === 'page' ? { buttonsStatus: 'interrupted' } : {}) });
  }
  function syncIdentity() {
    const next = identity();
    if (next.locale === snapshot.locale && next.grade === snapshot.grade && next.learner === snapshot.learner) return;
    const changedOwner = next.grade !== snapshot.grade || next.learner !== snapshot.learner;
    stop();
    if (changedOwner) { lastRound = -1; update({ ...initial(), active: snapshot.active }); return; }
    update({ ...next, ...(snapshot.roundStatus === 'ready' ? { roundStatus: 'interrupted' } : {}),
      ...(snapshot.roundStatus === 'correct' && snapshot.roundIndex !== null ? { slots: [...rounds[snapshot.roundIndex].target[next.locale]] } : {}) });
  }
  const delay = () => new Promise<void>(resolve => {
    const timer = setTimeout(() => { cancelDelay = undefined; resolve(); }, 140);
    cancelDelay = () => { clearTimeout(timer); resolve(); };
  });
  async function speak(text: string): Promise<PlaybackResult> {
    try { return await player.speak(text, snapshot.locale); } catch { return 'error'; }
  }
  async function playCards(id?: string) {
    if (!snapshot.active || snapshot.pane !== 'buttons') return;
    const items = pagePictograms(snapshot.page).filter(card => id === undefined || card.id === id);
    if (!items.length) return;
    stop(); const token = version;
    update({ playing: id === undefined ? 'page' : 'card', buttonsStatus: id === undefined ? 'page' : 'card' });
    for (let index = 0; index < items.length; index++) {
      const item = items[index]; update({ activeCard: item.id });
      const result = await speak(item.label[snapshot.locale]);
      if (token !== version) return;
      if (result !== 'ended') { update({ activeCard: null, playing: null, buttonsStatus: result === 'error' ? 'audioError' : 'interrupted' }); return; }
      update({ activeCard: null });
      if (index < items.length - 1) await delay();
      if (token !== version) return;
    }
    update({ playing: null, buttonsStatus: id === undefined ? 'finished' : 'hint' });
  }
  async function startRound() {
    if (!snapshot.active || snapshot.pane !== 'drag') return;
    const nextRound = snapshot.roundIndex === null || snapshot.roundStatus === 'correct';
    stop();
    let roundIndex = snapshot.roundIndex;
    if (nextRound) {
      roundIndex = Math.floor(random() * rounds.length);
      if (roundIndex === lastRound) roundIndex = (roundIndex + 1) % rounds.length;
      lastRound = roundIndex;
    }
    const token = version;
    update({ roundIndex, playing: 'round', roundStatus: 'listening', ...(nextRound ? { slots: [null, null, null] } : {}) });
    const result = await speak(rounds[roundIndex!].prompt[snapshot.locale]);
    if (token !== version) return;
    update({ playing: null, roundStatus: result === 'ended' ? 'ready' : result === 'error' ? 'audioError' : 'interrupted' });
  }
  const canArrange = () => snapshot.active && snapshot.pane === 'drag' && snapshot.roundStatus === 'ready';
  function place(id: string, index: number) {
    if (!canArrange() || !findVerbCard(id) || !Number.isInteger(index) || index < 0 || index >= 3) return false;
    if (snapshot.slots[index] === id) return false;
    const slots = snapshot.slots.map(value => value === id ? null : value); slots[index] = id;
    if (slots.some(value => value === null)) { update({ slots, selected: null }); return true; }
    const correct = rounds[snapshot.roundIndex!].target[snapshot.locale].every((value, slot) => slots[slot] === value);
    update({ slots: correct ? slots : [null, null, null], selected: null, roundStatus: correct ? 'correct' : 'wrong' });
    // Complete synchronously so repeated drops or navigation cannot queue another reward.
    if (correct) reward(); else error();
    return true;
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    start() { syncIdentity(); stop(); update({ active: true }); },
    close() { stop(); update({ active: false }); },
    syncIdentity, stop, playCards, startRound, place,
    switchPane(pane: VerbPane) { if (!snapshot.active || pane === snapshot.pane || !['buttons', 'drag'].includes(pane)) return; stop(); update({ pane }); },
    nextPage() { if (!snapshot.active || snapshot.pane !== 'buttons') return; stop(); update({ page: snapshot.page === 0 ? 1 : 0, buttonsStatus: 'pageChanged' }); },
    select(id: string) {
      if (!canArrange() || !findVerbCard(id) || snapshot.slots.includes(id)) return;
      update({ selected: snapshot.selected === id ? null : id });
    },
    remove(index: number) {
      if (!canArrange() || !Number.isInteger(index) || !snapshot.slots[index]) return false;
      update({ slots: snapshot.slots.map((id, position) => position === index ? null : id), selected: null }); return true;
    },
    dispose() { stop(); listeners.clear(); snapshot = { ...snapshot, active: false }; },
  };
}
export type VerbStore = ReturnType<typeof createVerbStore>;
