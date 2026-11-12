export interface TtsOptions {
  provider?: string; voice?: string; speed?: number; timeoutMs?: number;
  playbackRate?: number; volume?: number; waitUntilEnd?: boolean;
  onReady?: (audio: HTMLAudioElement) => void; onEnd?: (audio: HTMLAudioElement) => void;
}
export type TtsResult = { ok: true; audioEl: HTMLAudioElement; static?: boolean; path?: string }
  | { ok: false; reason: 'empty' | 'cancelled' | 'timeout' | 'request_failed' | 'empty_audio' | 'autoplay' | 'static_audio_failed' | 'unsupported'; details?: string; status?: number };
export interface TtsClient {
  ensureAudioEl(): HTMLAudioElement;
  ownsAudio(audio: HTMLAudioElement): boolean;
  speakText(text: string, lang?: string, options?: TtsOptions): Promise<TtsResult>;
  stop(): void;
  dispose(): void;
}
export type PreloadEntry = string | { src?: string; bytes?: number };
export interface AudioPreloader {
  preload(srcs: PreloadEntry | PreloadEntry[], options?: { priority?: number }): void;
  schedule(src: string, priority?: number): void;
  start(): void;
  stats(): { queued: number; loading: number; warmed: number; failed: number };
  dispose(): void;
}
export interface StopAudioOptions { includeEffects?: boolean; stopRecognition?: boolean }
export type AudioWindow = Window & typeof globalThis & {
  appTts?: TtsClient;
  appAudioPreloader?: AudioPreloader;
  APP_AUDIO_PRELOAD_MANIFEST?: PreloadEntry[];
  getProfileLang?: () => string;
  getProfileSpeechLang?: () => string;
  getRuVoiceoverAudioPath?: (text: string, lang: string) => string;
  getKkHumanVoiceoverAudioPath?: (text: string, lang: string) => string;
  chatbotTTS?: { stop(): void };
  chatbotControls?: { clearPendingReply?(): void; stopRecognition?(): void };
  stopVoicePractice?: () => void;
  stopReading?: () => void;
  stopVoiceGame?: () => void;
  webkitAudioContext?: typeof AudioContext;
  __inclusiveAudioWarmupCtx?: AudioContext;
};
export function isEffectMedia(media: HTMLAudioElement) {
  const id = (media.id || '').toLowerCase();
  const src = (media.currentSrc || media.src || '').toLowerCase();
  return /click|success|error|clap/.test(id) || /(?:click|success|error|clap)\.mp3/.test(src);
}
