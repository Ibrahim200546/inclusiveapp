import type { AudioWindow } from '../audio/types';
import type { Locale } from '../learning/content';
import { createCurriculumPlayback, type PlaybackResult } from '../curriculum/playback';

export interface ReadingPlayback {
  play(text: string, locale: Locale, options?: { path?: string; speed?: number }): Promise<boolean>;
  paths(paths: string[]): Promise<PlaybackResult>;
  stop(): void;
}

/** Reading and alphabet share a single cancellable content channel. */
export function createReadingPlayback(app: AudioWindow): ReadingPlayback {
  const media = createCurriculumPlayback(app);
  let version = 0, speaking = false;
  function stop() {
    version++; media.stop();
    if (speaking) { speaking = false; app.appTts?.stop(); }
  }
  async function paths(candidates: string[]): Promise<PlaybackResult> {
    stop(); const token = version;
    for (const path of [...new Set(candidates.filter(Boolean))]) {
      const result = await media.play(path);
      if (token !== version) return 'cancelled';
      if (result !== 'error') return result;
    }
    return 'error';
  }
  return {
    paths, stop,
    async play(text, locale, options = {}) {
      if (options.path) return await paths([options.path]) === 'ended';
      stop(); const token = version;
      speaking = true;
      try {
        const result = await app.appTts?.speakText(text, locale === 'ru' ? 'ru-RU' : 'kk-KZ', {
          provider: 'yandex', speed: options.speed ?? .78, waitUntilEnd: true,
        });
        return token === version && Boolean(result?.ok);
      } finally { if (token === version) speaking = false; }
    },
  };
}
