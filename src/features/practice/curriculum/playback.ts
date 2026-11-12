import type { AudioWindow } from '../audio/types';

export type PlaybackResult = 'ended' | 'interrupted' | 'error' | 'cancelled';
export interface CurriculumPlayback {
  play(path: string): Promise<PlaybackResult>;
  pause(): void;
  resume(): void;
  stop(): void;
}

/** A recording owns its listeners, timeout and pending play/resume promises. */
export function createCurriculumPlayback(app: AudioWindow): CurriculumPlayback {
  let current: { stop(): void; pause(): void; resume(): void } | null = null;
  const stop = () => current?.stop();
  return {
    stop, pause: () => current?.pause(), resume: () => current?.resume(),
    play(path) {
      stop();
      return new Promise(resolve => {
        const audio = new app.Audio(path);
        let settled = false, pausedByUser = false, attempt = 0, lastTime = -1, lastAdvance = Date.now();
        const reset = () => { audio.pause(); try { audio.currentTime = 0; } catch { /* Unloaded recording. */ } };
        const finish = (result: PlaybackResult) => {
          if (settled) return;
          settled = true; app.clearInterval(timeout);
          audio.removeEventListener('ended', ended); audio.removeEventListener('error', failed); audio.removeEventListener('pause', paused);
          if (current === control) current = null;
          if (result !== 'ended') reset();
          resolve(result);
        };
        const ended = () => finish('ended'), failed = () => finish('error');
        const paused = () => { if (audio.paused && !audio.ended && !pausedByUser) finish('interrupted'); };
        const start = () => {
          const token = ++attempt;
          try {
            void audio.play().then(() => { if (settled) reset(); }, () => { if (token === attempt) failed(); });
          } catch { failed(); }
        };
        const control = {
          stop: () => finish('cancelled'),
          pause() { if (!settled) { pausedByUser = true; attempt++; audio.pause(); } },
          resume() { if (!settled && pausedByUser) { pausedByUser = false; lastAdvance = Date.now(); start(); } },
        };
        const timeout = app.setInterval(() => {
          if (pausedByUser || audio.currentTime !== lastTime) { lastTime = audio.currentTime; lastAdvance = Date.now(); }
          else if (Date.now() - lastAdvance > 30000) failed();
        }, 2000);
        current = control;
        audio.addEventListener('ended', ended); audio.addEventListener('error', failed); audio.addEventListener('pause', paused);
        start();
      });
    },
  };
}
