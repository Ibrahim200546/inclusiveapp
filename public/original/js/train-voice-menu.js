(function (root) {
  'use strict';
  function nextLetters(previous = [], random = Math.random) {
    const pool = ['А','Ә','О','Ө','Ұ','Ү','Ы','І','П','Б','Т','К','У'];
    const shuffle = values => {
      const result = [...values];
      for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i],result[j]] = [result[j],result[i]]; }
      return result;
    };
    const unseen = shuffle(pool.filter(letter => !previous.includes(letter)));
    const repeats = shuffle(pool.filter(letter => previous.includes(letter)));
    return shuffle([...unseen,...repeats].slice(0,8));
  }
  root.TrainVoiceMenu = { nextLetters };
})(typeof window !== 'undefined' ? window : globalThis);
