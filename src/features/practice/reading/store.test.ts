import { afterEach, describe, expect, it, vi } from 'vitest';
import { createReadingStore, type ReadingIdentity, type ReadingRequest } from './store';
import type { ReadingPlayback } from './playback';

function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function setup(mode: ReadingRequest['mode'] = 'syllables') {
  let owner: ReadingIdentity = { learner: 'first', grade: 0, locale: 'kk' };
  const player = { play: vi.fn().mockResolvedValue(true), paths: vi.fn().mockResolvedValue('ended'), stop: vi.fn() } satisfies ReadingPlayback;
  const generate = vi.fn().mockResolvedValue([['Бала'], ['Бала', 'ойнады']]);
  const save = vi.fn().mockReturnValue(true);
  const store = createReadingStore({ player, generate, save, identity: () => owner });
  const request: ReadingRequest = { mode, host: 'reading', context: 'voice', returnScreen: 'voice' };
  store.start(request);
  return { store, player, save, generate, request, setOwner(next: Partial<ReadingIdentity>) { owner = { ...owner, ...next }; store.syncIdentity(); } };
}
afterEach(() => vi.useRealTimers());

describe('reading session ownership', () => {
  it('records listening only after completion and records teacher confirmation once', async () => {
    const { store, player, save } = setup();
    await store.preset('ТА'); store.confirm();
    expect(store.getSnapshot()?.progress).toBe('listenFirst'); expect(save).not.toHaveBeenCalled();
    const ended = deferred<boolean>(); player.play.mockReturnValueOnce(ended.promise);
    const playing = store.play(0); store.confirm();
    expect(save).not.toHaveBeenCalled();
    ended.resolve(true); await playing;
    expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ grade: 0, learner: 'first' }), 'voice', { listened: true, repeatedWithTeacher: false, sample: 'та' });
    store.confirm(); store.confirm();
    expect(save).toHaveBeenCalledTimes(2);
    expect(store.getSnapshot()).toMatchObject({ confirmed: true, progress: 'confirmed' });
    await store.preset('МА'); store.confirm();
    expect(save).toHaveBeenCalledTimes(2); expect(store.getSnapshot()?.progress).toBe('listenFirst');
  });

  it.each(['input', 'grade', 'locale', 'learner', 'close', 'stop'] as const)('ignores playback that finishes after %s changes', async change => {
    const { store, player, save, setOwner } = setup();
    await store.preset('ТА'); const ended = deferred<boolean>(); player.play.mockReturnValueOnce(ended.promise);
    const playing = store.play(0);
    if (change === 'input') store.setInput('МА');
    else if (change === 'grade') setOwner({ grade: 1 });
    else if (change === 'locale') setOwner({ locale: 'ru' });
    else if (change === 'learner') setOwner({ learner: 'second' });
    else store[change]();
    ended.resolve(true); await playing;
    expect(save).not.toHaveBeenCalled();
    expect(store.getSnapshot()?.playing).not.toBe(true);
    expect(store.getSnapshot()?.lastSample || '').toBe('');
  });

  it('waits for each recording and settles an interrupted gap without starting another', async () => {
    vi.useFakeTimers();
    const { store, player } = setup(); await store.preset('ТА');
    const playing = store.play(); await Promise.resolve();
    expect(player.play).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(449); expect(player.play).toHaveBeenCalledTimes(1);
    store.stop(); await playing; await vi.runAllTimersAsync();
    expect(player.play).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(0);
  });

  it('never marks a failed recording as heard and allows retry', async () => {
    const { store, player, save } = setup(); await store.preset('ТА'); player.play.mockResolvedValueOnce(false);
    await store.play(0); store.confirm();
    expect(store.getSnapshot()).toMatchObject({ status: 'audioError', progress: 'listenFirst' }); expect(save).not.toHaveBeenCalled();
    await store.play(0); store.confirm(); expect(store.getSnapshot()?.confirmed).toBe(true);
  });

  it('writes the selected class/context and permits retry when storage is unavailable', async () => {
    const { store, save, setOwner, request } = setup();
    setOwner({ grade: 1 }); store.start({ ...request, context: 'breathing' }); await store.preset('ПА'); await store.play(0);
    save.mockReturnValueOnce(false); store.confirm(); expect(store.getSnapshot()?.progress).toBe('unsaved');
    store.confirm(); expect(store.getSnapshot()?.progress).toBe('confirmed');
    expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ grade: 1 }), 'breathing', expect.objectContaining({ sample: 'па', repeatedWithTeacher: true }));
  });

  it('retains drafts for returning to a screen but clears them on account changes while closed', async () => {
    const { store, request, setOwner } = setup('words'); await store.preset('Балалар'); store.close();
    store.start(request); expect(store.getSnapshot()?.rows).toEqual([['Ба'], ['Ба', 'ла'], ['Ба', 'ла', 'лар']]);
    store.close(); setOwner({ learner: 'second' }); store.start(request);
    expect(store.getSnapshot()).toMatchObject({ input: '', rows: [], lastSample: '' });
  });
});

describe('sentence generation lifetime', () => {
  it('does not request AI for a full sentence and supports spaces while typing', async () => {
    const { store, generate } = setup('sentences');
    store.setInput('Бала '); expect(store.getSnapshot()?.input).toBe('Бала ');
    store.setInput('Бала кітап оқыды'); await store.generate();
    expect(generate).not.toHaveBeenCalled();
    expect(store.getSnapshot()?.rows).toEqual([['Бала'], ['Бала', 'кітап'], ['Бала', 'кітап', 'оқыды']]);
  });
  it.each(['input', 'locale', 'grade', 'close'] as const)('aborts and ignores a late AI reply after %s changes', async change => {
    const { store, generate, setOwner } = setup('sentences'); const pending = deferred<string[][]>(); generate.mockReturnValueOnce(pending.promise);
    const loading = store.preset('Бала'); const signal = generate.mock.calls[0][2] as AbortSignal;
    if (change === 'input') { store.setInput('Қыз кітап оқыды'); await store.generate(); }
    else if (change === 'locale') setOwner({ locale: 'ru' });
    else if (change === 'grade') setOwner({ grade: 1 });
    else store.close();
    const before = store.getSnapshot(); expect(signal.aborted).toBe(true);
    pending.resolve([['Кешіккен', 'жауап']]); await loading;
    expect(store.getSnapshot()).toEqual(before);
  });
  it('releases a request after timeout and allows retry without a stale reply overwriting it', async () => {
    vi.useFakeTimers(); const { store, generate } = setup('sentences'); const late = deferred<string[][]>(); generate.mockReturnValueOnce(late.promise);
    const loading = store.preset('Бала'); await vi.advanceTimersByTimeAsync(30_000);
    expect(store.getSnapshot()).toMatchObject({ loading: false, status: 'generationError' });
    expect((generate.mock.calls[0][2] as AbortSignal).aborted).toBe(true);
    await store.generate(); const before = store.getSnapshot();
    late.resolve([['Кешіккен']]); await loading;
    expect(store.getSnapshot()).toEqual(before); expect(vi.getTimerCount()).toBe(0);
  });
});
