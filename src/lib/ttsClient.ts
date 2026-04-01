export type SpeakTtsOptions = {
  lang?: string;
  provider?: string;
  voice?: string;
  speed?: number;
  timeoutMs?: number;
  playbackRate?: number;
  waitUntilEnd?: boolean;
  volume?: number;
};

export type SpeakTtsResult = {
  ok: boolean;
  reason?: string;
  status?: number;
  details?: string;
  audio?: HTMLAudioElement;
};

let activeController: AbortController | null = null;
let currentAudio: HTMLAudioElement | null = null;
let currentAudioUrl = '';

function parsePositiveNumber(value: unknown, fallback: number | null = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function readTtsError(response: Response) {
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

function ensureAudioElement() {
  if (!currentAudio) {
    currentAudio = new Audio();
    currentAudio.preload = 'auto';
  }

  return currentAudio;
}

function revokeAudioUrl() {
  if (!currentAudioUrl) {
    return;
  }

  try {
    URL.revokeObjectURL(currentAudioUrl);
  } catch {
    // Ignore URL cleanup issues.
  }

  currentAudioUrl = '';
}

export function stopTtsPlayback() {
  if (activeController) {
    activeController.abort();
    activeController = null;
  }

  if (!currentAudio) {
    return;
  }

  try {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  } catch {
    // Ignore playback stop issues.
  }
}

export async function speakTtsText(text: string, options: SpeakTtsOptions = {}): Promise<SpeakTtsResult> {
  const trimmedText = String(text || '').trim();
  if (!trimmedText) {
    return { ok: false, reason: 'empty' };
  }

  if (typeof window === 'undefined' || typeof fetch !== 'function') {
    return { ok: false, reason: 'unsupported', details: 'Fetch API is not available.' };
  }

  stopTtsPlayback();

  const controller = new AbortController();
  activeController = controller;
  const timeoutMs = Math.max(parsePositiveNumber(options.timeoutMs, 6500) || 6500, 1000);
  const timerId = window.setTimeout(() => controller.abort(), timeoutMs);
  const requestedProvider = String(options.provider || 'yandex').trim().toLowerCase();
  const lang = String(options.lang || 'kk-KZ').trim() || 'kk-KZ';
  const voice = String(options.voice || '').trim();
  const speed = parsePositiveNumber(options.speed, null);

  const payloadBase: Record<string, unknown> = {
    text: trimmedText,
    lang,
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

    const audioBlob = await response.blob();
    if (!audioBlob.size) {
      return {
        ok: false,
        reason: 'empty_audio',
        details: 'Received empty audio from TTS.',
      };
    }

    const audio = ensureAudioElement();
    revokeAudioUrl();
    currentAudioUrl = URL.createObjectURL(audioBlob);
    audio.src = currentAudioUrl;
    audio.preload = 'auto';
    audio.playbackRate = parsePositiveNumber(options.playbackRate, 1) || 1;
    audio.volume = Number.isFinite(Number(options.volume)) ? Number(options.volume) : 1;

    await audio.play();

    if (options.waitUntilEnd) {
      await new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          audio.removeEventListener('ended', handleEnded);
          audio.removeEventListener('error', handleError);
        };

        const handleEnded = () => {
          cleanup();
          resolve();
        };

        const handleError = () => {
          cleanup();
          reject(new Error('Audio playback failed.'));
        };

        audio.addEventListener('ended', handleEnded, { once: true });
        audio.addEventListener('error', handleError, { once: true });
      });
    }

    return { ok: true, audio };
  } catch (error) {
    if (controller.signal.aborted) {
      return {
        ok: false,
        reason: 'timeout',
        details: error instanceof Error ? error.message : 'TTS request timed out.',
      };
    }

    return {
      ok: false,
      reason: 'request_failed',
      details: error instanceof Error ? error.message : 'TTS request failed.',
    };
  } finally {
    window.clearTimeout(timerId);
    if (activeController === controller) {
      activeController = null;
    }
  }
}
