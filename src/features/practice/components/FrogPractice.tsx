import { Fragment, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import type { FrogRuntime } from '../legacy/frog';
import { frogCopy, frogSteps, frogVowels, frogWords } from '../frog/content';
import { useNavigator } from '../navigation/navigationContext';
import '../frog/frog.css';

function FrogExercise({ runtime }: { runtime: FrogRuntime }) {
  const { store, animation } = runtime, state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const navigator = useNavigator(), copy = frogCopy(state.locale);
  const board = useRef<HTMLDivElement>(null), field = useRef<HTMLDivElement>(null), character = useRef<HTMLDivElement>(null);
  const actionButton = useRef<HTMLButtonElement>(null), previousStatus = useRef(state.status);
  useLayoutEffect(() => {
    if (!board.current || !field.current || !character.current) return;
    const detach = animation.attach({ board: board.current, field: field.current, character: character.current }, store.pause);
    return () => { store.pause(); detach(); };
  }, [animation, store]);
  useLayoutEffect(() => {
    animation.place(state.position);
    if (state.position === null && board.current) board.current.scrollTop = 0;
  }, [animation, state.position, state.status]);
  useLayoutEffect(() => {
    if (previousStatus.current === 'running' && state.status !== 'running' && document.activeElement === document.body) actionButton.current?.focus({ preventScroll: true });
    previousStatus.current = state.status;
  }, [state.status]);
  const status = state.status === 'between' ? copy.next : copy[state.status === 'idle' ? 'ready' : state.status];
  const action = state.status === 'complete' ? copy.restart : ['paused', 'error'].includes(state.status) ? copy.resume : state.completedWords ? copy.next : copy.start;
  return <section className="frog-practice" data-react-owned="true" data-i18n-managed="true" data-status={state.status} aria-labelledby="frogTitle">
    <h2 id="frogTitle">{copy.title}</h2>
    <p className="frog-instruction">{copy.instruction}</p>
    <div className="frog-controls">
      <button type="button" id="frogActionBtn" ref={actionButton} className={state.status === 'between' ? 'next-mode' : undefined} disabled={state.status === 'running'} onClick={() => void store.advance()}>{action}</button>
      <button type="button" id="frogResetBtn" onClick={store.reset}>{copy.reset}</button>
    </div>
    <div className="frog-board" ref={board} tabIndex={0} role="region" aria-label={copy.board}>
      <div className="frog-grid" id="frogCardContainer" ref={field} lang="kk">
        <div id="frog-character" className="frog-shadow" ref={character} aria-hidden="true">
          <svg viewBox="0 0 64 64" width="100%" height="100%">
            <g fill="#43a047"><path d="M12 42 Q2 42 2 32 Q2 22 15 25 Q20 10 32 10 Q44 10 49 25 Q62 22 62 32 Q62 42 52 42"/><ellipse cx="32" cy="45" rx="22" ry="15"/></g>
            <circle cx="22" cy="22" r="5" fill="white"/><circle cx="42" cy="22" r="5" fill="white"/>
            <circle cx="22" cy="22" r="2" fill="black"/><circle cx="42" cy="22" r="2" fill="black"/>
            <path d="M25 48 Q32 55 39 48" stroke="#1b5e20" strokeWidth="2" fill="none" strokeLinecap="round"/>
          </svg>
        </div>
        {frogWords.map((word, index) => <div key={word} id={`frog-card-${index}`} role="group" aria-label={word} className={`frog-card${state.activeWord === index ? ' active-word' : ''}`} aria-current={state.activeWord === index ? 'step' : undefined}>
          {frogSteps.filter(step => step.wordIndex === index).map(step => <Fragment key={step.index}>
            {step.syllableIndex > 0 && <span className="frog-separator" aria-hidden="true">-</span>}
            <span className="frog-syllable" data-frog-step={step.index} aria-hidden="true">
              <span className={`frog-syllable-drop${step.index < state.markedCount ? ' visible' : ''}`}><svg viewBox="0 0 24 24" width="100%" height="100%" fill="#039be5"><path d="M12 2c-5.33 5.33-8 8-8 11 0 4.42 3.58 8 8 8s8-3.58 8-8c0-3-2.67-5.67-8-11z"/></svg></span>
              {Array.from(step.text).map((letter, i) => <span key={i} className={frogVowels.has(letter) ? 'frog-vowel' : 'frog-consonant'}>{letter}</span>)}
            </span>
          </Fragment>)}
        </div>)}
      </div>
    </div>
    <p id="frogStatus" role="status">{status} <span className="frog-progress">{copy.progress(state.completedWords)}</span></p>
    <button type="button" className="btn btn-secondary frog-back" data-destination="grade0VoiceMenu" onClick={() => navigator.navigate('grade0VoiceMenu')}>{copy.back}</button>
  </section>;
}

export function FrogPractice({ runtime }: { runtime: FrogRuntime }) {
  const state = useSyncExternalStore(runtime.store.subscribe, runtime.store.getSnapshot);
  const host = document.querySelector<HTMLElement>('[data-frog-root]');
  return state.active && host ? createPortal(<FrogExercise runtime={runtime} />, host) : null;
}
