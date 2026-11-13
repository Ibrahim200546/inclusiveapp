import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync } from 'node:fs';
import type { CardIdentity } from '../cards/content';
import type { CardPlayback } from '../cards/playback';
import type { PlaybackResult } from '../curriculum/playback';
import { pagePictograms, pictograms, rounds, sheets, verbCards } from './content';
import { createVerbStore } from './store';

function setup() {
  let owner: CardIdentity = { locale: 'kk', grade: 0, learner: null };
  const player: CardPlayback = { speak: vi.fn().mockResolvedValue('ended'), recording: vi.fn(), stop: vi.fn() };
  const reward = vi.fn(), error = vi.fn();
  const store = createVerbStore({ player, identity: () => owner, reward, error, random: () => 0 });
  store.start();
  return { store, player, reward, error, identify(changes: Partial<CardIdentity>) { owner = { ...owner, ...changes }; store.syncIdentity(); } };
}
function pending() {
  let resolve!: (value: PlaybackResult) => void, reject!: (reason: Error) => void;
  const promise = new Promise<PlaybackResult>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('retains both pages, twelve bank cards, valid sheet crops and existing images', () => {
  expect(pictograms).toHaveLength(12); expect(verbCards).toHaveLength(12);
  expect(pagePictograms(0)).toHaveLength(6); expect(pagePictograms(1)).toHaveLength(6);
  for (const item of pictograms) {
    const sheet = sheets[item.sheet];
    expect(item.x + item.w).toBeLessThanOrEqual(sheet.width); expect(item.y + item.h).toBeLessThanOrEqual(sheet.height);
    expect(existsSync(`public/original/${sheet.src}`)).toBe(true);
  }
  for (const item of verbCards) expect(existsSync(`public/original/${item.src}`), item.src).toBe(true);
  for (const round of rounds) for (const locale of ['kk', 'ru'] as const) {
    expect(new Set(round.target[locale]).size).toBe(3);
    expect(round.target[locale].every(id => verbCards.some(card => card.id === id))).toBe(true);
  }
});

describe('pictogram narration', () => {
  it('plays the six visible cards in order, using the selected language and cancellable gaps', async () => {
    const { store, player, identify } = setup(); identify({ locale: 'ru' });
    const playing = store.playCards(); await vi.runAllTimersAsync(); await playing;
    expect(vi.mocked(player.speak).mock.calls).toEqual(pagePictograms(0).map(item => [item.label.ru, 'ru']));
    expect(store.getSnapshot()).toMatchObject({ playing: null, activeCard: null, buttonsStatus: 'finished' });
    expect(vi.getTimerCount()).toBe(0);
    store.nextPage(); await store.playCards('play-ball'); expect(player.speak).toHaveBeenLastCalledWith('Играл в мяч', 'ru');
    const count = vi.mocked(player.speak).mock.calls.length; await store.playCards('wash-hands'); await store.playCards('unknown');
    expect(player.speak).toHaveBeenCalledTimes(count);
  });
  it('cancels the inter-card delay immediately and never starts the next recording', async () => {
    const { store, player } = setup(); const playing = store.playCards();
    await vi.advanceTimersByTimeAsync(1); expect(vi.getTimerCount()).toBe(1);
    store.stop(); await playing; await vi.runAllTimersAsync();
    expect(player.speak).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(0);
  });
  it.each(['page', 'pane', 'language', 'grade', 'learner', 'close', 'dispose'] as const)('ignores a late rejection after changing %s', async change => {
    const { store, player, identify } = setup(), delayed = pending();
    vi.mocked(player.speak).mockReturnValueOnce(delayed.promise); const playing = store.playCards();
    if (change === 'page') store.nextPage();
    if (change === 'pane') store.switchPane('drag');
    if (change === 'language') identify({ locale: 'ru' });
    if (change === 'grade') identify({ grade: 1 });
    if (change === 'learner') identify({ learner: 'new' });
    if (change === 'close') { store.close(); store.start(); }
    if (change === 'dispose') store.dispose();
    const snapshot = store.getSnapshot(); delayed.reject(new Error('late')); await playing; await vi.runAllTimersAsync();
    expect(store.getSnapshot()).toBe(snapshot); expect(player.speak).toHaveBeenCalledTimes(1); expect(player.stop).toHaveBeenCalled();
  });
  it('keeps a replacement card highlighted after an older request resolves', async () => {
    const { store, player } = setup(), first = pending(), second = pending();
    vi.mocked(player.speak).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const old = store.playCards('wash-hands'), current = store.playCards('eat-at-table');
    first.resolve('ended'); await old; expect(store.getSnapshot()).toMatchObject({ activeCard: 'eat-at-table', playing: 'card' });
    second.resolve('ended'); await current; expect(store.getSnapshot()).toMatchObject({ activeCard: null, playing: null });
  });
  it('stops a sequence at an audio failure and permits a fresh retry', async () => {
    const { store, player } = setup(); vi.mocked(player.speak).mockResolvedValueOnce('error');
    await store.playCards(); expect(store.getSnapshot().buttonsStatus).toBe('audioError'); expect(player.speak).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0); await store.playCards('wash-hands'); expect(store.getSnapshot().buttonsStatus).toBe('hint');
  });
});

