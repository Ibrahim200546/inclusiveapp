import type { Locale } from '../learning/content';

type Text = Record<Locale, string>;
export const voiceModes = {
  tap: { screen: 'g0DauyspTask1', grid: 'dtp-cards', icon: '📢', color: '#ef4444', animation: 'dv-shake', folder: 'loud', suffix: 'дауыстап',
    title: { kk: 'Дауыстап', ru: 'Громко' }, badge: { kk: 'ДАУЫСТАП 📢', ru: 'ГРОМКО 📢' },
    hint: { kk: 'Қатты айт!', ru: 'Говори громко!' },
    description: { kk: 'Дауыстап, қатты және батыл айтыңыз!', ru: 'Говорите громко, уверенно и смело!' },
    instruction: { kk: 'Дауыстап айт — қатты, батыл дауыспен!', ru: 'Скажите громко — сильным и уверенным голосом!' } },
  zhay: { screen: 'g0DauyspTask2', grid: 'zhay-cards', icon: '🗣️', color: '#10b981', animation: 'dv-pulse', folder: 'normal', suffix: 'жай',
    title: { kk: 'Жәй', ru: 'Обычно' }, badge: { kk: 'ЖӘЙ 🗣️', ru: 'ОБЫЧНО 🗣️' },
    hint: { kk: 'Жәй айт!', ru: 'Говори обычным голосом!' },
    description: { kk: 'Жәй, қалыпты дауыспен айтыңыз!', ru: 'Говорите обычным, спокойным голосом!' },
    instruction: { kk: 'Жәй айт — қалыпты, мысалы телефонда!', ru: 'Скажите обычным голосом, как по телефону!' } },
  sybyr: { screen: 'g0DauyspTask3', grid: 'sybyr-cards', icon: '🤫', color: '#a855f7', animation: 'dv-float', folder: 'whisper', suffix: 'сыбырлап',
    title: { kk: 'Сыбырлап', ru: 'Шёпотом' }, badge: { kk: 'СЫБЫРЛАП 🤫', ru: 'ШЁПОТОМ 🤫' },
    hint: { kk: 'Сыбырла!', ru: 'Шепчи!' },
    description: { kk: 'Сыбырлап, ақырын айтыңыз!', ru: 'Говорите шепотом, тихо!' },
    instruction: { kk: 'Сыбырлап айт — тым ақырын, бірақ анық!', ru: 'Скажите шепотом — тихо, но четко!' } },
} as const;
export type VoiceMode = keyof typeof voiceModes;
export type VoiceModeScreen = typeof voiceModes[VoiceMode]['screen'];
export const modeForScreen = (screen: string) => (Object.keys(voiceModes) as VoiceMode[]).find(mode => voiceModes[mode].screen === screen);

export const voiceAnimals = [
  { id: 'bear', sound: 'Топ-топ', color: ['#b45309', '#92400e'], glow: 'rgba(180,83,9,.7)',
    name: { kk: 'Аю', ru: 'Медведь' }, phrase: { kk: 'Аю — топ-топ', ru: 'Медведь — топ-топ' } },
  { id: 'cat', sound: 'Мяу-мяу', color: ['#7c3aed', '#5b21b6'], glow: 'rgba(124,58,237,.7)',
    name: { kk: 'Мысық', ru: 'Кошка' }, phrase: { kk: 'Мысық — мияу', ru: 'Кошка — мяу' } },
  { id: 'frog', sound: 'Бак-бак', color: ['#047857', '#065f46'], glow: 'rgba(4,120,87,.7)',
    name: { kk: 'Бақа', ru: 'Лягушка' }, phrase: { kk: 'Бақа — бақ-бақ', ru: 'Лягушка — ква-ква' } },
  { id: 'dog', sound: 'Аф-аф', color: ['#be185d', '#9d174d'], glow: 'rgba(190,24,93,.7)',
    name: { kk: 'Ит', ru: 'Собака' }, phrase: { kk: 'Ит — Аф-Аф', ru: 'Собака — гав-гав' } },
] as const satisfies readonly { id: string; sound: string; color: readonly string[]; glow: string; name: Text; phrase: Text }[];
export type VoiceAnimal = typeof voiceAnimals[number]['id'];
export function voiceRecording(mode: VoiceMode, animal: typeof voiceAnimals[number]) {
  const { folder, suffix } = voiceModes[mode];
  return `/original/sounds/${folder}/${animal.sound} ${suffix}.mp4`;
}
export const voicePicture = (mode: VoiceMode, animal: VoiceAnimal) => `/original/assets/voice-animals/${animal}-${voiceModes[mode].folder}.png?v=5`;

export const voiceModeCopy = {
  kk: { listen: 'Тыңда', stop: 'Тоқтату', back: 'Артқа', idle: 'Карточканы тыңдап, дыбысты қайталаңыз.',
    playing: 'Тыңдалуда…', finished: 'Енді дыбысты қайталаңыз!', error: 'Дыбыс ойнатылмады. Қайта тыңдап көріңіз.', interrupted: 'Дыбыс тоқтатылды. Қайта тыңдауға болады.' },
  ru: { listen: 'Слушать', stop: 'Остановить', back: 'Назад', idle: 'Послушайте карточку и повторите звук.',
    playing: 'Идёт прослушивание…', finished: 'Теперь повторите звук!', error: 'Не удалось воспроизвести звук. Попробуйте ещё раз.', interrupted: 'Звук остановлен. Можно послушать ещё раз.' },
} as const;
