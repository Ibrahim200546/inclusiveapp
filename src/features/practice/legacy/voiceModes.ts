import type { AudioWindow } from '../audio/types';
import { createCardPlayback } from '../cards/playback';
import { modeForScreen } from '../voiceModes/content';
import { createVoiceModeStore } from '../voiceModes/store';
import type { GradeStore } from '../menus/gradeStore';
import type { ScreenNavigator } from '../navigation/screenNavigator';
import { profileStore } from '../profile/profileRuntime';
import { getPracticeLocale, subscribeToPracticeLocale } from './bridge';

export function installVoiceModes(navigator: ScreenNavigator, grades: GradeStore, stopContent: () => void, app = window as AudioWindow) {
  const store = createVoiceModeStore({
    identity: () => ({ locale: getPracticeLocale(), grade: grades.getSnapshot().current, learner: profileStore.getSnapshot().userId }),
    player: createCardPlayback(app, stopContent),
  });
  const previousStop = app.stopVoiceModes;
  app.stopVoiceModes = store.stop;
  const releaseNavigation = navigator.register({ name: 'react-voice-modes', leave: store.close,
    enter({ to }) { const mode = modeForScreen(to); if (mode) store.start(mode); },
  });
  const releaseLocale = subscribeToPracticeLocale(store.syncIdentity), releaseGrade = grades.subscribe(store.syncIdentity), releaseProfile = profileStore.subscribe(store.syncIdentity);
  const hidden = () => { if (app.document.hidden) store.stop(); };
  app.document.addEventListener('visibilitychange', hidden); app.addEventListener('pagehide', store.stop);
  return { store, dispose() {
    releaseNavigation(); releaseLocale(); releaseGrade(); releaseProfile(); store.dispose();
    app.stopVoiceModes = previousStop;
    app.document.removeEventListener('visibilitychange', hidden); app.removeEventListener('pagehide', store.stop);
  } };
}
