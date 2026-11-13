import type { AudioWindow } from '../audio/types';
import { createCardPlayback } from '../cards/playback';
import { createArticulationRecorder } from '../articulation/recorder';
import { createArticulationStore } from '../articulation/store';
import type { GradeStore } from '../menus/gradeStore';
import type { ScreenNavigator } from '../navigation/screenNavigator';
import { profileStore } from '../profile/profileRuntime';
import { getPracticeLocale, subscribeToPracticeLocale } from './bridge';

type ArticulationWindow = AudioWindow & { openArticulationMap?(from?: string): void; goBackFromArticulationMap?(): void; playSuccess?(): void; playError?(): void };
export function installPracticeArticulation(navigator: ScreenNavigator, grades: GradeStore,
  audio: { stopContentPlayback(): void; stopAllAppAudio(): void }, app = window as ArticulationWindow) {
  const store = createArticulationStore({
    identity: () => ({ locale: getPracticeLocale(), grade: grades.getSnapshot().current, learner: profileStore.getSnapshot().userId }),
    player: createCardPlayback(app, audio.stopContentPlayback), recorder: createArticulationRecorder(app), prepareRecording: audio.stopAllAppAudio,
    reward() { profileStore.addCoins(10); app.playSuccess?.(); }, error: () => app.playError?.(),
  });
  const normalize = (screen: string) => {
    if (screen === 'grade0VoiceMenu' || screen === 'grade1Menu') return 'grade0Menu';
    return screen !== 'g0ArticulationMap' && app.document.getElementById(screen)?.classList.contains('screen') ? screen : 'grade0Menu';
  };
  let returnOverride: string | null = null;
  const previous = { open: app.openArticulationMap, back: app.goBackFromArticulationMap, stop: app.stopArticulationPractice };
  app.openArticulationMap = from => { returnOverride = normalize(from || navigator.getActiveScreen() || store.getSnapshot().returnTo); navigator.navigate('g0ArticulationMap'); };
  app.goBackFromArticulationMap = () => navigator.navigate(store.getSnapshot().returnTo);
  app.stopArticulationPractice = store.cancelWork;
  const releaseNavigation = navigator.register({ name: 'react-articulation-map', leave: store.close,
    enter({ from, to }) { if (to === 'g0ArticulationMap') { store.start(returnOverride || normalize(from || store.getSnapshot().returnTo)); returnOverride = null; } },
  });
  const releaseLocale = subscribeToPracticeLocale(store.syncIdentity), releaseGrade = grades.subscribe(store.syncIdentity), releaseProfile = profileStore.subscribe(store.syncIdentity);
  return { store, dispose() {
    releaseNavigation(); releaseLocale(); releaseGrade(); releaseProfile(); store.dispose();
    app.openArticulationMap = previous.open; app.goBackFromArticulationMap = previous.back; app.stopArticulationPractice = previous.stop;
  } };
}
