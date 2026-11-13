import type { AudioWindow } from '../audio/types';
import { createCardPlayback } from '../cards/playback';
import { lessonScreens, type LessonScreen } from '../articulationLessons/content';
import { createLessonStore } from '../articulationLessons/store';
import type { GradeStore } from '../menus/gradeStore';
import type { ScreenNavigator } from '../navigation/screenNavigator';
import { profileStore } from '../profile/profileRuntime';
import { getPracticeLocale, subscribeToPracticeLocale } from './bridge';

export function installArticulationLessons(navigator: ScreenNavigator, grades: GradeStore, stopContent: () => void,
  app = window as AudioWindow & { showReward?(): void }) {
  const store = createLessonStore({
    identity: () => ({ locale: getPracticeLocale(), grade: grades.getSnapshot().current, learner: profileStore.getSnapshot().userId }),
    player: createCardPlayback(app, stopContent, { exactMatch: true, speed: .85, timeoutMs: 6500 }),
    reward: () => app.showReward?.(),
  });
  const releaseNavigation = navigator.register({ name: 'react-articulation-lessons', leave: store.close,
    enter({ to }) { if (lessonScreens.includes(to)) store.start(to as LessonScreen); },
  });
  const releaseLocale = subscribeToPracticeLocale(store.syncIdentity), releaseGrade = grades.subscribe(store.syncIdentity), releaseProfile = profileStore.subscribe(store.syncIdentity);
  const hidden = () => { if (app.document.hidden) store.stop(); };
  app.document.addEventListener('visibilitychange', hidden);
  app.addEventListener('pagehide', store.stop);
  return { store, dispose() {
    releaseNavigation(); releaseLocale(); releaseGrade(); releaseProfile(); store.dispose();
    app.document.removeEventListener('visibilitychange', hidden); app.removeEventListener('pagehide', store.stop);
  } };
}