describe('ordering the heard sentence', () => {
  it.each(['error', 'interrupted', 'cancelled'] as const)('keeps answers locked after %s and retries the same sentence', async result => {
    const { store, player, reward } = setup(), delayed = pending(); store.switchPane('drag');
    vi.mocked(player.speak).mockReturnValueOnce(delayed.promise); const listening = store.startRound();
    expect(store.place('boy', 0)).toBe(false); store.select('boy'); expect(store.getSnapshot().selected).toBeNull();
    delayed.resolve(result); await listening; await vi.runAllTimersAsync();
    expect(store.place('boy', 0)).toBe(false); expect(reward).not.toHaveBeenCalled();
    await store.startRound(); expect(store.getSnapshot()).toMatchObject({ roundIndex: 0, roundStatus: 'ready' });
    expect(vi.mocked(player.speak).mock.calls.map(([text]) => text)).toEqual(['Бала доп тепті', 'Бала доп тепті']);
    expect(store.place('boy', 0)).toBe(true);
  });
  it.each(['pane', 'language', 'grade', 'learner', 'close', 'stop', 'dispose'] as const)('does not unlock or award after a late completion following %s', async change => {
    const { store, player, identify, reward } = setup(), delayed = pending(); store.switchPane('drag');
    vi.mocked(player.speak).mockReturnValueOnce(delayed.promise); const listening = store.startRound();
    if (change === 'pane') store.switchPane('buttons');
    if (change === 'language') identify({ locale: 'ru' });
    if (change === 'grade') identify({ grade: 1 });
    if (change === 'learner') identify({ learner: 'new' });
    if (change === 'close') { store.close(); store.start(); }
    if (change === 'stop') store.stop();
    if (change === 'dispose') store.dispose();
    const snapshot = store.getSnapshot(); delayed.resolve('ended'); await listening;
    expect(store.getSnapshot()).toBe(snapshot); expect(store.place('boy', 0)).toBe(false); expect(reward).not.toHaveBeenCalled();
  });
  it('requires another complete hearing after a mistake and awards a correct round once', async () => {
    const { store, reward, error, identify } = setup(); store.switchPane('drag'); await store.startRound();
    for (const [index, id] of ['cat', 'ball', 'kick'].entries()) store.place(id, index);
    expect(store.getSnapshot()).toMatchObject({ slots: [null, null, null], roundStatus: 'wrong' });
    expect(error).toHaveBeenCalledOnce(); expect(reward).not.toHaveBeenCalled(); expect(store.place('boy', 0)).toBe(false);
    await store.startRound(); for (const [index, id] of rounds[0].target.kk.entries()) store.place(id, index);
    expect(store.getSnapshot().roundStatus).toBe('correct'); expect(reward).toHaveBeenCalledOnce();
    store.place('kick', 2); store.remove(0); identify({ locale: 'ru' }); store.close(); store.start();
    expect(store.getSnapshot().slots).toEqual(['boy', 'kick', 'ball']); expect(reward).toHaveBeenCalledOnce();
    await store.startRound(); expect(store.getSnapshot()).toMatchObject({ roundIndex: 1, roundStatus: 'ready', slots: [null, null, null] });
  });
  it('validates the word order of each spoken language', async () => {
    const { store, identify, reward } = setup(); identify({ locale: 'ru' }); store.switchPane('drag'); await store.startRound();
    for (const [index, id] of ['boy', 'ball', 'kick'].entries()) store.place(id, index);
    expect(store.getSnapshot().roundStatus).toBe('wrong'); await store.startRound();
    for (const [index, id] of ['boy', 'kick', 'ball'].entries()) store.place(id, index);
    expect(reward).toHaveBeenCalledOnce();
    await store.startRound(); for (const [index, id] of ['cat', 'drink', 'milk'].entries()) store.place(id, index);
    expect(reward).toHaveBeenCalledTimes(2);
  });
  it('supports selection, removal, replacement and moving without duplicating cards or accepting foreign input', async () => {
    const { store, reward } = setup(); store.switchPane('drag'); await store.startRound();
    store.select('boy'); expect(store.getSnapshot().selected).toBe('boy'); store.select('boy'); expect(store.getSnapshot().selected).toBeNull();
    store.place('boy', 1); store.place('boy', 0); expect(store.getSnapshot().slots).toEqual(['boy', null, null]);
    store.place('cat', 0); expect(store.getSnapshot().slots).toEqual(['cat', null, null]); store.remove(0);
    for (const [id, index] of [['foreign', 0], ['boy', -1], ['boy', 3], ['boy', .5]] as const) expect(store.place(id, index)).toBe(false);
    store.select('foreign'); expect(store.getSnapshot().selected).toBeNull(); expect(reward).not.toHaveBeenCalled();
  });
  it('preserves an unfinished arrangement on translation but requires the translated sample to finish', async () => {
    const { store, identify } = setup(); store.switchPane('drag'); await store.startRound(); store.place('boy', 0);
    identify({ locale: 'ru' }); expect(store.getSnapshot()).toMatchObject({ slots: ['boy', null, null], roundStatus: 'interrupted' });
    expect(store.place('kick', 1)).toBe(false); await store.startRound(); expect(store.getSnapshot().slots).toEqual(['boy', null, null]);
    store.place('kick', 1); store.place('ball', 2); expect(store.getSnapshot().roundStatus).toBe('correct');
  });
  it('clears hidden drafts on learner changes and detaches subscribers on disposal', async () => {
    const { store, identify } = setup(); store.switchPane('drag'); await store.startRound(); store.place('boy', 0); store.close();
    identify({ learner: 'other' }); store.start(); expect(store.getSnapshot()).toMatchObject({ pane: 'buttons', roundIndex: null, slots: [null, null, null] });
    const listener = vi.fn(), release = store.subscribe(listener); release(); store.nextPage(); expect(listener).not.toHaveBeenCalled();
    store.subscribe(listener); store.dispose(); listener.mockClear(); store.stop(); expect(listener).not.toHaveBeenCalled();
  });
});
