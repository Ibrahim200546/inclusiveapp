import type { CardIdentity } from '../cards/content';
import type { AlphabetAudio } from '../legacy/reading';
import { targets } from './assessment';
import { nextLetters } from './menu';
import type { SessionOptions, TrainMode, TrainProgress, TrainSession, Verdict } from './types';

export type TrainStatus = 'idle' | 'selected' | 'loading' | 'requesting' | 'listening' | 'checking' | 'arriving' | 'complete' | 'incorrect' | 'error' | 'stopped';
export type TrainError = 'model' | 'denied' | 'timeout' | 'microphone';
export interface TrainState extends CardIdentity {
  active: boolean; letters: string[]; expanded: boolean; selected: string; mode: TrainMode;
  status: TrainStatus; progress: number; evidence: TrainProgress | null; result: Verdict | null; error: TrainError | null;
  preview: 'idle' | 'playing' | 'ended' | 'error';
}
export const isBusy = (status: TrainStatus) => ['loading', 'requesting', 'listening', 'checking', 'arriving'].includes(status);
interface Dependencies {
  identity(): CardIdentity; createSession(options: SessionOptions): TrainSession;
  alphabet: Pick<AlphabetAudio, 'letter' | 'stop'>; prepareCapture(): void; reward(): void;
  animation: { request(callback: FrameRequestCallback): number; cancel(id: number): void; reducedMotion(): boolean };
  random?: () => number;
}
export function createTrainStore(deps: Dependencies) {
  let state: TrainState = { ...deps.identity(), active: false, letters: [], expanded: false, selected: '', mode: 'long',
    status: 'idle', progress: 0, evidence: null, result: null, error: null, preview: 'idle' };
  let session: TrainSession | null = null, frame: number | null = null, generation = 0, previewVersion = 0, disposed = false, rewarded = false;
  const listeners = new Set<() => void>();
  const set = (patch: Partial<TrainState>) => { if (!disposed) { state = { ...state, ...patch }; listeners.forEach(listener => listener()); } };
  const current = (token: number) => !disposed && state.active && token === generation;
  function cancel() {
    generation++; previewVersion++;
    if (frame !== null) deps.animation.cancel(frame); frame = null;
    const old = session; session = null; old?.dispose();
    if (state.preview === 'playing') deps.alphabet.stop();
  }
  function reset(active: boolean) {
    cancel(); set({ ...deps.identity(), active, selected: '', expanded: false, letters: [], status: 'idle', progress: 0,
      result: null, evidence: null, error: null, preview: 'idle' });
  }
  function stop() {
    if (!state.active || disposed) return;
    const interrupted = isBusy(state.status) || state.preview === 'playing';
    cancel();
    if (interrupted) set({ status: state.selected ? 'stopped' : 'idle', progress: 0, evidence: null, result: null, error: null, preview: 'idle' });
  }
  function expand() {
    if (!state.active || disposed || isBusy(state.status)) return;
    cancel(); set({ expanded: true, letters: nextLetters(state.letters, deps.random), selected: '', status: 'idle',
      progress: 0, evidence: null, result: null, error: null, preview: 'idle' });
  }
  async function select(letter: string) {
    if (!state.active || disposed || isBusy(state.status) || !targets[letter]) return;
    cancel(); const token = generation, previewToken = previewVersion;
    set({ selected: letter, expanded: false, status: 'selected', progress: 0, evidence: null, result: null, error: null, preview: 'playing' });
    try {
      const result = await deps.alphabet.letter(letter);
      if (current(token) && previewToken === previewVersion) set({ preview: result === 'ended' ? 'ended' : result === 'error' ? 'error' : 'idle' });
    } catch { if (current(token) && previewToken === previewVersion) set({ preview: 'error' }); }
  }
  function arrive(token: number) {
    if (!current(token) || !state.result?.correct || state.status === 'arriving' || state.status === 'complete') return;
    const from = state.progress, duration = deps.animation.reducedMotion() ? 150 : 2400;
    let started: number | null = null;
    set({ status: 'arriving' });
    const step: FrameRequestCallback = now => {
      frame = null; if (!current(token) || state.status !== 'arriving') return;
      if (started === null) started = now;
      const progress = Math.min(100, from + (100 - from) * (now - started) / duration);
      set({ progress });
      if (!current(token)) return;
      if (progress < 100) frame = deps.animation.request(step);
      else {
        set({ status: 'complete' });
        if (current(token) && !rewarded) { rewarded = true; deps.reward(); }
      }
    };
    frame = deps.animation.request(step);
  }
  async function start() {
    if (!state.active || disposed || !state.selected || isBusy(state.status)) return;
    deps.prepareCapture(); // May call stop() through the application's microphone coordinator.
    cancel(); const token = generation; rewarded = false;
    set({ status: 'loading', expanded: false, progress: 0, evidence: null, result: null, error: null, preview: 'idle' });
    try {
      session = deps.createSession({ letter: state.selected, mode: state.mode,
        onState(value) {
          if (!current(token)) return;
          if (value === 'complete') arrive(token);
          else if (state.status !== 'arriving' && state.status !== 'complete') set({ status: value });
        },
        onProgress(value) {
          if (!current(token) || ['arriving', 'complete'].includes(state.status)) return;
          set({ evidence: value, progress: value.progress < 100 ? Math.max(state.progress, Math.min(90, value.progress)) : state.progress });
        },
        onResult(result) { if (current(token) && !['arriving', 'complete'].includes(state.status)) set({ result }); },
        onError(error) {
          if (!current(token)) return;
          const code = error.name === 'Error' ? error.message : error.name;
          set({ status: 'error', error: code === 'PhonemeModelUnavailable' ? 'model'
            : ['NotAllowedError', 'PermissionDeniedError'].includes(code) ? 'denied' : code === 'MicrophoneTimeout' ? 'timeout' : 'microphone' });
        },
      });
      await session.start();
    } catch { if (current(token)) { cancel(); set({ status: 'error', error: 'microphone' }); } }
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    open() { if (!disposed) reset(true); }, close() { if (state.active) reset(false); }, stop, select, start, expand,
    contentStarted() { if (isBusy(state.status)) stop(); },
    center() { if (state.expanded) set({ expanded: false }); else if (state.selected) void start(); else expand(); },
    setMode(mode: TrainMode) { if (!disposed && state.active && mode !== state.mode) { stop(); set({ mode, status: state.selected ? 'selected' : 'idle', progress: 0, result: null, evidence: null, error: null }); } },
    syncIdentity() {
      const next = deps.identity();
      if (next.locale === state.locale && next.grade === state.grade && next.learner === state.learner) return;
      if (next.grade !== state.grade || next.learner !== state.learner) reset(state.active);
      else { stop(); set(next); }
    },
    dispose() { if (!disposed) { cancel(); disposed = true; listeners.clear(); } },
  };
}
export type TrainStore = ReturnType<typeof createTrainStore>;
