export const vowels = {
  baby: { letter: 'А', emoji: '👶', color: '#be185d', names: { kk: 'Сәби', ru: 'Младенец' }, audio: '/original/sounds/letter-line/А .mp3' },
  wolf: { letter: 'У', emoji: '🐺', color: '#1d4ed8', names: { kk: 'Қасқыр', ru: 'Волк' }, audio: '/original/sounds/letter-line/У.mp3' },
  hurt: { letter: 'О', emoji: '🤕', color: '#047857', names: { kk: 'Таңғышы бар адам', ru: 'Человек с повязкой' }, audio: '/original/sounds/letter-line/О.mp3' },
} as const;
export type Vowel = keyof typeof vowels;
export const vowelIds: Vowel[] = ['baby', 'wolf', 'hurt'];
export const chains: { pattern: Vowel[]; audio: string }[] = [
  { pattern: ['baby', 'wolf', 'baby', 'wolf', 'baby'], audio: '/original/sounds/kk-human/ауауа.mp4' },
  { pattern: ['wolf', 'baby', 'wolf', 'baby', 'wolf'], audio: '/original/sounds/kk-human/уауауау.mp4' },
  { pattern: ['baby', 'hurt', 'baby', 'hurt', 'baby'], audio: '/original/sounds/kk-human/аоаоаоа.mp4' },
  { pattern: ['wolf', 'hurt', 'wolf', 'hurt', 'wolf', 'hurt'], audio: '/original/sounds/kk-human/уоуоуоуо.mp4' },
  { pattern: ['baby', 'hurt', 'wolf', 'hurt', 'baby'], audio: '/original/sounds/kk-human/аоуоа.mp4' },
  { pattern: ['wolf', 'hurt', 'baby', 'hurt', 'wolf'], audio: '/original/sounds/kk-human/уоаоу.mp4' },
];
export const chainLabel = (index: number) => chains[index].pattern.map(id => vowels[id].letter).join('–');
export const quizRounds: Vowel[] = ['baby', 'wolf', 'hurt', 'baby', 'wolf', 'hurt', 'baby', 'wolf', 'hurt'];
export type VowelScreen = 'g0DShakJattugu' | 'g0DShakTapsyrma';
export const vowelScreens: readonly string[] = ['g0DShakJattugu', 'g0DShakTapsyrma'];
export const vowelCopy = {
  kk: {
    chainTitle: 'Дауыстар тізбегі', chainHint: 'Суретке тиіп, дыбысты қайталаңыз!', legend: 'Суреттер мен дыбыстар', chains: 'Тізбекті таңдаңыз',
    row: 'Қатар', sound: 'Дыбыс', position: 'Орны', playChain: 'Барлығын тыңда', repeat: 'Дыбыстарды ретімен қайталаңыз!',
    quizTitle: 'Дыбысты тап!', quizHint: 'Дыбысты тыңдап, дұрыс суретті таңдаңыз!', choices: 'Суретті таңдаңыз',
    listen: 'Дыбысты тыңдау', stop: 'Тоқтату', playing: 'Тыңдаңыз…', finished: 'Қайталап айтыңыз. Қайта тыңдауға болады.',
    waiting: 'Дыбыс қазір ойнатылады…', ready: 'Сәйкес суретті таңдаңыз.', correct: 'Дұрыс!', wrong: 'Қате. Дұрыс сурет белгіленді. Тыңдап қайталаңыз.',
    error: 'Дыбыс жүктелмеді. Қайталап тыңдаңыз.', interrupted: 'Дыбыс тоқтатылды. Қайта тыңдаңыз.',
    round: 'Раунд', score: 'Дұрыс жауаптар', completed: 'Аяқталды!', next: 'Келесі', result: 'Нәтиже', restart: 'Қайта бастау', back: 'Артқа',
  },
  ru: {
    chainTitle: 'Цепочки гласных', chainHint: 'Нажмите на картинку и повторите звук!', legend: 'Картинки и звуки', chains: 'Выберите цепочку',
    row: 'Ряд', sound: 'Звук', position: 'Позиция', playChain: 'Послушать цепочку', repeat: 'Повторите звуки по порядку!',
    quizTitle: 'Найдите звук!', quizHint: 'Послушайте звук и выберите подходящую картинку!', choices: 'Выберите картинку',
    listen: 'Послушать звук', stop: 'Остановить', playing: 'Слушайте…', finished: 'Повторите звуки. Можно послушать ещё раз.',
    waiting: 'Сейчас прозвучит звук…', ready: 'Выберите подходящую картинку.', correct: 'Верно!', wrong: 'Неверно. Правильная картинка отмечена. Послушайте и повторите.',
    error: 'Звук не загрузился. Попробуйте послушать ещё раз.', interrupted: 'Звук остановлен. Послушайте ещё раз.',
    round: 'Раунд', score: 'Правильные ответы', completed: 'Завершено!', next: 'Дальше', result: 'Результат', restart: 'Начать заново', back: 'Назад',
  },
};
