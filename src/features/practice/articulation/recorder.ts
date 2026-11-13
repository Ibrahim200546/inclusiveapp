import type { AudioWindow } from '../audio/types';
import { extractFrame, type AcousticFrame } from './analysis';

export type CaptureResult = 'started' | 'cancelled' | 'denied' | 'unavailable' | 'unsupported';
export interface ArticulationRecorder {
  start(onLevels: (levels: number[]) => void, onInterrupted: () => void): Promise<CaptureResult>;
  finish(): AcousticFrame[];
  stop(): void;
}
export function createArticulationRecorder(app: AudioWindow): ArticulationRecorder {
  type Session = { context: AudioContext | null; stream: MediaStream | null; source: MediaStreamAudioSourceNode | null;
    analyser: AnalyserNode | null; frame: number | null; history: AcousticFrame[]; release: (() => void)[] };
  let current: Session | null = null;
  function stop() {
    const session = current; current = null; if (!session) return;
    session.release.forEach(release => release());
    if (session.frame !== null) app.cancelAnimationFrame(session.frame);
    session.stream?.getTracks().forEach(track => track.stop());
    try { session.source?.disconnect(); session.analyser?.disconnect(); } catch { /* Already disconnected. */ }
    if (session.context && session.context.state !== 'closed') void session.context.close().catch(() => {});
  }
  return {
    stop,
    finish() { const frames = current?.history ?? []; stop(); return frames; },
    async start(onLevels, onInterrupted) {
      stop();
      const Context = app.AudioContext || app.webkitAudioContext;
      if (!Context || !app.navigator.mediaDevices?.getUserMedia) return 'unsupported';
      const session: Session = { context: null, stream: null, source: null, analyser: null, frame: null, history: [], release: [] };
      current = session;
      try {
        const context = new Context(); session.context = context;
        // Resume during the user gesture; cancellation also closes a pending context.
        const resumed = context.resume().then(() => true, () => false);
        const stream = await app.navigator.mediaDevices.getUserMedia({ audio: true });
        if (current !== session) { stream.getTracks().forEach(track => track.stop()); return 'cancelled'; }
        session.stream = stream;
        if (!await resumed) throw new Error('Audio context did not resume');
        if (current !== session) return 'cancelled';
        if (!stream.getAudioTracks().some(track => track.readyState === 'live')) throw new Error('No active microphone');
        const interrupted = () => { if (current === session) { stop(); onInterrupted(); } };
        for (const track of stream.getAudioTracks()) {
          track.addEventListener('ended', interrupted); session.release.push(() => track.removeEventListener('ended', interrupted));
        }
        const stateChanged = () => { if (context.state !== 'running') interrupted(); };
        context.addEventListener('statechange', stateChanged); session.release.push(() => context.removeEventListener('statechange', stateChanged));
        const analyser = context.createAnalyser(); session.analyser = analyser;
        analyser.fftSize = 2048; analyser.smoothingTimeConstant = .6;
        const source = context.createMediaStreamSource(stream); session.source = source; source.connect(analyser);
        const bins = new Uint8Array(analyser.frequencyBinCount); let lastUpdate = -Infinity;
        function frame(time: number) {
          if (current !== session) return;
          analyser.getByteFrequencyData(bins);
          const sample = extractFrame(bins);
          if (sample.energy > 15) session.history.push(sample);
          if (session.history.length > 2000) session.history.shift();
          if (time - lastUpdate >= 50) {
            lastUpdate = time;
            onLevels(Array.from({ length: 20 }, (_, index) => {
              let peak = 0;
              for (let bin = Math.floor(index * bins.length / 20); bin < Math.floor((index + 1) * bins.length / 20); bin++) peak = Math.max(peak, bins[bin]);
              return peak / 255;
            }));
          }
          if (current === session) session.frame = app.requestAnimationFrame(frame);
        }
        session.frame = app.requestAnimationFrame(frame);
        return 'started';
      } catch (error) {
        if (current !== session) return 'cancelled';
        stop();
        const name = error && typeof error === 'object' && 'name' in error ? String(error.name) : '';
        return ['NotAllowedError', 'PermissionDeniedError'].includes(name) ? 'denied' : 'unavailable';
      }
    },
  };
}
