import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CardIdentity } from '../cards/content';
import { judgeRhythm, makeRhythm, rhythmGaps, rhythmLevels, rhythmSignature, usedRhythmPads, type RhythmPad } from './content';
import { createRhythmStore } from './store';

function harness() {
  let identity: CardIdentity = { locale: 'ru', grade: 0, learner: 'first' };
  const audio = { unlock: vi.fn(async () => true), hit: vi.fn(() => true), stop: vi.fn() }, stopOtherAudio = vi.fn();
  const store = createRhythmStore({ identity: () => identity, audio, stopOtherAudio, random: () => .4, now: () => Date.now() });
  store.open();
  const repeat = async () => { await store.listen(); await vi.advanceTimersByTimeAsync(store.getSnapshot().pattern.at(-1)!.time + 1350); };
  const answer = async () => {
    const pattern = store.getSnapshot().pattern;
    for (let index = 0; index < pattern.length; index++) {
      if (index) await vi.advanceTimersByTimeAsync(pattern[index].time - pattern[index - 1].time);
      store.tap(pattern[index].pad);
    }
    await vi.advanceTimersByTimeAsync(400);
  };
  return { store, audio, stopOtherAudio, repeat, answer, identity: (patch: Partial<CardIdentity>) => { identity = { ...identity, ...patch }; store.syncIdentity(); } };
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(0); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe('rhythm curriculum', () => {
  it.each(rhythmLevels.map((_, i) => i))('keeps the original count, instruments and gaps at level %i', level => {
    for (let round = 0; round < 20; round++) {
      const pattern = makeRhythm(level);
      expect(pattern).toHaveLength(rhythmLevels[level].beats); expect(usedRhythmPads(pattern)).toHaveLength(rhythmLevels[level].instruments);
      expect(pattern[0].time).toBe(0);
      pattern.slice(1).forEach((beat, index) => expect(rhythmGaps).toContain(beat.time - pattern[index].time));
    }
  });
  it('bounds repeat avoidance when the random source cannot produce a new rhythm', () => {
    const random = vi.fn(() => .5), first = makeRhythm(0, [], random);
    expect(makeRhythm(0, [rhythmSignature(first)], random)).toEqual(first); expect(random.mock.calls.length).toBeLessThan(1000);
  });
  it('uses interval tolerance rather than absolute start time and rejects wrong, missing and extra beats', () => {
    const pattern = [{ time: 0, pad: 0 }, { time: 450, pad: 1 }, { time: 1350, pad: 2 }] as const;
    const target = [...pattern];
    expect(judgeRhythm(target, [{ time: 90, pad: 0 }, { time: 860, pad: 1 }, { time: 2210, pad: 2 }]).success).toBe(true);
    expect(judgeRhythm(target, [{ time: 0, pad: 0 }, { time: 771, pad: 1 }, { time: 1671, pad: 2 }]).success).toBe(false);
    expect(judgeRhythm(target, [{ time: 0, pad: 1 }, ...target.slice(1)]).success).toBe(false);
    expect(judgeRhythm(target, target.slice(0, 2)).success).toBe(false);
    expect(judgeRhythm(target, [...target, { time: 1800, pad: 3 }]).success).toBe(false);
  });
});

it('gates input until the sample and bell tail finish; replay retains the pattern', async () => {
  const h = harness(), pattern = h.store.getSnapshot().pattern;
  h.store.tap(pattern[0].pad); expect(h.store.getSnapshot().taps).toEqual([]);
  await h.store.listen(); h.store.tap(pattern[0].pad); await h.store.listen();
  expect(h.audio.unlock).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(pattern.at(-1)!.time + 1349); expect(h.store.getSnapshot().phase).toBe('playing');
  await vi.advanceTimersByTimeAsync(1); h.store.tap(pattern[0].pad);
  await h.store.listen(); expect(h.store.getSnapshot().taps).toEqual([]); expect(h.store.getSnapshot().pattern).toBe(pattern);
  expect(h.store.getSnapshot().rounds).toBe(0); h.store.dispose(); expect(vi.getTimerCount()).toBe(0);
});

it('completes all five levels with exactly three successful rounds and ends in free play', async () => {
  const h = harness();
  for (let level = 0; level < 5; level++) for (let round = 1; round <= 3; round++) {
    expect(h.store.getSnapshot().level).toBe(level); await h.repeat(); await h.answer();
    expect(h.store.getSnapshot()).toMatchObject({ phase: 'result', success: true, rounds: round });
    h.store.tap(h.store.getSnapshot().pattern[0].pad); await h.store.listen();
    expect(h.store.getSnapshot().rounds).toBe(round);
    await vi.advanceTimersByTimeAsync(2800);
  }
  expect(h.store.getSnapshot()).toMatchObject({ phase: 'free', level: -1, done: [0, 1, 2, 3, 4], rounds: 0 }); h.store.dispose();
});

it('handles incorrect timing and incomplete attempts without awarding a star', async () => {
  const h = harness(); await h.repeat();
  for (const beat of h.store.getSnapshot().pattern) h.store.tap(beat.pad);
  await vi.advanceTimersByTimeAsync(400); expect(h.store.getSnapshot()).toMatchObject({ success: false, rounds: 0, matches: [true, false, false] });
  await vi.advanceTimersByTimeAsync(3200); await h.repeat(); h.store.tap(h.store.getSnapshot().pattern[0].pad);
  await vi.advanceTimersByTimeAsync(4000); expect(h.store.getSnapshot()).toMatchObject({ phase: 'result', success: false, rounds: 0 }); h.store.dispose();
});

it('clears the incomplete-attempt deadline when replaying', async () => {
  const h = harness(); await h.repeat(); h.store.tap(h.store.getSnapshot().pattern[0].pad);
  await h.repeat(); await vi.advanceTimersByTimeAsync(4500);
  expect(h.store.getSnapshot()).toMatchObject({ phase: 'repeat', taps: [], rounds: 0 }); h.store.dispose();
});

it.each(['pause', 'close', 'level', 'grade', 'learner', 'dispose'])('cancels playback and late unlock on %s', async reason => {
  const h = harness(); let resolve!: (ready: boolean) => void;
  h.audio.unlock.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  const pending = h.store.listen();
  if (reason === 'pause') h.store.pause();
  if (reason === 'close') { h.store.close(); h.store.open(); }
  if (reason === 'level') h.store.selectLevel(2);
  if (reason === 'grade') h.identity({ grade: 1 });
  if (reason === 'learner') h.identity({ learner: 'second' });
  if (reason === 'dispose') h.store.dispose();
  const snapshot = h.store.getSnapshot(); resolve(true); await pending; await vi.advanceTimersByTimeAsync(20_000);
  expect(h.store.getSnapshot()).toBe(snapshot); expect(h.audio.hit).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0); h.store.dispose();
});

