import { useEffect, useRef, useSyncExternalStore, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { chains, chainLabel, quizRounds, vowelCopy, vowelIds, vowels } from '../vowels/content';
import type { VowelSnapshot, VowelStore } from '../vowels/store';
import { useNavigator } from '../navigation/navigationContext';
import '../vowels/vowels.css';

function VowelChains({ state, store }: { state: VowelSnapshot; store: VowelStore }) {
  const copy = vowelCopy[state.locale], pattern = chains[state.chain].pattern;
  return <>
    <header><h2 id="vowelPracticeTitle">🔗 {copy.chainTitle}</h2><p>{copy.chainHint}</p></header>
    <ul className="vowel-legend" aria-label={copy.legend}>{vowelIds.map(id => <li key={id} aria-label={`${vowels[id].names[state.locale]} — ${vowels[id].letter}`}>
      <span aria-hidden="true">{vowels[id].emoji}</span><strong style={{ color: vowels[id].color }}> = {vowels[id].letter}</strong>
    </li>)}</ul>
    <div id="jat-chain-btns" className="vowel-chain-tabs" role="group" aria-label={copy.chains}>{chains.map((chain, index) =>
      <button type="button" key={chain.audio} aria-pressed={state.chain === index} onClick={() => store.selectChain(index)}>{chainLabel(index)}</button>)}
    </div>
    <div id="jat-chain-display" className="vowel-chain-display" data-playing={state.playing === 'chain'}>
      {[pattern, [...pattern].reverse()].map((row, rowIndex) => <section key={rowIndex} aria-label={`${copy.row} ${rowIndex + 1}`}>
        <h3>{copy.row} {rowIndex + 1}</h3>
        <div className="vowel-chain-row" style={{ '--vowel-count': row.length } as CSSProperties}>{row.map((id, index) => {
          const vowel = vowels[id], active = state.cell === `${rowIndex}:${index}`;
          return <button type="button" key={index} className="vowel-cell" data-row={rowIndex} data-idx={index} data-vowel={vowel.letter}
            aria-pressed={active} aria-label={`${copy.sound} ${vowel.letter}, ${vowel.names[state.locale]}, ${copy.position.toLowerCase()} ${index + 1}`}
            style={{ '--vowel-color': vowel.color } as CSSProperties} onClick={() => void store.playCell(rowIndex, index)}>
            <span className="vowel-emoji" aria-hidden="true">{vowel.emoji}</span><strong>{vowel.letter}</strong>
          </button>;
        })}</div>
      </section>)}
    </div>
    <button type="button" id="jat-play-all-btn" className="vowel-primary" aria-pressed={!!state.playing}
      onClick={() => { if (state.playing) store.stop(); else void store.playChain(); }}>{state.playing ? `⏹ ${copy.stop}` : `🔊 ${copy.playChain}`}</button>
    <p role="status" className="vowel-status">{state.status === 'idle' ? copy.repeat : copy[state.status]}</p>
  </>;
}

function VowelQuiz({ state, store }: { state: VowelSnapshot; store: VowelStore }) {
  const copy = vowelCopy[state.locale], root = useRef<HTMLDivElement>(null);
  const complete = state.status === 'completed';
  useEffect(() => {
    const selector = complete ? '#vowelQuizResult' : state.answer ? '[data-vowel-action="next"]' : '#dshakTapSoundBtn';
    root.current?.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true });
  }, [state.round, state.answer, complete]);
  return <div ref={root}>
    <header><h2 id="vowelPracticeTitle">🎯 {copy.quizTitle}</h2><p>{copy.quizHint}</p></header>
    {complete ? <h3 id="vowelQuizResult" tabIndex={-1}>🏆 {copy.completed}</h3> : <>
      <button type="button" id="dshakTapSoundBtn" className="vowel-listen" aria-pressed={!!state.playing}
        onClick={() => { if (state.playing) store.stop(); else void store.playQuestion(); }}>
        <span aria-hidden="true">{state.playing ? '⏹' : '🔊'}</span><span>{state.playing ? copy.stop : copy.listen}</span>
      </button>
      <p id="dshakTapRoundInfo">{copy.round} {state.round + 1} / {quizRounds.length}</p>
      <div id="dshakTapChoices" className="vowel-choices" role="group" aria-label={copy.choices}>{state.choices.map(id => {
        const right = state.answer !== null && id === quizRounds[state.round];
        return <button type="button" key={id} className="vowel-choice" data-choice={id} aria-label={vowels[id].names[state.locale]}
          disabled={state.status !== 'ready' || !state.heard || !!state.answer || !!state.playing}
          data-correct={right} data-wrong={state.answer === id && !right} onClick={() => store.answer(id)}>
          <span aria-hidden="true">{vowels[id].emoji}</span>{right && <span className="vowel-answer-mark" aria-hidden="true">✓</span>}
          {state.answer === id && !right && <span className="vowel-answer-mark" aria-hidden="true">×</span>}
        </button>;
      })}</div>
    </>}
    <p id="dshakTapFeedback" className="vowel-status" role="status" data-feedback={state.status}>
      {state.status === 'idle' ? copy.listen : copy[state.status]}
    </p>
    <p id="dshakTapScore" className="vowel-score">⭐ {copy.score}: {state.score} / {quizRounds.length}</p>
    <div className="vowel-actions">
      {state.answer && !complete && <button type="button" className="vowel-primary" data-vowel-action="next" onClick={store.next}>
        {state.round === quizRounds.length - 1 ? copy.result : copy.next} →</button>}
      <button type="button" className="vowel-secondary" data-vowel-action="restart" onClick={store.restart}>↻ {copy.restart}</button>
    </div>
  </div>;
}

export function VowelPractice({ store }: { store: VowelStore }) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot), navigator = useNavigator();
  if (!state.screen) return null;
  const host = document.querySelector<HTMLElement>(`#${state.screen} [data-vowel-practice-root]`);
  if (!host) return null;
  return createPortal(<div className="vowel-practice" data-react-owned="true" data-i18n-managed="true" data-card-audio="true" lang={state.locale}>
    {state.screen === 'g0DShakJattugu' ? <VowelChains state={state} store={store} /> : <VowelQuiz state={state} store={store} />}
    <button type="button" className="btn btn-secondary vowel-back" data-destination="grade0DauysShakMenu"
      onClick={() => navigator.navigate('grade0DauysShakMenu')}>← {vowelCopy[state.locale].back}</button>
  </div>, host, state.screen);
}
