export type TrainMode = 'short' | 'long';
export interface Segment { phone: string; start?: number; end?: number; confidence?: number }
export interface Verdict {
  correct: boolean; reason: 'empty' | 'different' | 'repetitions' | 'duration'; phones: string[];
  score: number; confidence: number; dominance: number; progress: number; ignoredPhones?: string[]; durationMs?: number;
}
export type SessionState = 'idle' | 'loading' | 'requesting' | 'listening' | 'checking' | 'complete' | 'incorrect' | 'error' | 'stopped';
export interface TrainProgress { progress: number; phase: 'signal' | 'recognition'; score?: number; rms?: number }
export interface SessionOptions {
  letter: string; mode: TrainMode;
  onState?(state: SessionState): void;
  onProgress?(progress: TrainProgress): void;
  onResult?(result: Verdict): void;
  onError?(error: Error): void;
}
export interface TrainSession { start(): Promise<boolean>; stop(): void; dispose(): void; readonly state: SessionState }
export interface PhonemeModel {
  preload(): Promise<unknown>;
  recognize(pcm: ArrayBuffer, signal: AbortSignal): Promise<Segment[]>;
}
export function asError(error: unknown) { return error instanceof Error ? error : new Error(String(error)); }
