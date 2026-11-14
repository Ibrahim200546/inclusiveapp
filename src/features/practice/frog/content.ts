import type { Locale } from '../learning/content';

// The reading material is Kazakh in both interface languages, as in the original exercise.
export const frogWords = ['а-та', 'ке-ме', 'бо-та', 'а-на', 'ша-на', 'ба-ла', 'мек-теп', 'қа-лам', 'дос-тық', 'құр-ба-қа', 'а-ла-қай'];
export const frogVowels = new Set('аяоёуюыиэеәіөұүАЯОЁУЮЫИЭЕӘІӨҰҮ');
export const frogSteps = frogWords.flatMap((word, wordIndex) => word.split('-').map((text, syllableIndex) => ({ wordIndex, syllableIndex, text })))
  .map((step, index) => ({ ...step, index }));
export type FrogStep = typeof frogSteps[number];

export function frogCopy(locale: Locale) {
  return locale === 'ru' ? {
    title: '🐸 Прочитай и отметь', instruction: 'Читай по слогам вместе с лягушкой. Переходи к следующему слову, когда будешь готов.',
    start: '🚀 Начать', next: '➡ Следующее слово', restart: '🔄 Начать заново', reset: '🔄 Сбросить', resume: '▶ Продолжить', back: '⬅️ Назад',
    running: 'Читай по слогам…', paused: 'Пауза. Можно продолжить с текущего слога.', complete: 'Все слова пройдены. Можно начать заново.',
    error: 'Не удалось продолжить прыжок. Попробуй ещё раз.', ready: 'Нажми «Начать», чтобы читать первое слово.',
    board: 'Слова для чтения', progress: (count: number) => `Пройдено слов: ${count} из ${frogWords.length}`,
  } : {
    title: '🐸 Оқы және белгіле', instruction: 'Бақамен бірге буындап оқы. Дайын болғанда келесі сөзге өт.',
    start: '🚀 Бастау', next: '➡ Келесі сөз', restart: '🔄 Қайта бастау', reset: '🔄 Қалпына келтіру', resume: '▶ Жалғастыру', back: '⬅️ Артқа',
    running: 'Буындап оқы…', paused: 'Үзіліс. Осы буыннан жалғастыруға болады.', complete: 'Барлық сөздер оқылды. Қайта бастауға болады.',
    error: 'Секіруді жалғастыру мүмкін болмады. Қайталап көр.', ready: 'Бірінші сөзді оқу үшін «Бастау» түймесін бас.',
    board: 'Оқуға арналған сөздер', progress: (count: number) => `Оқылған сөздер: ${count} / ${frogWords.length}`,
  };
}
