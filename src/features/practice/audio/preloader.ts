import { isEffectMedia, type AudioPreloader, type AudioWindow, type PreloadEntry } from './types';

export function audioPreloadPriority(src: string, bytes = 0) {
  const path = src.toLowerCase();
  if (/(?:^|\/)(?:click|success|error|clap)\.(?:mp3|wav|ogg|m4a|mp4|mpeg)$/.test(path)) return 0;
  if (path.includes('/sounds/kk-human/') || /\/sounds\/(?:ru\/(?:ui|named|letters)|letters)\//.test(path)) return 1;
  if (/\/sounds\/(?:ru\/)?alippe\//.test(path) || path.includes('/sounds/ru/spatial/')) return 2;
  return bytes > 1500000 ? 7 : bytes > 500000 ? 5 : 3;
}
export function normalizeAudioUrl(src: string, base: string, origin: string) {
  try {
    const url = new URL(src, base);
    return src && !/^(?:blob|data):/.test(src) && url.origin === origin && /\.(?:mp3|wav|ogg|m4a|mp4|mpeg)(?:$|[?#])/i.test(url.pathname + url.search) ? url.href : '';
  } catch { return ''; }
}

export function createAudioPreloader(app: AudioWindow, root: Document): AudioPreloader {
  const NativeAudio = app.Audio;
  const queue: { url: string; priority: number; order: number }[] = [];
  const queued = new Set<string>(), loading = new Set<string>(), warmed = new Set<string>(), failed = new Set<string>();
  const controllers = new Set<AbortController>();
  let order = 0, started = false, effectsStarted = false, backgroundStarted = false, disposed = false;
  let backgroundTimer: number | undefined, idleTask: number | undefined, ownedContext: AudioContext | undefined;

  function pump() {
    if (!started || disposed) return;
    while (loading.size < 2 && queue.length) {
      queue.sort((a, b) => a.priority - b.priority || a.order - b.order);
      const item = queue.shift()!; queued.delete(item.url);
      if (warmed.has(item.url) || loading.has(item.url)) continue;
      const controller = new AbortController(); controllers.add(controller); loading.add(item.url);
      void app.fetch(item.url, { cache: 'force-cache', signal: controller.signal }).then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.blob();
      }).then(blob => { if (!disposed && blob.size) warmed.add(item.url); })
        .catch(() => { if (!disposed) failed.add(item.url); })
        .finally(() => { loading.delete(item.url); controllers.delete(controller); pump(); });
    }
  }
  function schedule(src: string, priority = 3) {
    if (disposed) return;
    const url = normalizeAudioUrl(src, root.baseURI, app.location.origin);
    if (!url || warmed.has(url) || loading.has(url) || queued.has(url)) return;
    queued.add(url); queue.push({ url, priority, order: ++order }); pump();
  }
  function warm() {
    if (disposed) return;
    started = true;
    if (!effectsStarted) {
      effectsStarted = true;
      root.querySelectorAll<HTMLAudioElement>('audio[src]').forEach(audio => {
        const effect = isEffectMedia(audio); audio.preload = effect ? 'auto' : 'metadata';
        if (effect) { schedule(audio.src, 0); try { audio.load(); } catch { /* Playback reports missing files. */ } }
      });
    }
    pump();
  }
  function warmup() {
    warm();
    try {
      const Context = app.AudioContext || app.webkitAudioContext;
      if (Context && !app.__inclusiveAudioWarmupCtx) { ownedContext = new Context(); app.__inclusiveAudioWarmupCtx = ownedContext; }
      void app.__inclusiveAudioWarmupCtx?.resume().catch(() => {});
    } catch { /* AudioContext can be unavailable or limited by the browser. */ }
  }
  const events = ['pointerdown', 'touchstart', 'keydown'];
  events.forEach(event => root.addEventListener(event, warmup, { once: true, passive: true }));
  const OptimizedAudio = function (src?: string) {
    const audio = new NativeAudio(); audio.preload = 'metadata';
    if (src) { audio.src = src; schedule(src, 1); }
    return audio;
  } as unknown as typeof Audio;
  OptimizedAudio.prototype = NativeAudio.prototype; Object.setPrototypeOf(OptimizedAudio, NativeAudio);
  app.Audio = OptimizedAudio;

  return {
    schedule,
    preload(srcs, options = {}) {
      for (const entry of Array.isArray(srcs) ? srcs : [srcs]) {
        const src = typeof entry === 'string' ? entry : entry?.src;
        if (src) schedule(src, options.priority ?? audioPreloadPriority(src, typeof entry === 'string' ? 0 : entry.bytes || 0));
      }
      warm();
    },
    start() {
      warm(); if (disposed || backgroundStarted) return; backgroundStarted = true;
      const enqueue = () => {
        if (disposed) return;
        (app.APP_AUDIO_PRELOAD_MANIFEST || []).map(entry => {
          const src = typeof entry === 'string' ? entry : entry.src || '';
          const bytes = typeof entry === 'string' ? 0 : entry.bytes || 0;
          return { src, bytes, priority: audioPreloadPriority(src, bytes) };
        }).filter(entry => entry.src && entry.priority <= 2 && entry.bytes <= 180000)
          .sort((a, b) => a.priority - b.priority || a.bytes - b.bytes).slice(0, 80)
          .forEach(entry => schedule(entry.src, entry.priority));
      };
      backgroundTimer = app.setTimeout(() => {
        if (app.requestIdleCallback) idleTask = app.requestIdleCallback(enqueue, { timeout: 2200 }); else enqueue();
      }, 1200);
    },
    stats: () => ({ queued: queue.length, loading: loading.size, warmed: warmed.size, failed: failed.size }),
    dispose() {
      disposed = true; controllers.forEach(controller => controller.abort()); controllers.clear();
      queue.length = 0; queued.clear(); loading.clear(); warmed.clear(); failed.clear();
      app.clearTimeout(backgroundTimer); if (idleTask !== undefined) app.cancelIdleCallback?.(idleTask);
      events.forEach(event => root.removeEventListener(event, warmup));
      if (app.Audio === OptimizedAudio) app.Audio = NativeAudio;
      if (ownedContext) { void ownedContext.close().catch(() => {}); if (app.__inclusiveAudioWarmupCtx === ownedContext) delete app.__inclusiveAudioWarmupCtx; }
    },
  };
}
