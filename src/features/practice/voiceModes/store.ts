import type { CardIdentity } from '../cards/content';
import type { CardPlayback } from '../cards/playback';
import type { PlaybackResult } from '../curriculum/playback';
import { voiceAnimals, voiceRecording, type VoiceAnimal, type VoiceMode } from './content';

export interface VoiceModeSnapshot extends CardIdentity {
  mode: VoiceMode | null;
  selected: VoiceAnimal | null;
  status: 'idle' | 'playing' | 'finished' | 'error' | 'interrupted';
}
interface Dependencies { identity(): CardIdentity; player: Pick<CardPlayback, 'recording' | 'stop'> }

export function createVoiceModeStore({ identity, player }: Dependencies) {
  let snapshot: VoiceModeSnapshot = { ...identity(), mode: null, selected: null, status: 'idle' };
  let version = 0, disposed = false;
  const listeners = new Set<() => void>();
  const update = (changes: Partial<VoiceModeSnapshot>) => { snapshot = { ...snapshot, ...changes }; listeners.forEach(listener => listener()); };
  function cancel() { version++; player.stop(); }
  function stop() {
    if (disposed) return;
    cancel();
    if (snapshot.status === 'playing') update({ status: 'interrupted' });
  }
  function syncIdentity() {
    if (disposed) return;
    const next = identity();
    if (next.locale === snapshot.locale && next.grade === snapshot.grade && next.learner === snapshot.learner) return;
    const changedOwner = next.grade !== snapshot.grade || next.learner !== snapshot.learner;
    stop();
    update({ ...next, ...(changedOwner ? { selected: null, status: 'idle' as const } : {}) });
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    start(mode: VoiceMode) {
      if (disposed) return;
      cancel(); update({ ...identity(), mode, selected: null, status: 'idle' });
    },
    close() { if (!disposed) { cancel(); update({ mode: null, selected: null, status: 'idle' }); } },
    stop, syncIdentity,
    async play(id: VoiceAnimal) {
      syncIdentity();
      const animal = voiceAnimals.find(item => item.id === id), mode = snapshot.mode;
      if (disposed || !mode || !animal) return;
      cancel(); const token = version;
      update({ selected: id, status: 'playing' });
      let result: PlaybackResult;
      try { result = await player.recording(voiceRecording(mode, animal)); } catch { result = 'error'; }
      if (token !== version || disposed) return;
      update({ status: result === 'ended' ? 'finished' : result === 'error' ? 'error' : 'interrupted' });
    },
    dispose() { if (!disposed) { cancel(); disposed = true; snapshot = { ...snapshot, mode: null, selected: null, status: 'idle' }; listeners.clear(); } },
  };
}
export type VoiceModeStore = ReturnType<typeof createVoiceModeStore>;
