import { describe, expect, it, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { sentenceCards, spatialCards, spatialHeaders, type CardIdentity } from './content';
import type { CardPlayback } from './playback';
import type { PlaybackResult } from '../curriculum/playback';
import { createSentenceStore } from './sentenceStore';
import { createSpatialStore } from './spatialStore';

function setup() {
  let owner: CardIdentity = { locale: 'kk', grade: 0, learner: null };
  const player: CardPlayback = { stop: vi.fn(), speak: vi.fn().mockResolvedValue('ended'), recording: vi.fn().mockResolvedValue('ended') };
  const effect = vi.fn();
  const sentence = createSentenceStore(player, () => owner), spatial = createSpatialStore(player, () => owner, effect, () => .5);
  return { player, effect, sentence, spatial, identify(changes: Partial<CardIdentity>) { owner = { ...owner, ...changes }; sentence.syncIdentity(); spatial.syncIdentity(); } };
}
function pending() {
  let resolve!: (value: PlaybackResult) => void, reject!: (error: Error) => void;
  const promise = new Promise<PlaybackResult>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

it('retains the nine words and all 25 spatial images and recordings', () => {
  expect(sentenceCards).toHaveLength(9);
  expect(sentenceCards.map(card => card.kk)).toEqual(['Ата', 'жеді', 'ішті', 'банан', 'жуды', 'ойнады', 'Әпке', 'сорпа', 'Ана']);
  expect(spatialCards).toHaveLength(16);
  for (const sample of [...spatialCards, ...spatialHeaders]) {
    expect(existsSync(`public/original/${sample.image}`), sample.image).toBe(true);
    expect(existsSync(`public/original/${sample.audio}`), sample.audio).toBe(true);
  }
});

describe('sentence construction', () => {
  it('moves each card once, preserves order across language and navigation, and resets explicitly', async () => {
    const { sentence, player, identify } = setup();
    sentence.start(); sentence.move(9, true); sentence.move(2, true); sentence.move(8, true);
    expect(sentence.move(8, true)).toBe(false); expect(sentence.move(99, true)).toBe(false);
    expect(sentence.getSnapshot().sentence).toEqual([9, 2, 8]); expect(sentence.getSnapshot().available).toHaveLength(6);
    await sentence.play(); expect(player.speak).toHaveBeenLastCalledWith('Ана жеді сорпа', 'kk');
    sentence.close(); expect(sentence.move(9, false)).toBe(false);
    sentence.start(); identify({ locale: 'ru' });
    expect(sentence.getSnapshot().sentence).toEqual([9, 2, 8]);
    await sentence.play(); expect(player.speak).toHaveBeenLastCalledWith('Мама ест суп', 'ru');
    sentence.move(2, false); expect(sentence.getSnapshot().sentence).toEqual([9, 8]); expect(sentence.getSnapshot().available.at(-1)).toBe(2);
    sentence.reset(); expect(sentence.getSnapshot().sentence).toEqual([]); expect(sentence.getSnapshot().available).toHaveLength(9);
  });
  it.each(['edit', 'language', 'reset', 'close', 'learner', 'grade', 'dispose'] as const)('invalidates pending narration on %s', async change => {
    const { sentence, player, identify } = setup(), delayed = pending();
    sentence.start(); sentence.move(9, true);
    vi.mocked(player.speak).mockReturnValueOnce(delayed.promise);
    const playing = sentence.play(); expect(sentence.getSnapshot().status).toBe('playing');
    if (change === 'edit') sentence.move(2, true);
    if (change === 'language') identify({ locale: 'ru' });
    if (change === 'reset') sentence.reset();
    if (change === 'close') { sentence.close(); sentence.start(); }
    if (change === 'learner') identify({ learner: 'other' });
    if (change === 'grade') identify({ grade: 1 });
    if (change === 'dispose') sentence.dispose();
    const snapshot = sentence.getSnapshot(); delayed.reject(new Error('late error')); await playing;
    expect(sentence.getSnapshot()).toBe(snapshot); expect(snapshot.status).toBe(''); expect(player.stop).toHaveBeenCalled();
    if (change === 'learner' || change === 'grade') expect(snapshot.sentence).toEqual([]);
  });
  it('keeps a replacement narration active after an older promise resolves and permits retry after errors', async () => {
    const { sentence, player } = setup(), first = pending(), second = pending();
    sentence.start(); await sentence.play(); expect(player.speak).not.toHaveBeenCalled();
    sentence.move(1, true);
    vi.mocked(player.speak).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const old = sentence.play(), current = sentence.play(); first.resolve('ended'); await old;
    expect(sentence.getSnapshot().status).toBe('playing'); second.resolve('error'); await current;
    expect(sentence.getSnapshot().status).toBe('audioError'); await sentence.play(); expect(sentence.getSnapshot().status).toBe('');
  });
  it('clears a closed draft after changing learners and removes subscriptions on dispose', () => {
    const { sentence, identify } = setup(), listener = vi.fn();
    sentence.start(); sentence.move(1, true); sentence.close(); identify({ learner: 'new' }); sentence.start();
    expect(sentence.getSnapshot().sentence).toEqual([]);
    const remove = sentence.subscribe(listener); remove(); sentence.move(2, true); expect(listener).not.toHaveBeenCalled();
    sentence.subscribe(listener); sentence.dispose(); listener.mockClear(); sentence.stop(); expect(listener).not.toHaveBeenCalled();
  });
});

describe('spatial matrix', () => {
  it('preserves cards after mistakes and locale changes, completes once and restarts a fresh board', () => {
    const { spatial, identify, effect } = setup(); spatial.start();
    const order = spatial.getSnapshot().order;
    expect(new Set(order).size).toBe(16); spatial.select('0_0');
    expect(spatial.place('0_0', 0, 1)).toBe(false);
    expect(spatial.getSnapshot()).toMatchObject({ selected: '0_0', status: 'wrong', placed: [] });
    expect(spatial.place('0_0', 0, 0)).toBe(true); expect(spatial.place('0_0', 0, 0)).toBe(false);
    spatial.select('1_1'); identify({ locale: 'ru' });
    expect(spatial.getSnapshot()).toMatchObject({ placed: ['0_0'], selected: '1_1' }); expect(spatial.getSnapshot().order).toBe(order);
    for (const card of spatialCards) spatial.place(card.key, card.row, card.col);
    expect(spatial.getSnapshot().status).toBe('complete'); expect(effect.mock.calls.filter(([result]) => result === 'complete')).toHaveLength(1);
    spatial.place('0_0', 0, 0); expect(effect.mock.calls.filter(([result]) => result === 'complete')).toHaveLength(1);
    const round = spatial.getSnapshot().round; spatial.reset();
    expect(spatial.getSnapshot()).toMatchObject({ placed: [], selected: null, status: '', round: round + 1 });
  });
  it('ignores foreign cards, occupied cells, inactive input and invalid coordinates', () => {
    const { spatial, effect } = setup(); spatial.start();
    spatial.place('0_0', 0, 0); effect.mockClear();
    for (const [key, row, col] of [['garbage', 0, 1], ['0_1', 0, 0], ['0_1', -1, 5]] as const) expect(spatial.place(key, row, col)).toBe(false);
    spatial.select('garbage'); expect(spatial.getSnapshot().selected).toBeNull();
    spatial.close(); spatial.select('0_1'); expect(spatial.place('0_1', 0, 1)).toBe(false); expect(effect).not.toHaveBeenCalled();
  });
  it.each(['language', 'close', 'reset', 'learner', 'grade', 'dispose'] as const)('stops recording and ignores its late result on %s', async change => {
    const { spatial, player, identify } = setup(), delayed = pending(); identify({ locale: 'ru' }); spatial.start();
    vi.mocked(player.recording).mockReturnValueOnce(delayed.promise);
    const listening = spatial.listen('0_0'); expect(spatial.getSnapshot().playing).toBe('0_0');
    if (change === 'language') identify({ locale: 'kk' });
    if (change === 'close') spatial.close();
    if (change === 'reset') spatial.reset();
    if (change === 'learner') identify({ learner: 'another' });
    if (change === 'grade') identify({ grade: 1 });
    if (change === 'dispose') spatial.dispose();
    const snapshot = spatial.getSnapshot(); delayed.resolve('error'); await listening;
    expect(spatial.getSnapshot()).toBe(snapshot); expect(snapshot.playing).toBeNull(); expect(snapshot.audioError).toBe(false);
  });
  it('plays only the existing Russian recordings and isolates concurrent listening attempts', async () => {
    const { spatial, player, identify } = setup(), first = pending(), second = pending(); spatial.start();
    await spatial.listen('0_0'); expect(player.recording).not.toHaveBeenCalled(); identify({ locale: 'ru' });
    vi.mocked(player.recording).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const old = spatial.listen('0_0'), current = spatial.listen('header_col_1');
    expect(player.recording).toHaveBeenLastCalledWith('sounds/ru/spatial/ball-behind-bucket.mp3');
    first.reject(new Error('late')); await old; expect(spatial.getSnapshot().playing).toBe('header_col_1');
    second.resolve('error'); await current; expect(spatial.getSnapshot().audioError).toBe(true);
    await spatial.listen('header_col_1'); expect(spatial.getSnapshot().audioError).toBe(false);
  });
});
