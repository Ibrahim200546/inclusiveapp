import type { AudioWindow } from '../audio/types';
import { createCardPlayback } from '../cards/playback';
import { createVowelStore } from '../vowels/store';
import { vowelScreens, type VowelScreen } from '../vowels/content';
import type { GradeStore } from '../menus/gradeStore';
import type { ScreenNavigator } from '../navigation/screenNavigator';
import { profileStore } from '../profile/profileRuntime';
import { getPracticeLocale, subscribeToPracticeLocale } from './bridge';

export function installVowelPractice(navigator: ScreenNavigator, grades: GradeStore, stopContent: () => void, app = window as AudioWindow) {
  const store = createVowelStore({
    identity: () => ({ locale: getPracticeLocale(), grade: grades.getSnapshot().current, learner: profileStore.getSnapshot().userId }),
    player: createCardPlayback(app, stopContent),
  });
  const previousStop = app.stopVowelPractice;
  app.stopVowelPractice = store.stop;
  const releaseNavigation = navigator.register({ name: 'react-vowels', leave: store.close,
    enter({ to }) { if (vowelScreens.includes(to)) store.start(to as VowelScreen); },
  });
  const releaseLocale = subscribeToPracticeLocale(store.syncIdentity), releaseGrade = grades.subscribe(store.syncIdentity), releaseProfile = profileStore.subscribe(store.syncIdentity);
  const hidden = () => { if (app.document.hidden) store.stop(); };
  app.document.addEventListener('visibilitychange', hidden); app.addEventListener('pagehide', store.stop);
  return { store, dispose() {
    releaseNavigation(); releaseLocale(); releaseGrade(); releaseProfile(); store.dispose();
    app.stopVowelPractice = previousStop;
    app.document.removeEventListener('visibilitychange', hidden); app.removeEventListener('pagehide', store.stop);
  } };
}
