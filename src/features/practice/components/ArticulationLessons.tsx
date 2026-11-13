import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { lessonCopy, exercises } from '../articulationLessons/content';
import { LessonControls } from '../articulationLessons/LessonControls';
import { LessonGame } from '../articulationLessons/LessonGame';
import type { LessonStore } from '../articulationLessons/store';
import { useNavigator } from '../navigation/navigationContext';
import '../articulationLessons/lessons.css';

export function ArticulationLessons({ store }: { store: LessonStore }) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const navigator = useNavigator();
  if (!state.screen) return null;
  const host = document.getElementById(state.screen);
  if (!host) return null;
  const copy = lessonCopy[state.locale], animation = state.screen === 'g0ArticulationLessons', animal = state.screen === 'g0QSoundAdventure';
  const title = animation ? copy.title : animal ? copy.game : copy.autumn;
  const back = <button type="button" className="art-module-back" onClick={() => navigator.navigate('grade0DauysShakMenu')}>← {copy.back}</button>;
  return createPortal(<div className="art-module-wrap" data-react-owned="true" data-i18n-managed="true" lang={state.locale}>
    <div className="art-module-breadcrumb">{copy.breadcrumb}</div>
    <header className="art-module-header"><div><p className="art-module-eyebrow">{copy.learn}</p>
      <h2 id={animation ? 'artModuleTitle' : animal ? 'artGameTitle' : 'artAutumnTitle'}>{title}</h2>
      <p>{animation ? copy.note : animal ? copy.quiz : copy.autumnIntro}</p></div>
      {animation && <span className="art-module-count">0{exercises.indexOf(state.selected) + 1} / 03</span>}
    </header>
    {animation ? <LessonControls state={state} store={store} back={back} /> : <><LessonGame state={state} store={store} /><div className="art-module-bottom">{back}</div></>}
  </div>, host, state.screen);
}
