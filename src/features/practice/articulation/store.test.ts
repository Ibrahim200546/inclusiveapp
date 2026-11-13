import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { existsSync } from 'node:fs';
import type { CardIdentity } from '../cards/content';
import type { PlaybackResult } from '../curriculum/playback';
import { analyzeRecording, extractFrame } from './analysis';
import { firstToSecond, firstToThird, mouthPosition, point, recordingPath, rings, secondToThird, visibleLetters } from './content';
import type { ArticulationRecorder, CaptureResult } from './recorder';
import { createArticulationStore } from './store';

const samples = (energy = 50, centroid = 60) => Array.from({ length: 20 }, () => ({ energy, centroid }));
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; }
function setup() {
  let identity: CardIdentity = { locale: 'kk', grade: 0, learner: null };
  const player = { stop: vi.fn(), recording: vi.fn().mockResolvedValue('ended' as PlaybackResult) };
  const recorder: ArticulationRecorder = { start: vi.fn().mockResolvedValue('started'), finish: vi.fn(() => samples()), stop: vi.fn() };
  const reward = vi.fn(), error = vi.fn(), prepareRecording = vi.fn();
  const store = createArticulationStore({ player, recorder, identity: () => identity, prepareRecording, reward, error });
  store.start('grade2Menu');
  return { store, player, recorder, reward, error, prepareRecording,
    identify(changes: Partial<CardIdentity>) { identity = { ...identity, ...changes }; store.syncIdentity(); },
    async lesson() { store.center(); store.select(1, 'А'); store.select(1, 'А'); await Promise.resolve(); },
  };
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('preserves the three rings, connections, positions, mouth sprites and all real letter recordings', () => {
  expect([rings[1].length, rings[2].length, rings[3].length]).toEqual([18, 12, 20]);
  for (const [source, destination, mapping] of [[1, 2, firstToSecond], [1, 3, firstToThird], [2, 3, secondToThird]] as const) {
    for (const [letter, targets] of Object.entries(mapping)) {
      expect(rings[source]).toContain(letter); targets.forEach(target => expect(rings[destination]).toContain(target));
    }
  }
  for (const ring of [1, 2, 3] as const) for (const letter of rings[ring]) {
    expect(existsSync(`public${recordingPath(letter)}`), letter).toBe(true);
    expect(point(ring, letter).x).toBeGreaterThan(0); expect(point(ring, letter).y).toBeLessThan(920);
    expect(mouthPosition(letter).index).toBeGreaterThanOrEqual(1); expect(mouthPosition(letter).index).toBeLessThanOrEqual(9);
  }
  expect(recordingPath('Р’')).toBe('/original/sounds/letters/letter_р.mp3');
  expect(existsSync('public/original/assets/articulation/mouth-grid.svg')).toBe(true);
});
it('retains spectral thresholds while distinguishing silence, low volume, a match and unprofiled sounds', () => {
  expect(extractFrame(new Uint8Array([0, 10, 20]))).toEqual({ energy: 10, centroid: 5 / 3 });
  expect(extractFrame(new Uint8Array())).toEqual({ energy: 0, centroid: 0 });
  expect(analyzeRecording('А', samples(0)).kind).toBe('silent');
  expect(analyzeRecording('А', samples().slice(0, 4)).kind).toBe('silent');
  expect(analyzeRecording('А', samples(30)).kind).toBe('quiet');
  expect(analyzeRecording('А', samples(50, 95))).toMatchObject({ kind: 'matched', success: true });
  expect(analyzeRecording('А', samples(50, 96))).toMatchObject({ kind: 'retry', success: false });
  expect(analyzeRecording('Қ', samples())).toMatchObject({ kind: 'heard', success: true });
  expect(analyzeRecording("Р'", samples(50, 80))).toMatchObject({ kind: 'matched', success: true });
  expect(analyzeRecording('А', samples(NaN)).kind).toBe('silent');
});
it('reveals connected letters only, opens a lesson on a repeated selection, and resets dependent rings', () => {
  const { store, player } = setup();
  store.select(1, 'К'); expect(player.recording).not.toHaveBeenCalled(); store.center();
  store.select(1, 'К'); expect(store.getSnapshot().lesson).toBeNull();
  expect(visibleLetters(true, 'К', null)).toMatchObject({ 2: ['Қ', 'Г', 'Х'], 3: ['Ғ', "К'"] });
  store.select(2, 'Х'); expect(visibleLetters(true, 'К', 'Х')[3]).toEqual(['Ғ', "К'", 'Һ', "Х'"]);
  store.select(3, 'Щ'); expect(store.getSnapshot().third).toBeNull();
  store.select(3, "Х'"); store.select(3, "Х'"); expect(store.getSnapshot().lesson).toBe("Х'");
  store.closeLesson(); store.select(1, 'Ш'); expect(store.getSnapshot()).toMatchObject({ first: 'Ш', second: null, third: null, lesson: null });
  store.select(2, 'Ж'); expect(visibleLetters(true, 'Ш', 'Ж')[3]).toEqual(['Ж', 'Ч', 'Щ']);
  store.center(); expect(store.getSnapshot()).toMatchObject({ open: true, first: null, second: null, third: null });
  store.collapse(); expect(store.getSnapshot().open).toBe(false);
});
it('completes one timed attempt, awards once, and does not let its old timer finish the next attempt', async () => {
  const { store, recorder, reward, prepareRecording } = setup(); await setupLesson();
  async function setupLesson() { store.center(); store.select(1, 'А'); store.select(1, 'А'); await Promise.resolve(); }
  await store.record(); expect(prepareRecording).toHaveBeenCalledOnce(); expect(store.getSnapshot().phase).toBe('recording');
  await vi.advanceTimersByTimeAsync(1000); store.finishRecording(); store.finishRecording(); expect(reward).toHaveBeenCalledOnce();
  await store.record(); await vi.advanceTimersByTimeAsync(2500); expect(recorder.finish).toHaveBeenCalledOnce();
  await vi.advanceTimersByTimeAsync(1000); expect(recorder.finish).toHaveBeenCalledTimes(2); expect(reward).toHaveBeenCalledTimes(2);
  expect(store.getSnapshot()).toMatchObject({ phase: 'done', result: { kind: 'matched', success: true } }); expect(vi.getTimerCount()).toBe(0);
});
it.each(['close', 'navigate', 'locale', 'grade', 'learner', 'hidden', 'dispose'] as const)('cancels a pending permission request on %s and ignores its late frames and completion', async reason => {
  const { store, recorder, identify, lesson, reward } = setup(); await lesson(); const start = deferred<CaptureResult>();
  vi.mocked(recorder.start).mockReturnValueOnce(start.promise); const pending = store.record();
  const [levels, interrupted] = vi.mocked(recorder.start).mock.calls[0];
  if (reason === 'close') store.closeLesson();
  if (reason === 'navigate') { store.close(); store.start('grade3Menu'); }
  if (reason === 'locale') identify({ locale: 'ru' });
  if (reason === 'grade') identify({ grade: 2 });
  if (reason === 'learner') identify({ learner: 'someone-else' });
  if (reason === 'hidden') store.cancelWork();
  if (reason === 'dispose') store.dispose();
  const snapshot = store.getSnapshot(); start.resolve('started'); levels([1]); interrupted(); await pending; await vi.runAllTimersAsync();
  expect(store.getSnapshot()).toBe(snapshot); expect(reward).not.toHaveBeenCalled(); expect(recorder.stop).toHaveBeenCalled();
});
it('rejects a late recording sample when an older request is replaced', async () => {
  const { store, player } = setup(), first = deferred<PlaybackResult>(), second = deferred<PlaybackResult>();
  player.recording.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  store.center(); store.select(1, 'А'); store.select(1, 'О'); first.resolve('error'); await Promise.resolve();
  expect(store.getSnapshot()).toMatchObject({ phase: 'playing', sample: 'О' });
  second.resolve('ended'); await Promise.resolve(); expect(store.getSnapshot()).toMatchObject({ phase: 'idle', sample: null });
});
it('keeps errors retryable, cancels capture before playing a sample and releases the auto-stop timer on disconnection', async () => {
  const { store, recorder, player, lesson, reward, error } = setup(); await lesson();
  vi.mocked(recorder.start).mockResolvedValueOnce('denied'); await store.record(); expect(store.getSnapshot().phase).toBe('denied');
  await store.record(); const [, interrupted] = vi.mocked(recorder.start).mock.calls[1];
  interrupted(); expect(store.getSnapshot().phase).toBe('unavailable'); expect(vi.getTimerCount()).toBe(0);
  await store.record(); player.recording.mockResolvedValueOnce('error'); await store.play();
  expect(store.getSnapshot().phase).toBe('audioError'); expect(vi.getTimerCount()).toBe(0);
  await store.play(); expect(store.getSnapshot().phase).toBe('idle');
  vi.mocked(recorder.finish).mockReturnValueOnce([]); await store.record(); store.finishRecording();
  expect(error).toHaveBeenCalledOnce(); expect(reward).not.toHaveBeenCalled();
});
it('cancels permission with a second press and preserves a translated result without awarding twice', async () => {
  const { store, recorder, lesson, identify, reward } = setup(); await lesson(); const pending = deferred<CaptureResult>();
  vi.mocked(recorder.start).mockReturnValueOnce(pending.promise); const first = store.record(); await store.record();
  pending.resolve('started'); await first; expect(store.getSnapshot().phase).toBe('interrupted'); expect(vi.getTimerCount()).toBe(0);
  await store.record(); store.finishRecording(); identify({ locale: 'ru' });
  expect(store.getSnapshot()).toMatchObject({ lesson: 'А', result: { success: true }, locale: 'ru' }); expect(reward).toHaveBeenCalledOnce();
  identify({ learner: 'new' }); expect(store.getSnapshot()).toMatchObject({ lesson: null, open: false, first: null, result: null });
});
