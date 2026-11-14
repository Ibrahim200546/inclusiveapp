import type { Locale } from '../learning/content';

export type RhythmPad = 0 | 1 | 2 | 3;
export interface RhythmBeat { time: number; pad: RhythmPad }
export const rhythmPads = [
  { radius: '50%', icon: '🥁', color: '#aed3ec', border: '#5b94bf', vibration: [25] },
  { radius: '24%', icon: '👏', color: '#ffe49d', border: '#d4aa3c', vibration: [15, 30, 15] },
  { radius: '50% 14% 50% 14%', icon: '🔔', color: '#b1e2c7', border: '#4ea67c', vibration: [45] },
  { radius: '50% 50% 18% 18%', icon: '👣', color: '#dfcff3', border: '#9378c4', vibration: [20, 25, 20] },
];
export const rhythmLevels = [{ beats: 3, instruments: 1 }, { beats: 4, instruments: 2 }, { beats: 4, instruments: 3 }, { beats: 5, instruments: 4 }, { beats: 6, instruments: 4 }];
export const rhythmGaps = [450, 600, 750, 900];
export const rhythmRounds = 3;
export const freeSpan = 6000;
export const rhythmSignature = (beats: RhythmBeat[]) => beats.map(beat => `${beat.time}:${beat.pad}`).join();
export const rhythmSpan = (beats: RhythmBeat[]) => (beats.at(-1)?.time ?? 0) + 500;
export const usedRhythmPads = (beats: RhythmBeat[]): RhythmPad[] => [...new Set(beats.map(beat => beat.pad))].sort();

export function makeRhythm(level: number, recent: string[] = [], random = Math.random): RhythmBeat[] {
  const config = rhythmLevels[level];
  if (!config) throw new Error('Unknown rhythm level');
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const shuffle = <T,>(items: T[]) => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
    return copy;
  };
  let pattern: RhythmBeat[] = [];
  for (let attempt = 0; attempt < 30; attempt++) {
    const pool = shuffle<RhythmPad>([0, 1, 2, 3]).slice(0, config.instruments), sequence = [...pool];
    while (sequence.length < config.beats) sequence.push(pick(pool));
    let time = 0;
    pattern = shuffle(sequence).map((pad, index) => ({ time: time += index ? pick(rhythmGaps) : 0, pad }));
    if (!recent.includes(rhythmSignature(pattern))) break;
  }
  return pattern;
}

export function judgeRhythm(pattern: RhythmBeat[], taps: RhythmBeat[]) {
  const matches = taps.map((tap, index) => {
    if (!pattern[index] || tap.pad !== pattern[index].pad) return false;
    if (!index) return true;
    const want = pattern[index].time - pattern[index - 1].time, got = tap.time - taps[index - 1].time;
    return Math.abs(got - want) <= Math.max(320, want * .5);
  });
  return { matches, success: pattern.length > 0 && taps.length === pattern.length && matches.every(Boolean) };
}

const copy = {
  kk: { title: 'Ырғақты қайталау', levels: 'Деңгейлер', replay: 'Қайта тыңдау', listen: 'Тыңда', free: 'Еркін ойын', level: (n: number) => `${n}-деңгей`,
    idle: '«Тыңда» батырмасын бас', starting: 'Дыбысты дайындау…', playing: 'Тыңда', repeat: 'Енді сен', success: 'Жарайсың!', retry: 'Тағы бір рет көрейік',
    pads: ['Дүң', 'Шап', 'Дың', 'Топ'], sample: 'Үлгі', answer: 'Сенің ырғағың', back: '⬅️ Артқа',
    hint: 'Ырғақты тыңдап, батырмаларды басып қайтала. Пернетақтада: 1–4.', silent: 'Дыбыс қолжетімсіз. Түстер мен белгілер бойынша қайтала.',
    progress: (n: number) => `Орындалған тапсырмалар: ${n} / 3`, done: 'Аяқталды',
  },
  ru: { title: 'Повтори ритм', levels: 'Уровни', replay: 'Послушать ещё раз', listen: 'Слушай', free: 'Свободная игра', level: (n: number) => `Уровень ${n}`,
    idle: 'Нажми «Слушай»', starting: 'Подготовка звука…', playing: 'Слушай', repeat: 'Теперь ты', success: 'Молодец!', retry: 'Попробуем ещё раз',
    pads: ['Бум', 'Хлоп', 'Динь', 'Топ'], sample: 'Образец', answer: 'Твой ритм', back: '⬅️ Назад',
    hint: 'Послушай ритм и повтори его на кнопках. На клавиатуре: 1–4.', silent: 'Звук недоступен. Повторяй по цветам и значкам.',
    progress: (n: number) => `Выполнено заданий: ${n} / 3`, done: 'Завершён',
  },
};
export const rhythmCopy = (locale: Locale) => copy[locale];
