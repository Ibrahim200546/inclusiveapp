import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTrainModel, type ModelState } from '../features/practice/train/model';
import type { ModelWorker, WorkerMessage } from '../features/practice/train/modelTransport';
import { createTrainSession, type CaptureEnvironment } from '../features/practice/train/session';
function harness(brokenConstructor = false, sharedTransport = false) {
  const instances: FakeWorker[] = [];
  class FakeWorker implements ModelWorker {
    shared = false;
    onmessage: ModelWorker['onmessage'] = null;
    onerror: ModelWorker['onerror'] = null;
    messages: WorkerMessage[] = [];
    terminate = vi.fn();
    constructor() { if (brokenConstructor) throw new Error('Worker unavailable'); instances.push(this); }
    postMessage(data: WorkerMessage) { this.messages.push(data); }
    reply(data: WorkerMessage) { this.onmessage?.({ data }); }
    ready() { this.reply({ id: this.messages[this.messages.length - 1].id, ready: true }); }
  }
  let shared = sharedTransport;
  const api = createTrainModel({ create() { const worker = new FakeWorker(); worker.shared = shared; return worker; }, fallback() { shared = false; } });
  const getUserMedia = vi.fn();
  const create = () => createTrainSession({ letter: 'П', mode: 'short' }, api, { navigator: { mediaDevices: { getUserMedia } } } as unknown as CaptureEnvironment);
  return { api, instances, getUserMedia, create };
}

afterEach(() => vi.useRealTimers());

