import { describe, expect, it, vi } from 'vitest';
import type { CardIdentity } from '../cards/content';
import type { PlaybackResult } from '../curriculum/playback';
import { assess } from './assessment';
import { createTrainStore } from './store';
import type { SessionOptions, TrainSession } from './types';

function setup() {
  let identity: CardIdentity = { locale: 'kk', grade: 0, learner: null }, count = 0;
  const callbacks: SessionOptions[] = [], sessions: TrainSession[] = [], frames = new Map<number, FrameRequestCallback>();
  const alphabet = { letter: vi.fn<() => Promise<PlaybackResult>>().mockResolvedValue('ended'), stop: vi.fn() };
  const reward = vi.fn(), prepareCapture = vi.fn();
  const createSession = vi.fn((options: SessionOptions): TrainSession => {
    callbacks.push(options);
    const session = { start: vi.fn(async () => { options.onState?.('loading'); return true; }), stop: vi.fn(), dispose: vi.fn(), state: 'idle' as const };
    sessions.push(session); return session;
  });
  const store = createTrainStore({ identity: () => identity, createSession, alphabet, reward, prepareCapture,
    animation: { request(callback) { frames.set(++count, callback); return count; }, cancel: id => { frames.delete(id); }, reducedMotion: () => false },
  });
  return { store, callbacks, sessions, frames, alphabet, reward, prepareCapture, createSession,
    change(next: Partial<CardIdentity>) { identity = { ...identity, ...next }; store.syncIdentity(); },
    tick(now: number) { const active = [...frames.values()]; frames.clear(); active.forEach(callback => callback(now)); },
    async begin() { store.open(); await store.select('А'); await store.start(); },
    complete(index = callbacks.length - 1) { callbacks[index].onResult?.(assess('А', 'long', [{ phone: 'a' }], 2000)); callbacks[index].onState?.('complete'); },
  };
}

