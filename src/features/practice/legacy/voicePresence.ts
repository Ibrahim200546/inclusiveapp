import type { AudioWindow } from '../audio/types';
import { createPresencePlayer } from '../voicePresence/player';
import { createTeacherRecorder } from '../voicePresence/recorder';
import { createPresenceStore } from '../voicePresence/store';
import type { GradeStore } from '../menus/gradeStore';
import type { ScreenNavigator } from '../navigation/screenNavigator';
import { profileStore } from '../profile/profileRuntime';
import { saveLearningProgress } from '../learning/progress';
import { getPracticeLocale, subscribeToPracticeLocale } from './bridge';

export function installVoicePresence(navigator: ScreenNavigator, grades: GradeStore,
  audio: { stopContentPlayback(): void; stopAllAppAudio(): void }, app = window as AudioWindow) {
  const video = createPresencePlayer(app, audio.stopContentPlayback), recorder = createTeacherRecorder(app);
  const store = createPresenceStore({
    identity: () => ({ locale: getPracticeLocale(), grade: grades.getSnapshot().current, learner: profileStore.getSnapshot().userId }),
    player: video, recorder, prepareCapture: audio.stopAllAppAudio,
    save(owner, result) { return saveLearningProgress(app.localStorage, owner.learner, owner.grade, 'listening', 'voice-presence', { ...result }); },
  });
  const previousStop = app.stopVoicePresence;
  app.stopVoicePresence = store.stop;
  const releaseNavigation = navigator.register({ name: 'react-voice-presence', leave: store.close,
    enter({ to }) { if (to === 'voicePresenceScreen') store.start(); },
  });
  const releaseLocale = subscribeToPracticeLocale(store.syncIdentity), releaseGrade = grades.subscribe(store.syncIdentity), releaseProfile = profileStore.subscribe(store.syncIdentity);
  const hidden = () => { if (app.document.hidden) store.stop(); };
  app.document.addEventListener('visibilitychange', hidden); app.addEventListener('pagehide', store.close);
  return { store, video, recorder, dispose() {
    releaseNavigation(); releaseLocale(); releaseGrade(); releaseProfile(); store.dispose(); video.dispose();
    if (previousStop === undefined) delete app.stopVoicePresence; else app.stopVoicePresence = previousStop;
    app.document.removeEventListener('visibilitychange', hidden); app.removeEventListener('pagehide', store.close);
  } };
}
export type PresenceRuntime = ReturnType<typeof installVoicePresence>;
