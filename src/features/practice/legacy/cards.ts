import type { AudioWindow } from '../audio/types';
import { createCardPlayback } from '../cards/playback';
import { createSentenceStore } from '../cards/sentenceStore';
import { createSpatialStore } from '../cards/spatialStore';
import type { GradeStore } from '../menus/gradeStore';
import type { ScreenNavigator } from '../navigation/screenNavigator';
import { profileStore } from '../profile/profileRuntime';
import { getPracticeLocale, subscribeToPracticeLocale } from './bridge';

/** Navigation and identity are shared with the remaining classic exercises. */
export function installPracticeCards(navigator: ScreenNavigator, grades: GradeStore, stopContent: () => void, app = window as AudioWindow) {
  const player = createCardPlayback(app, stopContent);
  const identity = () => ({ locale: getPracticeLocale(), grade: grades.getSnapshot().current, learner: profileStore.getSnapshot().userId });
  const sentence = createSentenceStore(player, identity);
  const spatial = createSpatialStore(player, identity, result => {
    const audio = app.document.getElementById(result === 'complete' ? 'clapAudio' : result === 'correct' ? 'successSound' : 'errorSound');
    if (audio instanceof app.HTMLAudioElement) { audio.currentTime = 0; void audio.play().catch(() => {}); }
  });
  const releaseNavigation = navigator.register({
    name: 'react-cards',
    leave() { sentence.close(); spatial.close(); },
    enter({ to }) {
      if (to === 'sentenceBuilderScreen') sentence.start();
      if (to === 'grade0SpatialMatrixScreen') spatial.start();
    },
  });
  const sync = () => { sentence.syncIdentity(); spatial.syncIdentity(); };
  const releaseLocale = subscribeToPracticeLocale(sync), releaseGrade = grades.subscribe(sync), releaseProfile = profileStore.subscribe(sync);
  const stop = () => { sentence.stop(); spatial.stop(); };
  const hidden = () => { if (app.document.hidden) stop(); };
  app.addEventListener('pagehide', stop); app.document.addEventListener('visibilitychange', hidden);
  return { sentence, spatial, dispose() {
    releaseNavigation(); releaseLocale(); releaseGrade(); releaseProfile();
    app.removeEventListener('pagehide', stop); app.document.removeEventListener('visibilitychange', hidden);
    sentence.dispose(); spatial.dispose();
  } };
}
export type CardRuntime = ReturnType<typeof installPracticeCards>;
