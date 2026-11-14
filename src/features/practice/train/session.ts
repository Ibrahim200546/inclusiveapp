import { assess, signalProgress, speechBounds } from './assessment';
import { classifyFrame, createMeter } from './signal';
import { asError, type PhonemeModel, type SessionOptions, type SessionState, type TrainSession } from './types';

export type CaptureEnvironment = Pick<Window & typeof globalThis, 'navigator' | 'AudioContext' | 'OfflineAudioContext'> & {
  webkitAudioContext?: typeof AudioContext;
};
function safely(action: () => unknown) { try { action(); } catch { /* Release the other resources even if one node is already closed. */ } }

export function createTrainSession(options: SessionOptions, model: PhonemeModel, env: CaptureEnvironment): TrainSession {
  let state: SessionState = 'idle', generation = 0, disposed = false;
  let stream: MediaStream | null = null, context: AudioContext | null = null, source: MediaStreamAudioSourceNode | null = null;
  let processor: ScriptProcessorNode | null = null, timer: ReturnType<typeof setTimeout> | undefined;
  let blocks: Float32Array[] = [], releases: (() => void)[] = [], request: AbortController | null = null;
  const emit = (value: SessionState) => { state = value; options.onState?.(value); };
  const current = (token: number) => !disposed && token === generation;
  function cleanup() {
    clearTimeout(timer); timer = undefined;
    releases.forEach(release => safely(release)); releases = [];
    if (processor) { processor.onaudioprocess = null; safely(() => processor!.disconnect()); processor = null; }
    if (source) { safely(() => source!.disconnect()); source = null; }
    if (stream) { stream.getTracks().forEach(track => safely(() => track.stop())); stream = null; }
    const old = context; context = null;
    if (old) safely(() => { void Promise.resolve(old.close()).catch(() => {}); });
  }
  function wipe() { blocks.forEach(block => block.fill(0)); blocks = []; }
  function stop() { generation++; request?.abort(); request = null; cleanup(); wipe(); emit('stopped'); }
  function fail(token: number, error: unknown) {
    if (!current(token)) return;
    cleanup(); wipe(); request?.abort(); request = null;
    const failed = ++generation; emit('error');
    if (current(failed)) options.onError?.(asError(error));
  }
  async function finish(token: number, voicedMs: number, sampleRate: number) {
    if (!current(token) || state !== 'listening') return;
    cleanup();
    const pcm = new Float32Array(blocks.reduce((sum, block) => sum + block.length, 0));
    let offset = 0; for (const block of blocks) { pcm.set(block, offset); offset += block.length; } wipe();
    let audio: Float32Array = pcm, buffer: AudioBuffer | undefined, clip: Float32Array | null = null;
    emit('checking');
    try {
      if (!current(token)) return;
      if (sampleRate !== 16000) {
        const offline = new env.OfflineAudioContext(1, Math.ceil(pcm.length / sampleRate * 16000), 16000);
        buffer = offline.createBuffer(1, pcm.length, sampleRate); buffer.copyToChannel(pcm, 0);
        const input = offline.createBufferSource(); input.buffer = buffer; input.connect(offline.destination); input.start();
        const rendered = await offline.startRendering(); audio = rendered.getChannelData(0).slice(); rendered.getChannelData(0).fill(0);
        input.disconnect(); pcm.fill(0); buffer.getChannelData(0).fill(0);
      }
      if (!current(token)) return;
      const bounds = speechBounds(audio);
      const controller = new AbortController(); request = controller;
      clip = bounds ? audio.slice(bounds.first, bounds.last) : null; audio.fill(0);
      const segments = clip ? await model.recognize(clip.buffer as ArrayBuffer, controller.signal) : [];
      if (!current(token)) return;
      request = null;
      const verdict = assess(options.letter, options.mode, segments, voicedMs);
      options.onResult?.(verdict);
      if (!current(token)) return;
      options.onProgress?.({ progress: verdict.progress, phase: 'recognition', score: verdict.score });
      if (current(token)) emit(verdict.correct ? 'complete' : 'incorrect');
    } catch (error) { fail(token, error); }
    finally { pcm.fill(0); audio.fill(0); buffer?.getChannelData(0).fill(0); if (clip?.byteLength) clip.fill(0); }
  }
  async function start() {
    if (disposed || ['loading', 'requesting', 'listening', 'checking'].includes(state)) return false;
    cleanup(); wipe(); const token = ++generation; emit('loading');
    try {
      if (!current(token)) return false;
      await model.preload(); if (!current(token)) return false;
      emit('requesting'); if (!current(token)) return false;
      timer = setTimeout(() => fail(token, new Error('MicrophoneTimeout')), 45000);
      if (!env.navigator.mediaDevices?.getUserMedia) throw new Error('MicrophoneUnavailable');
      const acquired = await env.navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      if (!current(token)) { acquired.getTracks().forEach(track => safely(() => track.stop())); return false; }
      stream = acquired; clearTimeout(timer);
      // Covers suspended AudioContext.resume() and a device which never delivers samples.
      timer = setTimeout(() => fail(token, new Error('MicrophoneTimeout')), 15000);
      if (!stream.getAudioTracks().length) throw new Error('MicrophoneUnavailable');
      for (const track of stream.getTracks()) {
        const ended = () => fail(token, new Error('MicrophoneDisconnected'));
        track.addEventListener('ended', ended); releases.push(() => track.removeEventListener('ended', ended));
        if (track.readyState === 'ended') throw new Error('MicrophoneDisconnected');
      }
      const Context = env.AudioContext || env.webkitAudioContext;
      if (!Context) throw new Error('AudioContextUnavailable');
      const active = new Context({ sampleRate: 16000 }); context = active;
      const interrupted = () => { if (state === 'listening' && active.state !== 'running') fail(token, new Error('AudioContextInterrupted')); };
      active.addEventListener('statechange', interrupted); releases.push(() => active.removeEventListener('statechange', interrupted));
      source = active.createMediaStreamSource(stream); processor = active.createScriptProcessor(1024, 1, 1);
      source.connect(processor); processor.connect(active.destination);
      const meter = createMeter(2000), sampleRate = active.sampleRate;
      let maxVoicedMs = 0, signalMs = 0, count = 0;
      processor.onaudioprocess = event => {
        if (!current(token)) return;
        try {
          event.outputBuffer.getChannelData(0).fill(0);
          if (state === 'requesting') emit('listening');
          if (!current(token) || state !== 'listening') return;
          if (active.state !== 'running') throw new Error('AudioContextInterrupted');
          const copy = new Float32Array(event.inputBuffer.getChannelData(0)); blocks.push(copy); count += copy.length;
          const activity = classifyFrame(copy, sampleRate), timing = meter.update(count / sampleRate * 1000, activity.voiced);
          maxVoicedMs = Math.max(maxVoicedMs, timing.durationMs);
          if (activity.rms >= 0.015) signalMs += copy.length / sampleRate * 1000;
          options.onProgress?.({ progress: signalProgress(signalMs), phase: 'signal', rms: activity.rms });
          if (current(token) && count >= sampleRate * 8) void finish(token, maxVoicedMs, sampleRate);
        } catch (error) { fail(token, error); }
      };
      await active.resume(); return current(token);
    } catch (error) { fail(token, error); return false; }
  }
  return { start, stop, get state() { return state; }, dispose() { if (disposed) return; stop(); disposed = true; } };
}
