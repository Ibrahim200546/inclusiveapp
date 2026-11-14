import { consonants } from './assessment';
import type { TrainState } from './store';

export const trainCopy = {
  kk: { title: 'Поезд 🚂', center: 'Дауыс созу', close: 'Жабу', begin: 'бастау', choose: 'Басқа әріп', select: 'дыбысын таңдау',
    stop: '⏹ Тоқтату', retry: 'Қайталау', back: 'Артқа', mode: 'Дыбыс ұзақтығы', short: 'Қысқа дыбыс', long: 'Ұзақ дыбыс / 3 рет',
    note: 'Таңдалған дыбыс құрылғыда тексеріледі. Модель қателесуі мүмкін; анық әрі тыныш жерде айтыңыз. Дауыс файлға жазылмайды және жіберілмейді.',
    sample: 'Үлгіні тыңдаңыз, содан кейін ортадағы батырманы басыңыз.', sampleError: 'Үлгі ойнатылмады. Әріпті қайта таңдап, қайталаңыз.',
    loading: 'Дыбысты тану дайындалуда…', requesting: 'Микрофонға рұқсат күтілуде...', checking: 'Дыбыс тексерілуде. Микрофон өшірілді...',
    stopped: 'Тоқтатылды. Қайта бастауға болады.', signal: 'Сигнал тыңдалуда. Әріп әлі тексерілуде.', score: 'Танудың бағасы',
    failed: 'Таңдалған дыбыс анық расталмады немесе тым қысқа. Қайталап көріңіз.',
    model: 'Модель дайын емес. Қайталап көріңіз.', denied: 'Микрофонға рұқсат берілмеді. Рұқсат беріп, қайталаңыз.',
    timeout: 'Уақыт аяқталды. Қайталап көріңіз.', microphone: 'Микрофон қолжетімсіз немесе ажыратылды. Қайта қосып көріңіз.',
    progress: 'Пойыздың жолы',
  },
  ru: { title: 'Поезд 🚂', center: 'Протяжный голос', close: 'Закрыть', begin: 'начать', choose: 'Другая буква', select: 'Выбрать звук',
    stop: '⏹ Остановить', retry: 'Повторить', back: 'Назад', mode: 'Длительность звука', short: 'Короткий звук', long: 'Длинный звук / 3 повторения',
    note: 'Выбранный звук проверяется на устройстве. Модель может ошибаться; говорите отчётливо в тихом месте. Голос не сохраняется в файл и не отправляется.',
    sample: 'Послушайте образец, затем нажмите центральную кнопку.', sampleError: 'Не удалось воспроизвести образец. Выберите букву снова и повторите.',
    loading: 'Подготовка распознавания…', requesting: 'Ожидаем разрешение микрофона...', checking: 'Проверяем звук. Микрофон уже выключен...',
    stopped: 'Остановлено. Можно повторить.', signal: 'Слушаем сигнал. Буква ещё проверяется.', score: 'Оценка распознавания',
    failed: 'Выбранный звук не подтверждён или слишком короткий. Попробуйте ещё раз.',
    model: 'Распознавание не готово. Попробуйте ещё раз.', denied: 'Доступ к микрофону запрещён. Разрешите доступ и повторите.',
    timeout: 'Время ожидания истекло. Попробуйте ещё раз.', microphone: 'Микрофон недоступен или отключён. Подключите его и повторите.',
    progress: 'Путь поезда',
  },
};
const phoneLetters: Record<string, string> = { p:'П', b:'Б', t:'Т', k:'К', a:'А', ɑ:'А', æ:'Ә', ɛ:'Ә', o:'О', ø:'Ө', œ:'Ө', ʊ:'Ұ', y:'Ү', ɯ:'Ы', ɨ:'Ы', ɪ:'І', ɘ:'І', u:'У', h:'Х', s:'С', ʃ:'Ш', m:'М', n:'Н', l:'Л', r:'Р', d:'Д', ɡ:'Г' };
export function trainFeedback(state: TrainState) {
  const copy = trainCopy[state.locale], kk = state.locale === 'kk', letter = state.selected;
  switch (state.status) {
    case 'idle': return '';
    case 'selected': return state.preview === 'error' ? copy.sampleError : copy.sample;
    case 'loading': case 'requesting': case 'checking': case 'stopped': return copy[state.status];
    case 'error': return copy[state.error || 'microphone'];
    case 'listening': return consonants.has(letter)
      ? kk ? `«${letter}» дыбысын ${state.mode === 'short' ? 'бір рет' : 'үш рет'} айтыңыз (мысалы, пы-пы-пы).` : `Произнесите «${letter}» ${state.mode === 'short' ? 'один раз' : 'три раза'} (например, пы-пы-пы).`
      : kk ? `«${letter}» дыбысын ${state.mode === 'short' ? 'қысқа' : '2 секунд созып'} айтыңыз.` : `Произнесите «${letter}» ${state.mode === 'short' ? 'коротко' : 'протяжно, 2 секунды'}.`;
    case 'arriving': return kk ? `«${letter}» дыбысы расталды. Пойыз жүріп келеді!` : `Звук «${letter}» подтверждён. Поезд едет!`;
    case 'complete': return kk ? `«${letter}» дыбысы расталды. Пойыз жетті! 🎉` : `Звук «${letter}» подтверждён. Поезд доехал! 🎉`;
    case 'incorrect': {
      if (state.result?.reason !== 'different') return copy.failed;
      const heard = [...new Set(state.result.phones.map(phone => phoneLetters[phone] || '…'))].join(', ');
      return kk ? `Модель ${heard} дыбысын таныды. «${letter}» дыбысы расталмады. Қайталап көріңіз.` : `Модель услышала: ${heard}. Звук «${letter}» не подтверждён. Попробуйте ещё раз.`;
    }
  }
}
