// Staff rehearsal only. Never imported by the public build, service worker, or student routes.
export const cases = Object.freeze([
  {
    id: 'request-action', source: ['dialogues', 'g01-pencil'], grades: [0, 1],
    speech: ['Данияр, қаламың бар ма?', 'Иә, бар.', 'Маған бере тұршы.'],
    prompt: 'Тыңда. Қай әрекет сәйкес келеді?',
    // Scene briefs for adult reviewers, not child-facing labels or approved artwork.
    scenes: { a: 'A child puts the pencil into a pencil case.', b: 'A child hands the pencil to a classmate.' },
    answer: 'b',
  },
  {
    id: 'sentence-scene', source: ['syntax'], grades: [0, 1],
    speech: ['Бала кітап оқыды.'],
    prompt: 'Тыңда. Сәйкес суретті таңда.',
    scenes: { a: 'A child reads an open book.', b: 'A child writes in an exercise book.' },
    answer: 'a',
  },
]);

export function rehearse(item) {
  let phase = 'ready', segment = 0, generation = 0, credits = 0;
  return {
    view: () => ({
      phase,
      choices: ['answer', 'complete'].includes(phase) ? Object.keys(item.scenes) : [],
      credits,
    }),
    play() {
      if (phase === 'complete') return null;
      phase = 'playing';
      segment = 0;
      return ++generation;
    },
    clipEnded(token, index) {
      if (token !== generation || phase !== 'playing' || index !== segment) return false;
      segment++;
      if (segment === item.speech.length) phase = 'answer';
      return true;
    },
    failed(token) {
      if (token !== generation || phase !== 'playing') return false;
      phase = 'retry';
      return true;
    },
    choose(scene) {
      if (phase !== 'answer' || !Object.hasOwn(item.scenes, scene)) return 'blocked';
      if (scene !== item.answer) return 'retry-answer';
      phase = 'complete';
      credits++;
      return 'correct';
    },
    reset() {
      generation++;
      phase = 'ready';
      credits = 0;
    },
  };
}
