import type { Locale } from '../learning/content';

export interface VerbCard { id: string; label: Record<Locale, string>; src: string }
export interface Pictogram { id: string; label: Record<Locale, string>; page: number; sheet: keyof typeof sheets; x: number; y: number; w: number; h: number }
export const sheets = {
  buttonsSheetOne: { src: 'assets/verbs/buttons-sheet-1-hq.jpeg', width: 736, height: 983 },
  buttonsSheetTwo: { src: 'assets/verbs/buttons-sheet-2-hq.jpeg', width: 736, height: 975 },
};
export const pictograms: Pictogram[] = [
  { id: 'wash-hands', label: { kk: 'Қол жуды', ru: 'Помыл руки' }, page: 0, sheet: 'buttonsSheetOne', x: 40, y: 22, w: 284, h: 284 },
  { id: 'eat-at-table', label: { kk: 'Тамақ ішті', ru: 'Ел' }, page: 0, sheet: 'buttonsSheetOne', x: 388, y: 22, w: 284, h: 284 },
  // IDs are retained from the original sheet, whose captions were corrected earlier.
  { id: 'brush-teeth', label: { kk: 'Ойнады', ru: 'Играл' }, page: 0, sheet: 'buttonsSheetOne', x: 40, y: 348, w: 284, h: 284 },
  { id: 'computer', label: { kk: 'Сабақ оқыды, кітап оқыды', ru: 'Занимался, читал книгу' }, page: 0, sheet: 'buttonsSheetOne', x: 388, y: 348, w: 284, h: 284 },
  { id: 'sleep', label: { kk: 'Ұйықтады', ru: 'Спал' }, page: 0, sheet: 'buttonsSheetOne', x: 40, y: 674, w: 284, h: 284 },
  { id: 'wake-up', label: { kk: 'Оянды', ru: 'Проснулся' }, page: 0, sheet: 'buttonsSheetOne', x: 388, y: 674, w: 284, h: 284 },
  { id: 'play-ball', label: { kk: 'Доп ойнады', ru: 'Играл в мяч' }, page: 1, sheet: 'buttonsSheetTwo', x: 42, y: 20, w: 284, h: 284 },
  { id: 'build', label: { kk: 'Құрастырды', ru: 'Собирал' }, page: 1, sheet: 'buttonsSheetTwo', x: 389, y: 20, w: 284, h: 284 },
  { id: 'watch-tv', label: { kk: 'Теледидар көрді', ru: 'Смотрел телевизор' }, page: 1, sheet: 'buttonsSheetTwo', x: 42, y: 345, w: 284, h: 284 },
  { id: 'swim', label: { kk: 'Суға түсті', ru: 'Плавал' }, page: 1, sheet: 'buttonsSheetTwo', x: 389, y: 345, w: 284, h: 284 },
  { id: 'throw-trash', label: { kk: 'Қоқыс тастады', ru: 'Выбросил мусор' }, page: 1, sheet: 'buttonsSheetTwo', x: 42, y: 670, w: 284, h: 284 },
  { id: 'sweep', label: { kk: 'Сыпырды', ru: 'Подметал' }, page: 1, sheet: 'buttonsSheetTwo', x: 389, y: 670, w: 284, h: 284 },
];
export const verbCards: VerbCard[] = [
  { id: 'boy', label: { kk: 'Бала', ru: 'Ребёнок' }, src: 'assets/verbs/drag-boy.jpeg' },
  { id: 'ball', label: { kk: 'Доп', ru: 'Мяч' }, src: 'assets/verbs/drag-ball.jpeg' },
  { id: 'kick', label: { kk: 'Тепті', ru: 'Пнул' }, src: 'assets/verbs/drag-kick.jpeg' },
  { id: 'cat', label: { kk: 'Мысық', ru: 'Кошка' }, src: 'assets/verbs/drag-cat.jpeg' },
  { id: 'milk', label: { kk: 'Сүт', ru: 'Молоко' }, src: 'assets/verbs/drag-milk.jpeg' },
  { id: 'drink', label: { kk: 'Ішті', ru: 'Пил' }, src: 'assets/verbs/drag-drink.jpeg' },
  { id: 'eat-meal', label: { kk: 'Тамақ ішті', ru: 'Ел' }, src: 'assets/verbs/drag-eat-meal.jpeg' },
  { id: 'eat-bread', label: { kk: 'Нан жеді', ru: 'Ел хлеб' }, src: 'assets/verbs/drag-eat-bread.jpeg' },
  { id: 'drink-water', label: { kk: 'Су ішті', ru: 'Пил воду' }, src: 'assets/verbs/drag-drink-water.jpeg' },
  { id: 'wash-hands-drag', label: { kk: 'Қол жуды', ru: 'Помыл руки' }, src: 'assets/verbs/drag-wash-hands.jpeg' },
  { id: 'wash-face', label: { kk: 'Бетін жуды', ru: 'Умылся' }, src: 'assets/verbs/drag-wash-face.jpeg' },
  { id: 'comb-hair', label: { kk: 'Шашын тарады', ru: 'Расчесал волосы' }, src: 'assets/verbs/drag-comb-hair.jpeg' },
];
export const rounds = [
  { id: 'boy-ball-kick', prompt: { kk: 'Бала доп тепті', ru: 'Мальчик пнул мяч' }, target: { kk: ['boy', 'ball', 'kick'], ru: ['boy', 'kick', 'ball'] } },
  { id: 'cat-milk-drink', prompt: { kk: 'Мысық сүт ішті', ru: 'Кошка пьет молоко' }, target: { kk: ['cat', 'milk', 'drink'], ru: ['cat', 'drink', 'milk'] } },
];
export const findVerbCard = (id: string) => verbCards.find(card => card.id === id);
export const pagePictograms = (page: number) => pictograms.filter(card => card.page === page);
