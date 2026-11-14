import type { ModelWorker, WorkerMessage } from './modelTransport';
import { asError } from './types';

export interface ModelState {
  status: 'idle' | 'loading' | 'ready' | 'error'; phase: 'download' | 'initializing' | 'retrying' | 'ready';
  progress: number; loaded: number; total: number; attempt?: number; transport?: 'shared' | 'dedicated'; error?: string;
}
interface Request {
  type: 'load' | 'recognize'; resolve(message: WorkerMessage): void; reject(error: Error): void;
  timer?: ReturnType<typeof setTimeout>; release(): void;
}
const modelError = (message = 'PhonemeModelUnavailable') => Object.assign(new Error(message), { name: 'PhonemeModelUnavailable', sharedFailure: false });
const aborted = () => new DOMException('Model request cancelled', 'AbortError');

/** One model per page; exercise cancellation releases requests without discarding downloaded weights. */
export function createTrainModel(transport: { create(): ModelWorker; fallback(): void }) {
  let worker: ModelWorker | null = null, counter = 0, modelPromise: Promise<WorkerMessage> | undefined, disposed = false;
  let retryTimer: ReturnType<typeof setTimeout> | undefined, cancelRetry: (() => void) | undefined;
  let snapshot: ModelState = { status: 'idle', phase: 'download', progress: 0, loaded: 0, total: 0 };
  const pending = new Map<number, Request>(), listeners = new Set<() => void>();
  function publish(patch: Partial<ModelState>) {
    if (disposed) return;
    snapshot = { ...snapshot, ...patch }; listeners.forEach(listener => listener());
  }
  function failWorker(error: Error) {
    for (const item of pending.values()) { clearTimeout(item.timer); item.release(); item.reject(error); }
    pending.clear();
    const old = worker; worker = null;
    try { old?.terminate(); } catch { /* A dead worker must not prevent retry. */ }
    if (snapshot.status !== 'loading') modelPromise = undefined;
    publish({ status: snapshot.status === 'loading' ? 'loading' : 'error', error: error.message });
  }
  function arm(item: Request) {
    clearTimeout(item.timer);
    item.timer = setTimeout(() => failWorker(modelError('Model request timed out')), item.type === 'load' ? 300000 : 180000);
  }
  function request(type: Request['type'], pcm?: ArrayBuffer, signal?: AbortSignal): Promise<WorkerMessage> {
    if (disposed || signal?.aborted) return Promise.reject(aborted());
    if (!worker) {
      const current = transport.create(); worker = current;
      publish({ transport: current.shared ? 'shared' : 'dedicated' });
      current.onmessage = ({ data }) => {
        if (worker !== current || disposed) return;
        if (data.type === 'download') {
          if (snapshot.status !== 'loading') return;
          publish({ progress: Number.isFinite(data.progress) ? Math.min(90, Math.max(snapshot.progress, data.progress!)) : snapshot.progress,
            phase: data.phase === 'initializing' ? 'initializing' : 'download',
            loaded: Number.isFinite(data.loaded) ? data.loaded : snapshot.loaded, total: Number.isFinite(data.total) ? data.total : snapshot.total });
          for (const item of pending.values()) if (item.type === 'load') arm(item);
          return;
        }
        const item = pending.get(data.id!); if (!item) return;
        pending.delete(data.id!); clearTimeout(item.timer); item.release();
        if (data.error) {
          const error = modelError(data.error);
          if (current.shared && item.type === 'load') { transport.fallback(); error.sharedFailure = true; failWorker(error); }
          item.reject(error);
        } else item.resolve(data);
      };
      current.onerror = event => {
        if (worker !== current || disposed) return;
        event.preventDefault?.(); const error = modelError(event.message);
        if (current.shared) { transport.fallback(); error.sharedFailure = true; }
        failWorker(error);
      };
    }
    const id = ++counter;
    return new Promise((resolve, reject) => {
      const cancel = () => { pending.delete(id); clearTimeout(item.timer); item.release(); reject(aborted()); };
      const item: Request = { type, resolve, reject, release: () => signal?.removeEventListener('abort', cancel) };
      pending.set(id, item); signal?.addEventListener('abort', cancel, { once: true }); arm(item);
      try { worker!.postMessage({ id, type, pcm }, pcm ? [pcm] : []); }
      catch (error) { failWorker(modelError(asError(error).message)); }
    });
  }
  function preload() {
    if (disposed) return Promise.reject(aborted());
    if (!modelPromise) {
      publish({ status: 'loading', phase: 'download', progress: 0, loaded: 0, total: 0, error: '' });
      modelPromise = Promise.resolve().then(async () => {
        for (let attempt = 1; attempt <= 3; attempt++) {
          if (disposed) throw aborted();
          publish({ attempt });
          try {
            const result = await request('load');
            if (!result.ready) throw modelError('Model did not report readiness');
            publish({ status: 'ready', phase: 'ready', progress: 100, error: '' }); return result;
          } catch (failure) {
            const error = asError(failure) as Error & { sharedFailure?: boolean };
            const transient = /fetch|network|download|service unavailable|temporar|too many requests|bad gateway|gateway timeout|internal server|forbidden|\b(?:408|429|5\d\d)\b/i.test(error.message);
            if (disposed || attempt === 3 || (!transient && !error.sharedFailure)) throw error;
            publish({ phase: 'retrying', error: error.message });
            await new Promise<void>(resolve => {
              cancelRetry = resolve; retryTimer = setTimeout(resolve, attempt === 1 ? 500 : 1500);
            });
            retryTimer = undefined; cancelRetry = undefined;
            publish({ phase: 'download', progress: 0, loaded: 0, total: 0 });
          }
        }
        throw modelError();
      }).catch(error => {
        modelPromise = undefined; publish({ status: 'error', error: asError(error).message }); throw modelError(asError(error).message);
      });
    }
    return modelPromise;
  }
  return {
    preload,
    async recognize(pcm: ArrayBuffer, signal: AbortSignal) {
      try { return (await request('recognize', pcm, signal)).segments ?? []; }
      finally { if (pcm.byteLength) new Float32Array(pcm).fill(0); }
    },
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    dispose() {
      if (disposed) return; disposed = true;
      clearTimeout(retryTimer); cancelRetry?.(); cancelRetry = undefined; failWorker(aborted()); listeners.clear();
    },
  };
}
export type TrainModel = ReturnType<typeof createTrainModel>;
