/* Educational data and honest offline fallbacks. No learner audio is transmitted. */
(function () {
  'use strict';
  const groups = {
    1: ['ат', 'доп', 'нан', 'шар', 'су'],
    2: ['алма', 'бала', 'қалам', 'балық', 'шана'],
    3: ['балалар', 'ойнады', 'сыпырды', 'тақия', 'оянды'],
    4: ['құрастырды', 'ұйықтады', 'балабақша', 'кітапхана', 'ойыншықтар']
  };
  const syllableWords = Object.entries(groups).flatMap(([count, words]) => [
    // Keep all original recordings; their spoken text has not been transcribed.
    { id: `original-${count}`, count: Number(count), word: '', audio: `sounds/syllables/word_${count}.mp3`, original: true },
    ...words.map(word => ({ id: word, word, count: Number(count), original: false }))
  ]);
  const instrumentData = [
    { id: 'piano', name: 'Пианино', icon: '🎹', audio: 'sounds/musical/piano.mp3' },
    { id: 'drum', name: 'Барабан', icon: '🥁', audio: 'sounds/musical/drum.mp3' },
    { id: 'guitar', name: 'Гитара', icon: '🎸', audio: 'sounds/musical/guitar.mp3' },
    { id: 'violin', name: 'Скрипка', icon: '🎻', audio: 'sounds/musical/violin.mp3' },
    { id: 'dombra', name: 'Домбыра', icon: '♫', description: 'Екі ішекті, шертіп ойналатын қазақтың ұлттық аспабы.', audio: 'sounds/musical/dombra.mp3' },
    { id: 'qobyz', name: 'Қобыз', description: 'Ысқышпен ойналатын қазақтың ұлттық ішекті аспабы.', audio: null },
    { id: 'sybyzgy', name: 'Сыбызғы', description: 'Үрлеп ойналатын қазақтың ұлттық аспабы.', audio: null }
  ];
  window.learningContent = Object.freeze({ syllableWords, instrumentData });
  let round = 0, activeAudio = null, selectedWord = null, instrumentTarget = '', lastWord = '', answered = false;
  let speechPending = false, speechTimer = null, cancelStart = null, mediaCleanup = null;
  function stopLearningAudio() {
    round += 1;
    answered = false;
    if (cancelStart) { cancelStart(); cancelStart = null; }
    if (mediaCleanup) { mediaCleanup(); mediaCleanup = null; }
    clearTimeout(speechTimer); speechTimer = null;
    if (activeAudio) { activeAudio.pause(); activeAudio = null; }
    if (speechPending && window.speechSynthesis) window.speechSynthesis.cancel();
    speechPending = false;
    selectedWord = null;
    instrumentTarget = '';
    if (typeof currentSyllableCount !== 'undefined') currentSyllableCount = 0;
  }
  function feedback(id, text, kind = '') {
    const element = document.getElementById(id);
    if (element) { element.textContent = text; element.className = `feedback ${kind}`.trim(); }
  }
  async function playLocal(path, token, onPlaybackError) {
    const audio = new Audio(path);
    activeAudio = audio;
    if (typeof trackAudio === 'function') trackAudio(audio);
    let startTimer, failStart;
    const failed = new Promise((_, reject) => { failStart = reject; });
    const error = () => {
      failStart(new Error('Audio playback failed'));
      if (token === round) onPlaybackError?.();
    };
    audio.addEventListener?.('error', error);
    mediaCleanup = () => audio.removeEventListener?.('error', error);
    cancelStart = () => failStart(new Error('Audio cancelled'));
    try {
      startTimer = setTimeout(() => failStart(new Error('Audio start timed out')), 8000);
      await Promise.race([Promise.resolve(audio.play()), failed]);
    } catch (error) {
      audio.pause();
      if (activeAudio === audio) activeAudio = null;
      throw error;
    } finally { clearTimeout(startTimer); if (token === round) cancelStart = null; }
    if (token !== round) { audio.pause(); return false; }
    return true;
  }
  function wordFeedbackId() { return 'g0tSyllablesFeedback'; }
  function exactWordRecording(word) {
    const path = window.getKkHumanVoiceoverAudioPath?.(word, 'kk-KZ');
    if (!path) return '';
    // Alphabet clips may pronounce a letter before the word. Do not use them
    // to ask for the syllable count of one isolated word.
    const basename = decodeURIComponent(path.split('/').pop()).replace(/\.[^.]+$/, '').replace(/ \d+$/, '');
    return basename === word ? path : '';
  }
  async function playSyllableWord(repeat = false) {
    const oldWord = selectedWord;
    stopLearningAudio();
    const token = round;
    const candidates = syllableWords.filter(entry => entry.id !== lastWord);
    const entry = repeat && oldWord ? oldWord : candidates[Math.floor(Math.random() * candidates.length)];
    selectedWord = entry;
    lastWord = entry.id;
    const id = wordFeedbackId();
    const display = document.getElementById('syllableWordDisplay');
    if (display) { display.textContent = ''; display.hidden = true; }
    feedback(id, 'Сөз дайындалуда…');
    const audio = entry.audio || exactWordRecording(entry.word);
    if (audio) {
      try {
        if (!await playLocal(audio, token, () => showReadingFallback(entry, id, display))) return;
        currentSyllableCount = entry.count;
        currentSyllableWord = entry.word;
        feedback(id, 'Тыңдап, буын санын таңдаңыз.');
        return;
      } catch (_) {
        if (token !== round) return;
      }
    }
    if (token !== round) return;
    // Only an installed, on-device Kazakh voice is eligible. Never substitute Russian.
    const synth = window.speechSynthesis;
    const voice = synth?.getVoices().find(item => item.localService === true && /^kk(?:-|_)/i.test(item.lang));
    if (entry.word && voice && typeof SpeechSynthesisUtterance === 'function') {
      const utterance = new SpeechSynthesisUtterance(entry.word);
      utterance.lang = 'kk-KZ'; utterance.voice = voice; utterance.rate = 0.8;
      speechPending = true;
      let utteranceActive = true;
      speechTimer = setTimeout(() => {
        if (token !== round) return;
        utteranceActive = false; synth.cancel(); speechPending = false; showReadingFallback(entry, id, display);
      }, 5000);
      utterance.onstart = () => {
        if (token !== round || !utteranceActive || answered) return;
        clearTimeout(speechTimer); speechTimer = null;
        currentSyllableCount = entry.count;
        currentSyllableWord = entry.word;
        feedback(id, 'Құрылғының қазақша дауысы. Буын санын таңдаңыз.');
      };
      utterance.onend = () => { utteranceActive = false; if (token === round) { clearTimeout(speechTimer); speechTimer = null; speechPending = false; } };
      utterance.onerror = () => { if (token === round && utteranceActive) { utteranceActive = false; clearTimeout(speechTimer); speechTimer = null; speechPending = false; showReadingFallback(entry, id, display); } };
      synth.speak(utterance);
    } else showReadingFallback(entry, id, display);
  }
  function showReadingFallback(entry, id, display) {
    if (answered) return;
    if (!entry.word) {
      currentSyllableCount = 0;
      feedback(id, 'Жазба ойналмады. Дыбысты тексеріп, басқа сөзді таңдаңыз.', 'error');
      return;
    }
    currentSyllableCount = entry.count;
    currentSyllableWord = entry.word;
    if (display) { display.textContent = entry.word; display.hidden = false; }
    feedback(id, 'Бұл сөздің аудиосы әзірге жоқ. Сөзді өзіңіз не мұғаліммен оқып, буынын санаңыз.');
  }
  function checkSyllableAnswer(count) {
    const id = wordFeedbackId();
    if (answered || !selectedWord || !currentSyllableCount) { feedback(id, 'Алдымен сөзді таңдаңыз.'); return; }
    if (count !== selectedWord.count) { feedback(id, 'Қайта оқып немесе тыңдап, буын санын санаңыз.', 'error'); return; }
    const answer = selectedWord;
    answered = true;
    currentSyllableCount = 0;
    feedback(id, `Дұрыс! ${answer.word ? answer.word + ' — ' : ''}${answer.count} буын.`, 'success');
    const display = document.getElementById('syllableWordDisplay');
    if (display && answer.word) { display.textContent = answer.word; display.hidden = false; }
    if (typeof showReward === 'function') showReward();
  }
  async function playInstrument() {
    stopLearningAudio();
    const token = round;
    const available = instrumentData.filter(item => item.audio);
    const entry = available[Math.floor(Math.random() * available.length)];
    feedback('g0t3Feedback', 'Тыңдаңыз…');
    try {
      if (!await playLocal(entry.audio, token, () => {
        instrumentTarget = '';
        feedback('g0t3Feedback', 'Жазба үзілді. Қайта тыңдап көріңіз.', 'error');
      })) return;
      instrumentTarget = entry.id;
      feedback('g0t3Feedback', 'Қай аспаптың үні естілді?');
    } catch (_) {
      if (token === round) feedback('g0t3Feedback', 'Жазба ойналмады. Дыбысты тексеріп, қайта басыңыз.', 'error');
    }
  }
  function checkInstrumentAnswer(choice) {
    if (!instrumentTarget) { feedback('g0t3Feedback', 'Алдымен дыбысты тыңдаңыз.'); return; }
    if (choice !== instrumentTarget) { feedback('g0t3Feedback', 'Қайта тыңдап көріңіз.', 'error'); return; }
    const entry = instrumentData.find(item => item.id === choice);
    instrumentTarget = '';
    feedback('g0t3Feedback', `Дұрыс! Бұл — ${entry.name.toLowerCase()}.`, 'success');
    if (typeof showReward === 'function') showReward();
  }
  function init() {
    const screen = document.getElementById('g0TaskSyllables');
    if (screen) {
      const instructions = screen.querySelector('.instruction');
      instructions.textContent = 'Сөзді тыңдаңыз немесе оқыңыз. Неше буын бар?';
      const display = document.createElement('p'); display.id = 'syllableWordDisplay'; display.className = 'learning-word'; display.hidden = true;
      instructions.after(display);
      const buttons = document.createElement('div'); buttons.className = 'learning-actions';
      const repeat = document.createElement('button'); repeat.type = 'button'; repeat.className = 'btn btn-secondary'; repeat.textContent = '🔁 Қайталау'; repeat.onclick = () => playSyllableWord(true);
      buttons.appendChild(repeat); screen.querySelector('.feedback').after(buttons);
    }
    const instruments = document.querySelector('#g0Task3 .letter-circle-container');
    if (instruments) {
      instruments.className = 'instrument-options'; instruments.removeAttribute('style');
      instruments.replaceChildren();
      for (const entry of instrumentData.filter(item => item.audio)) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'instrument-choice';
        button.textContent = `${entry.icon} ${entry.name}`; button.onclick = () => checkInstrumentAnswer(entry.id); instruments.appendChild(button);
      }
      const listen = document.createElement('button'); listen.type = 'button'; listen.className = 'btn btn-primary'; listen.id = 'instrumentListenBtn'; listen.textContent = '🔊 Дыбысты тыңдау'; listen.onclick = playInstrument;
      instruments.before(listen);
      const familiarization = document.createElement('section'); familiarization.className = 'instrument-familiarization';
      const title = document.createElement('h3'); title.textContent = 'Қазақтың ұлттық аспаптарымен танысу'; familiarization.appendChild(title);
      const note = document.createElement('p'); note.textContent = 'Төмендегі аспаптардың рұқсат етілген дыбыс жазбалары әлі қосылмаған. Олар дыбысты табу ойынына кірмейді.'; familiarization.appendChild(note);
      for (const entry of instrumentData.filter(item => !item.audio)) {
        const card = document.createElement('p'); const name = document.createElement('strong'); name.textContent = entry.name + '. '; card.append(name, entry.description); familiarization.appendChild(card);
      }
      instruments.after(familiarization);
      const attribution = document.createElement('p'); attribution.className = 'instrument-attribution';
      const license = document.createElement('a'); license.href = 'sounds/musical/ATTRIBUTION.html'; license.textContent = 'Домбыра жазбасының авторы мен лицензиясы'; license.target = '_blank'; license.rel = 'noopener';
      attribution.appendChild(license); familiarization.after(attribution);
    }
    const originalPlaySound = window.playSound;
    window.playSound = function (type, ...args) {
      if (type === 'syllable') return playSyllableWord();
      if (type === 'dialog') {
        currentDialogSpeaker = '';
        feedback('g4t2Feedback', 'Диалог жазбалары әлі қосылмаған. Бұл тапсырма уақытша қолжетімсіз.');
        return;
      }
      return originalPlaySound?.(type, ...args);
    };
    window.checkSyllables = checkSyllableAnswer;
    window.playInstrumentSound = playInstrument;
    window.checkInstrument = checkInstrumentAnswer;
    const originalShowScreen = window.showScreen;
    window.showScreen = function (...args) { stopLearningAudio(); return originalShowScreen?.apply(this, args); };
    document.addEventListener('visibilitychange', () => { if (document.hidden) stopLearningAudio(); });
    window.addEventListener('pagehide', stopLearningAudio);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
