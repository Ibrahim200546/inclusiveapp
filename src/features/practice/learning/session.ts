export type Answer = string | number;
export interface LessonItem { id: string; answer: Answer }
export interface LearningResult { id: string; attempts: number }
export interface LearningState {
  index: number; total: number; heard: boolean; answered: boolean; complete: boolean;
  results: LearningResult[]; attempts: number;
}

export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function create<T extends LessonItem>(items: readonly T[], options: { random?: () => number } = {}) {
  if (!items.length || new Set(items.map(item => item.id)).size !== items.length) throw new Error('Invalid lesson items');
  let order: T[] = [], index = 0, heard = false, answered = false, attempts = 0, lastAnswerAt = -Infinity;
  let results: LearningResult[] = [], previousLast: string | undefined;
  const random = options.random || Math.random;
  function restart() {
    order = shuffle(items, random);
    if (order.length > 1 && order[0].id === previousLast) [order[0], order[1]] = [order[1], order[0]];
    index = 0; heard = false; answered = false; attempts = 0; results = []; lastAnswerAt = -Infinity;
  }
  function answer(value: Answer, now = Date.now()): { accepted: boolean; correct?: boolean } {
    if (!heard || answered || index >= order.length || now - lastAnswerAt < 350) return { accepted: false };
    lastAnswerAt = now; attempts++;
    const correct = value === order[index].answer;
    if (correct) { answered = true; results.push({ id: order[index].id, attempts }); }
    return { accepted: true, correct };
  }
  function next() {
    if (!answered || index >= order.length) return false;
    previousLast = order[index].id; index++; heard = false; answered = false; attempts = 0; lastAnswerAt = -Infinity;
    return true;
  }
  restart();
  return {
    restart, answer, next,
    markHeard() { if (index < order.length) heard = true; },
    get current(): T | null { return order[index] || null; },
    get state(): LearningState {
      return { index, total: order.length, heard, answered, complete: index === order.length,
        results: results.map(result => ({ ...result })), attempts: results.reduce((sum, result) => sum + result.attempts, 0) + (answered ? 0 : attempts) };
    },
  };
}

export function progressKey(grade: number, strand: string, objective: string, table = grade === 0 ? 5 : 7) {
  return ['grade', grade, 'table', table, strand, objective].join(':');
}