it('interrupts scheduled beats and pending result transitions; completed stars survive a pause', async () => {
  const h = harness(); await h.store.listen(); await vi.advanceTimersByTimeAsync(400); h.store.pause();
  const hits = h.audio.hit.mock.calls.length; await vi.advanceTimersByTimeAsync(20_000); expect(h.audio.hit).toHaveBeenCalledTimes(hits);
  await h.repeat(); await h.answer(); h.store.pause();
  expect(h.store.getSnapshot()).toMatchObject({ rounds: 1, phase: 'idle' });
  const next = h.store.getSnapshot(); await vi.advanceTimersByTimeAsync(20_000); expect(h.store.getSnapshot()).toBe(next); h.store.dispose();
});

it('keeps the running exercise and stars when only the language changes', async () => {
  const h = harness(); await h.repeat(); await h.answer(); await vi.advanceTimersByTimeAsync(2800); await h.store.listen();
  const pattern = h.store.getSnapshot().pattern; h.identity({ locale: 'kk' });
  expect(h.store.getSnapshot()).toMatchObject({ phase: 'playing', rounds: 1, locale: 'kk' }); expect(h.store.getSnapshot().pattern).toBe(pattern); h.store.dispose();
});

it('resets progress for another learner or grade and ignores invalid levels and pads', async () => {
  const h = harness(); await h.repeat(); await h.answer(); h.identity({ learner: 'second' });
  expect(h.store.getSnapshot()).toMatchObject({ rounds: 0, phase: 'idle', done: [] });
  for (const level of [-2, 5, .5, NaN]) h.store.selectLevel(level);
  expect(h.store.getSnapshot().level).toBe(0); h.store.tap(10 as RhythmPad); expect(h.store.getSnapshot().taps).toEqual([]); h.store.dispose();
});

it('keeps free play bounded and starts a fresh strip after six seconds', async () => {
  const h = harness(); h.store.selectLevel(-1);
  for (let n = 0; n < 100; n++) h.store.tap(n % 4 as RhythmPad);
  expect(h.store.getSnapshot()).toMatchObject({ phase: 'free', rounds: 0 }); expect(h.store.getSnapshot().taps).toHaveLength(64);
  await vi.advanceTimersByTimeAsync(6001); h.store.tap(1); expect(h.store.getSnapshot().taps).toEqual([{ time: 0, pad: 1 }]);
  h.store.close(); expect(vi.getTimerCount()).toBe(0); h.store.dispose();
});

it('falls back to visual practice if audio cannot start, and remains stoppable', async () => {
  const h = harness(); h.audio.unlock.mockResolvedValue(false); h.audio.hit.mockReturnValue(false); await h.repeat();
  expect(h.store.getSnapshot()).toMatchObject({ phase: 'repeat', silent: true }); await h.answer();
  expect(h.store.getSnapshot().success).toBe(true); h.store.dispose(); expect(vi.getTimerCount()).toBe(0);
});

it('cooperates with the global stop hook without cancelling its new sample or first free tap', async () => {
  const h = harness(); h.stopOtherAudio.mockImplementation(h.store.pause); await h.repeat();
  expect(h.store.getSnapshot().phase).toBe('repeat'); h.store.selectLevel(-1); h.store.tap(0);
  expect(h.store.getSnapshot().taps).toHaveLength(1); h.store.dispose();
});
