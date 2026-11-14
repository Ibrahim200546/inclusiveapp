import type { AudioWindow } from '../audio/types';
import type { PresencePlayer, VideoLoadResult, VideoPlayResult } from './types';

/** React owns the video node. Only media properties and playback live here. */
export function createPresencePlayer(app: AudioWindow, stopContent: () => void) {
  let video: HTMLVideoElement | null = null, objectUrl = '', disposed = false;
  let context: AudioContext | null = null, source: MediaElementAudioSourceNode | null = null;
  let analyser: AnalyserNode | null = null, gain: GainNode | null = null;
  let cancelLoad: (() => void) | null = null;
  let current: { element: HTMLVideoElement; finish(result: VideoPlayResult): void } | null = null;
  function stop() { current?.finish({ kind: 'cancelled' }); video?.pause(); if (gain) gain.gain.value = 0; }
  function clear() {
    cancelLoad?.(); stop();
    if (video) { video.removeAttribute('src'); video.load(); }
    if (objectUrl) app.URL.revokeObjectURL(objectUrl);
    objectUrl = '';
  }
  function detach() {
    clear(); video = null;
    source?.disconnect(); analyser?.disconnect(); gain?.disconnect();
    if (context && context.state !== 'closed') void context.close().catch(() => {});
    context = null; source = null; analyser = null; gain = null;
  }
  const player: PresencePlayer = {
    stop, clear,
    load(blob) {
      clear();
      const element = video;
      if (disposed || !element) return Promise.resolve('cancelled');
      return new Promise<VideoLoadResult>(resolve => {
        let settled = false, url = '';
        const finish = (result: VideoLoadResult) => {
          if (settled) return;
          settled = true; app.clearTimeout(timeout);
          element.removeEventListener('loadedmetadata', metadata); element.removeEventListener('error', failed);
          if (cancelLoad === cancel) cancelLoad = null;
          resolve(result);
        };
        const cancel = () => finish('cancelled');
        const metadata = () => {
          if (element.currentSrc !== url || element.readyState < 1) return;
          finish(element.videoWidth > 0 && element.videoHeight > 0 ? 'ready' : 'noVideo');
        };
        const failed = () => { if (element.error) finish('unsupported'); };
        const timeout = app.setTimeout(() => finish('unsupported'), 15000);
        cancelLoad = cancel;
        element.addEventListener('loadedmetadata', metadata); element.addEventListener('error', failed);
        try { url = objectUrl = app.URL.createObjectURL(blob); element.src = url; element.load(); }
        catch { finish('unsupported'); }
      });
    },
    play(voiced, detectSignal) {
      stop(); stopContent();
      const element = video;
      if (disposed || !element || !objectUrl) return Promise.resolve({ kind: 'cancelled' });
      return new Promise<VideoPlayResult>(resolve => {
        let settled = false, signal = false, started = false, frame: number | undefined;
        let lastTime = -1, lastAdvance = Date.now();
        const finish = (result: VideoPlayResult) => {
          if (settled) return;
          settled = true; app.clearInterval(timeout); if (frame !== undefined) app.cancelAnimationFrame(frame);
          element.removeEventListener('ended', ended); element.removeEventListener('error', failed); element.removeEventListener('pause', paused);
          if (current === attempt) { current = null; if (gain) gain.gain.value = 0; }
          element.pause(); resolve(result);
        };
        const ended = () => { if (element.ended) finish({ kind: 'ended', signal }); };
        const failed = () => finish({ kind: 'failed' });
        const paused = () => { if (started && element.paused && !element.ended) finish({ kind: 'interrupted' }); };
        const timeout = app.setInterval(() => {
          if (element.currentTime !== lastTime) { lastTime = element.currentTime; lastAdvance = Date.now(); }
          else if (Date.now() - lastAdvance > 30000) failed();
        }, 2000);
        const attempt = { element, finish }; current = attempt;
        element.addEventListener('ended', ended); element.addEventListener('error', failed); element.addEventListener('pause', paused);
        void (async () => {
          try {
            element.muted = !voiced; element.volume = 1; element.playbackRate = 1;
            // One source/context per mounted video; reusing it permits replacing files.
            if (!context) {
              const Context = app.AudioContext || app.webkitAudioContext;
              if (!Context) throw new Error('Web Audio is unavailable');
              context = new Context(); source = context.createMediaElementSource(element);
              analyser = context.createAnalyser(); analyser.fftSize = 2048; gain = context.createGain();
              source.connect(analyser); analyser.connect(gain); gain.connect(context.destination);
            }
            gain!.gain.value = voiced ? 1 : 0;
            await context.resume();
            if (current !== attempt) return;
            element.currentTime = 0;
            if (detectSignal) {
              const samples = new Uint8Array(analyser!.fftSize), meter = analyser!;
              const sampleWindow = meter.fftSize / context.sampleRate;
              const measure = () => {
                if (current !== attempt || signal) return;
                // Reused analysers can still contain the preceding file's samples.
                // Wait for a fresh window from the currently playing video.
                if (!element.paused && element.currentTime >= sampleWindow) {
                  meter.getByteTimeDomainData(samples);
                  signal = samples.some(value => Math.abs(value - 128) > 1);
                }
                if (!signal) frame = app.requestAnimationFrame(measure);
              };
              measure();
            }
            if (element.error) throw new Error('Invalid video');
            started = true; await element.play();
            // A cancelled native play may resolve after a new source or screen opens.
            if (current !== attempt && current?.element !== element) element.pause();
          } catch { if (current === attempt) failed(); }
        })();
      });
    },
  };
  return { ...player,
    attach(element: HTMLVideoElement) {
      if (disposed) return () => {};
      detach(); video = element;
      return () => { if (video === element) detach(); };
    },
    dispose() { if (!disposed) { detach(); disposed = true; } },
  };
}
export type PresenceVideo = ReturnType<typeof createPresencePlayer>;
