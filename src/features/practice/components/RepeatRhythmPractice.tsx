import { useLayoutEffect, useRef, useSyncExternalStore, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useNavigator } from '../navigation/navigationContext';
import { freeSpan, rhythmCopy, rhythmLevels, rhythmPads, rhythmSpan, usedRhythmPads, type RhythmBeat, type RhythmPad } from '../repeatRhythm/content';
import type { RhythmStore } from '../repeatRhythm/store';
import '../repeatRhythm/rhythm.css';

const padStyle = (pad: RhythmPad) => ({ '--c': rhythmPads[pad].color, '--b': rhythmPads[pad].border, '--r': rhythmPads[pad].radius }) as CSSProperties;

function RhythmExercise({ store }: { store: RhythmStore }) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot), navigator = useNavigator(), copy = rhythmCopy(state.locale);
  const section = useRef<HTMLElement>(null), listenButton = useRef<HTMLButtonElement>(null), firstPad = useRef<HTMLButtonElement>(null), previousPhase = useRef(state.phase);
  const lanes = useRef<HTMLDivElement>(null);
  const pads: RhythmPad[] = state.level < 0 ? [0, 1, 2, 3] : usedRhythmPads(state.pattern);
  const enabled = state.phase === 'repeat' || state.phase === 'free';
  useLayoutEffect(() => {
    if (previousPhase.current !== state.phase && (document.activeElement === document.body || section.current?.contains(document.activeElement))) {
      if (state.phase === 'repeat') firstPad.current?.focus();
      if (state.phase === 'idle') listenButton.current?.focus();
      if (state.phase === 'playing') lanes.current?.scrollIntoView({ block: 'center' });
    }
    previousPhase.current = state.phase;
  }, [state.phase]);
  useLayoutEffect(() => () => store.pause(), [store]);
  const notes = (beats: RhythmBeat[], answer: boolean) => beats.map((beat, index) => <span key={index}
    className={`rhythm-note${answer && state.phase === 'result' ? state.matches[index] ? ' ok' : ' miss' : ''}`}
    data-pad={beat.pad} data-time={Math.round(beat.time)} style={{ ...padStyle(beat.pad), '--x': Math.max(0, Math.min(1, beat.time / (state.level < 0 ? freeSpan : rhythmSpan(state.pattern)))) } as CSSProperties}
    aria-label={`${copy.pads[beat.pad]}${answer && state.phase === 'result' ? state.matches[index] ? ' ✓' : ' ×' : ''}`}>
    <span aria-hidden="true">{rhythmPads[beat.pad].icon}</span>{answer && state.phase === 'result' && <small aria-hidden="true">{state.matches[index] ? '✓' : '×'}</small>}
  </span>);
  const status = state.phase === 'result' ? state.success ? copy.success : copy.retry : copy[state.phase];
  return <section ref={section} className="rhythm-practice" data-react-owned="true" data-i18n-managed="true" data-phase={state.phase} data-level={state.level}
    aria-labelledby="rhythmTitle" onKeyDown={event => {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || !/^[1-4]$/.test(event.key)) return;
      if ((event.target as Element).closest('input, textarea, select, [contenteditable="true"]')) return;
      const pad = pads[Number(event.key) - 1];
      if (pad !== undefined && enabled) { event.preventDefault(); store.tap(pad); }
    }}>
    <div className="rhythm-heading"><h2 id="rhythmTitle">{copy.title}</h2><button type="button" className="rhythm-back" onClick={() => navigator.navigate('grade0SoundsMenu')}>{copy.back}</button></div>
    <p className="rhythm-hint">{copy.hint}</p>
    <div className="rhythm-toolbar">
      <nav className="rhythm-levels" aria-label={copy.levels}>{[...rhythmLevels.map((_, i) => i), -1].map(level => <button key={level} type="button"
        className={`${level === state.level ? 'on' : ''}${state.done.includes(level) ? ' done' : ''}`} aria-pressed={level === state.level}
        aria-label={`${level < 0 ? copy.free : copy.level(level + 1)}${state.done.includes(level) ? ` — ${copy.done}` : ''}`} onClick={() => store.selectLevel(level)}>{level < 0 ? '🎈' : level + 1}</button>)}</nav>
      <button type="button" className="rhythm-replay" aria-label={copy.replay} disabled={state.phase !== 'repeat'} onClick={() => void store.listen()}>🔁</button>
    </div>
    <div className="rhythm-feedback" role="status"><span className="rhythm-mascot" aria-hidden="true">{state.phase === 'result' ? state.success ? '🥳' : '🙂' : state.phase === 'playing' ? '👂' : state.phase === 'repeat' ? '🖐️' : state.phase === 'free' ? '🎈' : '😊'}</span>
      <span>{status}</span>{state.level >= 0 && <span className="rhythm-progress" aria-label={copy.progress(state.rounds)}>{'⭐'.repeat(state.rounds)}{'☆'.repeat(3 - state.rounds)}</span>}
    </div>
    {state.silent && <p className="rhythm-silent" role="status">{copy.silent}</p>}
    {state.phase === 'idle' && <button ref={listenButton} type="button" className="rhythm-listen" onClick={() => void store.listen()}><span aria-hidden="true">🎧</span> {copy.listen}</button>}
    <div className="rhythm-lanes" ref={lanes}>
      {state.level >= 0 && <div className="rhythm-lane"><span className="rhythm-lane-label">👂 {copy.sample}</span><div className="rhythm-track rhythm-sample" role="group" aria-label={copy.sample}>{notes(state.pattern.slice(0, state.shown), false)}</div></div>}
      <div className="rhythm-lane"><span className="rhythm-lane-label">🖐️ {copy.answer}</span><div className="rhythm-track rhythm-answer" role="group" aria-label={copy.answer}>{notes(state.taps, true)}</div></div>
    </div>
    {state.phase !== 'idle' && <div className="rhythm-zone">
      <div className="rhythm-pads" style={{ '--count': pads.length } as CSSProperties}>{pads.map((pad, index) => <button key={pad} type="button" ref={index === 0 ? firstPad : undefined}
        className={`rhythm-pad${state.lit.includes(pad) ? ' hit' : ''}`} style={padStyle(pad)} aria-label={copy.pads[pad]} data-pad={pad} disabled={!enabled}
        onPointerDown={event => { if (event.isPrimary && event.button === 0) { event.preventDefault(); event.currentTarget.focus({ preventScroll: true }); store.tap(pad); } }}
        onClick={event => { if (event.detail === 0) store.tap(pad); }}>
        <span className="rhythm-pad-icon" aria-hidden="true">{rhythmPads[pad].icon}</span><span className="rhythm-pad-word">{copy.pads[pad]}</span><kbd aria-hidden="true">{index + 1}</kbd>
      </button>)}</div>
    </div>}
  </section>;
}

export function RepeatRhythmPractice({ store }: { store: RhythmStore }) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot), host = document.querySelector<HTMLElement>('[data-repeat-rhythm-root]');
  return state.active && host ? createPortal(<RhythmExercise store={store} />, host) : null;
}
