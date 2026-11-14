import { describe, expect, it, vi } from 'vitest';
import type { CardIdentity } from '../cards/content';
import type { PlaybackResult } from '../curriculum/playback';
import { createVoiceModeStore } from './store';

function setup() {
  let identity: CardIdentity = { locale: 'kk', grade: 0, learner: null };
  const player = { recording: vi.fn<() => Promise<PlaybackResult>>().mockResolvedValue('ended'), stop: vi.fn() };
  const store = createVoiceModeStore({ identity: () => identity, player });
  return { store, player, change(next: Partial<CardIdentity>) { identity = { ...identity, ...next }; store.syncIdentity(); } };
}

describe('voice mode playback', () => {
  it('waits for the recording to end before inviting repetition and uses the selected mode', async () => {
    const { store, player } = setup(); let finish!: (result: PlaybackResult) => void;
    player.recording.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    store.start('sybyr'); expect(player.recording).not.toHaveBeenCalled();
    const pending = store.play('cat');
    expect(player.recording).toHaveBeenCalledWith('/original/sounds/whisper/Мяу-мяу сыбырлап.mp4');
    expect(store.getSnapshot()).toMatchObject({ selected: 'cat', status: 'playing' });
    finish('ended'); await pending;
    expect(store.getSnapshot()).toMatchObject({ selected: 'cat', status: 'finished' });
    store.start('tap'); await store.play('cat');
    expect(player.recording).toHaveBeenLastCalledWith('/original/sounds/loud/Мяу-мяу дауыстап.mp4');
  });

  it('replaces the previous card and ignores its late result', async () => {
    const { store, player } = setup(); let finish!: (result: PlaybackResult) => void;
    player.recording.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    store.start('zhay'); const pending = store.play('bear'), stops = player.stop.mock.calls.length;
    await store.play('frog');
    expect(player.stop).toHaveBeenCalledTimes(stops + 1);
    expect(player.recording).toHaveBeenLastCalledWith('/original/sounds/normal/Бак-бак жай.mp4');
    const current = store.getSnapshot(); finish('error'); await pending;
    expect(store.getSnapshot()).toBe(current);
  });

  it.each(['error', 'interrupted', 'cancelled'] as PlaybackResult[])('allows replay after %s without reporting completion', async result => {
    const { store, player } = setup(); player.recording.mockResolvedValueOnce(result);
    store.start('tap'); await store.play('dog');
    expect(store.getSnapshot().status).toBe(result === 'error' ? 'error' : 'interrupted');
    await store.play('dog'); expect(store.getSnapshot().status).toBe('finished');
  });

  it('handles rejected media promises and recovers on retry', async () => {
    const { store, player } = setup(); player.recording.mockRejectedValueOnce(new Error('decoding failed'));
    store.start('tap'); await store.play('bear'); expect(store.getSnapshot().status).toBe('error');
    await store.play('bear'); expect(store.getSnapshot().status).toBe('finished');
  });

  it.each(['stop', 'leave', 'mode', 'locale', 'grade', 'learner', 'dispose'] as const)('invalidates pending playback on %s', async action => {
    const { store, player, change } = setup(); let reject!: (reason: Error) => void;
    player.recording.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; }));
    store.start('tap'); const pending = store.play('dog'), stops = player.stop.mock.calls.length;
    if (action === 'leave') store.close();
    else if (action === 'mode') store.start('zhay');
    else if (action === 'locale') change({ locale: 'ru' });
    else if (action === 'grade') change({ grade: 2 });
    else if (action === 'learner') change({ learner: 'new-learner' });
    else store[action]();
    const current = store.getSnapshot();
    expect(current.status).not.toBe('playing'); expect(player.stop.mock.calls.length).toBeGreaterThan(stops);
    reject(new Error('late failure')); await pending; expect(store.getSnapshot()).toBe(current);
  });

  it('keeps the chosen card on language change and clears it for a new learner', async () => {
    const { store, change } = setup(); store.start('zhay'); await store.play('cat');
    change({ locale: 'ru' }); expect(store.getSnapshot()).toMatchObject({ locale: 'ru', mode: 'zhay', selected: 'cat', status: 'finished' });
    change({ learner: 'student' }); expect(store.getSnapshot()).toMatchObject({ mode: 'zhay', selected: null, status: 'idle' });
  });

  it('does not cancel playback for an unrelated profile update', async () => {
    const { store, player, change } = setup(); let finish!: (result: PlaybackResult) => void;
    player.recording.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    store.start('tap'); const pending = store.play('bear'), stops = player.stop.mock.calls.length;
    change({}); expect(player.stop).toHaveBeenCalledTimes(stops); expect(store.getSnapshot().status).toBe('playing');
    finish('ended'); await pending;
  });

  it('does not act on a closed or disposed exercise and releases subscribers', async () => {
    const { store, player } = setup(); const listener = vi.fn(), release = store.subscribe(listener);
    await store.play('bear'); store.start('tap'); expect(listener).toHaveBeenCalledOnce();
    release(); store.close(); await store.play('bear');
    store.dispose(); store.start('tap'); store.syncIdentity(); store.stop(); store.close(); await store.play('dog');
    expect(listener).toHaveBeenCalledOnce(); expect(player.recording).not.toHaveBeenCalled(); expect(store.getSnapshot().mode).toBeNull();
  });
});
