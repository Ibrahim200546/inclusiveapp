import type { CardIdentity } from '../cards/content';
import { freeSpan, judgeRhythm, makeRhythm, rhythmLevels, rhythmRounds, rhythmSignature, usedRhythmPads, type RhythmBeat, type RhythmPad } from './content';

export interface RhythmAudio { unlock(): Promise<boolean>; hit(pad: RhythmPad): boolean; stop(): void }
export interface RhythmState extends CardIdentity {
  active: boolean; level: number; phase: 'idle' | 'starting' | 'playing' | 'repeat' | 'result' | 'free';
  pattern: RhythmBeat[]; shown: number; taps: RhythmBeat[]; matches: boolean[]; success: boolean;
  rounds: number; done: number[]; lit: RhythmPad[]; silent: boolean;
}

export function createRhythmStore(deps: { identity(): CardIdentity; audio: RhythmAudio; stopOtherAudio(): void; random?(): number; now?(): number }) {
  const fresh = (active: boolean): RhythmState => ({ ...deps.identity(), active, level: 0, phase: 'idle', pattern: [], shown: 0, taps: [], matches: [], success: false, rounds: 0, done: [], lit: [], silent: false });
  let state = fresh(false), generation = 0, disposed = false, origin: number | null = null;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  const timers = new Set<ReturnType<typeof setTimeout>>(), lights = new Map<RhythmPad, ReturnType<typeof setTimeout>>();
  const listeners = new Set<() => void>();
  let recent: string[] = [];
  const now = deps.now ?? (() => performance.now());
  const set = (patch: Partial<RhythmState>) => { if (!disposed) { state = { ...state, ...patch }; listeners.forEach(listener => listener()); } };
  const current = (token: number) => !disposed && state.active && token === generation;
  function later(callback: () => void, ms: number) {
    const token = generation;
    const timer = setTimeout(() => { timers.delete(timer); if (current(token)) callback(); }, ms);
    timers.add(timer); return timer;
  }
  function cancel() {
    generation++; timers.forEach(clearTimeout); timers.clear(); lights.clear(); idleTimer = null; origin = null; deps.audio.stop();
  }
  function newPattern(level: number) {
    const pattern = makeRhythm(level, recent, deps.random);
    recent = [...recent, rhythmSignature(pattern)].slice(-12); return pattern;
  }
  function setup(level = state.level, rounds = state.rounds) {
    cancel();
    set({ level, rounds, phase: level < 0 ? 'free' : 'idle', pattern: level < 0 ? [] : newPattern(level), shown: 0, taps: [], matches: [], success: false, lit: [], silent: false });
  }
  function reset(active = state.active) {
    cancel(); recent = []; set(fresh(active));
    if (active) setup(0, 0);
  }
  function light(pad: RhythmPad) {
    const previous = lights.get(pad);
    if (previous) { clearTimeout(previous); timers.delete(previous); }
    set({ lit: [...new Set([...state.lit, pad])] });
    lights.set(pad, later(() => { lights.delete(pad); set({ lit: state.lit.filter(value => value !== pad) }); }, 240));
  }
  function sound(pad: RhythmPad) { if (!deps.audio.hit(pad)) set({ silent: true }); light(pad); }
  async function listen() {
    if (disposed || !state.active || !['idle', 'repeat'].includes(state.phase)) return;
    // The shared stop hook can interrupt this store, so call it before taking ownership.
    deps.stopOtherAudio(); cancel(); const token = generation;
    set({ phase: 'starting', taps: [], matches: [], shown: 0, lit: [], silent: false });
    let audible = false;
    try { audible = await deps.audio.unlock(); } catch { /* Visual and tactile practice remains available. */ }
    if (!current(token)) return;
    set({ phase: 'playing', silent: !audible });
    state.pattern.forEach((beat, index) => later(() => { sound(beat.pad); set({ shown: index + 1 }); }, beat.time + 400));
    // The bell has the longest envelope (920 ms), and must finish before input opens.
    later(() => set({ phase: 'repeat', lit: [] }), state.pattern.at(-1)!.time + 400 + 950);
  }
  function check() {
    if (state.phase !== 'repeat') return;
    const result = judgeRhythm(state.pattern, state.taps), rounds = state.rounds + Number(result.success);
    set({ phase: 'result', ...result, rounds, done: result.success && rounds === rhythmRounds ? [...new Set([...state.done, state.level])] : state.done });
    later(() => setup(result.success && rounds >= rhythmRounds ? (state.level < rhythmLevels.length - 1 ? state.level + 1 : -1) : state.level,
      result.success && rounds >= rhythmRounds ? 0 : rounds), result.success ? 2800 : 3200);
  }
  function tap(pad: RhythmPad) {
    if (disposed || !state.active || ![0, 1, 2, 3].includes(pad)) return;
    if (state.phase !== 'free' && (state.phase !== 'repeat' || state.taps.length >= state.pattern.length || !usedRhythmPads(state.pattern).includes(pad))) return;
    if (state.phase === 'free' && origin === null) deps.stopOtherAudio();
    const time = now();
    if (state.phase === 'free') {
      if (origin === null || time - origin > freeSpan) { origin = time; set({ taps: [] }); }
      // Free play starts on the first gesture, without adding an audible unlock beat.
      const token = generation;
      void deps.audio.unlock().then(audible => { if (current(token)) set({ silent: !audible }); }, () => { if (current(token)) set({ silent: true }); });
      sound(pad); set({ taps: [...state.taps, { time: time - origin!, pad }].slice(-64) }); return;
    }
    if (origin === null) origin = time;
    sound(pad); set({ taps: [...state.taps, { time: time - origin, pad }] });
    if (idleTimer) { clearTimeout(idleTimer); timers.delete(idleTimer); }
    idleTimer = later(check, state.taps.length === state.pattern.length ? 400 : 4000);
  }
  function pause() {
    if (!state.active || disposed) return;
    cancel();
    if (state.phase === 'result') setup(state.success && state.rounds >= rhythmRounds ? (state.level < rhythmLevels.length - 1 ? state.level + 1 : -1) : state.level,
      state.success && state.rounds >= rhythmRounds ? 0 : state.rounds);
    else set({ phase: state.level < 0 ? 'free' : 'idle', shown: 0, taps: [], matches: [], lit: [] });
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    open() { if (!disposed) reset(true); }, close() { if (state.active) reset(false); }, listen, tap, pause,
    selectLevel(level: number) { if (!disposed && state.active && Number.isInteger(level) && level >= -1 && level < rhythmLevels.length) setup(level, 0); },
    syncIdentity() {
      const next = deps.identity();
      if (next.grade !== state.grade || next.learner !== state.learner) reset();
      else if (next.locale !== state.locale) set(next);
    },
    dispose() { if (!disposed) { cancel(); disposed = true; listeners.clear(); } },
  };
}
export type RhythmStore = ReturnType<typeof createRhythmStore>;
