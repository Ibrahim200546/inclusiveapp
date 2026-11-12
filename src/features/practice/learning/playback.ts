import type { AudioWindow } from '../audio/types';
import type { ListeningItem, Locale, SoundEvent } from './content';

export interface ListeningPlayback {
  play(item: ListeningItem, locale: Locale): Promise<void>;
  events(events: SoundEvent[]): Promise<void>;
  stop(): void;
}

/** Each attempt owns its media, timer and cancellation, including a pending play/resume. */
export function createListeningPlayback(app: AudioWindow): ListeningPlayback {
  let cancel: (() => void) | null = null;
  function stop() { cancel?.(); }
  function file(path: string) {
    stop();
    return new Promise<void>((resolve, reject) => {
      const audio = new app.Audio(path);
      let settled = false, cancelled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true; cancelled = Boolean(error); app.clearTimeout(timer);
        audio.removeEventListener('ended', ended); audio.removeEventListener('error', failed); audio.removeEventListener('pause', paused);
        if (cancel === abort) cancel = null;
        if (error) { audio.pause(); audio.currentTime = 0; reject(error); } else resolve();
      };
      const ended = () => finish(), failed = () => finish(new Error('Audio unavailable'));
      const paused = () => { if (!audio.ended) finish(new Error('Audio interrupted')); };
      const abort = () => finish(new Error('Cancelled'));
      const timer = app.setTimeout(() => finish(new Error('Audio timeout')), 60_000);
      cancel = abort;
      audio.addEventListener('ended', ended); audio.addEventListener('error', failed); audio.addEventListener('pause', paused);
      try {
        void audio.play().then(() => { if (cancelled) { audio.pause(); audio.currentTime = 0; } }, error => finish(error));
      }
      catch (error) { finish(error as Error); }
    });
  }
  function events(stimulus: SoundEvent[]) {
    stop();
    return new Promise<void>((resolve, reject) => {
      const Context = app.AudioContext || app.webkitAudioContext;
      if (!Context || !stimulus.length) { reject(new Error('Audio unavailable')); return; }
      const ctx = new Context();
      const nodes: AudioNode[] = [];
      let settled = false;
      let endTimer: number | undefined;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true; app.clearTimeout(timeout); app.clearTimeout(endTimer);
        if (cancel === abort) cancel = null;
        nodes.forEach(node => node.disconnect());
        void ctx.close().catch(() => {});
        if (error) reject(error); else resolve();
      };
      const abort = () => finish(new Error('Cancelled'));
      const timeout = app.setTimeout(() => finish(new Error('Audio timeout')), 60_000);
      cancel = abort;
      void ctx.resume().then(() => {
        if (settled) return;
        const start = ctx.currentTime + .05;
        for (const event of stimulus) {
          const oscillator = ctx.createOscillator(), gain = ctx.createGain();
          nodes.push(oscillator, gain);
          oscillator.frequency.value = event.frequency;
          gain.gain.setValueAtTime(0, start + event.start);
          gain.gain.linearRampToValueAtTime(.12, start + event.start + .01);
          gain.gain.setValueAtTime(.12, start + event.start + event.duration - .02);
          gain.gain.linearRampToValueAtTime(0, start + event.start + event.duration);
          oscillator.connect(gain).connect(ctx.destination);
          oscillator.start(start + event.start); oscillator.stop(start + event.start + event.duration);
        }
        const end = Math.max(...stimulus.map(event => event.start + event.duration));
        endTimer = app.setTimeout(() => finish(), (end + .1) * 1000);
      }).catch(error => finish(error));
    });
  }
  return {
    stop, events,
    play: (item, locale) => item.events ? events(item.events) : file((locale === 'ru' && item.audioRu) || item.audio || ''),
  };
}
