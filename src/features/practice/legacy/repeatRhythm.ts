import type { AudioWindow } from '../audio/types';
import { createRhythmAudio } from '../repeatRhythm/audio';
import { createRhythmStore } from '../repeatRhythm/store';
import type { GradeStore } from '../menus/gradeStore';
import type { ScreenNavigator } from '../navigation/screenNavigator';
import { profileStore } from '../profile/profileRuntime';
import { getPracticeLocale, subscribeToPracticeLocale } from './bridge';

export function installRepeatRhythm(navigator: ScreenNavigator, grades: GradeStore, stopOtherAudio: () => void, app = window as AudioWindow) {
  const store = createRhythmStore({ audio: createRhythmAudio(app), stopOtherAudio,
    identity: () => ({ locale: getPracticeLocale(), grade: grades.getSnapshot().current, learner: profileStore.getSnapshot().userId }),
  });
  const previousStop = app.stopRepeatRhythm; app.stopRepeatRhythm = store.pause;
  const releaseNavigation = navigator.register({ name: 'react-repeat-rhythm', leave: store.close,
    enter({ to }) { if (to === 'g0TaskRepeatRhythm') store.open(); },
  });
  const releaseLocale = subscribeToPracticeLocale(store.syncIdentity), releaseGrade = grades.subscribe(store.syncIdentity), releaseProfile = profileStore.subscribe(store.syncIdentity);
  const hidden = () => { if (app.document.hidden) store.pause(); };
  app.document.addEventListener('visibilitychange', hidden); app.addEventListener('pagehide', store.pause);
  // Compatibility link for the retired standalone page. Only this known exercise is accepted.
  const openLink = () => { if (new URLSearchParams(app.location.search).get('exercise') === 'repeat-rhythm') navigator.navigate('g0TaskRepeatRhythm'); };
  if (app.document.readyState === 'loading') app.document.addEventListener('DOMContentLoaded', openLink, { once: true });
  else openLink();
  return { store, dispose() {
    releaseNavigation(); releaseLocale(); releaseGrade(); releaseProfile(); store.dispose(); app.stopRepeatRhythm = previousStop;
    app.document.removeEventListener('visibilitychange', hidden); app.removeEventListener('pagehide', store.pause); app.document.removeEventListener('DOMContentLoaded', openLink);
  } };
}
