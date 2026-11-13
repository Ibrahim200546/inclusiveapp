import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createVowelStore } from './store';
import { chains, quizRounds, vowels } from './content';
import type { CardIdentity } from '../cards/content';
import type { PlaybackResult } from '../curriculum/playback';

function setup() {
  let identity: CardIdentity = { locale: 'kk', grade: 0, learner: 'one' };
  const player = { recording: vi.fn(async (): Promise<PlaybackResult> => 'ended'), stop: vi.fn() };
  const store = createVowelStore({ identity: () => identity, player, random: () => .5 });
  return { store, player, identity(change: Partial<CardIdentity>) { identity = { ...identity, ...change }; store.syncIdentity(); } };
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('vowel chains and picture quiz', () => {
  it('plays the six existing recordings and resolves cells in both row directions', async () => {
    const { store, player } = setup(); store.start('g0DShakJattugu');
    for (let index = 0; index < chains.length; index++) {
      store.selectChain(index); await store.playChain(); expect(player.recording).toHaveBeenLastCalledWith(chains[index].audio);
      await store.playCell(0, 0); expect(player.recording).toHaveBeenLastCalledWith(vowels[chains[index].pattern[0]].audio);
      await store.playCell(1, 0); expect(player.recording).toHaveBeenLastCalledWith(vowels[chains[index].pattern.at(-1)!].audio);
    }
    const calls = player.recording.mock.calls.length;
    await store.playCell(9, 0); await store.playCell(0, -1); store.selectChain(999); await store.playCell(0, 99);
    expect(player.recording).toHaveBeenCalledTimes(calls); expect(store.getSnapshot().chain).toBe(5);
  });
  it('replacing a chain or cell cancels old audio without a late error overwriting the new selection', async () => {
    const { store, player } = setup(); let finish!: (result: PlaybackResult) => void;
    player.recording.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    store.start('g0DShakJattugu'); const pending = store.playCell(0, 0);
    expect(store.getSnapshot()).toMatchObject({ playing: 'vowel', cell: '0:0' });
    store.selectChain(3); await store.playCell(1, 0); const current = store.getSnapshot();
    finish('error'); await pending; expect(store.getSnapshot()).toEqual(current);
    expect(player.recording).toHaveBeenLastCalledWith(vowels.hurt.audio);
  });
  it('only accepts an answer after the entire prompt ends', async () => {
    const { store, player } = setup(); let finish!: (result: PlaybackResult) => void;
    player.recording.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    store.start('g0DShakTapsyrma'); store.answer('baby'); expect(store.getSnapshot().answer).toBeNull();
    await vi.advanceTimersByTimeAsync(400); store.answer('baby'); expect(store.getSnapshot().answer).toBeNull();
    expect(store.getSnapshot()).toMatchObject({ status: 'playing', heard: false });
    finish('ended'); await Promise.resolve(); store.answer('baby'); store.answer('baby'); store.answer('wolf');
    expect(store.getSnapshot()).toMatchObject({ status: 'correct', answer: 'baby', score: 1 });
  });
  it('advances automatically once and schedules the next prompt without overlap', async () => {
    const { store, player } = setup(); store.start('g0DShakTapsyrma');
    await vi.advanceTimersByTimeAsync(400); store.answer('baby');
    await vi.advanceTimersByTimeAsync(1399); expect(store.getSnapshot().round).toBe(0);
    await vi.advanceTimersByTimeAsync(1); expect(store.getSnapshot()).toMatchObject({ round: 1, status: 'waiting', score: 1, answer: null });
    expect(player.recording).toHaveBeenCalledTimes(1); await vi.advanceTimersByTimeAsync(400);
    expect(player.recording).toHaveBeenCalledTimes(2); expect(player.recording).toHaveBeenLastCalledWith(vowels.wolf.audio);
  });
  it('manual next cancels the scheduled advance and preserves nine-round scoring', async () => {
    const { store } = setup(); store.start('g0DShakTapsyrma');
    for (let round = 0; round < quizRounds.length; round++) {
      await vi.advanceTimersByTimeAsync(400); store.answer(round === 0 ? 'wolf' : quizRounds[round]);
      const score = store.getSnapshot().score; store.answer(quizRounds[round]); expect(store.getSnapshot().score).toBe(score);
      store.next();
    }
    expect(store.getSnapshot()).toMatchObject({ status: 'completed', round: 8, score: 8 });
    await vi.advanceTimersByTimeAsync(2000); store.next(); await store.playQuestion();
    expect(store.getSnapshot()).toMatchObject({ status: 'completed', score: 8 });
    store.restart(); expect(store.getSnapshot()).toMatchObject({ status: 'waiting', round: 0, score: 0, answer: null });
  });
  it.each(['error', 'interrupted', 'cancelled'] as PlaybackResult[])('does not unlock choices after %s and allows retry', async result => {
    const { store, player } = setup(); player.recording.mockResolvedValueOnce(result); store.start('g0DShakTapsyrma');
    await vi.advanceTimersByTimeAsync(400); store.answer('baby');
    expect(store.getSnapshot()).toMatchObject({ heard: false, answer: null, round: 0, score: 0 });
    expect(store.getSnapshot().status).toBe(result === 'error' ? 'error' : 'interrupted');
    await store.playQuestion(); store.answer('baby'); expect(store.getSnapshot().score).toBe(1);
  });
  it('handles rejected media promises and cancels auto-advance while replaying feedback', async () => {
    const { store, player } = setup(); player.recording.mockRejectedValueOnce(new Error('decoder')); store.start('g0DShakTapsyrma');
    await vi.advanceTimersByTimeAsync(400); expect(store.getSnapshot().status).toBe('error');
    await store.playQuestion(); store.answer('wolf'); await store.playQuestion();
    await vi.advanceTimersByTimeAsync(3000); expect(store.getSnapshot()).toMatchObject({ round: 0, answer: 'wolf', status: 'wrong', score: 0 });
    store.next(); expect(store.getSnapshot().round).toBe(1);
  });
  for (const phase of ['waiting', 'playing', 'answered'] as const) {
    it.each(['leave', 'stop', 'language', 'grade', 'learner', 'restart', 'dispose'] as const)(`cancels ${phase} work on %s`, async change => {
      const { store, player, identity } = setup(); let finish: ((result: PlaybackResult) => void) | undefined;
      if (phase === 'playing') player.recording.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
      store.start('g0DShakTapsyrma');
      if (phase !== 'waiting') await vi.advanceTimersByTimeAsync(400);
      if (phase === 'answered') store.answer('baby');
      if (change === 'leave') store.close();
      else if (change === 'language') identity({ locale: 'ru' });
      else if (change === 'grade') identity({ grade: 1 });
      else if (change === 'learner') identity({ learner: 'two' });
      else store[change]();
      const after = store.getSnapshot(), calls = player.recording.mock.calls.length;
      finish?.('error'); await Promise.resolve(); expect(store.getSnapshot()).toEqual(after);
      await vi.advanceTimersByTimeAsync(2500);
      if (change === 'restart') {
        expect(store.getSnapshot()).toMatchObject({ round: 0, score: 0, status: 'ready' }); expect(player.recording).toHaveBeenCalledTimes(calls + 1);
      } else { expect(store.getSnapshot()).toEqual(after); expect(player.recording).toHaveBeenCalledTimes(calls); }
      expect(vi.getTimerCount()).toBe(0);
    });
  }
  it('keeps locale changes on the same exercise but resets a new owner', async () => {
    const { store, identity } = setup(); store.start('g0DShakTapsyrma'); await vi.advanceTimersByTimeAsync(400); store.answer('baby');
    identity({ locale: 'ru' }); expect(store.getSnapshot()).toMatchObject({ round: 0, answer: 'baby', score: 1, status: 'correct' });
    store.next(); await vi.advanceTimersByTimeAsync(400); identity({ grade: 1 });
    expect(store.getSnapshot()).toMatchObject({ round: 0, answer: null, score: 0, heard: false, status: 'idle', grade: 1 });
  });
  it('does not play or accept actions on another screen or after disposal', async () => {
    const { store, player } = setup(); await store.playChain(); await store.playCell(0, 0); await store.playQuestion(); store.answer('baby'); store.next();
    store.start('g0DShakJattugu'); await store.playQuestion(); store.answer('baby'); store.next();
    store.dispose(); store.start('g0DShakTapsyrma'); store.restart(); await store.playChain(); await store.playQuestion();
    await vi.advanceTimersByTimeAsync(3000); expect(player.recording).not.toHaveBeenCalled(); expect(store.getSnapshot().screen).toBeNull();
  });
});
