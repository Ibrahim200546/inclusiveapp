import type { Locale } from '../learning/content';

export const breathPresets = ['ТА', 'МА', 'ПА', 'КО', 'БА', 'КА', 'НА', 'ЗА', 'ЛА', 'РА'] as const;
export const breathColors = ['#ff8fab', '#ffb86b', '#ffe066', '#8be28b', '#7fd3ff', '#c4a1ff'] as const;
export const breathLevels = breathColors.length;

/** The original custom field accepts up to three characters, including Kazakh letters. */
export function normalizeSyllable(value: string) {
  return Array.from(value.trim().toUpperCase()).slice(0, 3).join('');
}

interface BreathCopy {
  title: string; subtitle: string; choose: string; nextSyllable: string; random: string;
  own: string; apply: string; hint: string; back: string; start: string; next: string;
  finish: string; repeat: string; ready: string; complete: string; empty: string;
  pyramid: string; row: string; read: string;
}
export const breathCopy: Record<Locale, BreathCopy> = {
  kk: {
    title: 'Бір тыныспен оқу', subtitle: 'Буындар пирамидасын бір деммен оқимыз', choose: 'Буынды таңдау',
    nextSyllable: 'Келесі буын', random: 'Кездейсоқ', own: 'Өз буыныңыз', apply: 'Қолдану',
    hint: 'Терең тыныс алып, пирамидадағы барлық жолдарды тоқтамай, бір деммен оқып шығыңыз.',
    back: 'Артқа', start: 'Бастау', next: 'Келесі жол', finish: 'Дайын!', repeat: 'Қайталау',
    ready: 'Буынды таңдап, бастаңыз.', complete: '✓ Барлық алты жол оқылды!', empty: 'Буын енгізіңіз (1–3 таңба).',
    pyramid: 'Буындар пирамидасы', row: 'Жол', read: 'Оқылған жол',
  },
  ru: {
    title: 'Чтение на одном дыхании', subtitle: 'Читаем пирамиду слогов на одном выдохе', choose: 'Выбор слога',
    nextSyllable: 'Следующий слог', random: 'Случайный', own: 'Свой слог', apply: 'Применить',
    hint: 'Сделайте глубокий вдох и прочитайте все строки пирамиды без остановки, на одном выдохе.',
    back: 'Назад', start: 'Начать', next: 'Следующая строка', finish: 'Готово!', repeat: 'Ещё раз',
    ready: 'Выберите слог и начните.', complete: '✓ Все шесть строк прочитаны!', empty: 'Введите слог (1–3 символа).',
    pyramid: 'Пирамида слогов', row: 'Строка', read: 'Прочитанная строка',
  },
};
