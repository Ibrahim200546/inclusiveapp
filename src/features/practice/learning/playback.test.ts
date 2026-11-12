import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AudioWindow } from '../audio/types';
import { createListeningPlayback } from './playback';

function deferred() {
  let resolve!: () => void, reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function setup() {
  const audios: FakeAudio[] = [], contexts: FakeContext[] = [];
  class FakeAudio extends EventTarget {
    currentTime = 0; ended = false; paused = true;
    pending = deferred();
    play = vi.fn(() => { this.paused = false; return this.pending.promise; });
    pause = vi.fn(() => { this.paused = true; this.dispatchEvent(new Event('pause')); });
    constructor(public src: string) { super(); audios.push(this); }
  }
  class FakeContext {
    currentTime = 0; destination = {}; pending = deferred();
    resume = vi.fn(() => this.pending.promise);
    close = vi.fn(() => Promise.resolve());
    createOscillator = vi.fn(() => ({ frequency: { value: 0 }, connect: (node: unknown) => node, start: vi.fn(), stop: vi.fn(), disconnect: vi.fn() }));
    createGain = vi.fn(() => ({ gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() }));
    constructor() { contexts.push(this); }
  }
  const app = { Audio: FakeAudio, AudioContext: FakeContext, setTimeout: window.setTimeout.bind(window), clearTimeout: window.clearTimeout.bind(window) } as unknown as AudioWindow;
  return { player: createListeningPlayback(app), audios, contexts };
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('listening playback lifetime', () => {
  it('waits for ended, uses the selected language and releases its timeout', async () => {
    const { player, audios } = setup(), done = vi.fn();
    const playing = player.play({ id: 'one', answer: 1, audio: 'kk.mp3', audioRu: 'ru.mp3' }, 'ru').then(done);
    expect(audios[0].src).toBe('ru.mp3');
    audios[0].pending.resolve(); await Promise.resolve(); expect(done).not.toHaveBeenCalled();
    audios[0].ended = true; audios[0].dispatchEvent(new Event('ended')); await playing;
    expect(done).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(0);
    player.stop(); expect(audios[0].pause).not.toHaveBeenCalled();
  });
  it('settles cancellation immediately and stops a late play without affecting a newer recording', async () => {
    const { player, audios } = setup();
    const first = player.play({ id: 'one', answer: 1, audio: 'one.mp3' }, 'kk');
    const cancelled = expect(first).rejects.toThrow('Cancelled');
    const second = player.play({ id: 'two', answer: 2, audio: 'two.mp3' }, 'kk');
    await cancelled;
    audios[0].paused = false; audios[0].pending.resolve(); await Promise.resolve();
    expect(audios[0].paused).toBe(true); expect(audios[1].pause).not.toHaveBeenCalled();
    audios[0].dispatchEvent(new Event('ended'));
    const interrupted = expect(second).rejects.toThrow('Audio interrupted');
    audios[1].pause(); await interrupted; expect(vi.getTimerCount()).toBe(0);
  });
  it('rejects failed and timed out media and removes listeners before stopping', async () => {
    const { player, audios } = setup();
    const failed = player.play({ id: 'one', answer: 1, audio: 'one.mp3' }, 'kk');
    const error = expect(failed).rejects.toThrow('Audio unavailable');
    audios[0].dispatchEvent(new Event('error')); await error;
    const pending = player.play({ id: 'two', answer: 2, audio: 'two.mp3' }, 'kk');
    const timeout = expect(pending).rejects.toThrow('Audio timeout');
    await vi.advanceTimersByTimeAsync(60_000); await timeout;
    expect(audios[1].paused).toBe(true); expect(vi.getTimerCount()).toBe(0);
  });
  it('cancels pending Web Audio resume and closes completed oscillator contexts', async () => {
    const { player, contexts } = setup(), events = [{ start: 0, duration: .8, frequency: 440 }];
    const pending = player.events(events), cancelled = expect(pending).rejects.toThrow('Cancelled');
    player.stop(); await cancelled;
    contexts[0].pending.resolve(); await Promise.resolve();
    expect(contexts[0].createOscillator).not.toHaveBeenCalled(); expect(contexts[0].close).toHaveBeenCalledTimes(1);
    const playing = player.events(events); contexts[1].pending.resolve(); await Promise.resolve();
    expect(contexts[1].createOscillator).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(900); await playing;
    expect(contexts[1].close).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(0);
  });
});
