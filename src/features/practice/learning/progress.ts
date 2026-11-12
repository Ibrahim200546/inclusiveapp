import { progressKey } from './session';

export function saveLearningProgress(storage: Pick<Storage, 'getItem' | 'setItem'>, learner: string | null, grade: number,
  context: string, objective: string, result: Record<string, unknown>) {
  try {
    const key = 'eduCorex.learning.v1:' + (learner || 'guest');
    let previous: Record<string, unknown>;
    try { previous = JSON.parse(storage.getItem(key) || '{}'); } catch { previous = {}; }
    if (!previous || typeof previous !== 'object' || Array.isArray(previous)) previous = {};
    const table = 5 + 2 * grade + Number(objective === 'syllable-reading-2');
    previous[progressKey(grade, context, objective, table)] = { ...result, grade, table, context, objective, updatedAt: new Date().toISOString() };
    storage.setItem(key, JSON.stringify(previous));
    return true;
  } catch { return false; }
}
