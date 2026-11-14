import { createBreathStore } from '../oneBreath/store';
import type { GradeStore } from '../menus/gradeStore';
import type { ScreenNavigator } from '../navigation/screenNavigator';
import { profileStore } from '../profile/profileRuntime';
import { getPracticeLocale, subscribeToPracticeLocale } from './bridge';

export function installOneBreath(navigator: ScreenNavigator, grades: GradeStore, app = window) {
  const store = createBreathStore({
    identity: () => ({ locale: getPracticeLocale(), grade: grades.getSnapshot().current, learner: profileStore.getSnapshot().userId }),
  });
  const releaseNavigation = navigator.register({ name: 'react-one-breath', leave: store.close,
    enter({ to }) { if (to === 'g0TynysByOneBreath') store.open(); },
  });
  const releaseLocale = subscribeToPracticeLocale(store.syncIdentity), releaseGrade = grades.subscribe(store.syncIdentity), releaseProfile = profileStore.subscribe(store.syncIdentity);
  const hidden = () => { if (app.document.hidden) store.pause(); };
  app.document.addEventListener('visibilitychange', hidden); app.addEventListener('pagehide', store.pause);
  const openLink = () => { if (new URLSearchParams(app.location.search).get('exercise') === 'one-breath') navigator.navigate('g0TynysByOneBreath'); };
  if (app.document.readyState === 'loading') app.document.addEventListener('DOMContentLoaded', openLink, { once: true });
  else openLink();
  return { store, dispose() {
    releaseNavigation(); releaseLocale(); releaseGrade(); releaseProfile(); store.dispose();
    app.document.removeEventListener('visibilitychange', hidden); app.removeEventListener('pagehide', store.pause); app.document.removeEventListener('DOMContentLoaded', openLink);
  } };
}
