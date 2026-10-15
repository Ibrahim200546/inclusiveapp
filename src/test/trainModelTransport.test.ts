import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

type Message = { id?: number; type?: string; ready?: boolean; error?: string; progress?: number; segments?: unknown[]; pcm?: ArrayBuffer };
class Port {
  messages: Message[] = [];
  onmessage?: (event: { data: Message }) => void;
  onmessageerror?: () => void;
  start = vi.fn(); close = vi.fn(); addEventListener = vi.fn();
  postMessage(message: Message) { this.messages.push(message); }
  send(message: Message) { this.onmessage!({ data: message }); }
}

describe('model transport selection', () => {
  function harness(broken = false) {
    const port = new Port(), sharedCalls: { url: string; options: unknown }[] = [], dedicatedCalls: string[] = [];
    class Shared {
      port = port;
      constructor(url: URL, options: unknown) { sharedCalls.push({ url: String(url), options }); if (broken) throw new Error('Unsupported'); }
    }
    class Dedicated { constructor(url: URL) { dedicatedCalls.push(String(url)); } }
    const root: { SharedWorker: typeof Shared; Worker: typeof Dedicated; TrainModelTransport?: { create(): { shared?: boolean; terminate(): void }; fallback(): void } } = { SharedWorker: Shared, Worker: Dedicated };
    new Function('window', 'document', readFileSync('public/original/js/train-model-transport.js', 'utf8'))(root, {
      currentScript: { src: 'https://edu-corex.kz/original/js/train-model-transport.js?v=2' }, baseURI: 'https://edu-corex.kz/',
    });
    return { api: root.TrainModelTransport!, port, sharedCalls, dedicatedCalls };
  }

  it('uses the same shared URL on the landing page and requests navigation lifetime', () => {
    const { api, port, sharedCalls } = harness();
    const worker = api.create(); expect(worker.shared).toBe(true); expect(port.start).toHaveBeenCalledOnce();
    expect(sharedCalls[0]).toEqual({
      url: 'https://edu-corex.kz/original/js/phoneme-shared-worker.js?v=2',
      options: { type: 'module', name: 'corex-phoneme-v8', extendedLifetime: true },
    });
    worker.terminate(); expect(port.messages).toEqual([{ type: 'disconnect' }]); expect(port.close).toHaveBeenCalledOnce();
  });

  it('falls back without repeated constructor failures when shared workers are blocked', () => {
    const { api, dedicatedCalls, sharedCalls } = harness(true);
    api.create(); api.create();
    expect(sharedCalls).toHaveLength(1);
    expect(dedicatedCalls).toEqual(Array(2).fill('https://edu-corex.kz/original/js/phoneme-worker.js?v=8'));
  });
});

describe('shared model message isolation', () => {
  function harness(handler?: (event: { data: Message }) => Promise<void>) {
    const scope: { postMessage?: (message: Message) => void; onconnect?: (event: { ports: Port[] }) => void; onmessage?: (event: { data: Message }) => Promise<void> } = {};
    const calls: Message[] = [];
    const loadModule = vi.fn(async () => { scope.onmessage = handler || (async ({ data }) => { calls.push(data); }); });
    const source = readFileSync('public/original/js/phoneme-shared-worker.js', 'utf8')
      .replace("import('./phoneme-worker.js?v=8')", 'loadModule()');
    new Function('self', 'loadModule', source)(scope, loadModule);
    const first = new Port(), second = new Port();
    scope.onconnect!({ ports: [first] }); scope.onconnect!({ ports: [second] });
    return { scope, first, second, calls, loadModule };
  }

  it('routes colliding client request IDs separately and never broadcasts recognition results', async () => {
    const { first, second, scope, calls, loadModule } = harness();
    first.send({ id: 1, type: 'load' }); second.send({ id: 1, type: 'load' });
    await vi.waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[0].id).not.toBe(calls[1].id); expect(loadModule).toHaveBeenCalledOnce();
    scope.postMessage!({ type: 'download', progress: 25 });
    scope.postMessage!({ id: calls[0].id, segments: ['p'] });
    scope.postMessage!({ id: calls[1].id, segments: ['b'] });
    expect(first.messages).toEqual([{ type: 'download', progress: 25 }, { id: 1, segments: ['p'] }]);
    expect(second.messages).toEqual([{ type: 'download', progress: 25 }, { id: 1, segments: ['b'] }]);
  });

  it('serializes inference from two pages on the same WASM runtime', async () => {
    let release: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    const started: number[] = [];
    const { first, second } = harness(async ({ data }) => { started.push(data.id!); if (started.length === 1) await held; });
    first.send({ id: 1, type: 'recognize', pcm: new Float32Array(16).buffer });
    second.send({ id: 1, type: 'recognize', pcm: new Float32Array(16).buffer });
    await vi.waitFor(() => expect(started).toHaveLength(1));
    release!(); await vi.waitFor(() => expect(started).toHaveLength(2));
  });

  it('drops late results and progress for disconnected clients', async () => {
    const { first, second, scope, calls } = harness();
    first.send({ id: 1, type: 'load' }); await vi.waitFor(() => expect(calls).toHaveLength(1));
    first.send({ type: 'disconnect' });
    scope.postMessage!({ id: calls[0].id, ready: true }); scope.postMessage!({ type: 'download', progress: 50 });
    expect(first.messages).toEqual([]); expect(second.messages).toEqual([{ type: 'download', progress: 50 }]);
    expect(first.close).toHaveBeenCalledOnce();
  });
});
