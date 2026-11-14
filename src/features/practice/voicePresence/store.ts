import type { CardIdentity } from '../cards/content';
import type { PresenceMessage } from './content';
import type { PresencePlayer, TeacherRecorder, TeacherRecordingResult, VideoLoadResult, VideoPlayResult } from './types';

export interface PresenceSnapshot extends CardIdentity {
  active: boolean; phase: 'setup' | 'preview' | 'example' | 'question' | 'complete'; index: number;
  ready: boolean; loading: boolean; playing: boolean; watched: boolean; answered: boolean;
  questions: boolean[]; attempts: [number, number]; message: PresenceMessage | null;
  capture: 'idle' | 'requesting' | 'recording' | 'finishing'; camera: MediaStream | null; fileReset: number;
  saved: boolean | null;
}
export interface PresenceResult { completed: number; attempts: number; results: { id: string; attempts: number }[] }
interface Dependencies {
  identity(): CardIdentity; player: PresencePlayer; recorder: TeacherRecorder; prepareCapture(): void;
  save(owner: CardIdentity, result: PresenceResult): boolean; random?: () => number;
}

export function createPresenceStore({ identity, player, recorder, prepareCapture, save, random = Math.random }: Dependencies) {
  const blank = () => ({ ...identity(), phase: 'setup' as const, index: 0, ready: false, loading: false, playing: false, watched: false, answered: false,
    questions: [] as boolean[], attempts: [0, 0] as [number, number], message: null, capture: 'idle' as const, camera: null, saved: null });
  let snapshot: PresenceSnapshot = { ...blank(), active: false, fileReset: 0 }, version = 0, disposed = false;
  const listeners = new Set<() => void>();
  const update = (changes: Partial<PresenceSnapshot>) => { snapshot = { ...snapshot, ...changes }; listeners.forEach(listener => listener()); };
  function reset(clearInput = true) {
    version++; recorder.cancel(); player.clear();
    update({ ...blank(), fileReset: snapshot.fileReset + Number(clearInput) });
  }
  function stop() {
    if (disposed) return;
    version++; player.stop(); recorder.cancel();
    const pending = snapshot.playing || snapshot.loading || snapshot.capture !== 'idle';
    if (snapshot.loading) { player.clear(); update({ ready: false, phase: 'setup', fileReset: snapshot.fileReset + 1 }); }
    if (pending) update({ playing: false, loading: false, watched: false, capture: 'idle', camera: null, message: 'interrupted' });
  }
  function syncIdentity() {
    if (disposed) return;
    const next = identity();
    if (next.locale === snapshot.locale && next.grade === snapshot.grade && next.learner === snapshot.learner) return;
    if (next.grade !== snapshot.grade || next.learner !== snapshot.learner) reset();
    else { stop(); update(next); }
  }
  function active() { syncIdentity(); return !disposed && snapshot.active; }
  async function loadSource(blob: Blob | undefined) {
    if (!active()) return;
    reset(false); if (!blob) return;
    const token = version; update({ loading: true, message: 'loading' });
    let result: VideoLoadResult;
    try { result = await player.load(blob); } catch { result = 'unsupported'; }
    if (token !== version || disposed) return;
    if (result === 'ready') update({ ready: true, phase: 'preview', loading: false, message: null });
    else { player.clear(); update({ loading: false, message: result === 'cancelled' ? 'interrupted' : result, fileReset: snapshot.fileReset + 1 }); }
  }
  function advance(phase: PresenceSnapshot['phase'], index = 0) {
    version++; player.stop(); update({ phase, index, playing: false, watched: false, answered: false, message: null });
  }
  function beginQuestions() {
    const first = random() < .5;
    update({ questions: [first, !first], attempts: [0, 0], saved: null }); advance('question');
  }
  function saveResult() {
    if (!active() || snapshot.phase !== 'complete' || snapshot.saved === true) return;
    const { locale, grade, learner, questions, attempts } = snapshot;
    let saved = false;
    try { saved = save({ locale, grade, learner }, { completed: 2, attempts: attempts[0] + attempts[1],
      results: questions.map((voiced, i) => ({ id: voiced ? 'voiced' : 'silent', attempts: attempts[i] })) }); } catch { /* Keep the completed exercise available for a retry. */ }
    update({ saved, message: saved ? null : 'saveFailed' });
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    start() { if (!disposed) { reset(); update({ active: true }); } },
    close() { if (!disposed) { reset(); update({ active: false }); } },
    stop, syncIdentity, loadSource, saveResult,
    async record() {
      if (!active() || snapshot.capture !== 'idle') return;
      reset(); prepareCapture(); const token = version;
      update({ capture: 'requesting', message: 'permission' });
      let result: TeacherRecordingResult;
      try { result = await recorder.start(stream => {
        if (token === version && !disposed) update({ camera: stream, capture: 'recording', message: 'recording' });
      }); } catch { result = { kind: 'failed' }; }
      if (token !== version || disposed) return;
      update({ capture: 'idle', camera: null, message: null });
      if (result.kind === 'recorded') await loadSource(result.source);
      else if (result.kind === 'failed') update({ message: 'cameraFailed' });
    },
    finishRecording() { if (active() && snapshot.capture === 'recording') { update({ capture: 'finishing', message: 'finishing' }); recorder.finish(); } },
    cancelRecording() { if (active() && snapshot.capture !== 'idle') { version++; recorder.cancel(); update({ capture: 'idle', camera: null, message: null }); } },
    failRecording() { if (active() && snapshot.capture !== 'idle') { version++; recorder.cancel(); update({ capture: 'idle', camera: null, message: 'cameraFailed' }); } },
    async play() {
      if (!active() || !snapshot.ready || snapshot.playing || snapshot.answered || snapshot.phase === 'complete') return;
      const token = ++version, preview = snapshot.phase === 'preview';
      const voiced = preview || (snapshot.phase === 'example' ? snapshot.index === 0 : snapshot.questions[snapshot.index]);
      update({ playing: true, watched: false, message: 'playing' });
      let result: VideoPlayResult;
      try { result = await player.play(voiced, preview); } catch { result = { kind: 'failed' }; }
      if (token !== version || disposed) return;
      if (result.kind === 'ended') update({ playing: false, watched: !preview || result.signal, message: preview && !result.signal ? 'noVoice' : null });
      else update({ playing: false, watched: false, message: result.kind === 'failed' ? 'failed' : 'interrupted' });
    },
    next() {
      if (!active() || snapshot.playing) return;
      if (snapshot.phase === 'complete') { beginQuestions(); return; }
      if (!snapshot.ready || !snapshot.watched) return;
      if (snapshot.phase === 'preview') advance('example');
      else if (snapshot.phase === 'example' && snapshot.index === 0) advance('example', 1);
      else if (snapshot.phase === 'example') beginQuestions();
      else if (snapshot.phase === 'question' && snapshot.answered) advance('question', 1);
    },
    answer(choice: boolean) {
      if (!active() || snapshot.phase !== 'question' || !snapshot.watched || snapshot.playing || snapshot.answered) return;
      const attempts: [number, number] = [...snapshot.attempts]; attempts[snapshot.index]++;
      if (choice !== snapshot.questions[snapshot.index]) { update({ attempts, watched: false, message: 'wrong' }); return; }
      update({ attempts, answered: true, message: 'right' });
      if (snapshot.index === 1) { advance('complete'); saveResult(); }
    },
    dispose() {
      if (disposed) return;
      version++; recorder.cancel(); player.clear(); disposed = true;
      snapshot = { ...blank(), active: false, fileReset: snapshot.fileReset }; listeners.clear();
    },
  };
}
export type PresenceStore = ReturnType<typeof createPresenceStore>;
