import type { AudioWindow } from '../audio/types';
import type { GradeStore } from '../menus/gradeStore';
import type { ScreenNavigator } from '../navigation/screenNavigator';
import { profileStore } from '../profile/profileRuntime';
import { createTrainSession } from '../train/session';
import { createTrainStore } from '../train/store';
import type { PhonemeModel } from '../train/types';
import { getPracticeLocale, subscribeToPracticeLocale } from './bridge';
import type { AlphabetAudio } from './reading';

export function installTrainPractice(navigator: ScreenNavigator, grades: GradeStore, model: PhonemeModel, alphabet: AlphabetAudio,
  prepareCapture: () => void, app = window as AudioWindow & { showReward?(): void }) {
  const store = createTrainStore({
    identity: () => ({ locale: getPracticeLocale(), grade: grades.getSnapshot().current, learner: profileStore.getSnapshot().userId }),
    createSession: options => createTrainSession(options, model, app), alphabet, prepareCapture,
    reward: () => app.showReward?.(), animation: { request: app.requestAnimationFrame.bind(app), cancel: app.cancelAnimationFrame.bind(app),
      reducedMotion: () => app.matchMedia('(prefers-reduced-motion: reduce)').matches },
  });
  const previous = app.stopVoiceGame, previousCapture = app.stopTrainCapture;
  app.stopVoiceGame = store.stop; app.stopTrainCapture = store.contentStarted;
  const releaseNavigation = navigator.register({ name: 'react-train', leave: store.close, enter({ to }) { if (to === 'g0Task2') store.open(); } });
  const releaseLocale = subscribeToPracticeLocale(store.syncIdentity), releaseGrade = grades.subscribe(store.syncIdentity), releaseProfile = profileStore.subscribe(store.syncIdentity);
  const hidden = () => { if (app.document.hidden) store.stop(); };
  app.document.addEventListener('visibilitychange', hidden); app.addEventListener('pagehide', store.close);
  return { store, dispose() {
    releaseNavigation(); releaseLocale(); releaseGrade(); releaseProfile(); store.dispose();
    if (previous === undefined) delete app.stopVoiceGame; else app.stopVoiceGame = previous;
    if (previousCapture === undefined) delete app.stopTrainCapture; else app.stopTrainCapture = previousCapture;
    app.document.removeEventListener('visibilitychange', hidden); app.removeEventListener('pagehide', store.close);
  } };
}
