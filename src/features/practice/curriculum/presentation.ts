import type { Category, Lesson } from './types';

export const categories: Record<Category, [string, string]> = {
  comprehension: ['Түсіну', 'Понимание'], phonetics: ['Дыбыстар', 'Звуки'], speech: ['Сөйлеу', 'Речь'], math: ['Математика', 'Математика'], sentence: ['Сөйлем', 'Предложение'],
};
export function lessonIcon(item: Lesson) {
  const icons: Record<string, string> = { 'one-breath': '🌬️', 'voice-strength': '🔊', 'word-stress': '🎯', 'logical-stress': '🗣️', 'g4-syntagms': '⏸️' };
  if (icons[item.id]) return icons[item.id];
  const subjects: [RegExp, string][] = [[/school|familiar-6/, '🏫'], [/walk/, '🌳'], [/apple/, '🍎'], [/pencil/, '✏️'], [/library|familiar-8|familiar-10/, '📚'], [/shop/, '🏪'], [/unfamiliar-9/, '🐦'], [/unfamiliar-5/, '🧤'], [/unfamiliar-11/, '🌱'], [/extended-14/, '🧹'], [/disputed-15/, '🖼️'], [/extended-15/, '💧'], [/complex-8/, '🗓️'], [/intonation/, '🎶'], [/division/, '➗'], [/times-/, '✖️'], [/comparison/, '⚖️']];
  return subjects.find(([pattern]) => pattern.test(item.id))?.[1] || { comprehension: '📖', phonetics: '🔤', speech: '🗣️', math: '🧮', sentence: '📝' }[item.category] || '📚';
}
export function answerIcon(label: string) {
  const subjects: [RegExp, string][] = [[/мектеп/i, '🏫'], [/дүкен/i, '🏪'], [/кітап/i, '📚'], [/қалам/i, '✏️'], [/алма/i, '🍎'], [/құс/i, '🐦'], [/^(су|суды)(?:\s|$)/i, '💧']];
  return subjects.find(([pattern]) => pattern.test(label))?.[1] || (/^[\d\s+−×÷=<>–-]+$/.test(label) ? '🧮' : label.length <= 6 ? '🔤' : '📝');
}
