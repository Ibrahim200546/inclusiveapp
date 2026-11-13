import type { AudioWindow } from '../audio/types';
import { createCardPlayback } from '../cards/playback';
import { createVerbStore } from '../verbs/store';
import type { GradeStore } from '../menus/gradeStore';
import type { ScreenNavigator } from '../navigation/screenNavigator';
import { profileStore } from '../profile/profileRuntime';
import { getPracticeLocale, subscribeToPracticeLocale } from './bridge';

type VerbWindow = AudioWindow & { showReward?(): void; playError?(): void };
export function installPracticeVerbs(navigator: ScreenNavigator, grades: GradeStore, stopContent: () => void, app = window as VerbWindow) {
  const player = createCardPlayback(app, stopContent, { speed: .82, timeoutMs: 8000, exactMatch: true });
  const store = createVerbStore({ player,
    identity: () => ({ locale: getPracticeLocale(), grade: grades.getSnapshot().current, learner: profileStore.getSnapshot().userId }),
    // The shared reward modal still belongs to the classic shell and awards ten coins.
    reward: () => app.showReward?.(), error: () => app.playError?.(),
  });
  const releaseNavigation = navigator.register({ name: 'react-verbs', leave: store.close,
    enter({ to }) { if (to === 'g2VerbModule') store.start(); },
  });
  const releaseLocale = subscribeToPracticeLocale(store.syncIdentity), releaseGrade = grades.subscribe(store.syncIdentity), releaseProfile = profileStore.subscribe(store.syncIdentity);
  const hidden = () => { if (app.document.hidden) store.stop(); };
  app.addEventListener('pagehide', store.stop); app.document.addEventListener('visibilitychange', hidden);
  return { store, dispose() {
    releaseNavigation(); releaseLocale(); releaseGrade(); releaseProfile();
    app.removeEventListener('pagehide', store.stop); app.document.removeEventListener('visibilitychange', hidden); store.dispose();
  } };
}
