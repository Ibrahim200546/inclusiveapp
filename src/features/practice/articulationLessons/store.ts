import type { CardIdentity } from '../cards/content';
import type { CardPlayback } from '../cards/playback';
import { autumnRounds, exercises, narration, type Exercise, type LessonScreen } from './content';
import { clamp, durationMs } from './animation';

export interface LessonSnapshot extends CardIdentity {
  screen: LessonScreen | null; selected: Exercise; progress: number; speed: number; playing: boolean;
  round: number; solved: boolean; completed: boolean; rewarded: boolean; listening: boolean;
  feedback: '' | 'wrong' | 'right' | 'unavailable'; choices: string[];
}
interface Dependencies { identity(): CardIdentity; player: CardPlayback; reward(): void; random?: () => number }

export function createLessonStore({ identity, player, reward, random = Math.random }: Dependencies) {
  const initial = (): LessonSnapshot => ({ ...identity(), screen: null, selected: 'teeth', progress: 0, speed: .75, playing: false,
    round: 0, solved: false, completed: false, rewarded: false, listening: false, feedback: '', choices: [] });
  let snapshot = initial(), version = 0, disposed = false;
  const listeners = new Set<() => void>();
  const update = (changes: Partial<LessonSnapshot>) => { snapshot = { ...snapshot, ...changes }; listeners.forEach(listener => listener()); };
  function choices(screen: LessonScreen, round: number) {
    const values: string[] = screen === 'g0QSoundAdventure' ? ['Қ', 'К', 'Ғ', 'Т'] : [...autumnRounds[round].choices];
    for (let index = values.length - 1; index > 0; index--) {
      const next = Math.floor(random() * (index + 1));
      [values[index], values[next]] = [values[next], values[index]];
    }
    return values;
  }
  function stop() { version++; player.stop(); update({ listening: false, playing: false }); }
  function reset() {
    const screen = snapshot.screen;
    if (!screen || disposed) return;
    stop(); update({ round: 0, solved: false, completed: false, rewarded: false, feedback: '', choices: choices(screen, 0), progress: 0 });
  }
  function syncIdentity() {
    const next = identity();
    if (next.locale === snapshot.locale && next.grade === snapshot.grade && next.learner === snapshot.learner) return;
    const changedOwner = next.grade !== snapshot.grade || next.learner !== snapshot.learner;
    stop();
    if (changedOwner) {
      const screen = snapshot.screen;
      update({ ...initial(), screen, choices: screen ? choices(screen, 0) : [] });
    } else update(next);
  }
  function canPlayGame() { return !disposed && snapshot.screen !== null && snapshot.screen !== 'g0ArticulationLessons'; }
  function canAnimate() { return !disposed && snapshot.screen === 'g0ArticulationLessons'; }
  function announceCompletion() {
    syncIdentity();
    if (!canPlayGame() || !snapshot.completed || snapshot.rewarded) return;
    update({ rewarded: true }); reward();
  }
  async function listen() {
    syncIdentity();
    if (!canPlayGame() || snapshot.completed || snapshot.listening) return;
    const speech = narration(snapshot.screen!, snapshot.round, snapshot.locale);
    stop(); const token = version;
    update({ listening: true, feedback: snapshot.solved ? 'right' : '' });
    try {
      const result = await player.speak(speech.text, speech.locale);
      if (token !== version || disposed) return;
      update({ listening: false, ...(result !== 'ended' ? { feedback: 'unavailable' as const } : {}) });
    } catch {
      if (token === version && !disposed) update({ listening: false, feedback: 'unavailable' });
    }
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    start(screen: LessonScreen) {
      if (disposed) return;
      syncIdentity(); stop();
      update({ screen }); reset();
    },
    close() { stop(); update({ screen: null }); },
    stop, reset, syncIdentity, listen, announceCompletion,
    select(selected: Exercise) {
      if (!canAnimate() || !exercises.includes(selected)) return;
      stop(); update({ selected, progress: 0 });
    },
    play() { if (canAnimate()) update({ playing: true }); },
    pause() { if (canAnimate()) update({ playing: false }); },
    restart() { if (canAnimate()) update({ progress: 0, playing: true }); },
    seek(progress: number) { if (canAnimate() && Number.isFinite(progress)) update({ progress: clamp(progress, 0, 1), playing: false }); },
    setSpeed(speed: number) { if (canAnimate() && Number.isFinite(speed)) update({ speed: clamp(speed, .25, 2) }); },
    advance(milliseconds: number) {
      if (canAnimate() && snapshot.playing && Number.isFinite(milliseconds) && milliseconds > 0)
        update({ progress: (snapshot.progress + Math.min(milliseconds, 100) * snapshot.speed / durationMs) % 1 });
    },
    answer(choice: string) {
      syncIdentity();
      if (!canPlayGame() || snapshot.completed || snapshot.solved || !snapshot.choices.includes(choice)) return;
      const correct = snapshot.screen === 'g0QSoundAdventure' ? 'Қ' : autumnRounds[snapshot.round].key;
      update({ solved: choice === correct, feedback: choice === correct ? 'right' : 'wrong' });
    },
    next() {
      syncIdentity();
      if (!canPlayGame() || !snapshot.solved || snapshot.completed) return;
      stop();
      if (snapshot.round === 2) { update({ completed: true }); announceCompletion(); }
      else { const round = snapshot.round + 1; update({ round, solved: false, feedback: '', choices: choices(snapshot.screen!, round) }); }
    },
    dispose() { stop(); disposed = true; snapshot = { ...snapshot, screen: null }; listeners.clear(); },
  };
}
export type LessonStore = ReturnType<typeof createLessonStore>;
