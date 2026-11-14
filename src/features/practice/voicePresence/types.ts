export type VideoLoadResult = 'ready' | 'noVideo' | 'unsupported' | 'cancelled';
export type VideoPlayResult = { kind: 'ended'; signal: boolean } | { kind: 'failed' | 'interrupted' | 'cancelled' };
export interface PresencePlayer {
  load(source: Blob): Promise<VideoLoadResult>;
  play(voiced: boolean, detectSignal: boolean): Promise<VideoPlayResult>;
  stop(): void;
  clear(): void;
}
export type TeacherRecordingResult = { kind: 'recorded'; source: Blob } | { kind: 'cancelled' | 'failed' };
export interface TeacherRecorder {
  available(): boolean;
  start(onStarted: (stream: MediaStream) => void): Promise<TeacherRecordingResult>;
  finish(): void;
  cancel(): void;
}
