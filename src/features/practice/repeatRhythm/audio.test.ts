import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { AudioWindow } from '../audio/types';
import { createRhythmAudio } from './audio';
import type { RhythmPad } from './content';

function harness(initial: AudioContextState = 'running') {
  const param = () => ({ value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
  const nodes: Array<{ disconnect: ReturnType<typeof vi.fn>; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; onended: (() => void) | null }> = [];
  function node() {
    const item = { connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null as (() => void) | null, frequency: param(), gain: param(), Q: param(), type: '', buffer: null };
    nodes.push(item); return item;
  }
  class Context {
    static instances: Context[] = [];
    state = initial; currentTime = 3; sampleRate = 48000; destination = {};
    constructor() { Context.instances.push(this); }
    resume = vi.fn(async () => { this.state = 'running'; });
    close = vi.fn(async () => { this.state = 'closed'; });
    createOscillator = vi.fn(node); createBufferSource = vi.fn(node); createGain = vi.fn(node); createBiquadFilter = vi.fn(node);
    createBuffer = vi.fn((channels: number, size: number) => ({ getChannelData: () => new Float32Array(size) }));
  }
  const vibrate = vi.fn();
  const app = { AudioContext: Context, navigator: { vibrate }, setTimeout: window.setTimeout.bind(window), clearTimeout: window.clearTimeout.bind(window) } as unknown as AudioWindow;
  return { player: createRhythmAudio(app), contexts: Context.instances, app, nodes, vibrate };
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

it.each([0, 1, 2, 3] as RhythmPad[])('preserves instrument %i and disconnects all nodes when it ends', async pad => {
  const h = harness(); expect(await h.player.unlock()).toBe(true); expect(h.nodes).toHaveLength(0);
  expect(h.player.hit(pad)).toBe(true);
  const sources = h.nodes.filter(node => node.start.mock.calls.length);
  expect(sources).toHaveLength(pad === 2 ? 2 : 1);
  sources.forEach(source => { expect(source.start).toHaveBeenCalledWith(3); source.onended?.(); });
  h.nodes.forEach(node => expect(node.disconnect).toHaveBeenCalledTimes(1));
  h.player.stop(); expect(h.contexts[0].close).toHaveBeenCalledTimes(1); expect(h.vibrate).toHaveBeenLastCalledWith(0);
});

it('stops sources still sounding, closes once and creates a fresh context next time', async () => {
  const h = harness(); await h.player.unlock(); h.player.hit(2); h.player.stop(); h.player.stop();
  h.nodes.forEach(node => expect(node.disconnect).toHaveBeenCalledTimes(1));
  expect(h.contexts[0].close).toHaveBeenCalledTimes(1); expect(h.nodes[0].onended).toBeNull();
  await h.player.unlock(); expect(h.contexts).toHaveLength(2); h.player.stop();
});

it('a late resume cannot play a queued free tap after stop', async () => {
  const h = harness(); await h.player.unlock(); const context = h.contexts[0]; context.state = 'suspended';
  let resume!: () => void; context.resume.mockImplementationOnce(() => new Promise(done => { resume = () => { context.state = 'running'; done(); }; }));
  const waiting = h.player.unlock(); h.player.hit(0); h.player.stop(); expect(await waiting).toBe(false);
  resume(); await Promise.resolve(); await Promise.resolve(); expect(h.nodes).toHaveLength(0); expect(vi.getTimerCount()).toBe(0);
});

it('resolves a stuck resume as unavailable and releases the context', async () => {
  const h = harness(); await h.player.unlock(); const context = h.contexts[0]; context.state = 'suspended'; context.resume.mockImplementation(() => new Promise(() => {}));
  const waiting = h.player.unlock(); await vi.advanceTimersByTimeAsync(1500);
  expect(await waiting).toBe(false); expect(context.close).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(0);
});

it('shares pending unlock and plays the first free tap when resume succeeds', async () => {
  const h = harness(); await h.player.unlock(); const context = h.contexts[0]; context.state = 'suspended';
  const first = h.player.unlock(); expect(h.player.unlock()).toBe(first); h.player.hit(3);
  expect(await first).toBe(true); await Promise.resolve(); expect(context.createOscillator).toHaveBeenCalledTimes(1); h.player.stop();
});

it('cleans up a partially configured source on synthesis failure', async () => {
  const h = harness(); await h.player.unlock();
  h.contexts[0].createOscillator.mockImplementationOnce(() => { throw new Error('No audio device'); });
  expect(h.player.hit(2)).toBe(false); expect(h.contexts[0].close).toHaveBeenCalledTimes(1);
});

it('uses visual fallback when Web Audio or haptics are unavailable', async () => {
  const h = harness(); Object.defineProperty(h.app, 'AudioContext', { value: undefined });
  h.vibrate.mockImplementation(() => { throw new Error('Not permitted'); });
  expect(await h.player.unlock()).toBe(false); expect(h.player.hit(0)).toBe(false); h.player.stop();
});
