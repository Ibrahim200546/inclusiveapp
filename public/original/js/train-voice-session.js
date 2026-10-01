/* Sustained voiced activity only: this is not a pronunciation validator. */
(function (root) {
  'use strict';
  function classifyFrame(samples, sampleRate) {
    let energy = 0, mean = 0;
    for (const value of samples) mean += value;
    mean /= samples.length || 1;
    for (const value of samples) energy += (value - mean) ** 2;
    const rms = Math.sqrt(energy / (samples.length || 1));
    // Fixed RMS gate and periodicity suppress silence/broadband noise. Music or humming can still qualify; no letter identity is inferred.
    if (rms < 0.015 || !sampleRate || samples.length < 64) return { voiced: false, rms, periodicity: 0 };
    let best = 0;
    const minLag = Math.floor(sampleRate / 500), maxLag = Math.min(Math.ceil(sampleRate / 65), Math.floor(samples.length / 2));
    for (let lag = minLag; lag <= maxLag; lag += 2) {
      let cross = 0, left = 0, right = 0;
      for (let i = 0; i < samples.length - lag; i += 4) {
        const a = samples[i] - mean, b = samples[i + lag] - mean;
        cross += a * b; left += a * a; right += b * b;
      }
      best = Math.max(best, cross / (Math.sqrt(left * right) || 1));
    }
    return { voiced: best >= 0.65, rms, periodicity: best };
  }
  function createMeter(requiredMs = 2000) {
    let previous = null, previousVoiced = false, duration = 0, silence = 0;
    return {
      update(now, voiced) {
        const gap = previous === null ? 0 : Math.max(0, now - previous);
        previous = now;
        if (gap > 150) { duration = 0; silence = 0; }
        else if (voiced && previousVoiced) { duration += gap; silence = 0; }
        else if (!voiced) { silence += gap; if (silence > 200) duration = 0; }
        previousVoiced = voiced;
        return { durationMs: Math.min(duration, requiredMs), progress: Math.min(100, duration / requiredMs * 100), complete: duration >= requiredMs };
      }
    };
  }
  function create(options = {}) {
    const env = options.environment || root;
    let state = 'idle', generation = 0, stream = null, context = null, source = null, frame = null;
    let listeners = [], timeout = null;
    const emit = (value) => { state = value; if (options.onState) options.onState(value); };
    function cleanup() {
      if (timeout !== null) { (env.clearTimeout || root.clearTimeout)(timeout); timeout = null; }
      if (frame !== null) env.cancelAnimationFrame(frame);
      frame = null;
      listeners.forEach(([track, fn]) => track.removeEventListener('ended', fn)); listeners = [];
      if (source) { try { source.disconnect(); } catch (_) { /* Already disconnected. */ } source = null; }
      if (stream) { stream.getTracks().forEach(track => track.stop()); stream = null; }
      if (context) { const old = context; context = null; try { Promise.resolve(old.close()).catch(() => {}); } catch (_) { /* A closed context must not block track cleanup. */ } }
    }
    function stop(reason = 'stopped') { generation++; cleanup(); emit(reason); }
    function fail(error) { stop('error'); if (options.onError) options.onError(error); }
    async function start() {
      if (state === 'requesting' || state === 'listening') return false;
      const token = ++generation;
      emit('requesting');
      timeout = (env.setTimeout || root.setTimeout)(() => { if (token === generation) fail(new Error('MicrophoneTimeout')); }, options.timeoutMs || 45000);
      const meter = createMeter(options.requiredMs || 2000);
      try {
        if (!env.navigator.mediaDevices || !env.navigator.mediaDevices.getUserMedia) throw new Error('MicrophoneUnavailable');
        const acquired = await env.navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false } });
        if (token !== generation) { acquired.getTracks().forEach(track => track.stop()); return false; }
        stream = acquired;
        const Context = env.AudioContext || env.webkitAudioContext;
        if (!Context) throw new Error('AudioContextUnavailable');
        context = new Context();
        const activeContext = context;
        const analyser = context.createAnalyser(); analyser.fftSize = 2048;
        source = context.createMediaStreamSource(stream); source.connect(analyser);
        for (const track of stream.getTracks()) {
          const ended = () => fail(new Error('MicrophoneDisconnected'));
          track.addEventListener('ended', ended); listeners.push([track, ended]);
          if (track.readyState === 'ended') throw new Error('MicrophoneDisconnected');
        }
        await context.resume();
        if (token !== generation) return false;
        emit('listening');
        const samples = new Float32Array(analyser.fftSize);
        function tick(now) {
          if (token !== generation) return;
          if (activeContext.state !== 'running') { fail(new Error('AudioContextInterrupted')); return; }
          analyser.getFloatTimeDomainData(samples);
          const activity = classifyFrame(samples, activeContext.sampleRate);
          const result = meter.update(now, activity.voiced);
          if (options.onProgress) options.onProgress({ ...result, ...activity });
          if (token !== generation) return;
          if (result.complete) { stop('complete'); return; }
          frame = env.requestAnimationFrame(tick);
        }
        frame = env.requestAnimationFrame(tick);
        return true;
      } catch (error) { if (token === generation) fail(error); return false; }
    }
    const pagehide = () => stop('hidden');
    const visibility = () => { if (env.document && env.document.hidden) stop('hidden'); };
    if (env.addEventListener) env.addEventListener('pagehide', pagehide);
    if (env.document) env.document.addEventListener('visibilitychange', visibility);
    return { start, stop, get state() { return state; }, dispose() { stop(); if (env.removeEventListener) env.removeEventListener('pagehide', pagehide); if (env.document) env.document.removeEventListener('visibilitychange', visibility); } };
  }
  root.TrainVoiceSession = { classifyFrame, createMeter, create };
})(typeof window !== 'undefined' ? window : globalThis);
