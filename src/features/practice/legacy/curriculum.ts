import type { AudioWindow } from '../audio/types';
import { createCurriculumStore } from '../curriculum/store';
import { createCurriculumPlayback } from '../curriculum/playback';
import { createCurriculumProgress } from '../curriculum/progress';
import { lessonIcon } from '../curriculum/presentation';
import type { Lesson, SessionState } from '../curriculum/types';
import type { ScreenNavigator } from '../navigation/screenNavigator';
import { profileStore } from '../profile/profileRuntime';
import { getPracticeLocale, subscribeToPracticeLocale } from './bridge';

type CurriculumWindow = AudioWindow & {
  CorexCurriculumContent: { lessons: Lesson[] };
  CorexCurriculumUI?: {
    open(grade: number, parent: string): void; openLesson(lesson: Lesson, from?: string): void; lessonIcon: typeof lessonIcon;
    getState(): Partial<SessionState> & { grade: number; lesson?: string; active: boolean; playing: boolean };
  };
  showReward?(): void;
};

/** Only menu entry points remain global; React owns both screens and the lesson state. */
export function installLegacyCurriculum(navigator: ScreenNavigator, app = window as CurriculumWindow) {
  const previous = app.CorexCurriculumUI;
  const store = createCurriculumStore({
    lessons: app.CorexCurriculumContent.lessons, player: createCurriculumPlayback(app),
    progress: createCurriculumProgress(() => app.localStorage), getLocale: getPracticeLocale,
    getLearner: () => profileStore.getSnapshot().userId, navigate: navigator.navigate, reward: () => app.showReward?.(),
  });
  app.CorexCurriculumUI = {
    open: store.openCatalog, openLesson: store.openLesson, lessonIcon,
    getState() {
      const { practice, catalog } = store.getSnapshot();
      return { ...practice?.state, grade: practice?.active ? practice.lesson.grade : catalog.grade,
        lesson: practice?.lesson.id, active: Boolean(practice?.active), playing: Boolean(practice?.playing) };
    },
  };
  const releaseNavigation = navigator.register({ name: 'react-curriculum', leave: store.leave,
    enter: ({ to }) => { if (to === 'curriculumCatalog') store.refreshProgress(); } });
  const releaseLocale = subscribeToPracticeLocale(() => store.setLocale(getPracticeLocale()));
  const releaseProfile = profileStore.subscribe(store.changeLearner);
  const hidden = () => { if (app.document.hidden) store.stop(); };
  app.addEventListener('pagehide', store.stop); app.document.addEventListener('visibilitychange', hidden);
  return { store, dispose() {
    releaseNavigation(); releaseLocale(); releaseProfile();
    app.removeEventListener('pagehide', store.stop); app.document.removeEventListener('visibilitychange', hidden);
    store.dispose();
    if (previous === undefined) delete app.CorexCurriculumUI; else app.CorexCurriculumUI = previous;
  } };
}
