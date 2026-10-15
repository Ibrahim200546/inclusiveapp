import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

type ModelState = { status: string; progress: number; phase: string; loaded: number; total: number };
type Message = { id?: number; type?: string; ready?: boolean; error?: string; progress?: number; phase?: string; loaded?: number; total?: number };
type Api = {
  preload(): Promise<unknown>;
  subscribeModel(listener: (state: ModelState) => void): () => void;
  modelState: ModelState;
  create(options: Record<string, unknown>): { start(): Promise<boolean>; stop(): void; dispose(): void };
};
const source = readFileSync('public/original/js/train-phoneme-session.js', 'utf8');

function harness(brokenConstructor = false) {
  const instances: FakeWorker[] = [];
  class FakeWorker {
    onmessage?: (event: { data: Message }) => void;
    onerror?: (event: { message: string }) => void;
    messages: Message[] = [];
    terminate = vi.fn();
    constructor() { if (brokenConstructor) throw new Error('Worker unavailable'); instances.push(this); }
    postMessage(data: Message) { this.messages.push(data); }
    reply(data: Message) { this.onmessage?.({ data }); }
    ready() { this.reply({ id: this.messages[this.messages.length - 1].id, ready: true }); }
  }
  const root: { TrainPhonemeSession?: Api; addEventListener: unknown; removeEventListener: unknown } = {
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
  };
  const document = { currentScript: null, baseURI: 'https://edu-corex.kz/original/index2.html', addEventListener: vi.fn(), removeEventListener: vi.fn() };
  const getUserMedia = vi.fn();
  new Function('window', 'Worker', 'document', 'navigator', source)(root, FakeWorker, document, { mediaDevices: { getUserMedia } });
  return { api: root.TrainPhonemeSession!, instances, getUserMedia };
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
    expect(api.modelState).toMatchObject({ status: 'ready', progress: 100 });
    expect(api.preload()).toBe(first); expect(instances[0].messages).toHaveLength(1);
  });

  it('updates subscribers monotonically and reserves 100% for actual readiness', async () => {
    const { api, instances } = harness(); const states: ModelState[] = [];
    const unsubscribe = api.subscribeModel(state => states.push(state));
    const loading = api.preload(); await Promise.resolve();
    instances[0].reply({ type: 'download', progress: 45, loaded: 50, total: 100 });
    expect(api.modelState).toMatchObject({ status: 'loading', progress: 45, loaded: 50, total: 100 });
    instances[0].reply({ type: 'download', progress: 10 }); expect(api.modelState.progress).toBe(45);
    instances[0].reply({ type: 'download', progress: 100, phase: 'initializing' });
    expect(api.modelState).toMatchObject({ status: 'loading', progress: 90, phase: 'initializing' });
    unsubscribe(); const count = states.length;
    instances[0].ready(); await loading; expect(states).toHaveLength(count);
    expect(api.modelState.progress).toBe(100);
  });

  it('allows retry after an actual network error', async () => {
    const { api, instances } = harness(); const first = api.preload();
    const failure = expect(first).rejects.toMatchObject({ name: 'PhonemeModelUnavailable' });
    await Promise.resolve(); instances[0].reply({ id: instances[0].messages[0].id, error: 'Failed to fetch' });
    await failure; expect(api.modelState.status).toBe('error');
    const retry = api.preload(); await Promise.resolve(); instances[0].ready(); await retry;
    expect(api.modelState.status).toBe('ready'); expect(instances[0].messages).toHaveLength(2);
  });

  it('recreates a crashed ready worker and ignores its late messages', async () => {
    const { api, instances } = harness(); const first = api.preload(); await Promise.resolve();
    instances[0].ready(); await first;
    instances[0].onerror!({ message: 'Worker crashed' });
    expect(instances[0].terminate).toHaveBeenCalledOnce();
    const retry = api.preload(); await Promise.resolve();
    instances[0].reply({ type: 'download', progress: 80 }); expect(api.modelState.progress).toBe(0);
    instances[1].ready(); await retry; expect(api.modelState.status).toBe('ready');
  });

  it('does not time out a slow download while bytes are still arriving', async () => {
    vi.useFakeTimers(); const { api, instances } = harness(); const loading = api.preload(); await Promise.resolve();
    await vi.advanceTimersByTimeAsync(299000);
    instances[0].reply({ type: 'download', progress: 10 });
    await vi.advanceTimersByTimeAsync(299000);
    expect(api.modelState.status).toBe('loading');
    instances[0].ready(); await loading; expect(vi.getTimerCount()).toBe(0);
  });

  it('reports a truly stalled load and permits a new attempt', async () => {
    vi.useFakeTimers(); const { api, instances } = harness();
    const failed = expect(api.preload()).rejects.toMatchObject({ name: 'PhonemeModelUnavailable' });
    await Promise.resolve(); await vi.advanceTimersByTimeAsync(300000); await failed;
    expect(api.modelState.status).toBe('error'); expect(instances[0].terminate).toHaveBeenCalledOnce();
    const retry = api.preload(); await Promise.resolve(); instances[1].ready(); await retry;
    expect(api.modelState.status).toBe('ready');
  });

  it('waits for model readiness before asking for microphone access', async () => {
    const { api, instances, getUserMedia } = harness();
    let grant: (value: { getTracks(): unknown[] }) => void;
    getUserMedia.mockImplementation(() => new Promise(resolve => { grant = resolve; }));
    const session = api.create({ letter: 'П', mode: 'short' }); const start = session.start();
    await Promise.resolve(); expect(getUserMedia).not.toHaveBeenCalled();
    instances[0].ready(); await vi.waitFor(() => expect(getUserMedia).toHaveBeenCalledOnce());
    session.stop(); grant!({ getTracks: () => [] }); await start; session.dispose();
  });

  it('turns a synchronous worker-construction failure into a recoverable rejection', async () => {
    const { api } = harness(true);
    await expect(api.preload()).rejects.toMatchObject({ name: 'PhonemeModelUnavailable', message: 'Worker unavailable' });
    expect(api.modelState.status).toBe('error');
  });
});
