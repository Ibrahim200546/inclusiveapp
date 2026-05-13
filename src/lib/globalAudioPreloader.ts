type AudioManifestEntry = {
  src: string;
  bytes?: number;
};

type AudioPreloadItem = {
  url: string;
  priority: number;
  bytes: number;
  order: number;
};

type AudioPreloadStats = {
  queued: number;
  loading: number;
  warmed: number;
  failed: number;
};

declare global {
  interface Window {
    appAudioPreloader?: {
      preload: (srcs: string | string[] | AudioManifestEntry[], options?: { priority?: number }) => void;
      start: () => void;
      stats: () => AudioPreloadStats;
    };
    __inclusiveReactAudioPreloaderInstalled?: boolean;
    __inclusiveReactAudioWarmupCtx?: AudioContext;
    webkitAudioContext?: typeof AudioContext;
  }
}

const AUDIO_PRELOAD_CONCURRENCY = 4;
const AUDIO_BACKGROUND_START_DELAY_MS = 350;
const AUDIO_EXT_RE = /\.(?:mp3|wav|ogg|m4a)(?:$|[?#])/i;
const COMMON_AUDIO = [
  '/sounds/click.mp3',
  '/sounds/success.mp3',
  '/sounds/error.mp3',
  '/sounds/clap.mp3',
];

let preloadOrder = 0;
let manifestLoaded = false;

const audioPreloadState = {
  queue: [] as AudioPreloadItem[],
  queued: new Set<string>(),
  loading: new Set<string>(),
  warmed: new Set<string>(),
  failed: new Set<string>(),
  running: 0,
  started: false,
};

function normalizeAudioUrl(src: string | undefined) {
  const rawSrc = String(src || '').trim();
  if (!rawSrc || rawSrc.startsWith('blob:') || rawSrc.startsWith('data:')) {
    return '';
  }

  try {
    const url = new URL(rawSrc, window.location.href);
    if (url.origin !== window.location.origin || !AUDIO_EXT_RE.test(url.pathname + url.search)) {
      return '';
    }

    return url.href;
  } catch {
    return '';
  }
}

function getAudioPreloadPriority(src: string | undefined, bytes = 0) {
  const normalized = String(src || '').toLowerCase();
  if (/(?:^|\/)(?:click|success|error|clap)\.(?:mp3|wav|ogg|m4a)$/.test(normalized)) return 0;
  if (normalized.includes('/sounds/ru/ui/') || normalized.includes('/sounds/ru/named/')) return 1;
  if (normalized.includes('/sounds/letters/') || normalized.includes('/sounds/ru/letters/')) return 1;
  if (normalized.includes('/sounds/alippe/') || normalized.includes('/sounds/ru/alippe/')) return 2;
  if (normalized.includes('/sounds/ru/spatial/')) return 2;
  if (bytes > 1500000) return 7;
  if (bytes > 500000) return 5;
  return 3;
}

function pumpAudioPreloadQueue() {
  if (!audioPreloadState.started) return;

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
        if (blob.size > 0) {
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

function scheduleAudioPreload(src: string | undefined, priority = 3, bytes = 0) {
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

function scheduleAudioPreloadMany(entries: string[] | AudioManifestEntry[], fallbackPriority = 3) {
  entries.forEach((entry) => {
    const src = typeof entry === 'string' ? entry : entry.src;
    const bytes = typeof entry === 'string' ? 0 : Number(entry.bytes) || 0;
    const priority = src ? getAudioPreloadPriority(src, bytes) : fallbackPriority;
    scheduleAudioPreload(src, priority, bytes);
  });
}

function warmDomAudioElements() {
  document.querySelectorAll('audio[src]').forEach((audio) => {
    const src = audio.getAttribute('src') || audio.currentSrc || audio.src;
    audio.preload = 'auto';
    scheduleAudioPreload(src, getAudioPreloadPriority(src), 0);

    try {
      audio.load();
    } catch {
      // Normal playback paths still report real failures.
    }
  });
}

function installOptimizedAudioConstructor() {
  const NativeAudio = window.Audio;
  if (!NativeAudio || (window.Audio as unknown as { __inclusiveAudioOptimized?: boolean }).__inclusiveAudioOptimized) {
    return;
  }

  function InclusiveOptimizedAudio(src?: string) {
    const audio = new NativeAudio();
    audio.preload = 'auto';

    if (src) {
      audio.src = src;
      scheduleAudioPreload(src, getAudioPreloadPriority(src), 0);

      try {
        audio.load();
      } catch {
        // Ignore eager-load failures; play() will surface the actual error.
      }
    }

    return audio;
  }

  InclusiveOptimizedAudio.prototype = NativeAudio.prototype;
  Object.setPrototypeOf(InclusiveOptimizedAudio, NativeAudio);
  (InclusiveOptimizedAudio as unknown as { __inclusiveAudioOptimized: boolean }).__inclusiveAudioOptimized = true;
  window.Audio = InclusiveOptimizedAudio as unknown as typeof Audio;
}

function loadAudioManifest() {
  if (manifestLoaded) return;
  manifestLoaded = true;

  fetch('/audio-preload-manifest.json', { cache: 'force-cache' })
    .then((response) => (response.ok ? response.json() : []))
    .then((manifest: AudioManifestEntry[]) => {
      if (Array.isArray(manifest)) {
        scheduleAudioPreloadMany(manifest);
      }
    })
    .catch(() => {
      // The app can still play on demand if the manifest is unavailable.
    });
}

function installAudioWarmupEvents() {
  const warmup = () => {
    startAppAudioPreload();
    try {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (AudioContextCtor && !window.__inclusiveReactAudioWarmupCtx) {
        window.__inclusiveReactAudioWarmupCtx = new AudioContextCtor();
      }
      window.__inclusiveReactAudioWarmupCtx?.resume?.();
    } catch {
      // Ignore browser-specific AudioContext limits.
    }
  };

  ['pointerdown', 'touchstart', 'keydown'].forEach((eventName) => {
    document.addEventListener(eventName, warmup, { once: true, passive: true });
  });
}

export function startAppAudioPreload() {
  if (typeof window === 'undefined') return;
  if (audioPreloadState.started) return;

  audioPreloadState.started = true;
  warmDomAudioElements();
  scheduleAudioPreloadMany(COMMON_AUDIO, 0);

  window.setTimeout(() => {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(loadAudioManifest, { timeout: 2200 });
    } else {
      loadAudioManifest();
    }
  }, AUDIO_BACKGROUND_START_DELAY_MS);

  pumpAudioPreloadQueue();
}

export function preloadAppAudio(srcs: string | string[] | AudioManifestEntry[], options: { priority?: number } = {}) {
  if (typeof window === 'undefined') return;

  const priority = Number.isFinite(Number(options.priority)) ? Number(options.priority) : 1;
  const entries = Array.isArray(srcs) ? srcs : [srcs];
  scheduleAudioPreloadMany(entries as string[] | AudioManifestEntry[], priority);
  startAppAudioPreload();
}

export function getAudioPreloadStats(): AudioPreloadStats {
  return {
    queued: audioPreloadState.queue.length,
    loading: audioPreloadState.loading.size,
    warmed: audioPreloadState.warmed.size,
    failed: audioPreloadState.failed.size,
  };
}

export function installGlobalAudioPreloader() {
  if (typeof window === 'undefined') return;

  if (!window.__inclusiveReactAudioPreloaderInstalled) {
    window.__inclusiveReactAudioPreloaderInstalled = true;
    installOptimizedAudioConstructor();
    installAudioWarmupEvents();
    window.appAudioPreloader = {
      preload: preloadAppAudio,
      start: startAppAudioPreload,
      stats: getAudioPreloadStats,
    };
  }

  startAppAudioPreload();
}
