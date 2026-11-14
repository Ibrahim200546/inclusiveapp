import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CardIdentity } from '../cards/content';
import { frogSteps, frogWords, type FrogStep } from './content';
import { createFrogStore, frogDelay } from './store';

function setup() {
  let identity: CardIdentity = { locale: 'kk', grade: 0, learner: null };
  const motion = { jump: vi.fn<(step: FrogStep, signal: AbortSignal) => Promise<boolean>>().mockResolvedValue(true), celebrate: vi.fn().mockResolvedValue(true), cancel: vi.fn() };
  const delay = vi.fn<(signal: AbortSignal) => Promise<boolean>>().mockResolvedValue(true);
  const store = createFrogStore({ identity: () => identity, motion, delay });
  store.open();
  return { store, motion, delay, change(next: Partial<CardIdentity>) { identity = { ...identity, ...next }; store.syncIdentity(); } };
}
const deferred = () => { let resolve!: (value: boolean) => void; const promise = new Promise<boolean>(done => { resolve = done; }); return { promise, resolve }; };
afterEach(() => vi.useRealTimers());

describe('Frog reading lifecycle', () => {
  it('keeps all original words, advances one word per action and marks a syllable after leaving it', async () => {
    const h = setup();
    expect(frogWords).toEqual(['а-та', 'ке-ме', 'бо-та', 'а-на', 'ша-на', 'ба-ла', 'мек-теп', 'қа-лам', 'дос-тық', 'құр-ба-қа', 'а-ла-қай']);
    expect(frogSteps).toHaveLength(24);
    await h.store.advance();
    expect(h.motion.jump.mock.calls.map(([step]) => step.text)).toEqual(['а', 'та']);
    expect(h.store.getSnapshot()).toMatchObject({ status: 'between', completedWords: 1, nextStep: 2, position: 1, markedCount: 1 });
    await h.store.advance();
    expect(h.store.getSnapshot()).toMatchObject({ completedWords: 2, nextStep: 4, markedCount: 3 });
  });
  it('finishes only after all 24 syllables and restarts without an extra jump', async () => {
    const h = setup();
    for (let i = 0; i < 11; i++) await h.store.advance();
    expect(h.store.getSnapshot()).toMatchObject({ status: 'complete', completedWords: 11, nextStep: 24, markedCount: 24 });
    expect(h.motion.jump).toHaveBeenCalledTimes(24); expect(h.motion.celebrate).toHaveBeenCalledOnce();
    await h.store.advance();
    expect(h.store.getSnapshot()).toMatchObject({ status: 'idle', completedWords: 0, nextStep: 0, position: null, markedCount: 0 });
    expect(h.motion.jump).toHaveBeenCalledTimes(24);
  });
  it('ignores repeated action presses during a jump', async () => {
    const h = setup(), pending = deferred(); h.motion.jump.mockReturnValueOnce(pending.promise);
    const run = h.store.advance(); await h.store.advance(); await h.store.advance();
    expect(h.motion.jump).toHaveBeenCalledOnce(); pending.resolve(true); await run;
    expect(h.store.getSnapshot().completedWords).toBe(1);
  });
  it.each(['reset', 'close', 'pause', 'locale', 'grade', 'learner', 'dispose'] as const)('ignores late jump results after %s', async action => {
    const h = setup(), pending = deferred(); h.motion.jump.mockReturnValueOnce(pending.promise);
    const run = h.store.advance(), signal = h.motion.jump.mock.calls[0][1];
    if (action === 'locale') h.change({ locale: 'ru' });
    else if (action === 'grade') h.change({ grade: 1 });
    else if (action === 'learner') h.change({ learner: 'another' });
    else h.store[action]();
    const snapshot = h.store.getSnapshot(); expect(signal.aborted).toBe(true);
    pending.resolve(true); await run; expect(h.store.getSnapshot()).toBe(snapshot);
    expect(h.delay).not.toHaveBeenCalled(); expect(h.motion.celebrate).not.toHaveBeenCalled();
  });
  it('repeats an interrupted dwell without skipping a syllable or clearing completed words', async () => {
    const h = setup(); await h.store.advance();
    const pending = deferred(); h.delay.mockReturnValueOnce(pending.promise);
    const run = h.store.advance(); await Promise.resolve();
    expect(h.store.getSnapshot()).toMatchObject({ nextStep: 2, position: 2, markedCount: 2 });
    h.change({ locale: 'ru' }); pending.resolve(true); await run;
    expect(h.store.getSnapshot()).toMatchObject({ status: 'paused', completedWords: 1, nextStep: 2, locale: 'ru' });
    await h.store.advance();
    expect(h.motion.jump.mock.calls.map(([step]) => step.index)).toEqual([0, 1, 2, 2, 3]);
    expect(h.store.getSnapshot()).toMatchObject({ completedWords: 2, nextStep: 4 });
  });
  it('preserves completed work across translation but resets for another learner or grade', async () => {
    const h = setup(); await h.store.advance(); h.change({ locale: 'ru' });
    expect(h.store.getSnapshot()).toMatchObject({ completedWords: 1, status: 'between', locale: 'ru' });
    h.change({ learner: 'new' }); expect(h.store.getSnapshot()).toMatchObject({ completedWords: 0, status: 'idle', active: true });
    await h.store.advance(); h.change({ grade: 1 }); expect(h.store.getSnapshot().completedWords).toBe(0);
  });
  it('does not interrupt an unchanged identity and opens cleanly after leaving', async () => {
    const h = setup(), pending = deferred(); h.motion.jump.mockReturnValueOnce(pending.promise);
    const run = h.store.advance(); h.change({}); expect(h.motion.jump.mock.calls[0][1].aborted).toBe(false);
    h.store.close(); h.store.open(); pending.resolve(true); await run;
    expect(h.store.getSnapshot()).toMatchObject({ active: true, status: 'idle', completedWords: 0 });
  });
  it('can retry a failed animation without awarding or skipping the word', async () => {
    const h = setup(); h.motion.jump.mockRejectedValueOnce(new Error('animation failed')); await h.store.advance();
    expect(h.store.getSnapshot()).toMatchObject({ status: 'error', completedWords: 0, nextStep: 0 });
    await h.store.advance(); expect(h.store.getSnapshot().completedWords).toBe(1);
  });
  it('turns cancelled or timed-out animation into a resumable pause', async () => {
    const h = setup(); h.motion.jump.mockResolvedValueOnce(false); await h.store.advance();
    expect(h.store.getSnapshot()).toMatchObject({ status: 'paused', nextStep: 0 });
    await h.store.advance(); expect(h.store.getSnapshot().completedWords).toBe(1);
  });
  it('ignores a late celebration failure after restarting', async () => {
    const h = setup(); let fail!: (error: Error) => void;
    h.motion.celebrate.mockImplementationOnce(() => new Promise((_, reject) => { fail = reject; }));
    for (let i = 0; i < 10; i++) await h.store.advance();
    const run = h.store.advance();
    await vi.waitFor(() => expect(h.store.getSnapshot().status).toBe('complete'));
    h.store.reset(); fail(new Error('late')); await run;
    expect(h.store.getSnapshot()).toMatchObject({ status: 'idle', completedWords: 0 });
  });
  it('keeps completion valid if the decorative celebration cannot play', async () => {
    const h = setup(); h.motion.celebrate.mockRejectedValueOnce(new Error('animation unavailable'));
    for (let i = 0; i < 11; i++) await h.store.advance();
    expect(h.store.getSnapshot()).toMatchObject({ status: 'complete', completedWords: 11, markedCount: 24 });
    await h.store.advance(); expect(h.store.getSnapshot()).toMatchObject({ status: 'idle', completedWords: 0 });
  });
  it('clears the reading timer immediately on abort, including an already aborted signal', async () => {
    vi.useFakeTimers(); const controller = new AbortController(); const wait = frogDelay(controller.signal);
    expect(vi.getTimerCount()).toBe(1); controller.abort();
    expect(await wait).toBe(false); expect(vi.getTimerCount()).toBe(0);
    expect(await frogDelay(controller.signal)).toBe(false); expect(vi.getTimerCount()).toBe(0);
    const complete = frogDelay(new AbortController().signal); await vi.advanceTimersByTimeAsync(600); expect(await complete).toBe(true);
  });
});
