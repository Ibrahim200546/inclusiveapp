import type { CardIdentity } from '../cards/content';
import type { CardPlayback } from '../cards/playback';
import type { PlaybackResult } from '../curriculum/playback';
import { chains, quizRounds, vowelIds, vowels, type Vowel, type VowelScreen } from './content';

export type VowelStatus = 'idle' | 'waiting' | 'playing' | 'finished' | 'ready' | 'correct' | 'wrong' | 'error' | 'interrupted' | 'completed';
export interface VowelSnapshot extends CardIdentity {
  screen: VowelScreen | null; chain: number; cell: string | null; playing: 'chain' | 'vowel' | 'question' | null;
  status: VowelStatus; round: number; choices: Vowel[]; heard: boolean; answer: Vowel | null; score: number;
}
interface Dependencies { identity(): CardIdentity; player: Pick<CardPlayback, 'recording' | 'stop'>; random?: () => number }

export function createVowelStore({ identity, player, random = Math.random }: Dependencies) {
  const initial = (): VowelSnapshot => ({ ...identity(), screen: null, chain: 0, cell: null, playing: null,
    status: 'idle', round: 0, choices: [], heard: false, answer: null, score: 0 });
  let snapshot = initial(), version = 0, disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();
  const update = (changes: Partial<VowelSnapshot>) => { snapshot = { ...snapshot, ...changes }; listeners.forEach(listener => listener()); };
  function cancel() { version++; clearTimeout(timer); timer = undefined; player.stop(); }
  function shuffle() {
    const choices = [...vowelIds];
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1)); [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    return choices;
  }
  function active(screen: VowelScreen) { return !disposed && snapshot.screen === screen; }
  function feedback(): VowelStatus { return snapshot.answer === quizRounds[snapshot.round] ? 'correct' : 'wrong'; }
  function stop() {
    const interrupted = snapshot.playing !== null || snapshot.status === 'waiting';
    cancel(); update({ playing: null, cell: null, ...(interrupted ? { status: snapshot.answer ? feedback() : 'interrupted', heard: false } : {}) });
  }
  function schedule(action: () => void, milliseconds: number) {
    clearTimeout(timer); const token = version;
    timer = setTimeout(() => { timer = undefined; if (token === version && !disposed) action(); }, milliseconds);
  }
  function reset(autoplay: boolean) {
    const screen = snapshot.screen;
    if (!screen || disposed) return;
    cancel(); update({ ...initial(), screen, choices: shuffle(), status: screen === 'g0DShakTapsyrma' && autoplay ? 'waiting' : 'idle' });
    if (screen === 'g0DShakTapsyrma' && autoplay) schedule(() => { void playQuestion(); }, 400);
  }
  function syncIdentity() {
    const next = identity();
    if (next.locale === snapshot.locale && next.grade === snapshot.grade && next.learner === snapshot.learner) return;
    const ownerChanged = next.grade !== snapshot.grade || next.learner !== snapshot.learner;
    stop();
    if (ownerChanged) { reset(false); update(next); }
    else update(next);
  }
  async function play(path: string, kind: NonNullable<VowelSnapshot['playing']>, cell: string | null = null) {
    cancel(); const token = version;
    update({ playing: kind, cell, status: 'playing', ...(kind === 'question' ? { heard: false } : {}) });
    let result: PlaybackResult;
    try { result = await player.recording(path); } catch { result = 'error'; }
    if (token !== version || disposed) return;
    update({ playing: null, cell: null,
      status: result === 'ended' ? (kind === 'question' ? snapshot.answer ? feedback() : 'ready' : 'finished') : result === 'error' ? 'error' : 'interrupted',
      ...(kind === 'question' ? { heard: result === 'ended' } : {}) });
  }
  async function playQuestion() {
    syncIdentity();
    if (!active('g0DShakTapsyrma') || snapshot.status === 'completed') return;
    await play(vowels[quizRounds[snapshot.round]].audio, 'question');
  }
  function next() {
    syncIdentity();
    if (!active('g0DShakTapsyrma') || !snapshot.answer || snapshot.status === 'completed') return;
    cancel();
    if (snapshot.round === quizRounds.length - 1) update({ status: 'completed', playing: null });
    else {
      update({ round: snapshot.round + 1, choices: shuffle(), heard: false, answer: null, status: 'waiting', playing: null });
      schedule(() => { void playQuestion(); }, 400);
    }
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    start(screen: VowelScreen) { if (!disposed) { syncIdentity(); update({ screen }); reset(true); } },
    close() { cancel(); update({ screen: null, playing: null, cell: null }); },
    stop, syncIdentity, playQuestion, next,
    restart() { if (!disposed && snapshot.screen) reset(true); },
    selectChain(chain: number) {
      if (!active('g0DShakJattugu') || !Number.isInteger(chain) || !chains[chain]) return;
      cancel(); update({ chain, cell: null, playing: null, status: 'idle' });
    },
    async playCell(row: number, index: number) {
      syncIdentity();
      if (!active('g0DShakJattugu') || ![0, 1].includes(row) || !Number.isInteger(index)) return;
      const pattern = [...chains[snapshot.chain].pattern]; if (row === 1) pattern.reverse();
      const id = pattern[index]; if (id) await play(vowels[id].audio, 'vowel', `${row}:${index}`);
    },
    async playChain() {
      syncIdentity(); if (active('g0DShakJattugu')) await play(chains[snapshot.chain].audio, 'chain');
    },
    answer(answer: Vowel) {
      syncIdentity();
      if (!active('g0DShakTapsyrma') || !snapshot.heard || snapshot.playing || snapshot.answer || !snapshot.choices.includes(answer) || snapshot.status !== 'ready') return;
      const correct = answer === quizRounds[snapshot.round];
      update({ answer, score: snapshot.score + Number(correct), status: correct ? 'correct' : 'wrong' });
      schedule(next, 1400);
    },
    dispose() { cancel(); disposed = true; snapshot = { ...snapshot, screen: null, playing: null }; listeners.clear(); },
  };
}
export type VowelStore = ReturnType<typeof createVowelStore>;
