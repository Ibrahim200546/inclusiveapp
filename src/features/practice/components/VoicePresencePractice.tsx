import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useNavigator } from '../navigation/navigationContext';
import type { PresenceRuntime } from '../legacy/voicePresence';
import type { PresenceSnapshot } from '../voicePresence/store';
import { presenceCopy } from '../voicePresence/content';
import '../voicePresence/voicePresence.css';

function PresenceLesson({ runtime, state }: { runtime: PresenceRuntime; state: PresenceSnapshot }) {
  const { store, video, recorder } = runtime, copy = presenceCopy[state.locale], navigator = useNavigator();
  const root = useRef<HTMLElement>(null), playerRef = useRef<HTMLVideoElement>(null), cameraRef = useRef<HTMLVideoElement>(null);
  useLayoutEffect(() => video.attach(playerRef.current!), [video]);
  useEffect(() => {
    const camera = cameraRef.current!, stream = state.camera;
    camera.srcObject = stream;
    if (stream) void camera.play().catch(() => { if (camera.srcObject === stream) store.failRecording(); });
    return () => { camera.pause(); camera.srcObject = null; };
  }, [state.camera, store]);
  const wrong = state.message === 'wrong';
  useEffect(() => {
    const action = state.phase === 'complete' || state.answered ? 'continue' : 'play';
    root.current?.querySelector<HTMLButtonElement>(`[data-act="${action}"]:not([hidden])`)?.focus({ preventScroll: true });
  }, [state.phase, state.index, state.answered, state.ready, wrong]);
  const step = state.phase === 'preview' ? copy.preview : state.phase === 'example' ? (state.index === 0 ? copy.exampleVoice : copy.exampleSilent)
    : state.phase === 'question' ? `${state.index + 1} / 2 · ${copy.question}` : state.phase === 'complete' ? copy.complete : '';
  const next = state.phase === 'complete' ? copy.restart : state.phase === 'preview' ? copy.confirm
    : state.phase === 'example' ? (state.index === 0 ? copy.nextExample : copy.begin) : copy.next;
  return <section ref={root} className="learning-wrap voice-presence" data-react-owned="true" data-i18n-managed="true" data-card-audio="true"
    aria-labelledby="voicePresenceTitle" lang={state.locale}>
    <button type="button" className="voice-back" data-act="back" data-destination="grade0SoundsMenu" onClick={() => navigator.navigate('grade0SoundsMenu')}>{copy.back}</button>
    <h2 id="voicePresenceTitle">{copy.title}</h2>
    <div className="voice-teacher" data-part="setup" hidden={state.phase !== 'setup' && state.phase !== 'preview'}>
      <label htmlFor="voicePresenceFile">{copy.choose}</label>
      <p id="voicePresenceGuide">{copy.guide}</p>
      <input key={state.fileReset} id="voicePresenceFile" type="file" accept="video/*" aria-describedby="voicePresenceGuide"
        disabled={state.capture !== 'idle'} onChange={event => void store.loadSource(event.currentTarget.files?.[0])} />
      <div className="voice-controls">
        <button type="button" data-act="record" hidden={state.capture !== 'idle' || !recorder.available()} onClick={() => void store.record()}>{copy.record}</button>
        <button type="button" data-act="finishRecording" hidden={state.capture !== 'recording'} onClick={store.finishRecording}>{copy.finishRecording}</button>
        <button type="button" data-act="cancelRecording" hidden={state.capture === 'idle'} onClick={store.cancelRecording}>{copy.cancelRecording}</button>
      </div>
      <video ref={cameraRef} data-part="camera" aria-label={copy.camera} muted playsInline hidden={!state.camera} />
    </div>
    <p className="voice-step" data-part="step" aria-live="polite">{step}</p>
    <video ref={playerRef} data-part="video" aria-label={copy.video} preload="metadata" playsInline disablePictureInPicture hidden={!state.ready} />
    <div className="voice-controls">
      <button type="button" data-act="play" hidden={!state.ready || state.answered || state.phase === 'complete'} aria-pressed={state.playing}
        onClick={() => { if (state.playing) store.stop(); else void store.play(); }}>
        {state.playing ? copy.stop : state.watched || wrong ? copy.replay : state.phase === 'preview' ? copy.previewPlay : copy.watch}
      </button>
      <button type="button" data-act="continue" hidden={!(state.phase === 'complete' || (state.watched && !state.playing && (state.phase !== 'question' || state.answered)))} onClick={store.next}>{next}</button>
      {state.saved === false && <button type="button" data-act="save" onClick={store.saveResult}>{copy.retrySave}</button>}
    </div>
    <div className="voice-choices" data-part="choices" hidden={state.phase !== 'question'}>
      <button type="button" data-act="yes" disabled={!state.watched || state.answered || state.playing} onClick={() => store.answer(true)}><span aria-hidden="true">🔊</span><span>{copy.yes}</span></button>
      <button type="button" data-act="no" disabled={!state.watched || state.answered || state.playing} onClick={() => store.answer(false)}><span aria-hidden="true">🔇</span><span>{copy.no}</span></button>
    </div>
    <p className="voice-feedback" data-part="feedback" data-message={state.message ?? ''} role="status">{state.message ? copy[state.message] : ''}</p>
  </section>;
}

export function VoicePresencePractice({ runtime }: { runtime: PresenceRuntime }) {
  const state = useSyncExternalStore(runtime.store.subscribe, runtime.store.getSnapshot);
  if (!state.active) return null;
  const host = document.getElementById('voicePresenceScreen');
  return host ? createPortal(<PresenceLesson runtime={runtime} state={state} />, host) : null;
}
