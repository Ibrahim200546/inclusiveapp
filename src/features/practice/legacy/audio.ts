import type { AudioWindow } from '../audio/types';
export function stopLegacyInputStreams(app: AudioWindow) {
  for (const stop of [app.stopReading, app.stopVoiceGame, app.stopArticulationPractice, app.stopVowelPractice, app.stopVoiceModes, app.stopVoicePresence, app.stopRepeatRhythm]) {
    try { stop?.(); } catch { /* Other input streams still need to stop. */ }
  }
}
