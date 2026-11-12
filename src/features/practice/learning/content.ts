import type { LessonItem } from './session';

export type Locale = 'kk' | 'ru';
export type SoundMode = 'count' | 'pitch' | 'tempo' | 'rhythm' | 'dance';
export type ListeningMode = 'numbers' | SoundMode | 'recognition';
export interface SoundEvent { start: number; duration: number; frequency: number }
export interface ListeningItem extends LessonItem {
  audio?: string; audioRu?: string; events?: SoundEvent[];
  kk?: string; ru?: string; label?: string; icon?: string;
}
export const labels = {
  numbers: ['Санды тап', 'Найди число', '🔢'], count: ['Неше рет естідің?', 'Сколько сигналов?', '👏'],
  rhythm: ['Ырғақты таңда', 'Выбери ритм', '🥁'], tempo: ['Тез / Баяу', 'Быстро / Медленно', '⏱️'],
  pitch: ['Дыбыс биіктігі', 'Высота звука', '🎵'], dance: ['Вальс пе, марш па?', 'Вальс или марш?', '💃'],
} as const;
export const pairs = 'а–о;а–ә;а–э;о–у;о–ө;у–ү;ү–ұ;ө–ү;ы–і;і–и;ы–и;и–е;э–е;м–п;н–т;л–н;р–л;т–л;п–б;п–ф;с–з;ш–ж;д–т;ч–ш;ш–щ;к–қ;г–ғ;к–х;к–һ;х–һ'
  .split(';').map((pair, index) => ({ id: 'g1-t8-pair-' + (index + 1), pair, grade: 1, table: 8, strand: 'pronunciation',
    objective: '1.2.1.5', teacherApproved: false, levels: { syllables: [], words: [], sentences: [] } }));
const numbersKk = ['Бір', 'Екі', 'Үш', 'Төрт', 'Бес', 'Алты', 'Жеті', 'Сегіз', 'Тоғыз', 'Он'];
const numbersRu = ['Один', 'Два', 'Три', 'Четыре', 'Пять', 'Шесть', 'Семь', 'Восемь', 'Девять', 'Десять'];
export const numbers = numbersKk.map((name, index) => ({ id: 'number-' + (index + 1), answer: index + 1, name,
  prompt: name + ' санын тап.', promptRu: 'Найди число ' + numbersRu[index].toLowerCase() + '.',
  audio: 'sounds/find-number/kk-' + (index + 1) + '.mp3', audioRu: 'sounds/find-number/ru-' + (index + 1) + '.mp3' }));
export function soundItems(mode: SoundMode): ListeningItem[] {
  if (mode === 'dance') return [
    { id: 'march', answer: 'march', label: 'Марш', icon: '🥁', audio: 'sounds/rhythm/march.mp3' },
    { id: 'waltz', answer: 'waltz', label: 'Вальс', icon: '💃', audio: 'sounds/rhythm/vals.mp3' },
  ];
  if (mode === 'count') return [1, 2, 3].map(count => ({ id: 'count-' + count, answer: count, events: Array.from({ length: count }, (_, i) => ({ start: i * 0.6, duration: 0.14, frequency: 440 })) }));
  if (mode === 'pitch') return [{ answer: 'low', frequency: 220 }, { answer: 'mid', frequency: 440 }, { answer: 'high', frequency: 880 }]
    .map(item => ({ ...item, id: 'pitch-' + item.answer, events: [{ start: 0, duration: 0.8, frequency: item.frequency }] }));
  if (mode === 'tempo') return [{ answer: 'slow', interval: 0.8 }, { answer: 'fast', interval: 0.3 }]
    .map(item => ({ ...item, id: 'tempo-' + item.answer, events: Array.from({ length: 3 }, (_, i) => ({ start: i * item.interval, duration: 0.12, frequency: 440 })) }));
  if (mode === 'rhythm') return [{ answer: 'one', starts: [0] }, { answer: 'two', starts: [0, 0.4] }]
    .map(item => ({ ...item, id: 'rhythm-' + item.answer, events: item.starts.map(start => ({ start, duration: 0.14, frequency: 440 })) }));
  throw new Error('Unknown sound mode');
}
