import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AudioWindow } from '../audio/types';
import { createCurriculumPlayback } from './playback';

function deferred() {
  let resolve!: () => void, reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function setup() {
  const audios: FakeAudio[] = [];
  class FakeAudio extends EventTarget {
    currentTime = 0; ended = false; paused = true;
    pending = deferred();
    play = vi.fn(() => { this.paused = false; return this.pending.promise; });
    pause = vi.fn(() => { this.paused = true; this.dispatchEvent(new Event('pause')); });
    constructor(public src: string) { super(); audios.push(this); }
  }
  const app = { Audio: FakeAudio, setInterval: window.setInterval.bind(window), clearInterval: window.clearInterval.bind(window) } as unknown as AudioWindow;
  return { player: createCurriculumPlayback(app), audios };
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('curriculum media lifetime', () => {
  it('waits for ended, allows a user pause and clears all handlers and timers', async () => {
    const { player, audios } = setup(), done = vi.fn();
    const playing = player.play('story.mp3').then(done), audio = audios[0];
    audio.pending.resolve(); await Promise.resolve(); expect(done).not.toHaveBeenCalled();
    player.pause(); await vi.advanceTimersByTimeAsync(120_000); expect(done).not.toHaveBeenCalled();
    audio.pending = deferred(); player.resume(); audio.pending.resolve(); await Promise.resolve();
    expect(audio.play).toHaveBeenCalledTimes(2);
    audio.ended = true; audio.dispatchEvent(new Event('ended')); await playing;
    expect(done).toHaveBeenCalledWith('ended'); expect(vi.getTimerCount()).toBe(0);
    const pauses = audio.pause.mock.calls.length; player.stop(); expect(audio.pause).toHaveBeenCalledTimes(pauses);
  });
  it('does not count external interruptions, failed media or stalled narration', async () => {
    const { player, audios } = setup();
    const interrupted = player.play('one.mp3'); audios[0].pause(); expect(await interrupted).toBe('interrupted');
    const failed = player.play('two.mp3'); audios[1].dispatchEvent(new Event('error')); expect(await failed).toBe('error');
    const stalled = player.play('three.mp3'); await vi.advanceTimersByTimeAsync(34_000); expect(await stalled).toBe('error');
    expect(audios[2].paused).toBe(true); expect(vi.getTimerCount()).toBe(0);
  });
  it('allows long recordings while their media clock is advancing', async () => {
    const { player, audios } = setup(), done = vi.fn();
    const playing = player.play('long.mp3').then(done);
    for (let seconds = 0; seconds < 120; seconds += 10) { audios[0].currentTime += 10; await vi.advanceTimersByTimeAsync(10000); }
    expect(done).not.toHaveBeenCalled();
    audios[0].ended = true; audios[0].dispatchEvent(new Event('ended')); await playing; expect(done).toHaveBeenCalledWith('ended');
  });
  it('ignores late events and a rejected resume from a replaced recording', async () => {
    const { player, audios } = setup();
    const first = player.play('old.mp3'); audios[0].pending.resolve(); await Promise.resolve(); player.pause();
    audios[0].pending = deferred(); player.resume();
    const second = player.play('new.mp3'); expect(await first).toBe('cancelled');
    audios[0].pending.reject(new Error('late resume')); audios[0].dispatchEvent(new Event('ended')); await Promise.resolve();
    expect(audios[1].pause).not.toHaveBeenCalled();
    audios[1].ended = true; audios[1].dispatchEvent(new Event('ended')); expect(await second).toBe('ended'); expect(vi.getTimerCount()).toBe(0);
  });
  it('stops a late play resolution without pausing the next recording', async () => {
    const { player, audios } = setup();
    const first = player.play('old.mp3'); player.stop(); expect(await first).toBe('cancelled');
    const second = player.play('new.mp3'); audios[0].paused = false; audios[0].pending.resolve(); await Promise.resolve();
    expect(audios[0].paused).toBe(true); expect(audios[1].pause).not.toHaveBeenCalled();
    player.stop(); expect(await second).toBe('cancelled'); expect(vi.getTimerCount()).toBe(0);
  });
});
