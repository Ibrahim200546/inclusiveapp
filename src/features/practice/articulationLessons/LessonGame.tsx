import { useEffect, useId, useRef } from 'react';
import { animalScene, autumnScene } from './GameScenes';
import { autumnCopy, autumnRounds, qCopy, qScenes, type AutumnScene } from './content';
import type { LessonSnapshot, LessonStore } from './store';

export function LessonGame({ state, store }: { state: LessonSnapshot; store: LessonStore }) {
  const id = 'game-' + useId().replace(/:/g, '');
  const root = useRef<HTMLElement>(null);
  const animal = state.screen === 'g0QSoundAdventure';
  const prefix = animal ? 'qsa' : 'asg', q = qCopy[state.locale], autumn = autumnCopy[state.locale];
  const copy = animal ? { ...q, done: q.completed, doneText: q.completedText, result: q.completeAction,
    feedback: state.feedback === 'unavailable' ? q.speechUnavailable : state.feedback === 'wrong' ? q.wrong : q.right }
    : { ...autumn, feedback: state.feedback === 'unavailable' ? autumn.unavailable : state.feedback === 'wrong' ? autumn.retry : autumn.correct };
  useEffect(() => {
    const target = state.completed ? '[data-finale-title]' : state.solved ? '[data-action="next"]' : '[data-action="listen"]';
    root.current?.querySelector<HTMLElement>(target)?.focus({ preventScroll: true });
  }, [state.round, state.solved, state.completed]);
  const word = qScenes[state.round].word, scene = qScenes[state.round], round = autumnRounds[state.round];
  const missing = (letter: string) => letter === 'Қ' || letter === 'қ';
  return <div id={animal ? 'artQGame' : 'artAutumnGame'}>
    <section ref={root} className={`${prefix}-root`} lang={state.locale} data-solved={state.solved} data-completed={state.completed}>
      <div className={`${prefix}-${animal ? 'shell' : 'panel'}${state.completed ? ` ${prefix}-finale` : ''}`}>
        {state.completed ? <>
          {animal ? <svg className="qsa-medal" viewBox="0 0 120 120" aria-hidden="true"><path d="M30 63l-8 48 26-10 13 15 13-49" fill="#4793af"/><path d="M71 66l13 48 10-15 22 7-17-44" fill="#326d8d"/><circle cx="61" cy="47" r="42" fill="#f0c46b" stroke="#d9a849" strokeWidth="5"/><circle cx="61" cy="47" r="32" fill="#ffde8a"/><path d="M61 23l7 15 16 2-12 12 3 17-14-8-15 8 3-17-12-12 17-2Z" fill="#fff"/></svg>
            : <svg className="asg-badge" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="53" fill="#f5dfaa"/><circle cx="60" cy="60" r="44" fill="#fff3d5"/><path d="M59 28l5 17 16-7-5 17 18 5-17 9 4 19-19-6-14 14-1-21-20-7 17-11-3-19 16 6Z" fill="#d69a4c"/><path d="M42 91q17-26 32-42" stroke="#976b38" strokeWidth="3" fill="none" strokeLinecap="round"/></svg>}
          <h2 tabIndex={-1} data-finale-title>{copy.done}</h2><p>{copy.doneText}</p>
          <div className={`${prefix}-actions`}><button type="button" className={`${prefix}-primary`} data-action="result" onClick={store.announceCompletion}>{copy.result}</button>
            <button type="button" className={`${prefix}-secondary`} data-action="reset" onClick={store.reset}>{copy.replay}</button></div>
        </> : <>
          <div className={`${prefix}-${animal ? 'eyebrow' : 'meta'}`}><span className={`${prefix}-counter`}>{copy.round} {state.round + 1} / 3</span>
            <span className={`${prefix}-${animal ? 'dots' : 'progress'}`} aria-hidden="true">{[0, 1, 2].map(index => <span key={index} className={animal ? 'qsa-dot' : undefined}
              data-complete={index < state.round || index === state.round && state.solved} data-done={index < state.round || index === state.round && state.solved} />)}</span>
          </div>
          <h2>{copy.title}</h2><p className={`${prefix}-intro`}>{copy.intro}</p>
          <figure className={`${prefix}-scene`}>{animal ? animalScene(scene.key, `${id}-${state.round}`, q[`${scene.key}Scene`])
            : autumnScene(round.key, `${id}-${state.round}`, autumn[`${round.key}Scene`])}</figure>
          {animal ? <div className="qsa-word" role="img" lang="kk" aria-label={state.solved ? word : Array.from(word).map(letter => missing(letter) ? q.blank : letter).join(' ')}>
            {Array.from(word).map((letter, index) => <span key={index} aria-hidden="true" className={`qsa-letter${missing(letter) ? ' qsa-missing' : ''}${missing(letter) && state.solved ? ' qsa-revealed' : ''}`}>
              {missing(letter) && !state.solved ? '?' : letter}</span>)}</div> : <p className="asg-sentence">{autumn[round.key]}</p>}
          <div className={`${prefix}-actions`}><button type="button" className={`${prefix}-listen`} data-action="listen" data-card-audio
            disabled={state.listening} aria-busy={state.listening} onClick={() => void store.listen()}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4Zm12-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span>{state.listening ? copy.listening : copy.listen}</span></button></div>
          <p className={`${prefix}-${animal ? 'word-label' : 'prompt'}`}>{copy.choose}</p>
          <div className={`${prefix}-choices`} role="group" aria-label={animal ? q.letters : copy.choose}>
            {state.choices.map(choice => <button type="button" key={choice} className={`${prefix}-choice`} data-letter={animal ? choice : undefined}
              data-choice={animal ? undefined : choice} disabled={state.solved} data-correct={state.solved && choice === (animal ? 'Қ' : round.key) || undefined}
              onClick={() => store.answer(choice)}>{animal ? choice : <>{autumnScene(choice as AutumnScene, `${id}-choice-${state.round}-${choice}`, '', true)}
                <span>{autumn[`${choice as AutumnScene}Option`]}</span></>}</button>)}
          </div>
          <div className={`${prefix}-status`} role="status" aria-live="polite" aria-atomic="true" data-success={state.solved && state.feedback !== 'unavailable'}>{state.feedback ? copy.feedback : ''}</div>
          {state.solved && <div className={`${prefix}-actions`}><button type="button" className={`${prefix}-primary`} data-action="next" onClick={store.next}>{state.round === 2 ? copy.finish : copy.next}</button></div>}
        </>}
      </div>
    </section>
  </div>;
}
