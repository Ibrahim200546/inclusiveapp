import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTrainModel } from './model';
import type { ModelWorker, WorkerMessage } from './modelTransport';

function setup() {
  const messages: WorkerMessage[] = [];
  const worker: ModelWorker = { onmessage: null, onerror: null, terminate: vi.fn(), postMessage: value => { messages.push(value); } };
  const transport = { create: vi.fn(() => worker), fallback: vi.fn() }, model = createTrainModel(transport);
  return { model, transport, worker, messages, reply(data: WorkerMessage) { worker.onmessage?.({ data }); },
    async ready() { const pending = model.preload(); await Promise.resolve(); this.reply({ id: messages[0].id, ready: true }); await pending; },
  };
}
afterEach(() => { vi.useRealTimers(); });
describe('model request cancellation', () => {
  it('aborts one recognition without terminating the model or losing another request', async () => {
    vi.useFakeTimers(); const h = setup(); await h.ready();
    const controller = new AbortController(), pcm = new Float32Array(160).fill(.1);
    const first = h.model.recognize(pcm.buffer, controller.signal), second = h.model.recognize(new ArrayBuffer(160), new AbortController().signal);
    const cancelled = expect(first).rejects.toMatchObject({ name: 'AbortError' }); controller.abort(); await cancelled;
    expect(pcm.every(value => value === 0)).toBe(true); expect(h.worker.terminate).not.toHaveBeenCalled();
    h.reply({ id: h.messages[1].id, segments: [{ phone: 'wrong late result' }] });
    h.reply({ id: h.messages[2].id, segments: [{ phone: 'a' }] }); expect(await second).toEqual([{ phone: 'a' }]);
    expect(h.model.getSnapshot().status).toBe('ready'); expect(vi.getTimerCount()).toBe(0); h.model.dispose();
  });
  it('never sends data when already aborted and clears its buffer', async () => {
    const h = setup(), controller = new AbortController(), pcm = new Float32Array(160).fill(.1); controller.abort();
    await expect(h.model.recognize(pcm.buffer, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(h.transport.create).not.toHaveBeenCalled(); expect(pcm.every(value => value === 0)).toBe(true);
  });
  it('disposes pending requests, disconnects the worker and stops subscriptions', async () => {
    vi.useFakeTimers(); const h = setup(), listener = vi.fn(); h.model.subscribe(listener); await h.ready();
    const pending = h.model.recognize(new ArrayBuffer(160), new AbortController().signal);
    const cancelled = expect(pending).rejects.toMatchObject({ name: 'AbortError' }); h.model.dispose(); await cancelled;
    const count = listener.mock.calls.length; h.reply({ type: 'download', progress: 80 });
    expect(listener).toHaveBeenCalledTimes(count); expect(vi.getTimerCount()).toBe(0); expect(h.worker.terminate).toHaveBeenCalledOnce();
    await expect(h.model.preload()).rejects.toMatchObject({ name: 'AbortError' });
  });
  it('cancels an automatic retry without creating another worker', async () => {
    vi.useFakeTimers(); const h = setup(); const loading = h.model.preload(); const rejected = expect(loading).rejects.toThrow();
    await Promise.resolve(); h.reply({ id: h.messages[0].id, error: 'Failed to fetch' }); await vi.advanceTimersByTimeAsync(0);
    expect(h.model.getSnapshot().phase).toBe('retrying'); h.model.dispose(); await rejected; await vi.advanceTimersByTimeAsync(300000);
    expect(h.messages).toHaveLength(1); expect(vi.getTimerCount()).toBe(0);
  });
});
