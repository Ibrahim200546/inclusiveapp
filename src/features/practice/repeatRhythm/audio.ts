import type { AudioWindow } from '../audio/types';
import { rhythmPads, type RhythmPad } from './content';
import type { RhythmAudio } from './store';

/** Owns every source and context, including a resume which completes after navigation. */
export function createRhythmAudio(app: AudioWindow): RhythmAudio {
  let context: AudioContext | null = null, noise: AudioBuffer | null = null, generation = 0;
  let pending: { promise: Promise<boolean>; finish(value: boolean): void } | null = null;
  const sources = new Map<AudioScheduledSourceNode, AudioNode[]>();
  const disconnect = (source: AudioScheduledSourceNode) => {
    source.onended = null;
    for (const node of sources.get(source) ?? []) { try { node.disconnect(); } catch { /* Already disconnected. */ } }
    sources.delete(source);
  };
  function stop() {
    generation++; pending?.finish(false);
    for (const source of [...sources.keys()]) { try { source.stop(); } catch { /* Already stopped. */ } disconnect(source); }
    const previous = context; context = null; noise = null;
    try { if (previous && previous.state !== 'closed') void previous.close().catch(() => {}); } catch { /* Unsupported close. */ }
    try { app.navigator.vibrate?.(0); } catch { /* Optional haptics. */ }
  }
  function unlock(): Promise<boolean> {
    if (pending) return pending.promise;
    try {
      const Context = app.AudioContext || app.webkitAudioContext;
      if (!Context) return Promise.resolve(false);
      context ??= new Context();
      const active = context;
      if (active.state === 'running') return Promise.resolve(true);
      let resolve!: (value: boolean) => void;
      const promise = new Promise<boolean>(done => { resolve = done; });
      const timer = app.setTimeout(() => { if (context === active) stop(); }, 1500);
      const operation = { promise, finish(value: boolean) {
        if (pending !== operation) return;
        app.clearTimeout(timer); pending = null; resolve(value);
      } };
      pending = operation;
      void active.resume().then(() => operation.finish(context === active && active.state === 'running'), () => { if (context === active) stop(); });
      return promise;
    } catch { stop(); return Promise.resolve(false); }
  }
  function hit(pad: RhythmPad): boolean {
    try { app.navigator.vibrate?.(rhythmPads[pad].vibration); } catch { /* Optional haptics. */ }
    const active = context;
    if (!active) return false;
    if (active.state !== 'running') {
      const token = generation;
      void unlock().then(ready => { if (ready && token === generation) hit(pad); });
      return true;
    }
    const time = active.currentTime;
    const envelope = (gain: GainNode, peak: number, duration: number) => {
      gain.gain.setValueAtTime(.0001, time); gain.gain.exponentialRampToValueAtTime(peak, time + .012);
      gain.gain.exponentialRampToValueAtTime(.001, time + duration);
    };
    const track = (source: AudioScheduledSourceNode, nodes: AudioNode[], duration: number) => {
      sources.set(source, [source, ...nodes]); source.onended = () => disconnect(source);
      source.start(time); source.stop(time + duration);
    };
    const oscillator = (type: OscillatorType, from: number, to: number, duration: number, peak: number) => {
      const source = active.createOscillator(), gain = active.createGain();
      // Register before configuration so partial Web Audio failures are cleaned up too.
      sources.set(source, [source, gain]);
      source.type = type; source.frequency.setValueAtTime(from, time);
      if (to) source.frequency.exponentialRampToValueAtTime(to, time + duration * .6);
      envelope(gain, peak, duration); source.connect(gain); gain.connect(active.destination); track(source, [gain], duration + .02);
    };
    try {
      if (pad === 0) oscillator('sine', 190, 70, .42, .6);
      else if (pad === 2) { oscillator('sine', 880, 0, .9, .3); oscillator('sine', 1320, 0, .6, .12); }
      else if (pad === 3) oscillator('triangle', 340, 190, .2, .5);
      else {
        if (!noise) {
          noise = active.createBuffer(1, Math.floor(active.sampleRate * .2), active.sampleRate);
          const data = noise.getChannelData(0);
          for (let index = 0; index < data.length; index++) data[index] = Math.random() * 2 - 1;
        }
        const source = active.createBufferSource(), filter = active.createBiquadFilter(), gain = active.createGain();
        sources.set(source, [source, filter, gain]);
        source.buffer = noise; filter.type = 'bandpass'; filter.frequency.value = 1600; filter.Q.value = .8;
        envelope(gain, .7, .15); source.connect(filter); filter.connect(gain); gain.connect(active.destination); track(source, [filter, gain], .18);
      }
      return true;
    } catch { stop(); return false; }
  }
  return { unlock, hit, stop };
}
