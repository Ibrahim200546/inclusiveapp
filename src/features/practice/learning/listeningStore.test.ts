import { describe, expect, it, vi } from 'vitest';
import { createListeningStore, type SoundLibrary } from './listeningStore';
import type { ListeningItem } from './content';

function deferred() {
  let resolve!: () => void, reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function setup() {
  const plays: ReturnType<typeof deferred>[] = [], samples: ReturnType<typeof deferred>[] = [];
  const player = {
    play: vi.fn(() => { const pending = deferred(); plays.push(pending); return pending.promise; }),
    events: vi.fn(() => { const pending = deferred(); samples.push(pending); return pending.promise; }), stop: vi.fn(),
  };
  const items: ListeningItem[] = ['drum', 'piano'].map(id => ({ id, answer: id, audio: id + '.mp3', kk: id, ru: id }));
  const sounds: SoundLibrary = {
    categories: { instruments: { labels: ['Аспаптар', 'Инструменты'], icon: '🥁', screen: 'g0Task3' } },
    stages: () => ['start', 'extended'], profile: (_grade, category, stage = 'start') => ({ category, stage, items }), options: items => items,
  };
  const save = vi.fn(() => true), reward = vi.fn();
  const store = createListeningStore({ player, sounds, getLocale: () => 'kk', getLearner: () => 'learner', save, reward });
  const finish = async () => { plays.at(-1)!.resolve(); await Promise.resolve(); };
  return { store, player, plays, samples, save, reward, finish };
}

describe('React listening sessions', () => {
  it('requires a completed recording, retains wrong questions, debounces and saves one completed cycle', async () => {
    const { store, save, reward, finish } = setup();
    store.start({ host: 'learningPracticeScreen', mode: 'count', grade: 1 });
    const target = store.getSnapshot()!.target!;
    store.answer(target); store.next();
    expect(store.getSnapshot()!.state.index).toBe(0);
    expect(store.getSnapshot()!.state.results).toEqual([]);
    await finish();
    const wrong = store.getSnapshot()!.choices.find(choice => choice.value !== target)!.value;
    store.answer(wrong, 1000); store.answer(target, 1100);
    expect(store.getSnapshot()!.feedback).toBe('wrong');
    expect(store.getSnapshot()!.target).toBe(target);
    store.answer(target, 1400); store.answer(target, 1900);
    store.next();
    while (!store.getSnapshot()!.state.complete) {
      await finish(); store.answer(store.getSnapshot()!.target!); store.next();
    }
    expect(save).toHaveBeenCalledExactlyOnceWith('learner', 1, 'listening', 'count', expect.objectContaining({ completed: 3, attempts: 4 }));
    expect(reward).toHaveBeenCalledTimes(1);
    store.next(); await store.listen(); store.setLocale('ru');
    expect(reward).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('invalidates late playback on exit, restart and language changes without changing the question or choices', async () => {
    const { store, plays, player, finish, save } = setup();
    store.start({ host: 'learningPracticeScreen', mode: 'numbers', grade: 0 });
    const old = plays[0], initial = store.getSnapshot()!;
    store.setLocale('ru'); old.resolve(); await Promise.resolve();
    expect(store.getSnapshot()).toMatchObject({ ready: false, playing: false, target: initial.target, choices: initial.choices, locale: 'ru' });
    void store.listen(); expect(player.play).toHaveBeenLastCalledWith(expect.objectContaining({ answer: initial.target }), 'ru');
    await finish(); expect(store.getSnapshot()!.ready).toBe(true);
    void store.listen(); const stale = plays.at(-1)!;
    store.close(); store.start({ host: 'learningPracticeScreen', mode: 'pitch', grade: 0 });
    stale.reject(new Error('late failure')); await Promise.resolve();
    expect(store.getSnapshot()).toMatchObject({ ready: false, playing: true, feedback: 'listening' });
    const abandoned = plays.at(-1)!;
    store.restart(); abandoned.resolve(); await Promise.resolve();
    expect(store.getSnapshot()!.ready).toBe(false);
    store.close(); await finish();
    expect(store.getSnapshot()).toBeNull(); expect(save).not.toHaveBeenCalled();
  });

  it('keeps answers locked after a failed or interrupted replay until retry succeeds', async () => {
    const { store, plays, finish } = setup();
    store.start({ host: 'learningPracticeScreen', mode: 'numbers', grade: 0 });
    await finish(); const target = store.getSnapshot()!.target!;
    const retry = store.listen(); plays.at(-1)!.reject(new Error('unavailable')); await retry;
    store.answer(target);
    expect(store.getSnapshot()).toMatchObject({ feedback: 'error', ready: false, state: { answered: false } });
    void store.listen(); await finish(); store.stop(); store.answer(target);
    expect(store.getSnapshot()).toMatchObject({ ready: false, playing: false, state: { answered: false } });
    void store.listen(); await finish(); store.answer(target);
    expect(store.getSnapshot()!.state.answered).toBe(true);
  });

  it('compares a rhythm without replacing or crediting the target and cancels samples on exit', async () => {
    const { store, samples, finish, save } = setup();
    store.start({ host: 'learningPracticeScreen', mode: 'rhythm', grade: 0 });
    await store.compare('two'); expect(samples).toHaveLength(0);
    await finish(); const target = store.getSnapshot()!.target!;
    const comparing = store.compare('two');
    store.answer(target); expect(store.getSnapshot()!.state.answered).toBe(false);
    samples[0].resolve(); await comparing;
    expect(store.getSnapshot()).toMatchObject({ target, ready: true, playing: false, feedback: 'compare' });
    void store.compare('one'); store.close(); samples[1].resolve(); await Promise.resolve();
    expect(store.getSnapshot()).toBeNull(); expect(save).not.toHaveBeenCalled();
  });

  it('records recognition per correct answer with the class and stage, without duplicate rewards', async () => {
    const { store, save, reward, finish } = setup();
    store.start({ host: 'g0Task3', mode: 'recognition', grade: 2, category: 'instruments' });
    await finish(); store.answer(store.getSnapshot()!.target!); store.answer(store.getSnapshot()!.target!);
    expect(save).toHaveBeenCalledExactlyOnceWith('learner', 2, 'recognition', 'instruments:start', expect.objectContaining({ stage: 'start', completed: 1 }));
    expect(reward).toHaveBeenCalledTimes(1);
    store.setStage('extended');
    expect(store.getSnapshot()).toMatchObject({ profile: { stage: 'extended' }, state: { index: 0, attempts: 0 }, ready: false });
    await finish(); store.answer(store.getSnapshot()!.target!);
    expect(save).toHaveBeenLastCalledWith('learner', 2, 'recognition', 'instruments:extended', expect.objectContaining({ completed: 1 }));
  });

  it('retains results when local storage is unavailable and disposes subscriptions and pending playback', async () => {
    const { store, save, finish, player } = setup(); save.mockReturnValue(false);
    const listener = vi.fn(), release = store.subscribe(listener);
    store.start({ host: 'g0Task5', mode: 'dance', grade: 0 });
    for (let i = 0; i < 2; i++) { await finish(); store.answer(store.getSnapshot()!.target!); store.next(); }
    expect(store.getSnapshot()).toMatchObject({ persisted: false, state: { complete: true, attempts: 2 } });
    release(); listener.mockClear(); store.restart();
    expect(listener).not.toHaveBeenCalled();
    store.dispose(); await finish();
    expect(store.getSnapshot()).toBeNull(); expect(player.stop).toHaveBeenCalled();
  });
});
