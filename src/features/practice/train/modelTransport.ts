import type { Segment } from './types';

export interface WorkerMessage {
  id?: number; type?: string; ready?: boolean; error?: string; progress?: number;
  phase?: string; loaded?: number; total?: number; segments?: Segment[]; pcm?: ArrayBuffer;
}
export interface ModelWorker {
  shared?: boolean;
  onmessage: ((event: { data: WorkerMessage }) => void) | null;
  onerror: ((event: { message?: string; preventDefault?(): void }) => void) | null;
  postMessage(message: WorkerMessage, transfer: Transferable[]): void;
  terminate(): void;
}
export type TransportEnvironment = Pick<Window & typeof globalThis, 'Worker' | 'SharedWorker' | 'document'>;

export function createModelTransport(env: TransportEnvironment) {
  let dedicatedOnly = false;
  const url = (name: string) => new URL('/original/js/' + name, env.document.baseURI);
  return {
    fallback() { dedicatedOnly = true; },
    create(): ModelWorker {
      if (!dedicatedOnly && typeof env.SharedWorker === 'function') {
        try {
          const options: WorkerOptions & { extendedLifetime: boolean } = { type: 'module', name: 'corex-phoneme-v8', extendedLifetime: true };
          const shared = new env.SharedWorker(url('phoneme-shared-worker.js?v=2'), options), port = shared.port;
          const client: ModelWorker = {
            shared: true, onmessage: null, onerror: null,
            postMessage: (message, transfer) => port.postMessage(message, transfer),
            terminate() { try { port.postMessage({ type: 'disconnect' }); } finally { port.close(); } },
          };
          port.onmessage = event => client.onmessage?.(event);
          port.onmessageerror = () => client.onerror?.({ message: 'Shared worker message error' });
          shared.onerror = event => client.onerror?.(event);
          port.start(); return client;
        } catch { dedicatedOnly = true; }
      }
      return new env.Worker(url('phoneme-worker.js?v=8'), { type: 'module' }) as ModelWorker;
    },
  };
}
