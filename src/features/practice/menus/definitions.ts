import type { Lesson } from '../curriculum/types';
import { lessonIcon } from '../curriculum/presentation';
import type { SoundLibrary } from '../learning/listeningStore';
import type { ListeningMode } from '../learning/content';

export type MenuAction =
  | { kind: 'screen'; screen: string; initialize?: 'frog' }
  | { kind: 'articulation' }
  | { kind: 'embedded'; screen: string; path: string }
  | { kind: 'listening'; mode: Exclude<ListeningMode, 'recognition'> }
  | { kind: 'syllables' }
  | { kind: 'lesson'; lesson: Lesson };

export interface MenuEntry {
  id: string; labels: [string, string]; icon: string; action: MenuAction;
  junior?: boolean; grade?: number; soundCategory?: string;
}
export interface GradeMenuDefinition {
  id: string; labels: [string, string]; colors: [string, string]; entries: MenuEntry[];
  back: string; grade?: number; paged: boolean; size: number; centerSize: number; fontSize: number;
}

function screen(screen: string, icon: string, kk: string, ru: string, initialize?: 'frog'): MenuEntry {
  return { id: screen, labels: [kk, ru], icon, action: { kind: 'screen', screen, initialize } };
}
const soundsEntry = () => screen('grade0SoundsMenu', '🔊', 'Дыбыспен жұмыс', 'Работа со звуком');
const articulation = (): MenuEntry => ({ id: 'articulation', icon: '👄', labels: ['Дыбыс картасы', 'Карта звуков'], action: { kind: 'articulation' } });
const syllables = (): MenuEntry => ({ id: 'syllables', icon: '🎓', labels: ['Буындап оқу', 'Чтение по слогам'], action: { kind: 'syllables' } });

export function lessonMenu(lesson: Lesson) {
  if (lesson.id === 'one-breath' && lesson.grade < 2) return 'grade0TynysByMenu';
  if (lesson.category === 'phonetics') return 'grade0SoundsMenu';
  if (lesson.grade >= 2) return `grade${lesson.grade}Menu`;
  if (lesson.category === 'speech') return 'grade0DauyspenmMenu';
  if (lesson.category === 'sentence') return 'sentenceModuleScreen';
  return 'learningHubScreen';
}

