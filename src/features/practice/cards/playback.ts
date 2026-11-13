import type { AudioWindow, TtsOptions } from '../audio/types';
import type { Locale } from '../learning/content';
import { createCurriculumPlayback, type PlaybackResult } from '../curriculum/playback';

export interface CardPlayback {
  speak(text: string, locale: Locale): Promise<PlaybackResult>;
  recording(path: string): Promise<PlaybackResult>;
  stop(): void;
}

export function createCardPlayback(app: AudioWindow, stopContent: () => void, speech: Pick<TtsOptions, 'speed' | 'timeoutMs' | 'exactMatch'> = { speed: .85, timeoutMs: 6500 }): CardPlayback {
  const media = createCurriculumPlayback(app);
  let version = 0, speaking = false;
  function stop() {
    version++; media.stop();
    if (speaking) { speaking = false; app.appTts?.stop(); }
  }
  return {
    stop,
    recording(path) { stop(); stopContent(); return media.play(path); },
    async speak(text, locale) {
      stop(); stopContent(); const token = version; speaking = true;
      try {
        const result = await app.appTts?.speakText(text, locale === 'ru' ? 'ru-RU' : 'kk-KZ', {
          provider: 'yandex', ...speech, waitUntilEnd: true,
        });
        if (token !== version) return 'cancelled';
        if (result?.ok) return 'ended';
        return result && 'reason' in result && result.reason === 'cancelled' ? 'interrupted' : 'error';
      } catch { return token === version ? 'error' : 'cancelled'; }
      finally { if (token === version) speaking = false; }
    },
  };
}
