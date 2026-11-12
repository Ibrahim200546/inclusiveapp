import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import type { CurriculumStore } from '../curriculum/store';
import { useActiveScreen } from '../navigation/navigationContext';
import { CurriculumCatalog } from './curriculum/CurriculumCatalog';
import { CurriculumLesson } from './curriculum/CurriculumLesson';

export function CurriculumPractice({ store }: { store: CurriculumStore }) {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const active = useActiveScreen();
  const catalog = document.getElementById('curriculumCatalog'), practice = document.getElementById('curriculumPractice');
  if (!catalog || !practice) throw new Error('Curriculum roots are missing');
  return <>
    {createPortal(<CurriculumCatalog store={store} snapshot={snapshot} active={active === 'curriculumCatalog'} />, catalog)}
    {snapshot.practice?.active && createPortal(<CurriculumLesson practice={snapshot.practice} store={store} locale={snapshot.locale} />, practice)}
  </>;
}
