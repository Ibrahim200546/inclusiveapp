import { afterEach, expect, it, vi } from 'vitest';
import { createMediaCoordinator } from './mediaCoordinator';
import { createSoundTriggers } from './soundTriggers';
import type { AudioWindow } from './types';

const disposers: (() => void)[] = [];
function harness() {
  const states = new WeakMap<HTMLMediaElement, boolean>();
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function () { states.set(this, false); return Promise.resolve(); });
  const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function () {
    states.set(this, true); this.dispatchEvent(new Event('pause'));
  });
  const released = vi.fn();
  const coordinator = createMediaCoordinator(window as AudioWindow, document, { released }); disposers.push(coordinator.dispose);
  function audio(id = '') {
    const element = document.createElement('audio'); element.id = id;
    Object.defineProperty(element, 'paused', { get: () => states.get(element) !== false }); return element;
  }
  return { play, pause, released, coordinator, audio };
}
afterEach(() => { disposers.splice(0).forEach(dispose => dispose()); vi.restoreAllMocks(); vi.useRealTimers(); document.body.innerHTML = ''; });

it('allows effects alongside one content source and tracks pause/resume without duplicates', async () => {
  const { coordinator, audio } = harness(); const first = audio(), effect = audio('clickSound'), second = audio();
  coordinator.track(first); coordinator.track(first);
  await first.play(); await effect.play(); expect(coordinator.active).toEqual([first, effect]);
  await second.play(); expect(first.paused).toBe(true); expect(effect.paused).toBe(false); expect(coordinator.active).toEqual([effect, second]);
  second.pause(); expect(coordinator.active).toEqual([effect]);
  await second.play(); expect(coordinator.active).toEqual([effect, second]);
  coordinator.stop({ includeEffects: false }); expect(coordinator.active).toEqual([effect]);
  coordinator.stop(); expect(coordinator.active).toEqual([]);
});

it('stops DOM audio and manually registered legacy elements, even if one pause fails', () => {
  const { coordinator, audio } = harness(); const first = audio(), dom = audio(); document.body.append(dom);
  first.pause = vi.fn(() => { throw new Error('Already disposed'); }); coordinator.active.push(first);
  coordinator.stop(); expect(first.pause).toHaveBeenCalled(); expect(dom.currentTime).toBe(0); expect(coordinator.active).toEqual([]);
});

it('ignores an old play rejection after the same element has resumed', async () => {
  const { coordinator, audio, play } = harness(); const recording = audio();
  let reject!: (error: Error) => void;
  play.mockImplementationOnce(() => new Promise((_resolve, no) => { reject = no; }));
  const old = recording.play(); await recording.play(); reject(new Error('Old play'));
  await expect(old).rejects.toThrow('Old play'); expect(coordinator.active).toContain(recording); expect(recording.paused).toBe(false);
});

it('rejects a play resolving after stop and restores the prototype on disposal', async () => {
  const { coordinator, audio, play } = harness(); const recording = audio();
  let resolve!: () => void; play.mockImplementationOnce(() => new Promise(yes => { resolve = yes; }));
  const pending = recording.play(); coordinator.stop(); resolve();
  await expect(pending).rejects.toHaveProperty('name', 'AbortError');
  expect(recording.paused).toBe(true); coordinator.dispose(); expect(HTMLMediaElement.prototype.play).toBe(play);
});

it('clears trigger locks and their timers, retaining preexisting disabled state', () => {
  vi.useFakeTimers(); const triggers = createSoundTriggers(window as AudioWindow);
  const button = document.createElement('button'); button.className = 'center-circle'; document.body.append(button);
  const audio = document.createElement('audio');
  const click = new MouseEvent('click'); Object.defineProperty(click, 'target', { value: button });
  triggers.click(click); triggers.attach(audio); expect(button.disabled).toBe(true);
  triggers.release(audio); expect(button.disabled).toBe(false); expect(vi.getTimerCount()).toBe(0);
  button.disabled = true; triggers.click(click); triggers.attach(audio); triggers.clear();
  expect(button.disabled).toBe(true); expect(vi.getTimerCount()).toBe(0);
});