describe('React train exercise state', () => {
  it('chooses eight supported letters, previews selection and starts with the selected duration', async () => {
    const h = setup(); h.store.open(); h.store.center();
    expect(h.store.getSnapshot().letters).toHaveLength(8); expect(new Set(h.store.getSnapshot().letters).size).toBe(8);
    await h.store.select('Ә'); expect(h.alphabet.letter).toHaveBeenCalledWith('Ә');
    expect(h.store.getSnapshot()).toMatchObject({ expanded: false, selected: 'Ә', preview: 'ended' });
    h.store.setMode('short'); await h.store.start();
    expect(h.prepareCapture).toHaveBeenCalledOnce(); expect(h.callbacks[0]).toMatchObject({ letter: 'Ә', mode: 'short' });
    await h.store.start(); expect(h.sessions).toHaveLength(1);
  });
  it('shows preview failures and ignores a late preview after another selection', async () => {
    const h = setup(); h.store.open(); let done!: (result: PlaybackResult) => void;
    h.alphabet.letter.mockImplementationOnce(() => new Promise(resolve => { done = resolve; }));
    const first = h.store.select('А'); h.alphabet.letter.mockRejectedValueOnce(new Error('decode'));
    await h.store.select('П'); done('ended'); await first;
    expect(h.store.getSnapshot()).toMatchObject({ selected: 'П', preview: 'error' });
  });
  it('does not stop its own letter sample when the audio coordinator observes playback', async () => {
    const h = setup(); h.store.open(); let done!: (value: PlaybackResult) => void;
    h.alphabet.letter.mockImplementationOnce(() => new Promise(resolve => { done = resolve; }));
    const playing = h.store.select('А'); h.store.contentStarted();
    expect(h.store.getSnapshot().preview).toBe('playing'); done('ended'); await playing;
    expect(h.store.getSnapshot().preview).toBe('ended');
  });
  it('interrupts capture without stopping a newly started alphabet recording', async () => {
    const h = setup(); await h.begin(); const stops = h.alphabet.stop.mock.calls.length;
    h.store.contentStarted(); expect(h.store.getSnapshot().status).toBe('stopped');
    expect(h.alphabet.stop).toHaveBeenCalledTimes(stops);
  });
  it('never completes from signal progress or an unconfirmed completion event', async () => {
    const h = setup(); await h.begin(); h.callbacks[0].onProgress?.({ phase: 'signal', progress: 70 }); h.callbacks[0].onState?.('complete');
    expect(h.store.getSnapshot()).toMatchObject({ progress: 70, status: 'loading' }); expect(h.frames.size).toBe(0); expect(h.reward).not.toHaveBeenCalled();
    h.callbacks[0].onResult?.(assess('А', 'long', [{ phone: 'o' }], 2000)); h.callbacks[0].onState?.('incorrect');
    expect(h.store.getSnapshot().status).toBe('incorrect'); expect(h.reward).not.toHaveBeenCalled();
  });
  it('animates a confirmed result and rewards exactly once after arrival', async () => {
    const h = setup(); await h.begin(); h.complete(); h.complete();
    expect(h.frames.size).toBe(1); expect(h.reward).not.toHaveBeenCalled();
    h.tick(0); h.tick(1200); expect(h.store.getSnapshot().progress).toBe(50); h.tick(2400);
    expect(h.store.getSnapshot()).toMatchObject({ progress: 100, status: 'complete' }); expect(h.reward).toHaveBeenCalledOnce();
    h.complete(); h.tick(9999); expect(h.reward).toHaveBeenCalledOnce();
  });
  it.each(['stop', 'close', 'locale', 'grade', 'learner', 'mode', 'audio', 'dispose'] as const)('cancels recording and ignores late model callbacks on %s', async action => {
    const h = setup(); await h.begin();
    if (action === 'locale') h.change({ locale: 'ru' });
    else if (action === 'grade') h.change({ grade: 2 });
    else if (action === 'learner') h.change({ learner: 'student-2' });
    else if (action === 'mode') h.store.setMode('short');
    else if (action === 'audio') h.store.contentStarted();
    else h.store[action]();
    const snapshot = h.store.getSnapshot(); h.complete(); h.callbacks[0].onError?.(new Error('late')); h.tick(3000);
    expect(h.store.getSnapshot()).toBe(snapshot); expect(h.reward).not.toHaveBeenCalled(); expect(h.sessions[0].dispose).toHaveBeenCalledOnce();
  });
  it('cancels arrival on exit without awarding an unseen result', async () => {
    const h = setup(); await h.begin(); h.complete(); h.tick(0); h.store.close(); h.tick(2400);
    expect(h.reward).not.toHaveBeenCalled(); expect(h.frames.size).toBe(0); expect(h.store.getSnapshot().active).toBe(false);
  });
  it('retains completed work for translation and clears selection for another learner', async () => {
    const h = setup(); await h.begin(); h.complete(); h.tick(0); h.tick(2400); h.change({ locale: 'ru' });
    expect(h.store.getSnapshot()).toMatchObject({ status: 'complete', selected: 'А', locale: 'ru' });
    h.change({ learner: 'student-2' }); expect(h.store.getSnapshot()).toMatchObject({ active: true, status: 'idle', selected: '' });
  });
  it.each([['PhonemeModelUnavailable', 'model'], ['NotAllowedError', 'denied'], ['MicrophoneTimeout', 'timeout'], ['device lost', 'microphone']])('shows a recoverable %s error', async (message, kind) => {
    const h = setup(); await h.begin(); h.callbacks[0].onError?.(Object.assign(new Error(message), { name: message.includes('Unavailable') || message === 'NotAllowedError' ? message : 'Error' }));
    expect(h.store.getSnapshot()).toMatchObject({ status: 'error', error: kind }); await h.store.start(); expect(h.sessions).toHaveLength(2);
  });
  it('stops the current session before changing letters and ignores prior callbacks during retry', async () => {
    const h = setup(); await h.begin(); h.callbacks[0].onState?.('incorrect'); await h.store.start(); h.complete(0);
    expect(h.store.getSnapshot().status).toBe('loading'); expect(h.reward).not.toHaveBeenCalled();
    h.store.stop(); h.store.expand(); expect(h.store.getSnapshot()).toMatchObject({ selected: '', expanded: true });
  });
  it('does not interrupt a session for a profile update with unchanged identity', async () => {
    const h = setup(); await h.begin(); h.change({}); expect(h.sessions[0].dispose).not.toHaveBeenCalled();
  });
  it('does not act on closed/disposed screens or invalid letters and releases listeners', async () => {
    const h = setup(), listener = vi.fn(); const unsubscribe = h.store.subscribe(listener);
    await h.store.select('А'); await h.store.start(); expect(h.sessions).toHaveLength(0);
    h.store.open(); await h.store.select('invalid'); expect(h.alphabet.letter).not.toHaveBeenCalled();
    unsubscribe(); h.store.dispose(); const calls = listener.mock.calls.length; h.store.open(); await h.store.select('А');
    expect(listener).toHaveBeenCalledTimes(calls); expect(h.alphabet.letter).not.toHaveBeenCalled();
  });
});
