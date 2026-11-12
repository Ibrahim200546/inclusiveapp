import { identity } from './session';
import type { Lesson, Participation, SavedProgress, SessionState } from './types';

export function createCurriculumProgress(getStorage: () => Pick<Storage, 'getItem' | 'setItem'>) {
  const key = (learner: string | null) => 'eduCorex.curriculum.v1:' + (learner || 'guest');
  function read(learner: string | null): Record<string, SavedProgress> {
    try {
      const value: unknown = JSON.parse(getStorage().getItem(key(learner)) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, SavedProgress> : {};
    } catch { return {}; }
  }
  return {
    read,
    save(learner: string | null, lesson: Lesson, state: SessionState, participation: Participation) {
      try {
        const data = read(learner), prior = data[identity(lesson)];
        data[identity(lesson)] = {
          grade: lesson.grade, table: lesson.table, strand: lesson.strand, objectiveCodes: lesson.objectiveCodes,
          lessonId: lesson.id, ...(lesson.pairVariant ? { sequence: lesson.steps.map(step => step.id) } : {}),
          completed: state.complete, everCompleted: Boolean(state.complete || prior?.everCompleted || prior?.completed), results: state.records,
          index: state.index, solved: state.solved, attempts: state.attempts, order: state.order, supportUsed: state.supportUsed, participation,
          assessment: state.records.some(record => record.assessment === 'teacher') ? 'mixed-or-teacher' : 'choice', updatedAt: new Date().toISOString(),
        };
        getStorage().setItem(key(learner), JSON.stringify(data)); return true;
      } catch { return false; }
    },
  };
}
export type CurriculumProgress = ReturnType<typeof createCurriculumProgress>;
