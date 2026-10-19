(function (root) {
  'use strict';
  function shuffle(items, random = Math.random) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function create(items, options = {}) {
    if (!items.length || new Set(items.map(item => item.id)).size !== items.length) throw new Error('Invalid lesson items');
    let order = [], index = 0, heard = false, answered = false, attempts = 0, lastAnswerAt = -Infinity;
    let results = [], previousLast;
    const random = options.random || Math.random;
    function restart() {
      order = shuffle(items, random);
      if (order.length > 1 && order[0].id === previousLast) [order[0], order[1]] = [order[1], order[0]];
      index = 0; heard = false; answered = false; attempts = 0; results = []; lastAnswerAt = -Infinity;
    }
    function answer(value, now = Date.now()) {
      if (!heard || answered || index >= order.length || now - lastAnswerAt < 350) return { accepted: false };
      lastAnswerAt = now; attempts++;
      const correct = value === order[index].answer;
      if (correct) {
        answered = true;
        results.push({ id: order[index].id, attempts });
      }
      return { accepted: true, correct };
    }
    function next() {
      if (!answered || index >= order.length) return false;
      previousLast = order[index].id; index++; heard = false; answered = false; attempts = 0; lastAnswerAt = -Infinity;
      return true;
    }
    restart();
    return {
      restart, answer, next,
      markHeard() { if (index < order.length) heard = true; },
      get current() { return order[index] || null; },
      get state() { return { index, total: order.length, heard, answered, complete: index === order.length,
        results: results.map(result => ({ ...result })), attempts: results.reduce((sum, result) => sum + result.attempts, 0) + (answered ? 0 : attempts) }; },
    };
  }
  const pairs = 'а–о;а–ә;а–э;о–у;о–ө;у–ү;ү–ұ;ө–ү;ы–і;і–и;ы–и;и–е;э–е;м–п;н–т;л–н;р–л;т–л;п–б;п–ф;с–з;ш–ж;д–т;ч–ш;ш–щ;к–қ;г–ғ;к–х;к–һ;х–һ'
    .split(';').map((pair, index) => ({ id: 'g1-t8-pair-' + (index + 1), pair, grade: 1, table: 8, strand: 'pronunciation',
      objective: '1.2.1.5', teacherApproved: false, levels: { syllables: [], words: [], sentences: [] } }));
  const numbersKk = ['Бір', 'Екі', 'Үш', 'Төрт', 'Бес', 'Алты', 'Жеті', 'Сегіз', 'Тоғыз', 'Он'];
  const numbersRu = ['Один', 'Два', 'Три', 'Четыре', 'Пять', 'Шесть', 'Семь', 'Восемь', 'Девять', 'Десять'];
  const numbers = numbersKk.map((name, index) => ({ id: 'number-' + (index + 1), answer: index + 1, name,
    prompt: name + ' санын тап.', promptRu: 'Найди число ' + numbersRu[index].toLowerCase() + '.',
    audio: 'sounds/find-number/kk-' + (index + 1) + '.mp3', audioRu: 'sounds/find-number/ru-' + (index + 1) + '.mp3' }));
  function soundItems(mode) {
    if (mode === 'count') return [1, 2, 3].map(count => ({ id: 'count-' + count, answer: count, events: Array.from({ length: count }, (_, i) => ({ start: i * 0.6, duration: 0.14, frequency: 440 })) }));
    if (mode === 'pitch') return [{ answer: 'low', frequency: 220 }, { answer: 'mid', frequency: 440 }, { answer: 'high', frequency: 880 }]
      .map(item => ({ ...item, id: 'pitch-' + item.answer, events: [{ start: 0, duration: 0.8, frequency: item.frequency }] }));
    if (mode === 'tempo') return [{ answer: 'slow', interval: 0.8 }, { answer: 'fast', interval: 0.3 }]
      .map(item => ({ ...item, id: 'tempo-' + item.answer, events: Array.from({ length: 3 }, (_, i) => ({ start: i * item.interval, duration: 0.12, frequency: 440 })) }));
    if (mode === 'rhythm') return [{ answer: 'one', starts: [0] }, { answer: 'two', starts: [0, 0.4] }]
      .map(item => ({ ...item, id: 'rhythm-' + item.answer, events: item.starts.map(start => ({ start, duration: 0.14, frequency: 440 })) }));
    throw new Error('Unknown sound mode');
  }
  function progressKey(grade, strand, objective, table = grade === 0 ? 5 : 7) { return ['grade', grade, 'table', table, strand, objective].join(':'); }
  root.CorexLearning = { create, shuffle, numbers, pairs, soundItems, progressKey };
})(window);
