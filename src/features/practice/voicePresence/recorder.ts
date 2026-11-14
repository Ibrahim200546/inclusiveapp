import type { AudioWindow } from '../audio/types';
import type { TeacherRecorder, TeacherRecordingResult } from './types';

export function createTeacherRecorder(app: AudioWindow): TeacherRecorder {
  let current: { finish(): void; cancel(): void } | null = null;
  const cancel = () => current?.cancel();
  return {
    available: () => !!(app.navigator.mediaDevices?.getUserMedia && app.MediaRecorder),
    cancel, finish: () => current?.finish(),
    start(onStarted) {
      cancel();
      return new Promise<TeacherRecordingResult>(resolve => {
        let stream: MediaStream | null = null, recorder: MediaRecorder | null = null;
        let timer: number | undefined, settled = false, finishing = false;
        const chunks: Blob[] = [], releases: (() => void)[] = [];
        const settle = (result: TeacherRecordingResult) => {
          if (settled) return;
          settled = true; app.clearTimeout(timer); releases.forEach(release => release());
          if (recorder) {
            recorder.ondataavailable = null; recorder.onerror = null; recorder.onstop = null;
            try { if (recorder.state !== 'inactive') recorder.stop(); } catch { /* Tracks still need to stop. */ }
          }
          stream?.getTracks().forEach(track => track.stop());
          if (current === session) current = null;
          resolve(result);
        };
        const session = {
          cancel: () => settle({ kind: 'cancelled' }),
          finish() {
            if (settled || finishing || !recorder || recorder.state !== 'recording') return;
            finishing = true; app.clearTimeout(timer);
            timer = app.setTimeout(() => settle({ kind: 'failed' }), 5000);
            try { recorder.stop(); } catch { settle({ kind: 'failed' }); }
          },
        };
        current = session;
        void (async () => {
          try {
            const obtained = await app.navigator.mediaDevices.getUserMedia({ audio: true, video: { facingMode: 'user' } });
            if (settled) { obtained.getTracks().forEach(track => track.stop()); return; }
            stream = obtained;
            if (!stream.getAudioTracks().some(track => track.readyState === 'live') || !stream.getVideoTracks().some(track => track.readyState === 'live')) throw new Error('Missing live media track');
            for (const track of stream.getTracks()) {
              const ended = () => { if (!finishing) settle({ kind: 'failed' }); };
              track.addEventListener('ended', ended); releases.push(() => track.removeEventListener('ended', ended));
            }
            recorder = new app.MediaRecorder(stream);
            recorder.ondataavailable = event => { if (!settled && event.data.size) chunks.push(event.data); };
            recorder.onerror = () => settle({ kind: 'failed' });
            recorder.onstop = () => {
              const blob = new Blob(chunks, { type: recorder!.mimeType });
              settle(blob.size ? { kind: 'recorded', source: blob } : { kind: 'failed' });
            };
            recorder.start(); timer = app.setTimeout(session.finish, 15000); onStarted(stream);
          } catch { settle({ kind: 'failed' }); }
        })();
      });
    },
  };
}
