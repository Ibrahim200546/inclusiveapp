(() => {
  const EFFECT_AUDIO_IDS = new Set(['clickSound', 'clapAudio', 'successSound', 'errorSound']);
  const trackedMedia = new Set();
  const observedMedia = new WeakSet();
  const mediaMeta = new WeakMap();
  const triggerLocks = new WeakMap();
  const SOUND_TRIGGER_SELECTOR = [
    '.center-circle',
    '#voiceCenterBtn',
    '.chatbot-message-voice',
    '.ai-message-audio-btn'
  ].join(', ');
  const UI_VOICEOVER_SELECTOR = [
    'button',
    '[role="button"]',
    '.profile-action-row',
    '.profile-logout-btn',
    '.profile-close-btn'
  ].join(', ');
  const UI_VOICEOVER_SKIP_SELECTOR = [
    '.profile-lang-btn',
    '.theme-toggle',
    '.center-circle',
    '#voiceCenterBtn',
    '.chatbot-message-voice',
    '.ai-message-audio-btn',
    '.alippe-item',
    '.tynsby-pyramid-syl2',
    '.tynsby-row-btn3',
    '.tynsby-row-btn4',
    '.voice-btn',
    '.verb-picto-card',
    '.spatial-audio-trigger'
  ].join(', ');
  const FALLBACK_TRIGGER_LOCK_MS = 1800;
  const AUDIO_PRELOAD_CONCURRENCY = 2;
  const AUDIO_BACKGROUND_START_DELAY_MS = 1200;
  const AUDIO_BACKGROUND_MANIFEST_LIMIT = 80;
  const AUDIO_BACKGROUND_MAX_BYTES = 180000;
  const AUDIO_EXT_RE = /\.(?:mp3|wav|ogg|m4a|mp4|mpeg)(?:$|[?#])/i;

  let pendingTrigger = null;
  let pendingTriggerTimer = null;
  let uiVoiceoverAudio = null;
  let preloadOrder = 0;
  const nativeAudioConstructor = window.Audio;
  const audioPreloadState = {
    queue: [],
    queued: new Set(),
    loading: new Set(),
    warmed: new Set(),
    failed: new Set(),
    running: 0,
    started: false,
    effectsStarted: false,
    backgroundStarted: false,
  };

  function isElement(value) {
    return value instanceof Element;
  }

  function normalizeAudioUrl(src) {
    const rawSrc = String(src || '').trim();
    if (!rawSrc || rawSrc.startsWith('blob:') || rawSrc.startsWith('data:')) {
      return '';
    }

    try {
      const url = new URL(rawSrc, document.baseURI);
      if (url.origin !== window.location.origin || !AUDIO_EXT_RE.test(url.pathname + url.search)) {
        return '';
      }

      return url.href;
    } catch (error) {
      return '';
    }
  }

  function getAudioPreloadPriority(src, bytes = 0) {
    const normalized = String(src || '').toLowerCase();
    if (/(?:^|\/)(?:click|success|error|clap)\.(?:mp3|wav|ogg|m4a|mp4|mpeg)$/.test(normalized)) return 0;
    if (normalized.includes('/sounds/kk-human/')) return 1;
    if (normalized.includes('/sounds/ru/ui/') || normalized.includes('/sounds/ru/named/')) return 1;
    if (normalized.includes('/sounds/letters/') || normalized.includes('/sounds/ru/letters/')) return 1;
    if (normalized.includes('/sounds/alippe/') || normalized.includes('/sounds/ru/alippe/')) return 2;
    if (normalized.includes('/sounds/ru/spatial/')) return 2;
    if (bytes > 1500000) return 7;
    if (bytes > 500000) return 5;
    return 3;
  }

  function pumpAudioPreloadQueue() {
    if (!audioPreloadState.started) {
      return;
    }

    while (audioPreloadState.running < AUDIO_PRELOAD_CONCURRENCY && audioPreloadState.queue.length > 0) {
      audioPreloadState.queue.sort((a, b) => a.priority - b.priority || a.order - b.order);
      const item = audioPreloadState.queue.shift();
      if (!item || audioPreloadState.warmed.has(item.url) || audioPreloadState.loading.has(item.url)) {
        continue;
      }

      audioPreloadState.queued.delete(item.url);
      audioPreloadState.loading.add(item.url);
      audioPreloadState.running += 1;

      fetch(item.url, { cache: 'force-cache' })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          return response.blob();
        })
        .then((blob) => {
          if (blob && blob.size > 0) {
            audioPreloadState.warmed.add(item.url);
          }
        })
        .catch(() => {
          audioPreloadState.failed.add(item.url);
        })
        .finally(() => {
          audioPreloadState.loading.delete(item.url);
          audioPreloadState.running -= 1;
          pumpAudioPreloadQueue();
        });
    }
  }

  function scheduleAudioPreload(src, priority = 3, bytes = 0) {
    const url = normalizeAudioUrl(src);
    if (!url || audioPreloadState.warmed.has(url) || audioPreloadState.loading.has(url) || audioPreloadState.queued.has(url)) {
      return;
    }

    audioPreloadState.queued.add(url);
    audioPreloadState.queue.push({
      url,
      priority,
      bytes,
      order: preloadOrder += 1,
    });

    pumpAudioPreloadQueue();
  }

  function scheduleAudioPreloadMany(entries, fallbackPriority = 3) {
    entries.forEach((entry) => {
      const src = typeof entry === 'string' ? entry : entry?.src;
      const bytes = typeof entry === 'string' ? 0 : Number(entry?.bytes) || 0;
      const priority = typeof src === 'string' || src
        ? getAudioPreloadPriority(src, bytes)
        : fallbackPriority;
      scheduleAudioPreload(src, priority, bytes);
    });
  }

  function getBackgroundManifestEntries(manifest) {
    return manifest
      .map((entry) => {
        const src = typeof entry === 'string' ? entry : entry?.src;
        const bytes = typeof entry === 'string' ? 0 : Number(entry?.bytes) || 0;
        return {
          src,
          bytes,
          priority: getAudioPreloadPriority(src, bytes),
        };
      })
      .filter((entry) => entry.src && entry.priority <= 2 && entry.bytes <= AUDIO_BACKGROUND_MAX_BYTES)
      .sort((a, b) => a.priority - b.priority || a.bytes - b.bytes)
      .slice(0, AUDIO_BACKGROUND_MANIFEST_LIMIT);
  }

  function warmDomAudioElements() {
    document.querySelectorAll('audio[src]').forEach((audio) => {
      const src = audio.getAttribute('src') || audio.currentSrc || audio.src;
      const shouldWarm = isEffectMedia(audio);
      audio.preload = shouldWarm ? 'auto' : 'metadata';

      if (shouldWarm) {
        scheduleAudioPreload(src, getAudioPreloadPriority(src, 0), 0);

        try {
          audio.load();
        } catch (error) {
          // Loading can fail for missing legacy files; playback fallbacks still handle it.
        }
      }
    });
  }

  function installOptimizedAudioConstructor() {
    if (!nativeAudioConstructor || window.Audio?.__inclusiveAudioOptimized) {
      return;
    }

    function InclusiveOptimizedAudio(src) {
      const audio = new nativeAudioConstructor();
      audio.preload = 'metadata';

      if (src) {
        audio.src = src;
        scheduleAudioPreload(src, 1, 0);
      }

      return audio;
    }

    InclusiveOptimizedAudio.prototype = nativeAudioConstructor.prototype;
    Object.setPrototypeOf(InclusiveOptimizedAudio, nativeAudioConstructor);
    InclusiveOptimizedAudio.__inclusiveAudioOptimized = true;
    window.Audio = InclusiveOptimizedAudio;
  }

  function warmInteractiveAudio() {
    if (!audioPreloadState.started) {
      audioPreloadState.started = true;
    }

    if (!audioPreloadState.effectsStarted) {
      audioPreloadState.effectsStarted = true;
      warmDomAudioElements();
    }

    pumpAudioPreloadQueue();
  }

  function startAudioPreloadQueue() {
    warmInteractiveAudio();

    if (audioPreloadState.backgroundStarted) {
      return;
    }

    audioPreloadState.backgroundStarted = true;

    const manifest = Array.isArray(window.APP_AUDIO_PRELOAD_MANIFEST)
      ? window.APP_AUDIO_PRELOAD_MANIFEST
      : [];

    const enqueueManifest = () => {
      scheduleAudioPreloadMany(getBackgroundManifestEntries(manifest));
    };

    window.setTimeout(() => {
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(enqueueManifest, { timeout: 2200 });
      } else {
        enqueueManifest();
      }
    }, AUDIO_BACKGROUND_START_DELAY_MS);

    pumpAudioPreloadQueue();
  }

  function installAudioWarmupEvents() {
    const warmup = () => {
      warmInteractiveAudio();
      try {
        const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
        if (AudioContextCtor && !window.__inclusiveAudioWarmupCtx) {
          window.__inclusiveAudioWarmupCtx = new AudioContextCtor();
        }
        window.__inclusiveAudioWarmupCtx?.resume?.();
      } catch (error) {
        // Ignore browser-specific AudioContext limits.
      }
    };

    ['pointerdown', 'touchstart', 'keydown'].forEach((eventName) => {
      document.addEventListener(eventName, warmup, { once: true, passive: true });
    });
  }

  window.appAudioPreloader = {
    preload(srcs, options = {}) {
      const priority = Number.isFinite(Number(options.priority)) ? Number(options.priority) : 1;
      scheduleAudioPreloadMany(Array.isArray(srcs) ? srcs : [srcs], priority);
      warmInteractiveAudio();
    },
    start: startAudioPreloadQueue,
    stats() {
      return {
        queued: audioPreloadState.queue.length,
        loading: audioPreloadState.loading.size,
        warmed: audioPreloadState.warmed.size,
        failed: audioPreloadState.failed.size,
      };
    },
  };

  installOptimizedAudioConstructor();
  installAudioWarmupEvents();

  function isEffectMedia(media) {
    const id = String(media.id || '').toLowerCase();
    const src = String(media.currentSrc || media.src || '').toLowerCase();

    if (EFFECT_AUDIO_IDS.has(media.id)) {
      return true;
    }

    return /click|success|error|clap/.test(id) || /(?:click|success|error|clap)\.mp3/.test(src);
  }

  function clearPendingTrigger() {
    if (pendingTriggerTimer) {
      window.clearTimeout(pendingTriggerTimer);
      pendingTriggerTimer = null;
    }
    pendingTrigger = null;
  }

  function isRussianUiLang() {
    try {
      if (window.getProfileLang && window.getProfileLang() === 'ru') return true;
      const savedLang = localStorage.getItem('profileLang') || localStorage.getItem('locale');
      return savedLang === 'ru';
    } catch (error) {
      return false;
    }
  }

  function getElementVoiceoverCandidates(element) {
    const rawText = [
      element.getAttribute('data-ru-voiceover'),
      element.getAttribute('aria-label'),
      element.innerText || element.textContent || ''
    ].filter(Boolean).join(' / ');

    return rawText
      .split('/')
      .map(part => part
        .replace(/[\u200B-\u200D\uFE0E\uFE0F]/g, '')
        .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim())
      .filter(Boolean);
  }

  function playUiVoiceoverForClick(event) {
    if (!isRussianUiLang() || typeof window.getRuVoiceoverAudioPath !== 'function') {
      return;
    }

    const source = isElement(event.target) ? event.target : null;
    const trigger = source?.closest?.(UI_VOICEOVER_SELECTOR);
    if (!trigger || trigger.closest(UI_VOICEOVER_SKIP_SELECTOR)) {
      return;
    }

    const candidates = getElementVoiceoverCandidates(trigger);
    let audioPath = '';

    for (const candidate of candidates) {
      audioPath = window.getRuVoiceoverAudioPath(candidate, 'ru-RU');
      if (audioPath) break;
    }

    if (!audioPath) {
      return;
    }

    try {
      if (uiVoiceoverAudio) {
        uiVoiceoverAudio.pause();
        uiVoiceoverAudio.currentTime = 0;
      }

      uiVoiceoverAudio = new Audio(audioPath);
      uiVoiceoverAudio.preload = 'auto';
      uiVoiceoverAudio.play().catch(() => {});
    } catch (error) {
      console.warn('Unable to play UI voiceover:', error);
    }
  }

  function unlockTrigger(trigger, media) {
    if (!trigger) {
      return;
    }

    const lock = triggerLocks.get(trigger);
    if (!lock) {
      return;
    }

    if (media && lock.media && lock.media !== media) {
      return;
    }

    if (lock.timer) {
      window.clearTimeout(lock.timer);
    }

    triggerLocks.delete(trigger);
    trigger.classList.remove('sound-trigger-locked');

    if (trigger instanceof HTMLButtonElement) {
      trigger.disabled = false;
    }
  }

  function lockTrigger(trigger, media) {
    if (!trigger) {
      return;
    }

    unlockTrigger(trigger);

    const timer = window.setTimeout(() => unlockTrigger(trigger, media), 15000);
    triggerLocks.set(trigger, { media, timer });
    trigger.classList.add('sound-trigger-locked');

    if (trigger instanceof HTMLButtonElement) {
      trigger.disabled = true;
    }
  }

  function rememberMedia(media) {
    trackedMedia.add(media);

    const meta = mediaMeta.get(media) || {};
    meta.category = isEffectMedia(media) ? 'effect' : 'content';
    mediaMeta.set(media, meta);

    if (observedMedia.has(media)) {
      return;
    }

    observedMedia.add(media);

    const release = () => {
      trackedMedia.delete(media);

      const currentMeta = mediaMeta.get(media);
      if (currentMeta?.trigger) {
        unlockTrigger(currentMeta.trigger, media);
        currentMeta.trigger = null;
      }
    };

    ['ended', 'pause', 'abort', 'emptied', 'error'].forEach((eventName) => {
      media.addEventListener(eventName, release);
    });
  }

  function stopTrackedMedia({ includeEffects = true, except = null } = {}) {
    trackedMedia.forEach((media) => {
      if (media === except) {
        return;
      }

      const category = mediaMeta.get(media)?.category || 'content';
      if (!includeEffects && category === 'effect') {
        return;
      }

      try {
        media.pause();
      } catch (error) {
        console.warn('Unable to pause audio element:', error);
      }

      try {
        media.currentTime = 0;
      } catch (error) {
        console.warn('Unable to reset audio element:', error);
      }
    });
  }

  function cancelSpeechOutput({ stopRecognition = true, clearPendingReply = true } = {}) {
    try {
      window.speechSynthesis?.cancel();
    } catch (error) {
      console.warn('Unable to cancel speech synthesis:', error);
    }

    if (clearPendingReply && window.chatbotControls?.clearPendingReply) {
      try {
        window.chatbotControls.clearPendingReply();
      } catch (error) {
        console.warn('Unable to clear chatbot reply timer:', error);
      }
    }

    if (stopRecognition && window.chatbotControls?.stopRecognition) {
      try {
        window.chatbotControls.stopRecognition();
      } catch (error) {
        console.warn('Unable to stop chatbot recognition:', error);
      }
    }
  }

  function stopInputStreams() {
    try {
      if (typeof stopVoicePractice === 'function') {
        stopVoicePractice();
      }
    } catch (error) {
      console.warn('Unable to stop voice practice:', error);
    }

    try {
      if (typeof stopReading === 'function') {
        stopReading();
      }
    } catch (error) {
      console.warn('Unable to stop reading task:', error);
    }

    try {
      if (typeof stopVoiceGame === 'function') {
        stopVoiceGame();
      }
    } catch (error) {
      console.warn('Unable to stop voice game:', error);
    }

    try {
      if (typeof articulationEngine !== 'undefined' && articulationEngine?.isRecording) {
        articulationEngine.stop();
      }
    } catch (error) {
      console.warn('Unable to stop articulation engine:', error);
    }
  }

  function createAppTtsClient() {
    let activeController = null;
    let audioEl = null;
    let audioUrl = '';
    const ttsBlobCache = new Map();
    const TTS_BLOB_CACHE_LIMIT = 50;

    function ensureAudioEl() {
      if (!audioEl) {
        audioEl = new Audio();
        audioEl.preload = 'auto';
      }
      return audioEl;
    }

    function revokeAudioUrl() {
      if (!audioUrl) {
        return;
      }

      try {
        URL.revokeObjectURL(audioUrl);
      } catch (error) {
        console.warn('Unable to revoke TTS audio URL:', error);
      }

      audioUrl = '';
    }

    function parsePositiveNumber(value, fallback = null) {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
    }

    function getDefaultSpeechLang() {
      if (window.getProfileSpeechLang && typeof window.getProfileSpeechLang === 'function') {
        return window.getProfileSpeechLang();
      }

      try {
        const savedLang = localStorage.getItem('profileLang') || localStorage.getItem('locale');
        return savedLang === 'ru' ? 'ru-RU' : 'kk-KZ';
      } catch (error) {
        return 'kk-KZ';
      }
    }

    function getTtsCacheKey(text, lang, options = {}) {
      const requestedProvider = String(options.provider || 'yandex').trim().toLowerCase();
      const voice = String(options.voice || '').trim();
      const speed = parsePositiveNumber(options.speed, null) || '';
      const speechLang = String(lang || getDefaultSpeechLang()).trim() || getDefaultSpeechLang();

      return JSON.stringify([requestedProvider, speechLang, voice, speed, text]);
    }

    function rememberTtsBlob(cacheKey, blob) {
      if (!cacheKey || !blob || !blob.size) {
        return;
      }

      if (ttsBlobCache.has(cacheKey)) {
        ttsBlobCache.delete(cacheKey);
      }

      ttsBlobCache.set(cacheKey, blob);

      while (ttsBlobCache.size > TTS_BLOB_CACHE_LIMIT) {
        const oldestKey = ttsBlobCache.keys().next().value;
        ttsBlobCache.delete(oldestKey);
      }
    }

    async function readTtsError(response) {
      try {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const payload = await response.json();
          return [payload?.error, payload?.message, payload?.details].filter(Boolean).join(' ');
        }

        return await response.text();
      } catch {
        return '';
      }
    }

    function stop() {
      if (activeController) {
        try {
          activeController.abort();
        } catch (error) {
          console.warn('Unable to abort TTS request:', error);
        }
        activeController = null;
      }

      if (!audioEl) {
        return;
      }

      try {
        audioEl.pause();
        audioEl.currentTime = 0;
      } catch (error) {
        console.warn('Unable to stop TTS audio:', error);
      }
    }

    async function requestAudioBlob(text, lang, options = {}) {
      const controller = new AbortController();
      activeController = controller;

      const timeoutMs = Math.max(parsePositiveNumber(options.timeoutMs, 6500) || 6500, 1000);
      const timerId = window.setTimeout(() => controller.abort(), timeoutMs);
      const requestedProvider = String(options.provider || 'yandex').trim().toLowerCase();
      const voice = String(options.voice || '').trim();
      const speed = parsePositiveNumber(options.speed, null);

      const payloadBase = {
        text,
        lang: String(lang || getDefaultSpeechLang()).trim() || getDefaultSpeechLang(),
      };

      if (voice) {
        payloadBase.voice = voice;
      }

      if (speed) {
        payloadBase.speed = speed;
      }

      const makeRequest = (preferProvider = true) => fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferProvider && requestedProvider
          ? { ...payloadBase, provider: requestedProvider }
          : payloadBase),
        signal: controller.signal,
      });

      try {
        let response = await makeRequest(true);
        if (!response.ok) {
          const details = await readTtsError(response);
          if (details.includes('Requested TTS provider is not configured')) {
            response = await makeRequest(false);
          } else {
            return {
              ok: false,
              reason: 'request_failed',
              status: response.status,
              details: details || `Status ${response.status}`,
            };
          }
        }

        if (!response.ok) {
          const details = await readTtsError(response);
          return {
            ok: false,
            reason: 'request_failed',
            status: response.status,
            details: details || `Status ${response.status}`,
          };
        }

        const blob = await response.blob();
        if (!blob.size) {
          return {
            ok: false,
            reason: 'empty_audio',
            details: 'Received empty audio from TTS.',
          };
        }

        return { ok: true, blob };
      } catch (error) {
        if (controller.signal.aborted) {
          return {
            ok: false,
            reason: 'timeout',
            details: error?.message || 'TTS request timed out.',
          };
        }

        return {
          ok: false,
          reason: 'request_failed',
          details: error?.message || 'TTS request failed.',
        };
      } finally {
        window.clearTimeout(timerId);
        if (activeController === controller) {
          activeController = null;
        }
      }
    }

    async function playBlob(blob, options = {}) {
      const el = ensureAudioEl();

      revokeAudioUrl();
      audioUrl = URL.createObjectURL(blob);
      el.src = audioUrl;
      el.preload = 'auto';

      const playbackRate = parsePositiveNumber(options.playbackRate, 1) || 1;
      el.playbackRate = playbackRate;

      const volume = Number(options.volume);
      el.volume = Number.isFinite(volume) ? volume : 1;

      if (typeof options.onEnd === 'function') {
        el.addEventListener('ended', () => options.onEnd(el), { once: true });
      }

      if (typeof options.onReady === 'function') {
        options.onReady(el);
      }

      await el.play();

      if (options.waitUntilEnd) {
        await new Promise((resolve, reject) => {
          const cleanup = () => {
            el.removeEventListener('ended', handleEnded);
            el.removeEventListener('error', handleError);
            el.removeEventListener('pause', handlePaused);
          };

          const handleEnded = () => {
            cleanup();
            resolve();
          };

          const handleError = () => {
            cleanup();
            reject(new Error('Audio playback failed.'));
          };

          const handlePaused = () => {
            cleanup();
            resolve();
          };

          el.addEventListener('ended', handleEnded, { once: true });
          el.addEventListener('error', handleError, { once: true });
          el.addEventListener('pause', handlePaused, { once: true });
        });
      }

      return { ok: true, audioEl: el };
    }

    async function playStaticVoiceover(text, lang, options = {}) {
      const candidates = [];

      if (typeof window.getKkHumanVoiceoverAudioPath === 'function') {
        candidates.push(window.getKkHumanVoiceoverAudioPath(text, lang));
      }

      if (typeof window.getRuVoiceoverAudioPath === 'function') {
        candidates.push(window.getRuVoiceoverAudioPath(text, lang));
      }

      const audioPath = candidates.find(Boolean);
      if (!audioPath) {
        return null;
      }

      const el = ensureAudioEl();

      revokeAudioUrl();
      el.src = audioPath;
      el.preload = 'auto';
      el.currentTime = 0;

      const playbackRate = parsePositiveNumber(options.playbackRate, 1) || 1;
      el.playbackRate = playbackRate;

      const volume = Number(options.volume);
      el.volume = Number.isFinite(volume) ? volume : 1;

      if (typeof options.onEnd === 'function') {
        el.addEventListener('ended', () => options.onEnd(el), { once: true });
      }

      if (typeof options.onReady === 'function') {
        options.onReady(el);
      }

      await el.play();

      if (options.waitUntilEnd) {
        await new Promise((resolve, reject) => {
          const cleanup = () => {
            el.removeEventListener('ended', handleEnded);
            el.removeEventListener('error', handleError);
            el.removeEventListener('pause', handlePaused);
          };

          const handleEnded = () => {
            cleanup();
            resolve();
          };

          const handleError = () => {
            cleanup();
            reject(new Error('Audio playback failed.'));
          };

          const handlePaused = () => {
            cleanup();
            resolve();
          };

          el.addEventListener('ended', handleEnded, { once: true });
          el.addEventListener('error', handleError, { once: true });
          el.addEventListener('pause', handlePaused, { once: true });
        });
      }

      return { ok: true, audioEl: el, static: true, path: audioPath };
    }

    async function speakText(text, lang = getDefaultSpeechLang(), options = {}) {
      const trimmedText = String(text || '').trim();
      if (!trimmedText) {
        return { ok: false, reason: 'empty' };
      }

      stop();

      try {
        const staticResult = await playStaticVoiceover(trimmedText, lang, options);
        if (staticResult) {
          return staticResult;
        }
      } catch (error) {
        return {
          ok: false,
          reason: 'static_audio_failed',
          details: error?.message || 'Static voiceover playback failed.',
        };
      }

      const cacheKey = getTtsCacheKey(trimmedText, lang, options);
      const cachedBlob = ttsBlobCache.get(cacheKey);

      if (cachedBlob && cachedBlob.size) {
        try {
          return await playBlob(cachedBlob, options);
        } catch (error) {
          ttsBlobCache.delete(cacheKey);
          return {
            ok: false,
            reason: 'autoplay',
            details: error?.message || 'Cached audio playback was blocked.',
          };
        }
      }

      if (typeof fetch !== 'function') {
        return {
          ok: false,
          reason: 'unsupported',
          details: 'Fetch API is not available in this browser.',
        };
      }

      const blobResult = await requestAudioBlob(trimmedText, lang, options);
      if (!blobResult.ok) {
        return blobResult;
      }

      rememberTtsBlob(cacheKey, blobResult.blob);

      try {
        return await playBlob(blobResult.blob, options);
      } catch (error) {
        return {
          ok: false,
          reason: 'autoplay',
          details: error?.message || 'Audio playback was blocked.',
        };
      }
    }

    return {
      ensureAudioEl,
      stop,
      speakText,
    };
  }

  window.appTts = window.appTts || createAppTtsClient();

  function stopRemoteTtsOutput() {
    try {
      window.appTts?.stop?.();
    } catch (error) {
      console.warn('Unable to stop shared TTS client:', error);
    }

    try {
      window.chatbotTTS?.stop?.();
    } catch (error) {
      console.warn('Unable to stop chatbot TTS client:', error);
    }
  }

  function stopAllAppAudio({ includeEffects = true, stopRecognition = true } = {}) {
    stopRemoteTtsOutput();
    stopTrackedMedia({ includeEffects });
    cancelSpeechOutput({ stopRecognition });
    stopInputStreams();
  }

  window.stopAllAppAudio = stopAllAppAudio;
  window.stopContentPlayback = function stopContentPlayback() {
    stopRemoteTtsOutput();
    stopTrackedMedia({ includeEffects: false });
    cancelSpeechOutput({ stopRecognition: false, clearPendingReply: false });
  };

  const nativePlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function patchedPlay(...args) {
    if (!(this instanceof HTMLAudioElement)) {
      return nativePlay.apply(this, args);
    }

    const mediaSrc = this.currentSrc || this.src || this.getAttribute?.('src');
    if (mediaSrc) {
      this.preload = 'auto';
      scheduleAudioPreload(mediaSrc, 0, 0);

      if (this.readyState === HTMLMediaElement.HAVE_NOTHING) {
        try {
          this.load();
        } catch (error) {
          // Browser will surface real playback failures through play().
        }
      }
    }

    rememberMedia(this);

    const category = mediaMeta.get(this)?.category || 'content';
    if (category !== 'effect') {
      stopTrackedMedia({ includeEffects: false, except: this });
      cancelSpeechOutput({ stopRecognition: false, clearPendingReply: false });
    }

    if (pendingTrigger) {
      const currentMeta = mediaMeta.get(this) || {};
      currentMeta.trigger = pendingTrigger;
      mediaMeta.set(this, currentMeta);
      lockTrigger(pendingTrigger, this);
      clearPendingTrigger();
    }

    const playPromise = nativePlay.apply(this, args);

    if (playPromise && typeof playPromise.catch === 'function') {
      return playPromise.catch((error) => {
        const currentMeta = mediaMeta.get(this);
        if (currentMeta?.trigger) {
          unlockTrigger(currentMeta.trigger, this);
          currentMeta.trigger = null;
        }
        trackedMedia.delete(this);
        throw error;
      });
    }

    return playPromise;
  };

  document.addEventListener('click', (event) => {
    playUiVoiceoverForClick(event);

    const source = isElement(event.target) ? event.target : null;
    if (!source) {
      return;
    }

    const trigger = source.closest(SOUND_TRIGGER_SELECTOR);
    if (!trigger) {
      return;
    }

    if (triggerLocks.has(trigger)) {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }
      return;
    }

    clearPendingTrigger();
    pendingTrigger = trigger;
    pendingTriggerTimer = window.setTimeout(() => {
      unlockTrigger(trigger);
      if (pendingTrigger === trigger) {
        pendingTrigger = null;
      }
    }, FALLBACK_TRIGGER_LOCK_MS);
  }, true);

  function wrapShowScreen() {
    const originalShowScreen = window.showScreen;
    if (typeof originalShowScreen !== 'function' || originalShowScreen.__audioWrapped) {
      return;
    }

    function wrappedShowScreen(screenId) {
      stopAllAppAudio({ includeEffects: false, stopRecognition: true });
      return originalShowScreen(screenId);
    }

    wrappedShowScreen.__audioWrapped = true;
    window.showScreen = wrappedShowScreen;
  }

  function getActiveScreenId() {
    const activeScreen = document.querySelector('.screen.active');
    return activeScreen && activeScreen.id !== 'g0ArticulationMap' ? activeScreen.id : null;
  }

  function normalizeArticulationReturnScreen(screenId) {
    if (!screenId) {
      return null;
    }

    if (screenId === 'grade0VoiceMenu' || screenId === 'grade1Menu') {
      return 'grade0Menu';
    }

    return screenId;
  }

  window.openArticulationMap = function openArticulationMap(fromScreen) {
    window.__articulationReturnScreen =
      normalizeArticulationReturnScreen(fromScreen) ||
      normalizeArticulationReturnScreen(getActiveScreenId()) ||
      normalizeArticulationReturnScreen(window.__articulationReturnScreen) ||
      'grade0Menu';

    if (typeof closeArticulationModal === 'function') {
      try {
        closeArticulationModal();
      } catch (error) {
        console.warn('Unable to close articulation modal before opening map:', error);
      }
    }

    if (typeof initArticulationMap === 'function') {
      initArticulationMap();
    }

    window.showScreen('g0ArticulationMap');
  };

  window.goBackFromArticulationMap = function goBackFromArticulationMap() {
    if (typeof closeArticulationModal === 'function') {
      try {
        closeArticulationModal();
      } catch (error) {
        console.warn('Unable to close articulation modal before leaving map:', error);
      }
    }

    const returnScreen = normalizeArticulationReturnScreen(window.__articulationReturnScreen) || 'grade0Menu';
    window.showScreen(returnScreen);
  };

  if (document.readyState !== 'loading') {
    wrapShowScreen();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      wrapShowScreen();
    }, { once: true });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAllAppAudio({ includeEffects: true, stopRecognition: true });
    }
  });

  window.addEventListener('pagehide', () => {
    stopAllAppAudio({ includeEffects: true, stopRecognition: true });
  });

  window.addEventListener('beforeunload', () => {
    stopAllAppAudio({ includeEffects: true, stopRecognition: true });
  });
})();
