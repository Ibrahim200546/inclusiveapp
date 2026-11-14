import { useLayoutEffect, useRef, useSyncExternalStore, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useNavigator } from '../navigation/navigationContext';
import { breathColors, breathCopy, breathLevels } from '../oneBreath/content';
import type { BreathStore } from '../oneBreath/store';
import '../oneBreath/oneBreath.css';

export function OneBreathPractice({ store }: { store: BreathStore }) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot), navigator = useNavigator();
  const title = useRef<HTMLHeadingElement>(null), stage = useRef<HTMLElement>(null), input = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => { if (state.active) title.current?.focus({ preventScroll: true }); }, [state.active]);
  useLayoutEffect(() => {
    if (state.step > 0) stage.current?.querySelector(`[data-row="${state.step}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [state.step]);
  if (!state.active) return null;
  const host = document.querySelector<HTMLElement>('[data-one-breath-root]');
  if (!host) return null;
  const copy = breathCopy[state.locale];
  const progress = state.complete ? copy.complete : state.step ? `${copy.row} ${state.step} / ${breathLevels}` : copy.ready;
  const action = state.complete ? copy.repeat : state.step === 0 ? copy.start : state.step === breathLevels ? copy.finish : copy.next;
  return createPortal(<section className="breath-practice" data-react-owned="true" data-i18n-managed="true" data-card-audio="true"
    data-step={state.step} data-complete={state.complete} lang={state.locale} aria-labelledby="breathTitle">
    <header className="breath-heading">
      <div><h2 ref={title} id="breathTitle" tabIndex={-1}>🌬️ {copy.title}</h2><p>{copy.subtitle}</p></div>
      <button className="breath-back" type="button" data-destination="grade0TynysByMenu"
        onClick={() => navigator.navigate('grade0TynysByMenu')}>⬅️ {copy.back}</button>
    </header>
    <div className="breath-layout">
      <section className="breath-settings" aria-labelledby="breathChoose">
        <h3 id="breathChoose">🔤 {copy.choose}</h3>
        <div className="breath-chips">{state.presets.map(syllable => <button key={syllable} type="button"
          className="breath-chip" aria-pressed={syllable === state.syllable} lang="kk" onClick={() => store.select(syllable)}>{syllable}</button>)}</div>
        <div className="breath-picker-actions">
          <button type="button" onClick={store.nextSyllable}>➡️ {copy.nextSyllable}</button>
          <button type="button" onClick={store.randomSyllable}>🎲 {copy.random}</button>
        </div>
        <form className="breath-own" onSubmit={event => { event.preventDefault(); store.apply(); if (store.getSnapshot().invalid) input.current?.focus(); }}>
          <label htmlFor="breathOwn">{copy.own}</label>
          <div><input ref={input} id="breathOwn" value={state.draft} maxLength={3} autoComplete="off" spellCheck={false}
            aria-invalid={state.invalid} aria-describedby={state.invalid ? 'breathInputError' : undefined}
            onChange={event => store.edit(event.target.value)} />
          <button type="submit">{copy.apply}</button></div>
          {state.invalid && <p id="breathInputError" role="alert">{copy.empty}</p>}
        </form>
      </section>
      <p className="breath-hint">🌬️ {copy.hint}</p>
      <section ref={stage} className="breath-stage" aria-label={copy.pyramid}>
        <div className="breath-toolbar">
          <p role="status" aria-live="polite" aria-atomic="true">{progress}</p>
          <button className="breath-go" type="button" onClick={store.advance}>{state.complete ? '↻' : state.step === breathLevels ? '✓' : '▶'} {action}</button>
        </div>
        <div className="breath-pyramid" role="group" aria-label={copy.pyramid}>{breathColors.map((color, index) => {
          const row = index + 1, waiting = state.step > 0 && !state.complete && row > state.step;
          const current = !state.complete && row === state.step, read = state.complete || (state.step > 0 && row < state.step);
          return <button key={row} type="button" className={`breath-row${current ? ' current' : ''}${read ? ' read' : ''}${waiting ? ' waiting' : ''}${state.flashed === row ? ' flashed' : ''}`}
            data-row={row} style={{ '--row-color': color, '--row-width': `${30 + 14 * index}%` } as CSSProperties}
            disabled={waiting} aria-current={current ? 'step' : undefined}
            aria-label={`${read ? copy.read : copy.row} ${row}${waiting ? '' : `: ${state.syllable.repeat(row)}`}`}
            onClick={() => store.flash(row)}><span aria-hidden="true">{waiting ? '\u00a0' : Array.from({ length: row }, (_, repeat) =>
              <span className="breath-syllable" key={repeat}>{state.syllable}</span>)}</span></button>;
        })}</div>
        {state.celebrating && <div className="breath-celebration" aria-hidden="true">{Array.from({ length: 18 }, (_, index) =>
          <span key={index} style={{ left: `${(index * 37) % 100}%`, animationDelay: `${index % 5 * .1}s` }}>{['🎉', '⭐', '🎈', '✨', '🌟'][index % 5]}</span>)}</div>}
      </section>
    </div>
  </section>, host);
}
