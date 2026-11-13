import type { AudioWindow } from '../audio/types';
export function stopLegacyInputStreams(app: AudioWindow) {
  for (const stop of [app.stopVoicePractice, app.stopReading, app.stopVoiceGame, app.stopArticulationPractice, app.stopVowelPractice]) {
    try { stop?.(); } catch { /* Other input streams still need to stop. */ }
  }
}
