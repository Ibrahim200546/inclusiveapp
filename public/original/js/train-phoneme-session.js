(function (root) {
  'use strict';
  const targets = { 'А':['a','ɑ'], 'Ә':['æ','ɛ'], 'О':['o','oː'], 'Ө':['ø','œ'], 'Ұ':['ʊ'], 'Ү':['y','yː'], 'Ы':['ɯ','ɨ'], 'І':['ɪ','ɘ'], 'У':['u','uː'], 'П':['p'], 'Б':['b'], 'Т':['t'], 'К':['k'] };
  const normalizePhone = phone => phone.replace(/[ːˑ]/g, '');
  const carriers = new Set(['a','ɑ','æ','ɛ','ə','ɐ','ɨ','ɯ','ɪ','ɘ','ʌ','ɜ','u','o','ʊ','ø','œ','y','i','e','ɤ']);
  const consonants = new Set(['П','Б','Т','К']);
  function assess(letter, mode, segments, voicedDurationMs = 0) {
    const accepted = (targets[letter] || []).map(normalizePhone);
    const voiced = segments.filter(s => s.phone).map(s => ({ ...s, phone:normalizePhone(s.phone) }));
    const isConsonant = consonants.has(letter);
    if (!voiced.length) return { correct:false, reason:'empty', phones:[], score:0, confidence:0, dominance:0, progress:0 };
    const phones = voiced.map(s => s.phone);
    const reliable = voiced.filter(s => (s.confidence ?? 1) >= 0.35);
    const hits = reliable.filter(s => accepted.includes(s.phone));
    const competitors = reliable.filter(s => !accepted.includes(s.phone) && !(isConsonant && carriers.has(s.phone)));
    const targetWeight = hits.reduce((sum,s) => sum + (s.confidence ?? 1),0);
    const otherWeight = competitors.reduce((sum,s) => sum + (s.confidence ?? 1),0);
    const dominance = targetWeight / (targetWeight + otherWeight || 1);
    const confidence = hits.length ? targetWeight / hits.length : 0;
    const score = Math.round(100 * dominance * confidence);
    const contradictory = competitors.some(s => (s.confidence ?? 1) >= 0.85);
    const identity = hits.length > 0 && confidence >= 0.5 && dominance >= 0.7 && !contradictory;
    const enough = isConsonant ? hits.length >= (mode === 'short' ? 1 : 3) : mode === 'short' || voicedDurationMs >= 2000;
    const correct = identity && enough;
    return { correct, reason:!identity ? 'different' : isConsonant ? 'repetitions' : 'duration', phones,
      score, confidence, dominance, ignoredPhones:voiced.filter(s => (s.confidence ?? 1) < 0.35).map(s => s.phone),
      durationMs:voicedDurationMs, progress:correct ? 100 : Math.min(90,Math.round(score * (enough ? 0.9 : 0.6))) };
  }
  function signalProgress(milliseconds) { return Math.min(70,Math.max(0,milliseconds) / 500 * 70); }
  function speechBounds(pcm) {
    let first = -1, last = 0, maxRms = 0;
    for (let i = 0; i < pcm.length; i += 320) {
      let energy = 0; for (let j = i; j < Math.min(i + 320, pcm.length); j++) energy += pcm[j] * pcm[j];
      const rms = Math.sqrt(energy / 320); maxRms = Math.max(maxRms, rms);
      if (rms > 0.006) { if (first < 0) first = i; last = i + 320; }
    }
    if (first < 0) return null;
    first = Math.max(0, first - 4800);
    last = Math.min(pcm.length, last + 4800, first + 80000);
    return { first, last, maxRms };
  }
  let worker, counter = 0; const pending = new Map();
  function request(type, pcm) {
    if (!worker) {
      worker = new Worker(new URL('phoneme-worker.js', document.currentScript?.src || new URL('js/phoneme-worker.js', document.baseURI)), { type:'module' });
      worker.onmessage = event => {
        const item = pending.get(event.data.id); if (!item) return;
        pending.delete(event.data.id); clearTimeout(item.timer); event.data.error ? item.reject(Object.assign(new Error(event.data.error), { name:'PhonemeModelUnavailable' })) : item.resolve(event.data);
      };
      worker.onerror = () => { for (const item of pending.values()) { clearTimeout(item.timer); item.reject(new Error('PhonemeModelUnavailable')); } pending.clear(); worker.terminate(); worker = null; };
    }
    const id = ++counter;
    return new Promise((resolve, reject) => { const timer = setTimeout(() => { for (const item of pending.values()) { clearTimeout(item.timer); item.reject(new Error('PhonemeModelUnavailable')); } pending.clear(); worker?.terminate(); worker = null; }, 180000); pending.set(id, { resolve, reject, timer }); worker.postMessage({ id, type, pcm }, pcm ? [pcm] : []); });
  }
  function create(options) {
    let state = 'idle', generation = 0, stream, context, source, processor, timer, blocks = [], listeners = [];
    const emit = value => { state = value; options.onState?.(value); };
    function cleanup() {
      clearTimeout(timer); timer = null;
      for (const [track, listener] of listeners) track.removeEventListener('ended', listener); listeners = [];
      if (processor) { processor.onaudioprocess = null; processor.disconnect(); processor = null; }
      source?.disconnect(); source = null;
      stream?.getTracks().forEach(track => track.stop()); stream = null;
      const old = context; context = null; if (old) void old.close().catch(() => {});
    }
    function wipe() { blocks.forEach(block => block.fill(0)); blocks = []; }
    function stop(reason = 'stopped') { generation++; cleanup(); wipe(); emit(reason); }
    async function start() {
      if (['loading','requesting','listening','checking'].includes(state)) return false;
      const token = ++generation; emit('loading');
      try {
        await request('load'); if (token !== generation) return false;
        emit('requesting');
        timer = setTimeout(() => { if (token === generation) { stop('error'); options.onError?.(new Error('MicrophoneTimeout')); } }, 45000);
        const acquired = await navigator.mediaDevices.getUserMedia({ audio:{ echoCancellation:false, noiseSuppression:false, autoGainControl:false } });
        if (token !== generation) { acquired.getTracks().forEach(track => track.stop()); return false; }
        stream = acquired; clearTimeout(timer);
        for (const track of stream.getTracks()) {
          const ended = () => { if (token === generation) { stop('error'); options.onError?.(new Error('MicrophoneDisconnected')); } };
          track.addEventListener('ended', ended); listeners.push([track, ended]);
          if (track.readyState === 'ended') throw new Error('MicrophoneDisconnected');
        }
        context = new (root.AudioContext || root.webkitAudioContext)({ sampleRate:16000 });
        source = context.createMediaStreamSource(stream); processor = context.createScriptProcessor(1024, 1, 1);
        source.connect(processor); processor.connect(context.destination);
        const meter = root.TrainVoiceSession.createMeter(2000); let maxVoicedMs = 0; let signalMs = 0;
        const sampleRate = context.sampleRate;
        const maxSamples = sampleRate * 8; let count = 0; let firstBlock = true;
        processor.onaudioprocess = event => {
          if (token !== generation) return;
          event.outputBuffer.getChannelData(0).fill(0);
          if (firstBlock) { firstBlock = false; emit('listening'); }
          const input = event.inputBuffer.getChannelData(0); const copy = new Float32Array(input); blocks.push(copy); count += copy.length;
          const activity = root.TrainVoiceSession.classifyFrame(copy, sampleRate);
          const timing = meter.update(count / sampleRate * 1000, activity.voiced); maxVoicedMs = Math.max(maxVoicedMs, timing.durationMs);
          if (activity.rms >= 0.015) signalMs += copy.length / sampleRate * 1000;
          options.onProgress?.({ progress:signalProgress(signalMs), phase:'signal', rms:activity.rms });
          if (count >= maxSamples) void finish(token, maxVoicedMs, sampleRate);
        };
        await context.resume(); if (token !== generation) return false;
        timer = setTimeout(() => { if (token === generation && ['requesting','listening'].includes(state)) { stop('error'); options.onError?.(new Error('MicrophoneTimeout')); } }, 15000);
        return true;
      } catch (error) { if (token === generation) { stop('error'); options.onError?.(error); } return false; }
    }
    async function finish(token, maxVoicedMs, sampleRate) {
      if (state !== 'listening') return;
      cleanup(); emit('checking');
      const length = blocks.reduce((sum, block) => sum + block.length, 0); const pcm = new Float32Array(length);
      let offset = 0; for (const block of blocks) { pcm.set(block, offset); offset += block.length; } wipe();
      try {
        let audio = pcm;
        if (sampleRate !== 16000) {
          const offline = new root.OfflineAudioContext(1, Math.ceil(pcm.length / sampleRate * 16000), 16000);
          const buffer = offline.createBuffer(1, pcm.length, sampleRate); buffer.copyToChannel(pcm, 0);
          const input = offline.createBufferSource(); input.buffer = buffer; input.connect(offline.destination); input.start();
          audio = (await offline.startRendering()).getChannelData(0).slice(); pcm.fill(0); buffer.getChannelData(0).fill(0);
        }
        if (token !== generation) { audio.fill(0); return; }
        const bounds = speechBounds(audio);
        if (!bounds) { audio.fill(0); const verdict = { correct:false, reason:'empty', phones:[] }; root.lastTrainPhonemeResult = { letter:options.letter, mode:options.mode, ...verdict }; options.onResult?.(verdict); options.onProgress?.({progress:0,phase:'recognition',score:0}); if (token === generation) emit('incorrect'); return; }
        const clip = audio.slice(bounds.first, bounds.last); audio.fill(0);
        const result = await request('recognize', clip.buffer);
        if (token !== generation) return;
        const verdict = assess(options.letter, options.mode, result.segments, maxVoicedMs);
        root.lastTrainPhonemeResult = { letter:options.letter, mode:options.mode, ...verdict, clipMs:(bounds.last - bounds.first) / 16, maxRms:bounds.maxRms };
        options.onResult?.(verdict);
        options.onProgress?.({ progress:verdict.progress, phase:'recognition', score:verdict.score });
        if (token !== generation) return;
        if (verdict.correct) { emit('complete'); }
        else emit('incorrect');
      } catch (error) { if (token === generation) { stop('error'); options.onError?.(error); } }
    }
    const hidden = () => { if (document.hidden) stop('hidden'); };
    const pagehide = () => stop('hidden');
    document.addEventListener('visibilitychange', hidden); root.addEventListener('pagehide', pagehide);
    return { start, stop, get state() { return state; }, dispose() { stop(); document.removeEventListener('visibilitychange', hidden); root.removeEventListener('pagehide', pagehide); } };
  }
  root.TrainPhonemeSession = { assess, speechBounds, signalProgress, create, letters:Object.keys(targets) };
})(typeof window !== 'undefined' ? window : globalThis);
