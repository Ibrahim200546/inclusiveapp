import type { CardIdentity } from '../cards/content';
import { frogSteps, frogWords, type FrogStep } from './content';

export interface FrogMotion {
  jump(step: FrogStep, signal: AbortSignal): Promise<boolean>;
  celebrate(signal: AbortSignal): Promise<boolean>;
  cancel(): void;
}
export interface FrogState extends CardIdentity {
  active: boolean;
  status: 'idle' | 'running' | 'paused' | 'between' | 'complete' | 'error';
  completedWords: number;
  nextStep: number;
  position: number | null;
  markedCount: number;
  activeWord: number | null;
}

export function frogDelay(signal: AbortSignal, ms = 600): Promise<boolean> {
  if (signal.aborted) return Promise.resolve(false);
  return new Promise(resolve => {
    const finish = (done: boolean) => { clearTimeout(timer); signal.removeEventListener('abort', abort); resolve(done); };
    const abort = () => finish(false);
    const timer = setTimeout(() => finish(true), ms);
    signal.addEventListener('abort', abort, { once: true });
  });
}

export function createFrogStore(deps: { identity(): CardIdentity; motion: FrogMotion; delay?(signal: AbortSignal): Promise<boolean> }) {
  const fresh = (active: boolean): FrogState => ({ ...deps.identity(), active, status: 'idle', completedWords: 0, nextStep: 0, position: null, markedCount: 0, activeWord: null });
  let state = fresh(false), generation = 0, controller: AbortController | null = null, disposed = false;
  const listeners = new Set<() => void>();
  const set = (patch: Partial<FrogState>) => { if (!disposed) { state = { ...state, ...patch }; listeners.forEach(listener => listener()); } };
  const cancel = () => { generation++; controller?.abort(); controller = null; deps.motion.cancel(); };
  const current = (token: number) => !disposed && state.active && generation === token;
  const reset = (active = state.active) => { cancel(); set(fresh(active)); };
  function pause() {
    cancel();
    if (state.status === 'running') set({ status: 'paused' });
  }
  async function advance() {
    if (disposed || !state.active || state.status === 'running') return;
    if (state.status === 'complete') { reset(); return; }
    cancel();
    const token = generation, operation = new AbortController(); controller = operation;
    const word = state.completedWords;
    set({ status: 'running', activeWord: word });
    try {
      while (current(token) && frogSteps[state.nextStep]?.wordIndex === word) {
        const step = frogSteps[state.nextStep];
        if (!await deps.motion.jump(step, operation.signal)) { if (current(token)) pause(); return; }
        if (!current(token)) return;
        set({ position: step.index, markedCount: step.index });
        if (!await (deps.delay ?? frogDelay)(operation.signal)) { if (current(token)) pause(); return; }
        if (!current(token)) return;
        set({ nextStep: step.index + 1 });
      }
      if (!current(token)) return;
      const completedWords = word + 1, complete = completedWords === frogWords.length;
      set({ completedWords, status: complete ? 'complete' : 'between', ...(complete && { markedCount: frogSteps.length }) });
      if (complete) {
        // The decorative dance does not determine whether the words were completed.
        try { await deps.motion.celebrate(operation.signal); }
        catch { if (current(token)) deps.motion.cancel(); }
      }
    } catch {
      if (current(token)) { cancel(); set({ status: 'error' }); }
    } finally { if (current(token)) controller = null; }
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    open() { if (!disposed) reset(true); }, close() { if (state.active) reset(false); },
    reset: () => reset(), pause, advance,
    syncIdentity() {
      const next = deps.identity();
      if (next.locale === state.locale && next.grade === state.grade && next.learner === state.learner) return;
      if (next.grade !== state.grade || next.learner !== state.learner) reset();
      else { pause(); set(next); }
    },
    dispose() { if (!disposed) { cancel(); disposed = true; listeners.clear(); } },
  };
}
export type FrogStore = ReturnType<typeof createFrogStore>;
