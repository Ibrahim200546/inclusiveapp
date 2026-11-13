import type { CardIdentity } from '../cards/content';
import type { CardPlayback } from '../cards/playback';
import { analyzeRecording, type AcousticResult } from './analysis';
import { recordingPath, visibleLetters, type Ring } from './content';
import type { ArticulationRecorder } from './recorder';

export type ArticulationPhase = 'idle' | 'playing' | 'starting' | 'recording' | 'done' | 'audioError' | 'denied' | 'unavailable' | 'unsupported' | 'interrupted';
export interface ArticulationSnapshot extends CardIdentity {
  active: boolean; open: boolean; first: string | null; second: string | null; third: string | null; pending: string | null;
  lesson: string | null; returnTo: string; phase: ArticulationPhase; sample: string | null; levels: number[]; result: AcousticResult | null;
}
interface Dependencies { identity(): CardIdentity; player: Pick<CardPlayback, 'recording' | 'stop'>; recorder: ArticulationRecorder; prepareRecording(): void; reward(): void; error(): void }
export function createArticulationStore({ identity, player, recorder, prepareRecording, reward, error }: Dependencies) {
  const initial = (): ArticulationSnapshot => ({ ...identity(), active: false, open: false, first: null, second: null, third: null,
    pending: null, lesson: null, returnTo: 'grade0Menu', phase: 'idle', sample: null, levels: [], result: null });
  let snapshot = initial(), version = 0, timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();
  const update = (changes: Partial<ArticulationSnapshot>) => { snapshot = { ...snapshot, ...changes }; listeners.forEach(listener => listener()); };
  function cancelWork() {
    version++; clearTimeout(timer); timer = undefined; player.stop(); recorder.stop();
    update({ levels: [], sample: null, ...(['starting', 'recording', 'playing'].includes(snapshot.phase) ? { phase: 'interrupted' } : {}) });
  }
  async function play(letter = snapshot.lesson) {
    if (!snapshot.active || !letter) return;
    cancelWork(); const token = version; update({ phase: 'playing', sample: letter, result: null });
    let result; try { result = await player.recording(recordingPath(letter)); } catch { result = 'error'; }
    if (token !== version) return;
    update({ phase: result === 'ended' ? 'idle' : result === 'error' ? 'audioError' : 'interrupted', sample: null });
  }
  function finishRecording() {
    if (!snapshot.active || !snapshot.lesson || snapshot.phase !== 'recording') return;
    version++; clearTimeout(timer); timer = undefined;
    const result = analyzeRecording(snapshot.lesson, recorder.finish());
    update({ phase: 'done', result, levels: [] });
    if (result.success) reward(); else error();
  }
  async function record() {
    if (!snapshot.active || !snapshot.lesson) return;
    if (snapshot.phase === 'recording') { finishRecording(); return; }
    if (snapshot.phase === 'starting') { cancelWork(); return; }
    cancelWork(); prepareRecording(); const token = version;
    update({ phase: 'starting', result: null });
    const result = await recorder.start(levels => { if (token === version) update({ levels }); }, () => {
      if (token === version) { cancelWork(); update({ phase: 'unavailable' }); }
    });
    if (token !== version) return;
    if (result !== 'started') { update({ phase: result === 'cancelled' ? 'interrupted' : result }); return; }
    update({ phase: 'recording' }); timer = setTimeout(finishRecording, 3500);
  }
  function syncIdentity() {
    const next = identity();
    if (next.locale === snapshot.locale && next.grade === snapshot.grade && next.learner === snapshot.learner) return;
    const changedOwner = next.grade !== snapshot.grade || next.learner !== snapshot.learner;
    cancelWork();
    update(changedOwner ? { ...initial(), active: snapshot.active, returnTo: snapshot.returnTo } : { ...next, pending: null });
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    start(returnTo = snapshot.returnTo) { cancelWork(); update({ ...initial(), active: true, returnTo }); },
    close() { cancelWork(); update({ active: false, lesson: null, pending: null }); },
    cancelWork, syncIdentity, play, record, finishRecording,
    center() { if (!snapshot.active || snapshot.lesson) return; cancelWork(); update({ open: true, first: null, second: null, third: null, pending: null, phase: 'idle', result: null }); },
    collapse() { if (!snapshot.active) return; cancelWork(); update({ open: false, first: null, second: null, third: null, pending: null, lesson: null, phase: 'idle', result: null }); },
    select(ring: Ring, letter: string) {
      if (!snapshot.active || snapshot.lesson || !visibleLetters(snapshot.open, snapshot.first, snapshot.second)[ring]?.includes(letter)) return;
      const key = `${ring}:${letter}`, openLesson = snapshot.pending === key;
      cancelWork();
      update({ ...(ring === 1 ? { first: letter, second: null, third: null } : ring === 2 ? { second: letter, third: null } : { third: letter }),
        pending: openLesson ? null : key, lesson: openLesson ? letter : null, result: null });
      void play(letter);
    },
    closeLesson() { cancelWork(); update({ lesson: null, pending: null, phase: 'idle', result: null }); },
    dispose() { cancelWork(); listeners.clear(); snapshot = { ...snapshot, active: false, lesson: null }; },
  };
}
export type ArticulationStore = ReturnType<typeof createArticulationStore>;
