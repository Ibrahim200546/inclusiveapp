import * as session from '../learning/session';
import { numbers, pairs, soundItems, type ListeningMode } from '../learning/content';
import { createListeningPlayback } from '../learning/playback';
import { createListeningStore, type SoundLibrary } from '../learning/listeningStore';
import { saveLearningProgress } from '../learning/progress';
import { getPracticeLocale, subscribeToPracticeLocale } from './bridge';
import { profileStore } from '../profile/profileRuntime';
import type { ScreenNavigator } from '../navigation/screenNavigator';
import type { AudioWindow } from '../audio/types';

type LearningWindow = AudioWindow & {
  CorexGradeSounds: SoundLibrary;
  CorexGrades?: { current: number };
  CorexLearning?: unknown;
  practiceListening?: { open(mode: Exclude<ListeningMode, 'recognition'>): void; saveProgress(grade: number, context: string, objective: string, result: Record<string, unknown>): boolean };
  showReward?(): void;
};

export function installLegacyLearning(navigator: ScreenNavigator, app = window as LearningWindow) {
  const previousLearning = app.CorexLearning, previousListening = app.practiceListening;
  app.CorexLearning = { ...session, numbers, pairs, soundItems };
  const save = (learner: string | null, grade: number, context: string, objective: string, result: Record<string, unknown>) => {
    try { return saveLearningProgress(app.localStorage, learner, grade, context, objective, result); } catch { return false; }
  };
  const store = createListeningStore({
    player: createListeningPlayback(app), sounds: app.CorexGradeSounds, getLocale: getPracticeLocale,
    getLearner: () => profileStore.getSnapshot().userId, save, reward: () => app.showReward?.(),
  });
  app.practiceListening = {
    open(mode) {
      navigator.navigate('learningPracticeScreen');
      store.start({ host: 'learningPracticeScreen', mode, grade: app.CorexGrades?.current ?? 0 });
    },
    saveProgress: (grade, context, objective, result) => save(profileStore.getSnapshot().userId, grade, context, objective, result),
  };
  const releaseNavigation = navigator.register({
    name: 'react-listening', leave: store.close,
    enter({ to }) {
      const destination = app.document.getElementById(to);
      const grade = app.CorexGrades?.current ?? 0;
      if (to === 'g0Task5') store.start({ host: to, mode: 'dance', grade });
      else if (destination?.classList.contains('recognition-screen')) store.start({ host: to, mode: 'recognition', grade, category: destination.dataset.category });
    },
  });
  const releaseLocale = subscribeToPracticeLocale(() => store.setLocale(getPracticeLocale()));
  const releaseProfile = profileStore.subscribe(() => {
    const current = store.getSnapshot();
    if (current && current.learner !== profileStore.getSnapshot().userId) store.close();
  });
  const hidden = () => { if (app.document.hidden) store.stop(); };
  app.addEventListener('pagehide', store.stop); app.document.addEventListener('visibilitychange', hidden);
  return {
    store, sounds: app.CorexGradeSounds,
    dispose() {
      releaseNavigation(); releaseLocale(); releaseProfile();
      app.removeEventListener('pagehide', store.stop); app.document.removeEventListener('visibilitychange', hidden);
      store.dispose();
      if (previousLearning === undefined) delete app.CorexLearning; else app.CorexLearning = previousLearning;
      if (previousListening === undefined) delete app.practiceListening; else app.practiceListening = previousListening;
    },
  };
}
