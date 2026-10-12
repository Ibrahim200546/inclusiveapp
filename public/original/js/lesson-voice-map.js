(function () {
  'use strict';

  // Bundled synthetic narration for the new lessons. Existing voice maps remain available.
  const base = 'sounds/articulation-lessons/';
  const kk = Object.freeze({
    'қасқыр': 'q-wolf-kk.mp3',
    'қоян': 'q-rabbit-kk.mp3',
    'тасбақа': 'q-tortoise-kk.mp3',
    'күз келді': 'autumn-arrived-kk.mp3',
    'күн суытты': 'autumn-cold-kk.mp3',
    'жапырақтар түсті': 'autumn-leaves-kk.mp3',
  });
  const ru = Object.freeze({
    'наступила осень': 'autumn-arrived-ru.mp3',
    'похолодало': 'autumn-cold-ru.mp3',
    'опали листья': 'autumn-leaves-ru.mp3',
  });
  const normalize = text => String(text || '').normalize('NFC').toLocaleLowerCase('kk-KZ')
    .replace(/[.!?…]/g, '').replace(/\s+/g, ' ').trim();
  const priorKk = window.getKkHumanVoiceoverAudioPath;
  const priorRu = window.getRuVoiceoverAudioPath;
  const lookup = (map, text) => Object.prototype.hasOwnProperty.call(map, normalize(text)) ? map[normalize(text)] : '';
  window.getKkHumanVoiceoverAudioPath = function (text, lang) {
    const file = !String(lang || '').toLowerCase().startsWith('ru') && lookup(kk, text);
    return file ? base + file : typeof priorKk === 'function' ? priorKk(text, lang) : '';
  };
  window.getRuVoiceoverAudioPath = function (text, lang) {
    const file = String(lang || '').toLowerCase().startsWith('ru') && lookup(ru, text);
    return file ? base + file : typeof priorRu === 'function' ? priorRu(text, lang) : '';
  };
})();
