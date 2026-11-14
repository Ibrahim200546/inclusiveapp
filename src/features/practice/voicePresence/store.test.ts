import { describe, expect, it, vi } from 'vitest';
import type { CardIdentity } from '../cards/content';
import type { PresencePlayer, TeacherRecorder, TeacherRecordingResult, VideoPlayResult } from './types';
import { createPresenceStore } from './store';

function deferred<T>() { let resolve!: (value: T) => void, reject!: (error: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function setup() {
  let identity: CardIdentity = { locale: 'ru', grade: 1, learner: null };
  const player = { load: vi.fn<PresencePlayer['load']>().mockResolvedValue('ready'), play: vi.fn<PresencePlayer['play']>().mockResolvedValue({ kind: 'ended', signal: true }), stop: vi.fn(), clear: vi.fn() };
  const recorder = { available: () => true, start: vi.fn<TeacherRecorder['start']>().mockResolvedValue({ kind: 'failed' }), finish: vi.fn(), cancel: vi.fn() };
  const save = vi.fn().mockReturnValue(true), prepareCapture = vi.fn();
  const store = createPresenceStore({ identity: () => identity, player, recorder, prepareCapture, save, random: () => 0 });
  const blob = new Blob(['local-video']);
  async function questions() {
    store.start(); await store.loadSource(blob); await store.play(); store.next();
    await store.play(); store.next(); await store.play(); store.next();
  }
  return { store, player, recorder, save, blob, prepareCapture, questions,
    change(next: Partial<CardIdentity>) { identity = { ...identity, ...next }; store.syncIdentity(); } };
}

describe('voice presence learning state', () => {
  it('requires preview, both examples and full question playback before accepting answers', async () => {
    const h = setup(); h.store.start(); await h.store.loadSource(h.blob);
    h.store.next(); h.store.answer(true); expect(h.store.getSnapshot().phase).toBe('preview');
    await h.store.play(); expect(h.player.play).toHaveBeenLastCalledWith(true, true); h.store.next();
    h.store.next(); expect(h.store.getSnapshot()).toMatchObject({ phase: 'example', index: 0 });
    await h.store.play(); expect(h.player.play).toHaveBeenLastCalledWith(true, false); h.store.next();
    await h.store.play(); expect(h.player.play).toHaveBeenLastCalledWith(false, false); h.store.next();
    h.store.answer(true); expect(h.store.getSnapshot().attempts).toEqual([0, 0]);
    const pending = deferred<VideoPlayResult>(); h.player.play.mockReturnValueOnce(pending.promise);
    const playing = h.store.play(); h.store.answer(true); h.store.next();
    expect(h.store.getSnapshot()).toMatchObject({ phase: 'question', index: 0, attempts: [0, 0] });
    pending.resolve({ kind: 'ended', signal: false }); await playing; h.store.answer(true);
    expect(h.store.getSnapshot()).toMatchObject({ answered: true, attempts: [1, 0], message: 'right' });
  });
  it('keeps the same question on a mistake and saves exactly once after both correct answers', async () => {
    const h = setup(); await h.questions(); await h.store.play(); h.store.answer(false); h.store.answer(true); h.store.next();
    expect(h.store.getSnapshot()).toMatchObject({ index: 0, watched: false, attempts: [1, 0], message: 'wrong' });
    await h.store.play(); h.store.answer(true); h.store.answer(true); h.store.next();
    await h.store.play(); h.store.answer(false); h.store.answer(false); h.store.saveResult();
    expect(h.store.getSnapshot()).toMatchObject({ phase: 'complete', saved: true, attempts: [2, 1] });
    expect(h.save).toHaveBeenCalledOnce(); expect(h.save).toHaveBeenCalledWith({ locale: 'ru', grade: 1, learner: null },
      { completed: 2, attempts: 3, results: [{ id: 'voiced', attempts: 2 }, { id: 'silent', attempts: 1 }] });
    h.store.next(); expect(h.store.getSnapshot()).toMatchObject({ phase: 'question', watched: false, attempts: [0, 0], saved: null, ready: true });
  });
  it.each(['noVideo', 'unsupported', 'cancelled'] as const)('does not offer assessment for %s input', async result => {
    const h = setup(); h.player.load.mockResolvedValueOnce(result); h.store.start(); await h.store.loadSource(h.blob);
    await h.store.play(); h.store.next(); expect(h.store.getSnapshot()).toMatchObject({ phase: 'setup', ready: false, watched: false });
    expect(h.player.play).not.toHaveBeenCalled(); expect(h.save).not.toHaveBeenCalled();
  });
  it('rejects a silent preview and permits a retry with an audible signal', async () => {
    const h = setup(); h.player.play.mockResolvedValueOnce({ kind: 'ended', signal: false });
    h.store.start(); await h.store.loadSource(h.blob); await h.store.play(); h.store.next();
    expect(h.store.getSnapshot()).toMatchObject({ phase: 'preview', watched: false, message: 'noVoice' });
    await h.store.play(); h.store.next(); expect(h.store.getSnapshot().phase).toBe('example');
  });
  it.each(['failed', 'interrupted', 'cancelled'] as const)('does not unlock a question after %s playback', async kind => {
    const h = setup(); await h.questions(); h.player.play.mockResolvedValueOnce({ kind });
    await h.store.play(); h.store.answer(true);
    expect(h.store.getSnapshot()).toMatchObject({ watched: false, attempts: [0, 0], answered: false });
    await h.store.play(); h.store.answer(true); expect(h.store.getSnapshot().answered).toBe(true);
  });
  for (const phase of ['load', 'play', 'record'] as const) {
    it.each(['leave', 'stop', 'language', 'grade', 'learner', 'dispose'] as const)(`ignores late ${phase} results after %s`, async action => {
      const h = setup(); h.store.start(); const pending = deferred<never>();
      let operation: Promise<void>;
      if (phase === 'load') { h.player.load.mockReturnValueOnce(pending.promise); operation = h.store.loadSource(h.blob); }
      else if (phase === 'play') { await h.store.loadSource(h.blob); h.player.play.mockReturnValueOnce(pending.promise); operation = h.store.play(); }
      else { h.recorder.start.mockReturnValueOnce(pending.promise); operation = h.store.record(); }
      if (action === 'leave') h.store.close();
      else if (action === 'language') h.change({ locale: 'kk' });
      else if (action === 'grade') h.change({ grade: 0 });
      else if (action === 'learner') h.change({ learner: 'another' });
      else h.store[action]();
      const current = h.store.getSnapshot(); pending.reject(new Error('late media failure')); await operation;
      expect(h.store.getSnapshot()).toBe(current); expect(current.playing).toBe(false); expect(current.capture).toBe('idle');
      expect(h.save).not.toHaveBeenCalled();
    });
  }
  it('keeps accepted answers on locale changes but clears private media and progress for another learner', async () => {
    const h = setup(); await h.questions(); await h.store.play(); h.store.answer(true);
    h.change({ locale: 'kk' }); expect(h.store.getSnapshot()).toMatchObject({ locale: 'kk', index: 0, answered: true, attempts: [1, 0] });
    h.change({ learner: 'new' }); expect(h.store.getSnapshot()).toMatchObject({ active: true, phase: 'setup', ready: false, attempts: [0, 0] });
    h.store.answer(false); expect(h.save).not.toHaveBeenCalled(); expect(h.player.clear).toHaveBeenCalled();
  });
  it('replaces a loading file and ignores old metadata', async () => {
    const h = setup(), old = deferred<'ready'>(); h.store.start(); h.player.load.mockReturnValueOnce(old.promise);
    const loading = h.store.loadSource(h.blob); await h.store.loadSource(new Blob(['second'])); const current = h.store.getSnapshot();
    old.resolve('ready'); await loading; expect(h.store.getSnapshot()).toBe(current);
  });
  it('loads a finished camera recording through the same teacher preview', async () => {
    const h = setup(), result = deferred<TeacherRecordingResult>(), stream = {} as MediaStream;
    h.recorder.start.mockImplementationOnce(started => { started(stream); return result.promise; });
    h.store.start(); const recording = h.store.record();
    expect(h.prepareCapture).toHaveBeenCalledOnce(); expect(h.store.getSnapshot()).toMatchObject({ capture: 'recording', camera: stream });
    h.store.finishRecording(); expect(h.recorder.finish).toHaveBeenCalledOnce(); expect(h.store.getSnapshot().capture).toBe('finishing');
    result.resolve({ kind: 'recorded', source: h.blob }); await recording;
    expect(h.player.load).toHaveBeenCalledWith(h.blob); expect(h.store.getSnapshot()).toMatchObject({ phase: 'preview', camera: null, capture: 'idle', watched: false });
  });
  it('cancels a pending permission request and ignores a late recording callback', async () => {
    const h = setup(), result = deferred<TeacherRecordingResult>(); let started!: (stream: MediaStream) => void;
    h.recorder.start.mockImplementationOnce(callback => { started = callback; return result.promise; });
    h.store.start(); const recording = h.store.record(); h.store.cancelRecording(); const current = h.store.getSnapshot();
    started({} as MediaStream); result.resolve({ kind: 'recorded', source: h.blob }); await recording;
    expect(h.store.getSnapshot()).toBe(current); expect(h.player.load).not.toHaveBeenCalled();
  });
  it('retains a completed result when storage fails and retries without counting extra answers', async () => {
    const h = setup(); h.save.mockImplementationOnce(() => { throw new Error('storage full'); });
    await h.questions(); await h.store.play(); h.store.answer(true); h.store.next(); await h.store.play(); h.store.answer(false);
    expect(h.store.getSnapshot()).toMatchObject({ phase: 'complete', saved: false, message: 'saveFailed' });
    h.store.saveResult(); h.store.saveResult(); expect(h.save).toHaveBeenCalledTimes(2);
    expect(h.store.getSnapshot()).toMatchObject({ saved: true, message: null, attempts: [1, 1] });
  });
  it('does not run closed or disposed actions and releases subscriptions', async () => {
    const h = setup(), listener = vi.fn(), release = h.store.subscribe(listener);
    await h.store.loadSource(h.blob); await h.store.record(); await h.store.play(); h.store.next(); h.store.answer(true);
    expect(listener).not.toHaveBeenCalled(); h.store.start(); release(); const calls = listener.mock.calls.length;
    h.store.dispose(); h.store.start(); h.store.close(); h.store.syncIdentity(); await h.store.loadSource(h.blob); await h.store.record(); await h.store.play();
    expect(h.player.load).not.toHaveBeenCalled(); expect(h.recorder.start).not.toHaveBeenCalled(); expect(listener).toHaveBeenCalledTimes(calls);
  });
});
