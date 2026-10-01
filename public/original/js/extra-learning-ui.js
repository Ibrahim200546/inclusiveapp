(function () {
  'use strict';
  const extra = window.EXTRA_LEARNING_CONTENT;
  if (!extra) return;
  const syllables = [1, 2, 3, 4].map(count => ({count, audio:`sounds/syllables/word_${count}.mp3`, original:true})).concat(extra.syllables);
  const instruments = [
    {id:'piano',label:'Пианино',audio:'sounds/musical/piano.mp3'},
    {id:'drum',label:'Барабан',audio:'sounds/musical/drum.mp3'},
    {id:'guitar',label:'Гитара',audio:'sounds/musical/guitar.mp3'},
    {id:'violin',label:'Скрипка',audio:'sounds/musical/violin.mp3'}
  ].concat(extra.instruments);
  let active = null, audio = null, generation = 0;
  const history = {syllable:[],instrument:[]};
  const language = (kk,ru) => window.getProfileLang?.() === 'ru' ? ru : kk;
  const currentScreen = () => document.querySelector('.screen.active')?.id;
  function message(kind, kk, ru, className = '') {
    const node = document.getElementById(kind === 'syllable' ? 'g0tSyllablesFeedback' : 'g0t3Feedback');
    if (node) { node.textContent = language(kk,ru); node.className = 'feedback ' + className; }
  }
  function stop() {
    generation++; active = null;
    if (audio) { audio.pause(); audio.currentTime = 0; audio = null; }
  }
  function choose(kind, catalog) {
    const recent = history[kind].slice(-2);
    const available = catalog.filter(item => !recent.includes(item));
    const item = available[Math.floor(Math.random() * available.length)];
    history[kind].push(item); if (history[kind].length > 3) history[kind].shift();
    return item;
  }
  async function play(kind, item, replay = false) {
    if (audio) { audio.pause(); audio.currentTime = 0; }
    const token = ++generation;
    active = {kind,item,heard:false,answered:false};
    const candidate = new Audio(item.audio);
    audio = typeof window.trackAudio === 'function' ? window.trackAudio(candidate) : candidate;
    audio.preload = 'auto';
    audio.addEventListener('error', () => {
      if (token !== generation) return;
      active = null; message(kind, 'Дыбыс жүктелмеді. Қайталап көріңіз.', 'Не удалось загрузить звук. Повторите.', 'error');
    }, {once:true});
    try {
      await audio.play();
      if (token !== generation) return;
      active.heard = true;
      message(kind, replay ? '🔊 Қайта тыңдаңыз.' : kind === 'syllable' ? '🔊 Сөзді тыңдап, буын санын таңдаңыз.' : '🔊 Аспапты тыңдап, таңдаңыз.',
        replay ? '🔊 Слушайте ещё раз.' : kind === 'syllable' ? '🔊 Послушайте слово и выберите количество слогов.' : '🔊 Послушайте и выберите инструмент.');
    } catch (error) {
      if (token !== generation) return;
      active = null;
      message(kind, error.name === 'NotAllowedError' ? 'Дыбысты қосу үшін батырманы қайта басыңыз.' : 'Дыбыс жүктелмеді. Қайталап көріңіз.',
        error.name === 'NotAllowedError' ? 'Нажмите кнопку ещё раз, чтобы включить звук.' : 'Не удалось загрузить звук. Повторите.', 'error');
    }
  }
  function answer(kind, choice) {
    if (!active || active.kind !== kind || !active.heard || active.answered) {
      message(kind, 'Алдымен дыбысты тыңдаңыз!', 'Сначала послушайте звук!'); return;
    }
    const expected = kind === 'syllable' ? active.item.count : active.item.id;
    if (choice !== expected) {
      window.playError?.(); message(kind, 'Қате! Қайта тыңдап көріңіз.', 'Ошибка! Послушайте ещё раз.', 'error'); return;
    }
    active.answered = true;
    if (audio) audio.pause();
    const word = kind === 'syllable' && active.item.word ? active.item.word + ' — ' : '';
    message(kind, kind === 'syllable' ? `Дұрыс! ${word}${expected} буын.` : 'Дұрыс! Тамаша!',
      kind === 'syllable' ? `Правильно! ${word}${expected} слог(а).` : 'Правильно! Отлично!', 'success');
    window.showReward?.();
  }
  const previousPlaySound = window.playSound;
  const previousCheckSyllables = window.checkSyllables;
  window.playSound = function(type) {
    if (type !== 'syllable' || currentScreen() !== 'g0TaskSyllables') return previousPlaySound?.(type);
    return play('syllable', choose('syllable', syllables));
  };
  window.checkSyllables = function(count) {
    if (currentScreen() !== 'g0TaskSyllables') return previousCheckSyllables?.(count);
    answer('syllable', count);
  };
  window.playInstrumentSound = () => play('instrument', choose('instrument', instruments));
  window.checkInstrument = choice => answer('instrument',choice);
  const previousShowScreen = window.showScreen;
  window.showScreen = function(id) { stop(); return previousShowScreen(id); };
  window.addEventListener('pagehide',stop);
  window.addEventListener('profile-language-change',stop);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  document.addEventListener('DOMContentLoaded',()=>{
    for (const [kind,id] of [['syllable','g0TaskSyllables'],['instrument','g0Task3']]) {
      const screen = document.getElementById(id);
      const center = screen?.querySelector('.center-circle');
      if (center) center.setAttribute('aria-label',language('Жаңа дыбысты тыңдау','Послушать новый звук'));
      const replay = document.createElement('button'); replay.type = 'button'; replay.className = 'btn btn-secondary'; replay.id = kind + 'Replay';
      const setLabel = () => { replay.textContent = language('🔊 Қайта тыңдау','🔊 Слушать ещё раз'); };
      setLabel(); window.addEventListener('profile-language-change',setLabel);
      replay.addEventListener('click',()=>{
        if (active?.kind === kind && !active.answered) void play(kind,active.item,true);
        else message(kind,'Алдымен жаңа дыбысты тыңдаңыз!','Сначала послушайте новый звук!');
      });
      screen?.querySelector('.feedback')?.after(replay);
    }
    const circle = document.querySelector('#g0Task3 .letter-circle-container');
    if (circle) {
      extra.instruments.forEach(instrument=>{
        const button = document.createElement('button'); button.type='button'; button.className='option-circle'; button.dataset.instrument=instrument.id;
        const icon=document.createElement('div');icon.textContent=instrument.emoji;
        const name=document.createElement('p');name.textContent=instrument.label;
        button.append(icon,name);button.addEventListener('click',()=>answer('instrument',instrument.id));circle.append(button);
      });
      circle.querySelectorAll('.option-circle').forEach((node,index,nodes)=>node.style.setProperty('--angle',index*360/nodes.length+'deg'));
      const attribution=document.createElement('a');
      attribution.textContent=language('Дыбыс жазбаларының дереккөздері','Источники аудиозаписей');
      // The bundled attribution is readable offline in a browser, unlike repository documentation.
      attribution.href='sounds/kazakh-instruments/ATTRIBUTION.html';attribution.target='_blank';attribution.rel='noopener';
      document.getElementById('g0t3Feedback').after(attribution);
    }
  });
})();
