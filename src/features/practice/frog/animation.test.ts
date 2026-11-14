import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFrogAnimation } from './animation';
import { frogSteps } from './content';

function setup(reduced = false, supported = true) {
  document.body.innerHTML = '<div id="board"><div id="field"><span data-frog-step="0"></span><div id="character"></div></div></div>';
  const field = document.getElementById('field')!, board = document.getElementById('board')!, character = document.getElementById('character')!;
  vi.spyOn(field, 'getBoundingClientRect').mockReturnValue({ left: 20, top: 30, width: 300 } as DOMRect);
  vi.spyOn(field.querySelector('span')!, 'getBoundingClientRect').mockReturnValue({ left: 60, top: 130, width: 40 } as DOMRect);
  Object.defineProperty(field, 'clientWidth', { configurable: true, value: 300 });
  Object.defineProperty(board, 'clientHeight', { value: 300 });
  const animations: Animation[] = [];
  const animate = vi.fn(() => {
    const animation = { onfinish: null, oncancel: null, cancel: vi.fn() } as unknown as Animation;
    animations.push(animation); return animation;
  });
  if (supported) character.animate = animate;
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: reduced })));
  const driver = createFrogAnimation(), interrupt = vi.fn(() => driver.cancel());
  const detach = driver.attach({ field, board, character }, interrupt);
  return { driver, detach, interrupt, field, character, animations, animate };
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); document.body.innerHTML = ''; });

describe('Frog animation resources', () => {
  it('commits the final transform and releases the finished browser animation and timer', async () => {
    vi.useFakeTimers(); const h = setup(); const run = h.driver.jump(frogSteps[0], new AbortController().signal);
    expect(h.animations).toHaveLength(1); h.animations[0].onfinish?.call(h.animations[0], {} as AnimationPlaybackEvent);
    expect(await run).toBe(true); expect(h.character.style.transform).toBe('translate(30px, 40px) scale(1)');
    expect(h.animations[0].cancel).toHaveBeenCalledOnce(); expect(h.animations[0].onfinish).toBeNull(); expect(vi.getTimerCount()).toBe(0); h.detach();
  });
  it.each(['abort', 'detach', 'resize', 'timeout', 'browser-cancel'] as const)('settles and releases an unfinished jump on %s', async reason => {
    vi.useFakeTimers(); const h = setup(), controller = new AbortController(); const run = h.driver.jump(frogSteps[0], controller.signal);
    const lateFinish = h.animations[0].onfinish;
    if (reason === 'abort') controller.abort();
    if (reason === 'detach') h.detach();
    if (reason === 'resize') { Object.defineProperty(h.field, 'clientWidth', { value: 240 }); window.dispatchEvent(new Event('resize')); }
    if (reason === 'timeout') await vi.advanceTimersByTimeAsync(2000);
    if (reason === 'browser-cancel') h.animations[0].oncancel?.call(h.animations[0], {} as AnimationPlaybackEvent);
    expect(await run).toBe(false); expect(h.animations[0].cancel).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
    const position = h.character.style.transform; lateFinish?.call(h.animations[0], {} as AnimationPlaybackEvent); expect(h.character.style.transform).toBe(position);
    h.detach(); const count = h.interrupt.mock.calls.length; window.dispatchEvent(new Event('resize')); expect(h.interrupt).toHaveBeenCalledTimes(count);
  });
  it.each([[true, true], [false, false]])('keeps reading usable with reduced motion %s and WAAPI support %s', async (reduced, supported) => {
    const h = setup(reduced, supported);
    expect(await h.driver.jump(frogSteps[0], new AbortController().signal)).toBe(true);
    expect(await h.driver.celebrate(new AbortController().signal)).toBe(true);
    expect(h.animate).not.toHaveBeenCalled(); expect(h.character.style.transform).toBe('translate(30px, 40px) scale(1)'); h.detach();
  });
  it('does not animate detached, missing or already aborted targets', async () => {
    const h = setup(), controller = new AbortController(); controller.abort();
    expect(await h.driver.jump(frogSteps[0], controller.signal)).toBe(false);
    expect(await h.driver.jump(frogSteps[1], new AbortController().signal)).toBe(false);
    h.detach(); expect(await h.driver.jump(frogSteps[0], new AbortController().signal)).toBe(false); expect(h.animate).not.toHaveBeenCalled();
  });
});
