import type { AudioWindow } from '../audio/types';
import type { ScreenNavigator } from '../navigation/screenNavigator';

// Still a classic lexical global; the recording engine will migrate with articulation.
declare const articulationEngine: { isRecording?: boolean; stop(): void } | undefined;
export function stopLegacyInputStreams(app: AudioWindow) {
  for (const stop of [app.stopVoicePractice, app.stopReading, app.stopVoiceGame]) {
    try { stop?.(); } catch { /* Other input streams still need to stop. */ }
  }
  try { if (typeof articulationEngine !== 'undefined' && articulationEngine?.isRecording) articulationEngine.stop(); }
  catch { /* A legacy recording engine can already be disposed. */ }
}

// These navigation helpers used to live in app-audio.js but do not own audio.
export function installArticulationNavigation(navigator: ScreenNavigator) {
  const app = window as Window & {
    __articulationReturnScreen?: string; openArticulationMap?: (from?: string) => void; goBackFromArticulationMap?: () => void;
    closeArticulationModal?: () => void; initArticulationMap?: () => void;
  };
  const previousOpen = app.openArticulationMap, previousBack = app.goBackFromArticulationMap;
  const normalize = (screen?: string | null) => screen === 'grade0VoiceMenu' || screen === 'grade1Menu' ? 'grade0Menu' : screen;
  const closeModal = () => { try { app.closeArticulationModal?.(); } catch { /* Navigation should still complete. */ } };
  app.openArticulationMap = from => {
    const active = navigator.getActiveScreen();
    app.__articulationReturnScreen = normalize(from) || normalize(active !== 'g0ArticulationMap' ? active : null) || normalize(app.__articulationReturnScreen) || 'grade0Menu';
    closeModal(); app.initArticulationMap?.(); navigator.navigate('g0ArticulationMap');
  };
  app.goBackFromArticulationMap = () => { closeModal(); navigator.navigate(normalize(app.__articulationReturnScreen) || 'grade0Menu'); };
  return () => { app.openArticulationMap = previousOpen; app.goBackFromArticulationMap = previousBack; };
}
