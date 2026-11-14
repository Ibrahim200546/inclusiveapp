import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useNavigator } from '../navigation/navigationContext';
import { trainCopy, trainFeedback } from '../train/copy';
import { isBusy, type TrainStore } from '../train/store';
import '../train/train.css';

export function TrainPractice({ store }: { store: TrainStore }) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot), navigator = useNavigator();
  const center = useRef<HTMLButtonElement>(null), stop = useRef<HTMLButtonElement>(null), retry = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null), [expanded, setExpanded] = useState(false);
  const copy = trainCopy[state.locale], busy = isBusy(state.status);
  const train = busy || ['complete', 'incorrect', 'error'].includes(state.status);
  useLayoutEffect(() => {
    if (!state.active || !state.expanded) { setExpanded(false); return; }
    // Give newly rendered letters their collapsed geometry before opening the orbit.
    void menu.current?.offsetWidth;
    const frame = requestAnimationFrame(() => setExpanded(true));
    return () => cancelAnimationFrame(frame);
  }, [state.active, state.expanded]);
  useEffect(() => {
    if (!state.active) return;
    if (state.status === 'loading') stop.current?.focus();
    else if (['complete', 'incorrect', 'error'].includes(state.status)) retry.current?.focus();
    else if (state.expanded || ['selected', 'stopped'].includes(state.status)) center.current?.focus();
  }, [state.active, state.status, state.expanded]);
  const host = document.querySelector<HTMLElement>('#g0Task2 [data-train-root]');
  if (!state.active || !host) return null;
  return createPortal(<section className="voice-game-wrapper train-practice" data-react-owned="true" data-i18n-managed="true" data-card-audio="true"
    data-status={state.status} aria-labelledby="trainTitle" lang={state.locale}>
    <h2 id="trainTitle">{copy.title}</h2>
    <div className={`voice-bubble-container${expanded ? ' expanded' : ''}`} id="voiceGameContainer" hidden={train} ref={menu}>
      <button type="button" className="voice-center-bubble" id="voiceCenterBtn" ref={center} aria-expanded={state.expanded}
        onClick={store.center}>{state.expanded ? copy.close : state.selected ? `▶ ${state.selected} — ${copy.begin}` : copy.center}</button>
      {state.letters.map((letter, index) => <button type="button" key={letter} className="small-bubble" tabIndex={state.expanded ? 0 : -1}
        aria-hidden={!state.expanded} aria-label={state.locale === 'kk' ? `${letter} ${copy.select}` : `${copy.select} ${letter}`}
        aria-pressed={state.selected === letter} style={{ '--voice-angle': `${index * 45}deg`, '--voice-delay': `${index * 18}ms` } as CSSProperties}
        onClick={() => { void store.select(letter); }}>{letter}</button>)}
    </div>
    <p id="trainVoiceNote" className="instruction">{copy.note}</p>
    <div id="phonemeControls"><label htmlFor="phonemeMode">{copy.mode}</label>
      <select id="phonemeMode" value={state.mode} onChange={event => store.setMode(event.target.value === 'short' ? 'short' : 'long')}>
        <option value="short">{copy.short}</option><option value="long">{copy.long}</option>
      </select>
    </div>
    <div id="voiceFeedback" role="status" className={`feedback ${state.status === 'complete' ? 'success' : ['error', 'incorrect'].includes(state.status) ? 'error' : ''}`}>{trainFeedback(state)}</div>
    <div id="voiceTrainContainer" hidden={!train}>
      <div className="train-track">
        <div className="train-icon-track" aria-hidden="true"><span id="trainIcon" style={{ left: `${state.progress}%` }}>🚂</span></div>
        <div className="train-progress-track" role="progressbar" aria-label={copy.progress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor(state.progress)}>
          <div id="voiceProgressBar" style={{ width: `${state.progress}%` }} />
          <span className="train-percent">{Math.floor(state.progress)}%</span>
        </div>
      </div>
      <p id="trainVoiceEvidence" className="instruction">{state.evidence ? state.evidence.phase === 'signal' ? copy.signal : `${copy.score}: ${state.evidence.score || 0}%` : ''}</p>
      <button type="button" id="trainVoiceStop" className="btn btn-secondary" ref={stop} hidden={!busy} onClick={store.stop}>{copy.stop}</button>
      <div id="trainVoiceActions" hidden={busy}>
        <button type="button" id="trainVoiceRetry" className="btn" ref={retry} onClick={() => { void store.start(); }}>{copy.retry}</button>
        <button type="button" id="trainVoiceChoose" className="btn btn-secondary" onClick={store.expand}>{copy.choose}</button>
      </div>
    </div>
    {!train && state.selected && <button type="button" className="btn" onClick={store.expand}>{copy.choose}</button>}
    <button type="button" className="btn btn-secondary train-back" data-destination="grade0VoiceMenu" onClick={() => navigator.navigate('grade0VoiceMenu')}>⬅️ {copy.back}</button>
  </section>, host);
}
