import type { AudioWindow, TtsClient, TtsOptions, TtsResult } from './types';

function positive(value: unknown, fallback: number) { const number = Number(value); return Number.isFinite(number) && number > 0 ? number : fallback; }
function abortable<T>(pending: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(new DOMException('Cancelled', 'AbortError'));
    if (signal.aborted) { void pending.catch(() => {}); abort(); return; }
    signal.addEventListener('abort', abort, { once: true });
    pending.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}
interface Session { controller: AbortController; audio: HTMLAudioElement | null; url: string; cleanup?: () => void; timedOut: boolean }

export function createTtsClient(app: AudioWindow): TtsClient {
  let session: Session | null = null;
  let audioEl: HTMLAudioElement | null = null;
  let disposed = false;
  const cache = new Map<string, Blob>();
  function ensureAudioEl() { if (!audioEl) { audioEl = new app.Audio(); audioEl.preload = 'auto'; } return audioEl; }
  function stop() {
    const previous = session; session = null;
    if (!previous) return;
    previous.controller.abort(); previous.cleanup?.();
    if (previous.audio) { try { previous.audio.pause(); previous.audio.currentTime = 0; } catch { /* Already stopped. */ } }
    if (previous.url) { app.URL.revokeObjectURL(previous.url); previous.url = ''; }
  }
  function langDefault() {
    if (app.getProfileSpeechLang) return app.getProfileSpeechLang();
    try { return (app.localStorage.getItem('profileLang') || app.localStorage.getItem('locale')) === 'ru' ? 'ru-RU' : 'kk-KZ'; }
    catch { return 'kk-KZ'; }
  }
  const cancelled = (current: Session): TtsResult => ({ ok: false, reason: current.timedOut ? 'timeout' : 'cancelled' });
  async function errorDetails(response: Response) {
    try {
      if (response.headers.get('content-type')?.includes('application/json')) {
        const payload = await response.json(); return [payload?.error, payload?.message, payload?.details].filter(Boolean).join(' ');
      }
      return await response.text();
    } catch { return ''; }
  }
  async function request(text: string, lang: string, options: TtsOptions, current: Session): Promise<{ ok: true; blob: Blob } | Extract<TtsResult, { ok: false }>> {
    const signal = current.controller.signal;
    const timer = app.setTimeout(() => { current.timedOut = true; current.controller.abort(); }, Math.max(1000, positive(options.timeoutMs, 6500)));
    const provider = (options.provider || 'yandex').trim().toLowerCase();
    const voice = options.voice?.trim(); const speed = positive(options.speed, 0);
    const payload = { text, lang, ...(voice ? { voice } : {}), ...(speed ? { speed } : {}) };
    const send = (preferred: boolean) => abortable(app.fetch('/api/tts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
      body: JSON.stringify(preferred && provider ? { ...payload, provider } : payload),
    }), signal);
    try {
      let response = await send(true);
      if (!response.ok) {
        const details = await abortable(errorDetails(response), signal);
        if (details.includes('Requested TTS provider is not configured')) response = await send(false);
        else return { ok: false, reason: 'request_failed', status: response.status, details: details || `Status ${response.status}` };
      }
      if (!response.ok) return { ok: false, reason: 'request_failed', status: response.status, details: await abortable(errorDetails(response), signal) };
      const blob = await abortable(response.blob(), signal);
      return blob.size ? { ok: true, blob } : { ok: false, reason: 'empty_audio', details: 'Received empty audio from TTS.' };
    } finally { app.clearTimeout(timer); }
  }
  async function play(source: string | Blob, options: TtsOptions, current: Session): Promise<TtsResult> {
    const signal = current.controller.signal;
    if (signal.aborted || session !== current) return cancelled(current);
    const audio = ensureAudioEl(); current.audio = audio;
    const path = typeof source === 'string' ? source : (current.url = app.URL.createObjectURL(source));
    audio.src = path; audio.preload = 'auto'; audio.playbackRate = positive(options.playbackRate, 1);
    audio.volume = Number.isFinite(Number(options.volume)) ? Math.min(1, Math.max(0, Number(options.volume))) : 1;
    let finish!: (value: 'ended' | 'cancelled' | 'error') => void;
    const completed = new Promise<'ended' | 'cancelled' | 'error'>(resolve => { finish = resolve; });
    const cleanup = () => {
      audio.removeEventListener('ended', ended); audio.removeEventListener('pause', paused); audio.removeEventListener('error', failed);
      signal.removeEventListener('abort', aborted); current.cleanup = undefined;
    };
    const ended = () => {
      cleanup(); finish('ended');
      if (!signal.aborted && session === current) options.onEnd?.(audio);
    };
    const paused = () => { if (audio.paused && !audio.ended) { cleanup(); finish('cancelled'); } };
    const failed = () => { cleanup(); finish('error'); };
    const aborted = () => { cleanup(); finish('cancelled'); };
    current.cleanup = cleanup;
    audio.addEventListener('ended', ended); audio.addEventListener('pause', paused); audio.addEventListener('error', failed);
    signal.addEventListener('abort', aborted, { once: true });
    try {
      options.onReady?.(audio);
      if (signal.aborted || session !== current) return cancelled(current);
      await abortable(audio.play(), signal);
      if (options.waitUntilEnd) {
        const result = await completed;
        if (result === 'cancelled') return cancelled(current);
        if (result === 'error') throw new Error('Audio playback failed.');
      }
      if (signal.aborted || session !== current) return cancelled(current);
      return { ok: true, audioEl: audio, ...(typeof source === 'string' ? { static: true, path } : {}) };
    } catch (error) { cleanup(); throw error; }
  }
  async function speakText(text: string, lang = langDefault(), options: TtsOptions = {}): Promise<TtsResult> {
    const trimmed = String(text || '').trim();
    if (!trimmed) return { ok: false, reason: 'empty' };
    stop(); if (disposed) return { ok: false, reason: 'cancelled' };
    // Separate elements prevent late events from an older utterance reaching a new one.
    audioEl = null;
    const current: Session = { controller: new AbortController(), audio: null, url: '', timedOut: false }; session = current;
    let staticPath = '';
    try {
      staticPath = app.getKkHumanVoiceoverAudioPath?.(trimmed, lang) || app.getRuVoiceoverAudioPath?.(trimmed, lang) || '';
      if (staticPath) return await play(staticPath, options, current);
      const key = JSON.stringify([(options.provider || 'yandex').trim().toLowerCase(), lang, options.voice?.trim() || '', positive(options.speed, 0) || '', trimmed]);
      let blob = cache.get(key);
      if (!blob) {
        if (!app.fetch) return { ok: false, reason: 'unsupported' };
        const result = await request(trimmed, lang, options, current);
        if (current.controller.signal.aborted || session !== current) return cancelled(current);
        if (result.ok === false) return result;
        blob = result.blob; cache.set(key, blob);
        while (cache.size > 50) cache.delete(cache.keys().next().value!);
      }
      return await play(blob, options, current);
    } catch (error) {
      if (current.controller.signal.aborted || session !== current) return cancelled(current);
      const details = error instanceof Error ? error.message : String(error);
      return { ok: false, reason: staticPath ? 'static_audio_failed' : current.audio ? 'autoplay' : 'request_failed', details };
    }
  }
  return { ensureAudioEl, ownsAudio: audio => session?.audio === audio, speakText, stop, dispose() { stop(); disposed = true; cache.clear(); audioEl = null; } };
}
