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
  let worker, counter = 0, modelPromise;
  const pending = new Map(), modelListeners = new Set();
  let modelState = { status:'idle', phase:'download', progress:0, loaded:0, total:0 };
  const modelError = message => Object.assign(new Error(message || 'PhonemeModelUnavailable'), { name:'PhonemeModelUnavailable' });
  function publishModel(patch) {
    const previous = modelState;
    modelState = { ...modelState, ...patch };
    if (patch.progress !== undefined && modelState.status === 'loading'
      && previous.status === 'loading' && previous.phase === modelState.phase
      && Math.floor(previous.progress) === Math.floor(modelState.progress)) return;
    for (const listener of modelListeners) {
      try { listener({ ...modelState }); } catch (error) { root.console?.error(error); }
    }
  }
  function subscribeModel(listener) {
    modelListeners.add(listener); listener({ ...modelState });
    return () => modelListeners.delete(listener);
  }
  function failWorker(error) {
    for (const item of pending.values()) { clearTimeout(item.timer); item.reject(error); }
    pending.clear(); worker?.terminate(); worker = null;
    const loading = modelState.status === 'loading';
    if (!loading) modelPromise = undefined;
    publishModel({ status:loading ? 'loading' : 'error', error:error.message });
  }
  function armTimeout(item) {
    clearTimeout(item.timer);
    item.timer = setTimeout(() => failWorker(modelError('Model request timed out')), item.type === 'load' ? 300000 : 180000);
  }
  function request(type, pcm, sustainedVowel = false) {
    if (!worker) {
      const current = root.TrainModelTransport ? root.TrainModelTransport.create()
        : new Worker(new URL('/original/js/phoneme-worker.js?v=7', document.baseURI), { type:'module' });
      publishModel({ transport:current.shared ? 'shared' : 'dedicated' });
      worker = current;
      current.onmessage = event => {
        if (worker !== current) return;
        const data = event.data;
        if (data.type === 'download') {
          if (modelState.status !== 'loading') return;
          const progress = Number.isFinite(data.progress) ? Math.min(90,Math.max(modelState.progress,data.progress)) : modelState.progress;
          publishModel({ progress, phase:data.phase === 'initializing' ? 'initializing' : 'download',
            loaded:Number.isFinite(data.loaded) ? data.loaded : modelState.loaded,
            total:Number.isFinite(data.total) ? data.total : modelState.total });
          // Active downloads must not time out merely because the connection is slow.
          for (const item of pending.values()) if (item.type === 'load') armTimeout(item);
          return;
        }
        const item = pending.get(data.id); if (!item) return;
        pending.delete(data.id); clearTimeout(item.timer);
        if (data.error) {
          const error = modelError(data.error);
          if (current.shared && item.type === 'load') {
            root.TrainModelTransport?.fallback(); current.terminate(); worker = null; error.sharedFailure = true;
          }
          item.reject(error);
        } else item.resolve(data);
      };
      current.onerror = event => {
        if (worker !== current) return;
        event.preventDefault?.();
        const error = modelError(event.message);
        if (current.shared) { root.TrainModelTransport?.fallback(); error.sharedFailure = true; }
        failWorker(error);
      };
    }
    const id = ++counter;
    return new Promise((resolve, reject) => {
      const item = { type, resolve, reject, timer:null };
      pending.set(id,item); armTimeout(item);
      try { worker.postMessage({ id, type, pcm, sustainedVowel }, pcm ? [pcm] : []); }
      catch (error) { failWorker(modelError(error.message)); }
    });
  }
  function preload() {
    if (!modelPromise) {
      publishModel({ status:'loading', phase:'download', progress:0, loaded:0, total:0, error:'' });
      modelPromise = Promise.resolve().then(async () => {
        for (let attempt = 1; attempt <= 3; attempt++) {
          publishModel({ attempt });
          try {
            const result = await request('load');
            if (!result.ready) throw modelError('Model did not report readiness');
            publishModel({ status:'ready', phase:'ready', progress:100, error:'' }); return result;
          } catch (error) {
            const transient = /fetch|network|download|service unavailable|temporar|too many requests|bad gateway|gateway timeout|internal server|forbidden|\b(?:408|429|5\d\d)\b/i.test(error.message || '');
            if (attempt === 3 || (!transient && !error.sharedFailure)) throw error;
            publishModel({ status:'loading', phase:'retrying', error:error.message });
            await new Promise(resolve => setTimeout(resolve,attempt === 1 ? 500 : 1500));
            publishModel({ phase:'download', progress:0, loaded:0, total:0 });
          }
        }
      }).catch(error => {
        modelPromise = undefined; publishModel({ status:'error', error:error.message }); throw modelError(error.message);
      });
    }
    return modelPromise;
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
        await preload(); if (token !== generation) return false;
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
  root.TrainPhonemeSession = { preload, subscribeModel, get modelState() { return { ...modelState }; }, assess, speechBounds, signalProgress, create, letters:Object.keys(targets) };
})(typeof window !== 'undefined' ? window : globalThis);
