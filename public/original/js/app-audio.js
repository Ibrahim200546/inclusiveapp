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
  const FALLBACK_TRIGGER_LOCK_MS = 1800;

  let pendingTrigger = null;
  let pendingTriggerTimer = null;

  function isElement(value) {
    return value instanceof Element;
  }

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
        lang: String(lang || 'kk-KZ').trim() || 'kk-KZ',
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
          };

          const handleEnded = () => {
            cleanup();
            resolve();
          };

          const handleError = () => {
            cleanup();
            reject(new Error('Audio playback failed.'));
          };

          el.addEventListener('ended', handleEnded, { once: true });
          el.addEventListener('error', handleError, { once: true });
        });
      }

      return { ok: true, audioEl: el };
    }

    async function speakText(text, lang = 'kk-KZ', options = {}) {
      if (typeof fetch !== 'function') {
        return {
          ok: false,
          reason: 'unsupported',
          details: 'Fetch API is not available in this browser.',
        };
      }

      const trimmedText = String(text || '').trim();
      if (!trimmedText) {
        return { ok: false, reason: 'empty' };
      }

      stop();

      const blobResult = await requestAudioBlob(trimmedText, lang, options);
      if (!blobResult.ok) {
        return blobResult;
      }

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
    document.addEventListener('DOMContentLoaded', wrapShowScreen, { once: true });
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
