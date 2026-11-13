export type Ring = 1 | 2 | 3;
export const rings: Record<Ring, string[]> = {
  1: ['С', 'Ш', 'И', 'Л', 'Ө', 'К', 'А', 'П', 'Ә', 'М', 'Т', 'О', 'Ү', 'Ф', 'Н', 'У', 'В', 'І'],
  2: ['Ж', 'И', 'Р', 'Қ', 'Г', 'Х', 'Б', 'Д', 'Ұ', 'Ң', 'Ы', 'З'],
  3: ["Л'", "Р'", 'Ғ', "Г'", "К'", "Х'", 'Һ', "Б'", "П'", "М'", "Д'", 'Т', "Ф'", "Я'", "З'", "С'", "Ц'", 'Ж', 'Ч', 'Щ'],
};
export const firstToSecond: Record<string, string[]> = {
  'Ш': ['Ж'], 'И': ['И'], 'Л': ['Р'], 'К': ['Қ', 'Г', 'Х'], 'П': ['Б'], 'Т': ['Д'], 'Ү': ['Ұ'], 'Н': ['Ң'], 'І': ['Ы'], 'С': ['З'],
};
export const secondToThird: Record<string, string[]> = {
  'Ж': ['Ж', 'Ч', 'Щ'], 'Р': ["Р'"], 'Қ': ['Ғ'], 'Г': ["Г'"], 'Х': ['Һ', "Х'"], 'Б': ["Б'"], 'Д': ["Д'"], 'З': ["З'"],
};
export const firstToThird: Record<string, string[]> = {
  'Л': ["Л'"], 'К': ['Ғ', "К'"], 'П': ["П'"], 'М': ["М'"], 'Т': ['Т'], 'Ф': ["Ф'"], 'В': ["Я'"], 'С': ["С'", "Ц'"],
};
export const normalizeLetter = (letter: string) => letter.replace(/['’ʼ]/g, '').trim().toUpperCase();
export const recordingPath = (letter: string) => `/original/sounds/letters/letter_${normalizeLetter(letter).toLowerCase()}.mp3`;
const mouthIndices: Record<string, number> = {
  'А': 6, 'Ә': 6, 'Я': 6, 'О': 7, 'Ө': 7, 'У': 3, 'Ұ': 3, 'Ү': 3, 'Ю': 3, 'Ы': 2,
  'И': 9, 'І': 9, 'Й': 9, 'Е': 1, 'Э': 1, 'М': 5, 'Б': 5, 'П': 5, 'Н': 8, 'Ң': 8,
  'Л': 8, 'Р': 8, 'Д': 8, 'Т': 8, 'К': 4, 'Г': 4, 'Қ': 4, 'Ғ': 4, 'Х': 4, 'Һ': 4,
  'С': 9, 'З': 9, 'Ш': 9, 'Ж': 9, 'Ч': 9, 'Щ': 9, 'Ц': 9, 'Ф': 2, 'В': 2,
};
export function mouthPosition(letter: string) {
  const index = mouthIndices[normalizeLetter(letter)] ?? 4, zero = index - 1;
  return { index, position: `${zero % 3 * 50}% ${Math.floor(zero / 3) * 50}%` };
}
export function visibleLetters(open: boolean, first: string | null, second: string | null): Record<Ring, string[]> {
  return { 1: open ? rings[1] : [], 2: open && first ? firstToSecond[first] ?? [] : [],
    3: open ? [...new Set([...(firstToThird[first] ?? []), ...(secondToThird[second] ?? [])])] : [] };
}
const angles = (start: number, end: number, count: number) => Array.from({ length: count }, (_, index) => start + (end - start) * index / (count - 1));
const ringAngles = { 1: angles(180, 520, 18), 2: [182, 216, 248, 278, 302, 330, 360, 390, 424, 454, 488, 520], 3: angles(228, 620, 20) };
export const radii = { 1: 176, 2: 278, 3: 378 };
export function point(ring: Ring, letter: string) {
  const radians = ringAngles[ring][rings[ring].indexOf(letter)] * Math.PI / 180;
  return { x: 460 + Math.cos(radians) * radii[ring], y: 470 + Math.sin(radians) * radii[ring] };
}
