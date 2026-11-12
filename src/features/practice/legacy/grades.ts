import type { Lesson } from '../curriculum/types';
import type { SoundLibrary } from '../learning/listeningStore';
import type { ListeningMode } from '../learning/content';
import type { ScreenNavigator } from '../navigation/screenNavigator';
import { createGradeStore, gradeParent, type JuniorGrade } from '../menus/gradeStore';
import { createGradeMenus, type MenuAction } from '../menus/definitions';

type GradeWindow = Window & {
  CorexGrades?: { readonly current: number; readonly junior: number; readonly parent: string;
    selectJunior(value: JuniorGrade): void; recordListening(objective: string, detail: Record<string, unknown>): boolean };
  CorexCurriculumContent: { lessons: Lesson[] };
  CorexGradeSounds: SoundLibrary;
  practiceListening?: { open(mode: Exclude<ListeningMode, 'recognition'>): void;
    saveProgress(grade: number, context: string, objective: string, detail: Record<string, unknown>): boolean };
  CorexSyllableContext?: { open(from: string): void };
  initFrogGame?(): void; initSpatialGame?(): void;
  openArticulationMap?(from: string): void; openEmbeddedTask?(screen: string, path: string): void;
};

/** Only the unported exercise entry points and progress callers cross this boundary. */
export function installLegacyGrades(navigator: ScreenNavigator, app = window as unknown as GradeWindow) {
  const previous = app.CorexGrades;
  const store = createGradeStore();
  app.CorexGrades = {
    get current() { return store.getSnapshot().current; },
    get junior() { return store.getSnapshot().junior; },
    get parent() { return gradeParent(store.getSnapshot().current); },
    selectJunior: store.selectJunior,
    recordListening: (objective, detail) => app.practiceListening?.saveProgress(store.getSnapshot().current, 'listening', objective, detail) ?? false,
  };
  let lastGrade = store.getSnapshot().current;
  const releaseChanges = store.subscribe(() => {
    if (lastGrade === store.getSnapshot().current) return;
    lastGrade = store.getSnapshot().current;
    app.dispatchEvent(new Event('learning-grade-change'));
  });
  const releaseNavigation = navigator.register({ name: 'react-grades', prepare: store.prepare });
  function openExercise(action: Exclude<MenuAction, { kind: 'lesson' }>, from: string) {
    switch (action.kind) {
      case 'screen':
        if (action.initialize === 'frog') app.initFrogGame?.();
        if (action.initialize === 'spatial') app.initSpatialGame?.();
        navigator.navigate(action.screen); break;
      case 'articulation': app.openArticulationMap?.(from); break;
      case 'embedded': app.openEmbeddedTask?.(action.screen, action.path); break;
      case 'listening': app.practiceListening?.open(action.mode); break;
      case 'syllables': app.CorexSyllableContext?.open(from); break;
    }
  }
  return { store, menus: createGradeMenus(app.CorexCurriculumContent.lessons, app.CorexGradeSounds), openExercise,
    dispose() {
      releaseNavigation(); releaseChanges();
      if (previous === undefined) delete app.CorexGrades; else app.CorexGrades = previous;
    } };
}

export type GradeRuntime = ReturnType<typeof installLegacyGrades>;
