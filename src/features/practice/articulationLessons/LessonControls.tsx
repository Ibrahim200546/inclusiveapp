import { useEffect, useState, type ReactNode } from 'react';
import { exercises, lessonCopy } from './content';
import { phases } from './animation';
import { LessonScene } from './LessonScene';
import type { LessonSnapshot, LessonStore } from './store';

export function LessonControls({ state, store, back }: { state: LessonSnapshot; store: LessonStore; back: ReactNode }) {
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const changed = () => setReducedMotion(media.matches);
    media.addEventListener('change', changed); return () => media.removeEventListener('change', changed);
  }, []);
  useEffect(() => {
    if (!state.playing) return;
    let frame = 0, previous = 0;
    const tick = (now: number) => {
      if (document.hidden || !store.getSnapshot().playing) return;
      if (previous) store.advance(now - previous);
      previous = now; frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame);
  }, [store, state.playing, state.selected]);
  const copy = lessonCopy[state.locale], lesson = copy[state.selected];
  const phase = phases[state.selected][Math.min(3, Math.floor(state.progress * 4))];
  const index = exercises.indexOf(state.selected);
  return <>
    <div className="art-module-tabs" role="group" aria-label={copy.title}>
      {exercises.map((exercise, number) => <button type="button" key={exercise} data-art-lesson={exercise}
        aria-pressed={state.selected === exercise} className="art-module-tab" onClick={() => store.select(exercise)}>
        <span>0{number + 1}</span><strong>{copy[exercise].title}</strong>
      </button>)}
    </div>
    <div className="art-module-workspace">
      <div className="art-module-stage-panel">
        <div className="art-module-stage-heading"><span>{copy.intro}</span><span className="art-module-stage-dot" aria-hidden="true" /></div>
        <div id="artModuleStage" className="art-module-stage"><LessonScene exercise={state.selected} progress={state.progress}
          reducedMotion={reducedMotion} label={lesson.title} description={lesson.steps.join(' ')} /></div>
        <p className="art-module-phase" aria-live="polite"><span>{copy.phase}: </span><strong id="artModulePhase">{copy.phases[phase]}</strong></p>
      </div>
      <article className="art-module-guide"><span className="art-module-lesson-number">0{index + 1}</span><h3>{lesson.title}</h3>
        <p className="art-module-hint">{lesson.hint}</p><h4>{copy.steps}</h4><ol>{lesson.steps.map(step => <li key={step}>{step}</li>)}</ol>
      </article>
    </div>
    <div className="art-module-controls">
      <div className="art-module-playback"><button type="button" id="artModulePlay" className="art-module-primary" aria-pressed={state.playing}
        onClick={state.playing ? store.pause : store.play}>{state.playing ? `Ⅱ ${copy.pause}` : `▶ ${copy.play}`}</button>
        <button type="button" id="artModuleRestart" className="art-module-secondary" onClick={store.restart}>↻ {copy.restart}</button></div>
      <label className="art-module-speed">{copy.speed}<select id="artModuleSpeed" value={state.speed} onChange={event => store.setSpeed(Number(event.target.value))}>
        <option value="0.5">{copy.slow} · 0.5×</option><option value="0.75">0.75×</option><option value="1">{copy.normal} · 1×</option>
      </select></label>
      <label className="art-module-timeline"><span>{copy.progress}</span><input type="range" id="artModuleProgress" min="0" max="100" step="0.1"
        value={state.progress * 100} onChange={event => store.seek(Number(event.target.value) / 100)} /></label>
    </div>
    <div className="art-module-bottom">{back}<div className="art-module-nextprev">
      <button type="button" id="artModulePrev" disabled={index === 0} onClick={() => store.select(exercises[index - 1])}>← {copy.prev}</button>
      <button type="button" id="artModuleNext" disabled={index === 2} onClick={() => store.select(exercises[index + 1])}>{copy.next} →</button>
    </div></div>
  </>;
}
