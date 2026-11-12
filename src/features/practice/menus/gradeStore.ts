import type { NavigationTransition } from '../navigation/screenNavigator';

export type Grade = 0 | 1 | 2 | 3 | 4;
export type JuniorGrade = 0 | 1;
export const gradeParent = (grade: Grade) => `grade${grade < 2 ? 0 : grade}Menu`;

export function createGradeStore() {
  let snapshot = { current: 0 as Grade, junior: 0 as JuniorGrade, voiceEntry: 0 };
  const listeners = new Set<() => void>();
  function update(changes: Partial<typeof snapshot>) {
    if (Object.entries(changes).every(([key, value]) => snapshot[key as keyof typeof snapshot] === value)) return;
    snapshot = { ...snapshot, ...changes };
    listeners.forEach(listener => listener());
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    selectJunior(value: JuniorGrade) {
      if (value !== 0 && value !== 1) return;
      update({ current: value, junior: value });
    },
    prepare({ from, to }: NavigationTransition) {
      const match = /^grade([0234])Menu$/.exec(to);
      if (match) update({ current: match[1] === '0' ? snapshot.junior : Number(match[1]) as Grade });
      // Entering voice work from the main junior menu starts with its centre closed.
      if (from === 'grade0Menu' && to === 'grade0DauyspenmMenu') update({ voiceEntry: snapshot.voiceEntry + 1 });
    },
  };
}

export type GradeStore = ReturnType<typeof createGradeStore>;