export function createGradeMenus(lessons: Lesson[], sounds: SoundLibrary): GradeMenuDefinition[] {
  const menus: GradeMenuDefinition[] = [];
  const add = (id: string, labels: [string, string], entries: MenuEntry[], overrides: Partial<GradeMenuDefinition> = {}) => {
    menus.push({ id, labels, entries, colors: ['#FDB813', '#F5A623'], back: 'grade0Menu', paged: true,
      size: 700, centerSize: 160, fontSize: 28, ...overrides });
  };
  add('grade0Menu', ['1-деңгей', '1 уровень'], [
    soundsEntry(), screen('grade0DauyspenmMenu', '🗣️', 'Дауыспен жұмыс', 'Работа с голосом'),
    screen('grade0TynysByMenu', '🫁', 'Тыныспен жумыс', 'Дыхательные упражнения'), articulation(),
    screen('sentenceModuleScreen', '🧩', 'Сөйлем', 'Предложение'),
    screen('grade0SpatialMatrixScreen', '🧭', 'Кеңістікке бағдарлау', 'Ориентация в пространстве'),
    screen('learningHubScreen', '🔢', 'Тыңдап үйрен', 'Слушай и учись'),
  ], { paged: false, back: 'levelsScreen' });
  add('sentenceModuleScreen', ['Сөйлем', 'Предложение'], [
    screen('g2VerbModule', '🏃', 'Етістік', 'Глагол'),
    screen('sentenceBuilderScreen', '🧩', 'Сөйлем құрастыру', 'Составление предложения'),
  ], { colors: ['#73C0FC', '#4F8FF7'], size: 640, centerSize: 170 });
  add('grade0DauysShakMenu', ['Дауыс шақыру', 'Вызов голоса'], [
    screen('g0DShakJattugu', '🏋️', 'Жаттығу', 'Упражнение'),
    screen('g0DShakTapsyrma', '📝', 'Тапсырма', 'Задание'),
    screen('g0ArticulationLessons', '👄', 'Артикуляция', 'Артикуляция'),
    screen('g0QSoundAdventure', 'Қ', 'Жоғалған Қ', 'Пропавшая Қ'),
    screen('g0AutumnStory', '🍂', 'Күзгі оқиға', 'Осенняя история'),
  ], { paged: false, back: 'grade0DauyspenmMenu', colors: ['#f97316', '#b45309'], fontSize: 22 });

  const recognition = (category: string): MenuEntry => {
    const definition = sounds.categories[category];
    return { ...screen(definition.screen, definition.icon, ...definition.labels), soundCategory: category,
      ...(category === 'instruments' && { labels: ['Аспаптар', 'Инструменты'] as [string, string] }) };
  };
  add('grade0SoundsMenu', ['Дыбыспен жұмыс', 'Работа со звуком'], [
    { ...screen('g0Task1', '🔊', 'Тану', 'Распознавание'), junior: true },
    recognition('instruments'), recognition('animals'),
    { ...screen('g0Task5', '🎵', 'Вальс / марш', 'Вальс / марш'), junior: true },
    recognition('nature'), recognition('transport'), recognition('household'), recognition('wild'),
    { ...screen('g0TaskSyllables', '👏', 'Буындар', 'Слоги'), junior: true },
    recognition('technical'), recognition('emotion'),
    { id: 'repeat-rhythm', icon: '🥁', labels: ['Ырғақты қайталау', 'Повтори ритм'], junior: true,
      action: { kind: 'embedded', screen: 'g0TaskRepeatRhythm', path: 'tasks/povtori_ritm.html' } },
  ], { colors: ['#00C9FF', '#0084FF'], centerSize: 230, fontSize: 24 });
  add('grade0VoiceMenu', ['Дауыс', 'Голос'], [
    screen('g0Task2', '🚂', 'Поезд', 'Поезд'), screen('g0TaskFrog', '🐸', 'Бақа', 'Лягушка', 'frog'),
    screen('g0TynysByTask', '📖', 'Буындап оқу · 1', 'Чтение по слогам · 1'), syllables(),
  ], { colors: ['#FF6B9D', '#C06C84'], back: 'grade0DauyspenmMenu' });
  add('grade0DauyspenmMenu', ['Дауыспен жұмыс', 'Работа с голосом'], [
    screen('g0DauyspTask1', '📢', 'Дауыстап', 'Громко'), screen('g0DauyspTask2', '🗣️', 'Жай', 'Обычно'),
    screen('g0DauyspTask3', '🤫', 'Сыбырлап', 'Шёпотом'), screen('grade0DauysShakMenu', '📞', 'Дауыс шақыру', 'Вызов голоса'),
    screen('grade0VoiceMenu', '🎤', 'Дауыс', 'Голос'), syllables(),
  ], { colors: ['#a855f7', '#6d28d9'], fontSize: 22 });
  add('grade0TynysByMenu', ['Тыныспен жумыс', 'Дыхательные упражнения'], [
    screen('g0TynysByTask3', '🧩', 'Сөздер', 'Слова'), screen('g0TynysByTask4', '📝', 'Сөйлем', 'Предложение'),
    { id: 'one-breath', icon: '🌬️', labels: ['Бір тыныспен оқу', 'Чтение на одном дыхании'],
      action: { kind: 'embedded', screen: 'g0TynysByOneBreath', path: 'tasks/bir_tinispen_oku.html' } },
  ], { colors: ['#06b6d4', '#0891b2'], fontSize: 20 });
  add('grade2Menu', ['2-деңгей', '2 уровень'], [
    screen('g2Task3', '🔤', 'С-Ш', 'С-Ш'), screen('g2Task4', '📐', 'Математика', 'Математика'),
    screen('g2Task5', '⏱️', 'Сипаты', 'Свойства'), screen('g2Task6', '🎭', 'Ертегілер', 'Сказки'), articulation(), soundsEntry(),
  ], { grade: 2, size: 600, back: 'levelsScreen' });
  add('grade3Menu', ['3-деңгей', '3 уровень'], [
    screen('g3Task1', '🎼', 'Ырғақ', 'Ритм'), screen('g3Task2', '😊', 'Интонация', 'Интонация'),
    screen('g3Task3', '📝', 'Екпін', 'Ударение'), screen('g3Task5', '🗣️', 'Сөздер', 'Слова'),
    screen('g3Task6', '🎤', 'Әндер', 'Песни'), articulation(), soundsEntry(),
  ], { grade: 3, size: 600, back: 'levelsScreen' });
  add('grade4Menu', ['4-деңгей', '4 уровень'], [
    screen('g4Task1', '📖', 'Әңгіме', 'Рассказ'), screen('g4Task2', '💬', 'Диалог', 'Диалог'),
    screen('g4Task3', '📚', 'Мәтін', 'Текст'), screen('g4Task5', '🥁', 'Ырғақ', 'Ритм'),
    screen('g4Task6', '🧭', 'Бағыт', 'Направление'), articulation(), soundsEntry(),
  ], { grade: 4, size: 600, back: 'levelsScreen' });
  add('learningHubScreen', ['Тыңдап үйрен', 'Слушай и учись'], [
    ['numbers', '🔢', 'Санды тап', 'Найди число'], ['count', '👏', 'Неше рет естідің?', 'Сколько сигналов?'],
    ['rhythm', '🥁', 'Ырғақты таңда', 'Выбери ритм'], ['tempo', '⏱️', 'Тез / Баяу', 'Быстро / Медленно'],
    ['pitch', '🎵', 'Дыбыс биіктігі', 'Высота звука'],
  ].map(([mode, icon, kk, ru]) => ({ id: mode, icon, labels: [kk, ru], action: { kind: 'listening', mode: mode as Exclude<ListeningMode, 'recognition'> } })));

  for (const lesson of lessons) {
    menus.find(menu => menu.id === lessonMenu(lesson))!.entries.push({
      id: `lesson:${lesson.grade}:${lesson.id}`, labels: [lesson.title, lesson.title], icon: lessonIcon(lesson),
      grade: lesson.grade, action: { kind: 'lesson', lesson },
    });
  }
  menus.find(menu => menu.id === 'grade0SoundsMenu')!.entries.push({
    ...screen('voicePresenceScreen', '🗣️', 'Дауыс бар ма?', 'Есть ли голос?'), junior: true,
  });
  return menus;
}
