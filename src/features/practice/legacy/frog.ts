import { createFrogAnimation } from '../frog/animation';
import { createFrogStore } from '../frog/store';
import type { GradeStore } from '../menus/gradeStore';
import type { ScreenNavigator } from '../navigation/screenNavigator';
import { profileStore } from '../profile/profileRuntime';
import { getPracticeLocale, subscribeToPracticeLocale } from './bridge';

export function installFrogPractice(navigator: ScreenNavigator, grades: GradeStore, app = window) {
  const animation = createFrogAnimation(app);
  const store = createFrogStore({ motion: animation,
    identity: () => ({ locale: getPracticeLocale(), grade: grades.getSnapshot().current, learner: profileStore.getSnapshot().userId }),
  });
  const releaseNavigation = navigator.register({ name: 'react-frog', leave: store.close,
    enter({ to }) { if (to === 'g0TaskFrog') store.open(); },
  });
  const releaseLocale = subscribeToPracticeLocale(store.syncIdentity), releaseGrade = grades.subscribe(store.syncIdentity), releaseProfile = profileStore.subscribe(store.syncIdentity);
  const hidden = () => { if (app.document.hidden) store.pause(); };
  const alphabet = (event: FocusEvent) => {
    if (event.target instanceof Element && event.target.closest('#g0TaskFrog .alippe-panel, #g0TaskFrog #alippeWordDisplay')) store.pause();
  };
  app.document.addEventListener('visibilitychange', hidden); app.document.addEventListener('focusin', alphabet); app.addEventListener('pagehide', store.pause);
  return { store, animation, dispose() {
    releaseNavigation(); releaseLocale(); releaseGrade(); releaseProfile(); store.dispose(); animation.dispose();
    app.document.removeEventListener('visibilitychange', hidden); app.document.removeEventListener('focusin', alphabet); app.removeEventListener('pagehide', store.pause);
  } };
}
export type FrogRuntime = ReturnType<typeof installFrogPractice>;
