import { isEffectMedia, type AudioWindow } from './types';

interface MediaOptions {
  prepare?(audio: HTMLAudioElement): void;
  contentStarted?(audio: HTMLAudioElement): void;
  released?(audio: HTMLAudioElement): void;
}
export function createMediaCoordinator(app: AudioWindow, root: Document, options: MediaOptions = {}) {
  // Kept as one stable array for classic exercises which inspect _activeAudios.
  const active: HTMLAudioElement[] = [];
  const observed = new Map<HTMLAudioElement, () => void>();
  const attempts = new WeakMap<HTMLAudioElement, { cancelled: boolean }>();
  const nativePlay = app.HTMLMediaElement.prototype.play;
  let disposed = false;

  function release(audio: HTMLAudioElement, cancelPending = false) {
    if (cancelPending) { const attempt = attempts.get(audio); if (attempt) attempt.cancelled = true; }
    observed.get(audio)?.(); observed.delete(audio);
    for (let index = active.length - 1; index >= 0; index--) if (active[index] === audio) active.splice(index, 1);
    options.released?.(audio);
  }
  function track<T extends HTMLAudioElement>(audio: T): T {
    if (disposed) return audio;
    if (!active.includes(audio)) active.push(audio);
    if (!observed.has(audio)) {
      const ended = () => release(audio);
      // A queued pause event from an older play must not unregister a resume.
      const paused = () => { if (audio.paused) release(audio, true); };
      const failed = () => release(audio, true);
      const emptied = () => { if (audio.networkState === 0) release(audio, true); };
      const listeners = { ended, pause: paused, error: failed, abort: failed, emptied };
      for (const [event, listener] of Object.entries(listeners)) audio.addEventListener(event, listener);
      observed.set(audio, () => { for (const [event, listener] of Object.entries(listeners)) audio.removeEventListener(event, listener); });
    }
    return audio;
  }
  function stop({ includeEffects = true, except = null }: { includeEffects?: boolean; except?: HTMLAudioElement | null } = {}) {
    const all = new Set([...active, ...root.querySelectorAll<HTMLAudioElement>('audio')]);
    for (const audio of all) {
      if (audio === except || (!includeEffects && isEffectMedia(audio))) continue;
      release(audio, true);
      try { audio.pause(); } catch { /* Continue stopping other media. */ }
      try { audio.currentTime = 0; } catch { /* An unloaded media element may not be seekable. */ }
    }
  }
  const patchedPlay = function (this: HTMLMediaElement): Promise<void> {
    if (!(this instanceof app.HTMLAudioElement) || disposed) return nativePlay.call(this);
    const audio = track(this);
    audio.preload = 'auto';
    const attempt = { cancelled: false }; attempts.set(audio, attempt);
    if (!isEffectMedia(audio)) {
      stop({ includeEffects: false, except: audio });
      options.contentStarted?.(audio);
    }
    options.prepare?.(audio);
    let pending: Promise<void>;
    try { pending = nativePlay.call(audio); }
    catch (error) { release(audio, true); return Promise.reject(error); }
    return Promise.resolve(pending).then(() => {
      if (attempt.cancelled || attempts.get(audio) !== attempt || disposed) {
        // Do not pause a newer play of this same element.
        if (attempts.get(audio) === attempt) { try { audio.pause(); audio.currentTime = 0; } catch { /* Already stopped. */ } }
        throw new DOMException('Playback was cancelled', 'AbortError');
      }
    }, error => {
      if (attempts.get(audio) === attempt) release(audio, true);
      throw error;
    });
  };
  app.HTMLMediaElement.prototype.play = patchedPlay;
  return {
    active, track, stop,
    dispose() {
      if (disposed) return;
      stop(); disposed = true;
      observed.forEach(remove => remove()); observed.clear(); active.length = 0;
      if (app.HTMLMediaElement.prototype.play === patchedPlay) app.HTMLMediaElement.prototype.play = nativePlay;
    },
  };
}
