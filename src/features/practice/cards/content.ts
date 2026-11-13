import type { Locale } from '../learning/content';

export interface CardIdentity { locale: Locale; grade: number; learner: string | null }
export const sentenceCards = [
  { id: 1, kk: 'Ата', ru: 'Дедушка', emoji: '👴' },
  { id: 2, kk: 'жеді', ru: 'ест', emoji: '🍽️' },
  { id: 3, kk: 'ішті', ru: 'пьёт', emoji: '🥤' },
  { id: 4, kk: 'банан', ru: 'банан', emoji: '🍌' },
  { id: 5, kk: 'жуды', ru: 'моет', emoji: '💦' },
  { id: 6, kk: 'ойнады', ru: 'играет', emoji: '⚽' },
  { id: 7, kk: 'Әпке', ru: 'Сестра', emoji: '👧' },
  { id: 8, kk: 'сорпа', ru: 'суп', emoji: '🥣' },
  { id: 9, kk: 'Ана', ru: 'Мама', emoji: '🤱' },
] as const;
export const sentenceCard = (id: number) => sentenceCards.find(card => card.id === id);

export const coordinates = [0, 1, 2, 3] as const;
type Coordinate = typeof coordinates[number];
export type SpatialKey = `${Coordinate}_${Coordinate}`;
export type SpatialAudioKey = SpatialKey | 'corner_icon' | `header_col_${Coordinate}` | `header_row_${Coordinate}`;
const animals = ['hedgehog', 'squirrel', 'snail', 'bunny'] as const;
const images = ['top', 'under', 'front', 'side'] as const;
const recordings = ['on', 'behind', 'front', 'left'] as const;
export const spatialLabels = {
  kk: {
    title: '🧭 Кеңістікке бағдарлау', animals: ['Кірпі', 'Тиін', 'Ұлу', 'Қоян'],
    positions: ['Түбірдің үстінде', 'Түбірдің артында', 'Түбірдің алдында', 'Түбірдің сол жағында'],
    headers: ['Доп шелектің үстінде', 'Доп шелектің артында', 'Доп шелектің алдында', 'Доп шелектің сол жағында'],
    corner: 'Түбір', hint: 'Суретті, содан кейін тиісті ұяшықты таңдаңыз. Кестені көлденең жылжытуға болады.',
    wrong: 'Басқа ұяшықты таңдаңыз.', correct: 'Дұрыс!', selected: 'Таңдалды',
    complete: 'Жарайсың! Барлық жануарлар өз орнында!', cards: 'Жауап карточкалары:',
  },
  ru: {
    title: '🧭 Ориентация в пространстве', animals: ['Ёжик', 'Белка', 'Улитка', 'Заяц'],
    positions: ['На пне', 'За пнём', 'Перед пнём', 'Слева от пня'],
    headers: ['Мяч на ведре', 'Мяч за ведром', 'Мяч перед ведром', 'Мяч слева от ведра'],
    corner: 'Пень', hint: 'Выберите картинку, затем подходящую ячейку. Таблицу можно прокручивать вбок.',
    wrong: 'Попробуйте другую ячейку.', correct: 'Верно!', selected: 'Выбрано',
    complete: 'Молодец! Все животные на своих местах!', cards: 'Карточки ответов:',
  },
} as const;
export const spatialCards = coordinates.flatMap(row => coordinates.map(col => ({
  key: `${row}_${col}` as SpatialKey, row, col,
  image: `assets/space-img/${images[col]}-${animals[row]}.png`,
  audio: `sounds/ru/spatial/${animals[row]}-${recordings[col]}-stump.mp3`,
})));
export const spatialCard = (key: string) => spatialCards.find(card => card.key === key);
export const spatialCaption = (row: Coordinate, col: Coordinate, locale: Locale) =>
  `${spatialLabels[locale].animals[row]} · ${spatialLabels[locale].positions[col]}`;
export const spatialHeaders = [
  { key: 'corner_icon' as const, image: 'assets/space-img/corner.png', audio: 'sounds/ru/spatial/stump.mp3' },
  ...coordinates.map(col => ({ key: `header_col_${col}` as const, image: `assets/space-img/${images[col]}-object.png`, audio: `sounds/ru/spatial/ball-${recordings[col]}-bucket.mp3` })),
  ...coordinates.map(row => ({ key: `header_row_${row}` as const, image: `assets/space-img/${animals[row]}.png`, audio: `sounds/ru/spatial/${animals[row]}.mp3` })),
];
export function spatialMedia(key: string) { return spatialCard(key) ?? spatialHeaders.find(header => header.key === key); }
