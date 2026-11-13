import type { Locale } from '../learning/content';

export type ReadingMode = 'split' | 'syllables' | 'words' | 'sentences';
export type SplitItem = { text: string } | { space: true };
export const readingScreens: Record<string, ReadingMode> = {
  g0TynysByTask: 'split', g0TynysByTask2: 'syllables', g0TynysByTask3: 'words', g0TynysByTask4: 'sentences',
};
export const titles: Record<ReadingMode, [string, string]> = {
  split: ['📖 Буындап оқу', '📖 Чтение по слогам'], syllables: ['🎓 Буындап оқу 2.0', '🎓 Чтение по слогам 2.0'],
  words: ['🧩 Сөздер', '🧩 Слова'], sentences: ['📝 Сөйлем', '📝 Предложение'],
};
export const presets: Record<ReadingMode, Record<Locale, string[]>> = {
  split: {
    kk: ['Ана', 'Бала', 'Мектеп', 'Сабақ', 'Қалам', 'Апа', 'Ата', 'Қоян', 'Мысық', 'Гүл', 'Алма', 'Дәптер'],
    ru: ['Мама', 'Ребёнок', 'Школа', 'Урок', 'Ручка', 'Тётя', 'Дедушка', 'Заяц', 'Кошка', 'Цветок', 'Яблоко', 'Тетрадь'],
  },
  syllables: { kk: ['ТА', 'МА', 'КО', 'РА', 'ЛА'], ru: ['ТА', 'МА', 'КО', 'РА', 'ЛА'] },
  words: { kk: ['Балалар', 'Алма', 'Балық', 'Қалам', 'Дәптер'], ru: ['Дети', 'Яблоко', 'Рыба', 'Ручка', 'Тетрадь'] },
  sentences: {
    kk: ['Бала', 'Бала ойнады', 'Қыз кітап оқыды', 'Ана тамақ пісірді', 'Мен сурет салдым'],
    ru: ['Ребёнок', 'Ребёнок играл', 'Девочка читала книгу', 'Мама приготовила еду', 'Я нарисовал картинку'],
  },
};
const syllableFiles: Record<string, string> = { ТА: 'ta', МА: 'ma', КО: 'ko', РА: 'ra', ЛА: 'la' };
export function syllableAudio(text: string) {
  const key = text.toUpperCase();
  if (key === 'ПА') return 'sounds/curriculum/2d38fc570da73b5ba98a.mp3';
  return syllableFiles[key] ? `sounds/syllable-reading/${syllableFiles[key]}.mp3` : undefined;
}

/** Preserve the existing vowel-based splitting rule. */
export function splitWord(word: string) {
  const chars = [...word], vowels = chars.flatMap((char, index) => 'аәеёиіоөуүыэюя'.includes(char.toLowerCase()) ? [index] : []);
  if (!word) return [];
  if (vowels.length <= 1) return [word];
  const result: string[] = [];
  let start = 0;
  for (let i = 0; i < vowels.length - 1; i++) {
    const end = vowels[i] + (vowels[i + 1] - vowels[i] > 2 ? 2 : 1);
    result.push(chars.slice(start, end).join('')); start = end;
  }
  result.push(chars.slice(start).join(''));
  return result;
}
export function splitSentence(text: string): SplitItem[] {
  return text.trim().split(/\s+/).filter(Boolean).flatMap((word, index) => [
    ...(index ? [{ space: true } as const] : []), ...splitWord(word).map(text => ({ text })),
  ]);
}
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
export function normalizeInput(mode: ReadingMode, value: string, final = false) {
  if (mode === 'split') return final ? value.trim() : value;
  if (mode === 'syllables') return value.toUpperCase().replace(/[^А-ЯӘІҢҒҮҰҚӨҺЁ]/g, '').slice(0, 2);
  if (mode === 'words') return capitalize(value.replace(/[^А-Яа-яӘәІіҢңҒғҮүҰұҚқӨөҺһЁё]/g, '').slice(0, 24));
  const sentence = value.replace(/[^А-Яа-яӘәІіҢңҒғҮүҰұҚқӨөҺһЁё\s]/g, ' ').replace(/\s+/g, ' ').trimStart().slice(0, 64);
  return capitalize(final ? sentence.trim() : sentence);
}
export const progressiveRows = (parts: string[]) => parts.map((_, index) => parts.slice(0, index + 1));
export function buildRows(mode: ReadingMode, input: string): string[][] {
  if (!input) return [];
  if (mode === 'syllables') return [...new Set([input, 'ТА', 'ПА', 'МА', 'КО'])].map(text => [text.toLowerCase(), text.toUpperCase()]);
  return progressiveRows(mode === 'words' ? splitWord(input) : input.split(/\s+/));
}