describe('shared train model preparation', () => {
  it('shares one background load with later callers, retaining the ready worker', async () => {
    const { api, instances, getUserMedia } = harness();
    const first = api.preload(); expect(api.preload()).toBe(first);
    await Promise.resolve();
    expect(instances).toHaveLength(1); expect(instances[0].messages).toHaveLength(1);
    expect(getUserMedia).not.toHaveBeenCalled();
    instances[0].ready(); await first;
    expect(api.getSnapshot()).toMatchObject({ status: 'ready', progress: 100 });
    expect(api.preload()).toBe(first); expect(instances[0].messages).toHaveLength(1);
  });

  it('updates subscribers monotonically and reserves 100% for actual readiness', async () => {
    const { api, instances } = harness(); const states: ModelState[] = [];
    const unsubscribe = api.subscribe(() => states.push(api.getSnapshot()));
    const loading = api.preload(); await Promise.resolve();
    instances[0].reply({ type: 'download', progress: 45, loaded: 50, total: 100 });
    expect(api.getSnapshot()).toMatchObject({ status: 'loading', progress: 45, loaded: 50, total: 100 });
    instances[0].reply({ type: 'download', progress: 10 }); expect(api.getSnapshot().progress).toBe(45);
    instances[0].reply({ type: 'download', progress: 100, phase: 'initializing' });
    expect(api.getSnapshot()).toMatchObject({ status: 'loading', progress: 90, phase: 'initializing' });
    unsubscribe(); const count = states.length;
    instances[0].ready(); await loading; expect(states).toHaveLength(count);
    expect(api.getSnapshot().progress).toBe(100);
  });

  it('allows manual retry after an unrecoverable loading error', async () => {
    const { api, instances } = harness(); const first = api.preload();
    const failure = expect(first).rejects.toMatchObject({ name: 'PhonemeModelUnavailable' });
    await Promise.resolve(); instances[0].reply({ id: instances[0].messages[0].id, error: 'Invalid model configuration' });
    await failure; expect(api.getSnapshot().status).toBe('error');
    const retry = api.preload(); await Promise.resolve(); instances[0].ready(); await retry;
    expect(api.getSnapshot().status).toBe('ready'); expect(instances[0].messages).toHaveLength(2);
  });

  it.each(['Failed to fetch', 'Service unavailable error occurred while trying to load file'])('recovers automatically from %s without a second caller', async message => {
    vi.useFakeTimers(); const { api, instances } = harness(); const loading = api.preload();
    await Promise.resolve(); instances[0].reply({ id: instances[0].messages[0].id, error: message });
    await vi.advanceTimersByTimeAsync(0);
    expect(api.getSnapshot()).toMatchObject({ status: 'loading', phase: 'retrying' });
    expect(api.preload()).toBe(loading);
    await vi.advanceTimersByTimeAsync(500);
    expect(instances[0].messages).toHaveLength(2);
    instances[0].ready(); await loading;
    expect(api.getSnapshot()).toMatchObject({ status: 'ready', attempt: 2 });
  });

  it('falls back from a broken shared runtime to a dedicated worker', async () => {
    vi.useFakeTimers(); const { api, instances } = harness(false, true); const loading = api.preload();
    await Promise.resolve(); instances[0].onerror!({ message: 'Shared worker backend unavailable' });
    await vi.advanceTimersByTimeAsync(0); await vi.advanceTimersByTimeAsync(500);
    expect(instances[0].terminate).toHaveBeenCalledOnce();
    expect(instances[1].shared).toBe(false);
    instances[1].ready(); await loading;
    expect(api.getSnapshot()).toMatchObject({ status: 'ready', transport: 'dedicated' });
  });

  it('caps automatic retries and keeps the real reason available for diagnostics', async () => {
    vi.useFakeTimers(); const { api, instances } = harness();
    const failed = expect(api.preload()).rejects.toMatchObject({ message: 'Failed to fetch' });
    await Promise.resolve();
    for (let attempt = 0; attempt < 3; attempt++) {
      const message = instances[0].messages[instances[0].messages.length - 1];
      instances[0].reply({ id: message.id, error: 'Failed to fetch' });
      await vi.advanceTimersByTimeAsync(0);
      if (attempt < 2) await vi.advanceTimersByTimeAsync(attempt === 0 ? 500 : 1500);
    }
    await failed;
    expect(api.getSnapshot()).toMatchObject({ status: 'error', attempt: 3, error: 'Failed to fetch' });
    expect(instances[0].messages).toHaveLength(3);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('recreates a crashed ready worker and ignores its late messages', async () => {
    const { api, instances } = harness(); const first = api.preload(); await Promise.resolve();
    instances[0].ready(); await first;
    instances[0].onerror!({ message: 'Worker crashed' });
    expect(instances[0].terminate).toHaveBeenCalledOnce();
    const retry = api.preload(); await Promise.resolve();
    instances[0].reply({ type: 'download', progress: 80 }); expect(api.getSnapshot().progress).toBe(0);
    instances[1].ready(); await retry; expect(api.getSnapshot().status).toBe('ready');
  });

  it('does not time out a slow download while bytes are still arriving', async () => {
    vi.useFakeTimers(); const { api, instances } = harness(); const loading = api.preload(); await Promise.resolve();
    await vi.advanceTimersByTimeAsync(299000);
    instances[0].reply({ type: 'download', progress: 10 });
    await vi.advanceTimersByTimeAsync(299000);
    expect(api.getSnapshot().status).toBe('loading');
    instances[0].ready(); await loading; expect(vi.getTimerCount()).toBe(0);
  });

  it('reports a truly stalled load and permits a new attempt', async () => {
    vi.useFakeTimers(); const { api, instances } = harness();
    const failed = expect(api.preload()).rejects.toMatchObject({ name: 'PhonemeModelUnavailable' });
    await Promise.resolve(); await vi.advanceTimersByTimeAsync(300000); await failed;
    expect(api.getSnapshot().status).toBe('error'); expect(instances[0].terminate).toHaveBeenCalledOnce();
    const retry = api.preload(); await Promise.resolve(); instances[1].ready(); await retry;
    expect(api.getSnapshot().status).toBe('ready');
  });

  it('waits for model readiness before asking for microphone access', async () => {
    const { instances, getUserMedia, create } = harness();
    let grant: (value: { getTracks(): unknown[] }) => void;
    getUserMedia.mockImplementation(() => new Promise(resolve => { grant = resolve; }));
    const session = create(); const start = session.start();
    await Promise.resolve(); expect(getUserMedia).not.toHaveBeenCalled();
    instances[0].ready(); await vi.waitFor(() => expect(getUserMedia).toHaveBeenCalledOnce());
    session.stop(); grant!({ getTracks: () => [] }); await start; session.dispose();
  });

  it('turns a synchronous worker-construction failure into a recoverable rejection', async () => {
    const { api } = harness(true);
    await expect(api.preload()).rejects.toMatchObject({ name: 'PhonemeModelUnavailable', message: 'Worker unavailable' });
    expect(api.getSnapshot().status).toBe('error');
  });
});
