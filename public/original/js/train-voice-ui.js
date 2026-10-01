(function () {
  'use strict';
  let session = null;
  let selection = '';
  let state = 'idle';
  let mode = 'long';
  let previousLetters = [];
  let menuTimer = null;
  let morphTimer = null;
  let travelFrame = null;
  let rewardGiven = false;
  let currentProgress = 0;
  const busy = () => state === 'arriving' || ['loading', 'requesting', 'listening', 'checking'].includes(session?.state);
  const screen = () => document.getElementById('g0Task2');
  const text = (kk, ru) => typeof window.getProfileLang === 'function' && window.getProfileLang() === 'ru' ? ru : kk;
  const feedback = (kk, ru, kind = '') => {
    const node = document.getElementById('voiceFeedback');
    if (node) { node.textContent = text(kk, ru); node.className = 'feedback ' + kind; }
  };
  function restoreCircles() {
    const container = document.getElementById('voiceGameContainer');
    const train = document.getElementById('voiceTrainContainer');
    const center = document.getElementById('voiceCenterBtn');
    if (container) container.style.display = '';
    if (train) train.style.display = 'none';
    if (center) { center.style.display = ''; center.textContent = selection ? text('▶ ' + selection + ' — бастау', '▶ ' + selection + ' — начать') : text('Дауыс созу', 'Протяжный голос'); }
    const stop = document.getElementById('trainVoiceStop');
    if (stop) stop.hidden = true;
  }
  function positionBubbles() {
    const container = document.getElementById('voiceGameContainer');
    if (!container) return;
    container.querySelectorAll('.small-bubble').forEach((bubble,index) => bubble.style.setProperty('--voice-angle',index * 45 + 'deg'));
  }
  function morph(container) {
    clearTimeout(morphTimer); container.classList.add('voice-morphing');
    morphTimer = setTimeout(() => container.classList.remove('voice-morphing'),800);
  }
  function collapse() {
    const container = document.getElementById('voiceGameContainer');
    if (!container) return;
    clearTimeout(menuTimer); morph(container); container.classList.remove('expanded');
    container.querySelectorAll('.small-bubble').forEach(node => { node.tabIndex = -1; node.setAttribute('aria-hidden','true'); });
    document.getElementById('voiceCenterBtn')?.setAttribute('aria-expanded','false');
    menuTimer = setTimeout(() => { if (!container.classList.contains('expanded')) container.querySelectorAll('.small-bubble').forEach(node => node.remove()); },650);
  }
  function expand() {
    const container = document.getElementById('voiceGameContainer');
    if (!container || busy()) return;
    clearTimeout(menuTimer); morph(container); container.classList.remove('expanded');
    container.querySelectorAll('.small-bubble').forEach(node => node.remove());
    const letters = window.TrainVoiceMenu.nextLetters(previousLetters); previousLetters = letters;
    letters.forEach((letter,index) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'small-bubble'; button.textContent = letter;
      button.style.setProperty('--voice-angle',index * 45 + 'deg');
      button.style.setProperty('--voice-delay',index * 18 + 'ms');
      button.setAttribute('aria-label',text(letter + ' дыбысын таңдау','Выбрать звук ' + letter));
      button.addEventListener('click',event => { event.stopPropagation(); selectVoiceLetter(letter); });
      container.appendChild(button);
    });
    state = 'expanded'; document.getElementById('voiceCenterBtn').textContent = text('Жабу','Закрыть');
    document.getElementById('voiceCenterBtn').setAttribute('aria-expanded','true');
    void container.offsetWidth;
    requestAnimationFrame(() => { if (state === 'expanded') container.classList.add('expanded'); });
  }
  function cancelTravel() { if (travelFrame !== null) cancelAnimationFrame(travelFrame); travelFrame = null; }
  function renderProgress(value) {
    currentProgress = value;
    const progress = document.getElementById('voiceProgressBar');
    progress.style.width = value + '%'; progress.textContent = Math.floor(value) + '%';
    progress.setAttribute('aria-valuenow',String(Math.floor(value)));
    const icon = document.getElementById('trainIcon');
    icon.style.left = Math.max(0,icon.parentElement.clientWidth - icon.offsetWidth) * value / 100 + 'px';
    icon.style.transform = 'scaleX(-1)';
  }
  function showTrainActions(visible) {
    const actions = document.getElementById('trainVoiceActions'); if (actions) actions.hidden = !visible;
  }
  function arrive() {
    cancelTravel(); state = 'arriving';
    document.getElementById('voiceProgressBar').style.transition = 'none'; document.getElementById('trainIcon').style.transition = 'none'; showTrainActions(false);
    document.getElementById('trainVoiceStop').hidden = true;
    feedback(`«${selection}» дыбысы расталды. Пойыз жүріп келеді!`, `Звук «${selection}» подтверждён. Поезд едет!`);
    const from = currentProgress;
    let started = null; const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 150 : 2400;
    const step = now => {
      if (state !== 'arriving') return;
      if (started === null) started = now;
      const percent = Math.min(100,from + (100 - from) * (now - started) / duration); renderProgress(percent);
      if (percent < 100) travelFrame = requestAnimationFrame(step);
      else { travelFrame = requestAnimationFrame(() => {
        travelFrame = null; if (state !== 'arriving') return;
        state = 'complete'; feedback(`«${selection}» дыбысы расталды. Пойыз жетті! 🎉`, `Звук «${selection}» подтверждён. Поезд доехал! 🎉`,'success');
        showTrainActions(true);
        if (!rewardGiven) { rewardGiven = true; if (typeof window.showReward === 'function') window.showReward(); }
      }); }
    };
    travelFrame = requestAnimationFrame(step);
  }
  function chooseAnotherLetter() {
    cancelTravel(); session?.dispose(); selection = ''; state = 'idle'; restoreCircles(); feedback('',''); expand();
  }
  function selectVoiceLetter(letter) {
    selection = letter; state = 'selected'; restoreCircles();
    collapse();
    const container = document.getElementById('voiceGameContainer');
    container.querySelectorAll('.small-bubble').forEach(node => {
      node.setAttribute('aria-pressed', String(node.textContent === letter));
    });
    if (typeof window.playAlippeSoundLocal === 'function') window.playAlippeSoundLocal(letter);
    feedback('Үлгіні тыңдаңыз, содан кейін ортадағы батырманы басыңыз.', 'Послушайте образец, затем нажмите центральную кнопку.');
  }
  function initialize() {
    cancelTravel(); clearTimeout(menuTimer); clearTimeout(morphTimer);
    if (session) session.stop('reset');
    selection = ''; state = 'idle';
    const container = document.getElementById('voiceGameContainer');
    if (container) { container.classList.remove('expanded', 'hidden', 'voice-morphing'); container.querySelectorAll('.small-bubble').forEach(node => node.remove()); }
    restoreCircles(); feedback('', '');
    const center = document.getElementById('voiceCenterBtn');
    if (center) { center.setAttribute('role', 'button'); center.tabIndex = 0; center.setAttribute('aria-expanded', 'false'); }
  }
  function stopVoiceGame() {
    cancelTravel(); session?.stop('stopped'); state = selection ? 'selected' : 'idle'; restoreCircles();
  }
  function startVoicePractice() {
    if (!selection || !screen()?.classList.contains('active') || busy()) return;
    if (typeof window.stopAllAudio === 'function') window.stopAllAudio();
    cancelTravel(); session?.dispose(); rewardGiven = false; showTrainActions(false);
    const container = document.getElementById('voiceGameContainer');
    const train = document.getElementById('voiceTrainContainer');
    container.style.display = 'none'; train.style.display = 'block';
    document.getElementById('trainVoiceStop').hidden = false;
    const progress = document.getElementById('voiceProgressBar');
    progress.style.transition = 'none'; document.getElementById('trainIcon').style.transition = 'none';
    renderProgress(0);
    document.getElementById('trainVoiceEvidence').textContent = '';
    session = window.TrainPhonemeSession.create({
      letter: selection, mode,
      onState(value) {
        state = value;
        if (value === 'loading') feedback('Дыбысты тану моделі жүктелуде. Алғаш рет күту қажет...', 'Загружаем модель распознавания. Первый запуск требует ожидания...');
        if (value === 'checking') feedback('Дыбыс тексерілуде. Микрофон өшірілді...', 'Проверяем звук. Микрофон уже выключен...');
        if (value === 'requesting') feedback('Микрофонға рұқсат күтілуде...', 'Ожидаем разрешение микрофона...');
        if (value === 'listening') {
          const consonant = ['П','Б','Т','К'].includes(selection);
          feedback(consonant ? `«${selection}» дыбысын ${mode === 'short' ? 'бір рет' : 'үш рет'} айтыңыз (мысалы, пы-пы-пы).` : `«${selection}» дыбысын ${mode === 'short' ? 'қысқа' : '2 секунд созып'} айтыңыз.`, consonant ? `Произнесите «${selection}» ${mode === 'short' ? 'один раз' : 'три раза'} (например, пы-пы-пы).` : `Произнесите «${selection}» ${mode === 'short' ? 'коротко' : 'протяжно, 2 секунды'}.`);
        }
        if (value === 'complete') arrive();
        if (['error','timeout','incorrect'].includes(value)) { cancelTravel(); document.getElementById('trainVoiceStop').hidden = true; showTrainActions(true); }
        if (['stopped','hidden'].includes(value)) { cancelTravel(); restoreCircles(); }
      },
      // Travel begins only after selected-phoneme verification, never from arbitrary sound level.
      onProgress(result) {
        if (state === 'arriving' || state === 'complete') return;
        if (result.progress < 100) {
          progress.style.transition = 'width 350ms ease'; document.getElementById('trainIcon').style.transition = 'left 350ms ease';
          renderProgress(Math.max(currentProgress,result.progress));
        }
        const evidence = document.getElementById('trainVoiceEvidence');
        if (evidence) evidence.textContent = result.phase === 'signal' ? text('Сигнал тыңдалуда. Әріп әлі тексерілуде.','Слушаем сигнал. Буква ещё проверяется.') : text(`Танудың бағасы: ${result.score || 0}%`, `Оценка распознавания: ${result.score || 0}%`);
      },
      onResult(result) {
        const map = {p:'П',b:'Б',t:'Т',k:'К',a:'А',ɑ:'А',æ:'Ә',ɛ:'Ә',o:'О','oː':'О',ø:'Ө',œ:'Ө',ʊ:'Ұ',y:'Ү','yː':'Ү',ɯ:'Ы',ɨ:'Ы',ɪ:'І',ɘ:'І',u:'У','uː':'У',h:'Х',s:'С',ʃ:'Ш',m:'М',n:'Н',l:'Л',r:'Р',d:'Д',ɡ:'Г'};
        const heard = [...new Set(result.phones.map(phone => map[phone] || '…'))].join(', ');
        if (!result.correct) feedback(result.reason === 'different' ? `Модель ${heard} дыбысын таныды. «${selection}» дыбысы расталмады. Қайталап көріңіз.` : 'Таңдалған дыбыс анық расталмады немесе тым қысқа. Қайталап көріңіз.', result.reason === 'different' ? `Модель услышала: ${heard}. Звук «${selection}» не подтверждён. Попробуйте ещё раз.` : 'Выбранный звук не подтверждён или слишком короткий. Попробуйте ещё раз.', 'error');
      },
      onError(error) {
        const code = error.name || error.message;
        if (code === 'PhonemeModelUnavailable' || error.message?.includes('model') || error.message?.includes('fetch') || error.message?.includes('onnx')) { feedback('Тану моделі қолжетімсіз. Қайта жүктеп көріңіз.', 'Не удалось загрузить модель распознавания. Попробуйте ещё раз.', 'error'); return; }
        const denied = code === 'NotAllowedError' || code === 'PermissionDeniedError';
        if (code === 'MicrophoneTimeout') { feedback('Уақыт аяқталды. Қайталап көріңіз.', 'Время ожидания истекло. Попробуйте ещё раз.', 'error'); return; }
        feedback(denied ? 'Микрофонға рұқсат берілмеді. Рұқсат беріп, қайталаңыз.' : 'Микрофон қолжетімсіз немесе ажыратылды. Қайта қосып көріңіз.',
          denied ? 'Доступ к микрофону запрещён. Разрешите доступ и повторите.' : 'Микрофон недоступен или отключён. Подключите его и повторите.', 'error');
      }
    });
    void session.start();
  }
  function handleVoiceCenterClick() {
    if (state === 'expanded') { collapse(); state = 'idle'; restoreCircles(); }
    else if (state === 'idle') expand();
    else if (selection) startVoicePractice();
    else { initialize(); }
  }
  window.initVoiceGame = initialize;
  window.handleVoiceCenterClick = handleVoiceCenterClick;
  window.selectVoiceLetter = selectVoiceLetter;
  window.startVoicePractice = startVoicePractice;
  window.stopVoiceGame = stopVoiceGame;
  window.positionBubblesExpanded = positionBubbles;
  window.addEventListener('resize', positionBubbles);
  window.addEventListener('profile-language-change', initialize);
  document.addEventListener('DOMContentLoaded', () => {
    const voiceScreen = screen(); if (!voiceScreen) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('aria-hidden','true'); svg.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none';
    svg.innerHTML = '<defs><filter id="train-voice-goo" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/><feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 18 -7" result="goo"/><feBlend in="SourceGraphic" in2="goo"/></filter></defs>'; voiceScreen.appendChild(svg);
    const stop = document.createElement('button'); stop.id = 'trainVoiceStop'; stop.type = 'button'; stop.className = 'btn btn-secondary';
    const labelStop = () => { stop.textContent = text('⏹ Тоқтату', '⏹ Остановить'); };
    labelStop(); stop.hidden = true; stop.addEventListener('click', () => { stopVoiceGame(); feedback('Тоқтатылды. Қайта бастауға болады.', 'Остановлено. Можно повторить.'); });
    document.getElementById('voiceTrainContainer').appendChild(stop);
    const evidence = document.createElement('p'); evidence.id = 'trainVoiceEvidence'; evidence.className = 'instruction'; evidence.setAttribute('aria-live','polite'); document.getElementById('voiceTrainContainer').appendChild(evidence);
    const actions = document.createElement('div'); actions.id = 'trainVoiceActions'; actions.hidden = true;
    const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'btn'; retry.id = 'trainVoiceRetry'; retry.addEventListener('click',startVoicePractice);
    const choose = document.createElement('button'); choose.type = 'button'; choose.className = 'btn btn-secondary'; choose.id = 'trainVoiceChoose'; choose.addEventListener('click',chooseAnotherLetter);
    const labelActions = () => { retry.textContent = text('Қайталау','Повторить'); choose.textContent = text('Басқа әріп','Другая буква'); };
    labelActions(); actions.append(retry,choose); document.getElementById('voiceTrainContainer').appendChild(actions);
    window.addEventListener('profile-language-change',labelActions);
    const note = document.createElement('p'); note.id = 'trainVoiceNote'; note.className = 'instruction';
    const labelNote = () => { note.textContent = text('Таңдалған дыбыс құрылғыда тексеріледі. Модель қателесуі мүмкін; анық әрі тыныш жерде айтыңыз. Дауыс файлға жазылмайды және жіберілмейді.', 'Выбранный звук проверяется на устройстве. Модель может ошибаться; говорите отчётливо в тихом месте. Голос не сохраняется в файл и не отправляется.'); labelStop(); };
    labelNote(); document.getElementById('voiceFeedback').before(note);
    const controls = document.createElement('div'); controls.id = 'phonemeControls';
    const modeSelect = document.createElement('select'); modeSelect.id = 'phonemeMode';
    function labelControls() {
      modeSelect.replaceChildren();
      for (const [value, kk, ru] of [['short','Қысқа дыбыс','Короткий звук'],['long','Ұзақ дыбыс / 3 рет','Длинный звук / 3 повторения']]) { const option = document.createElement('option'); option.value = value; option.textContent = text(kk,ru); modeSelect.appendChild(option); } modeSelect.value = mode;
      modeSelect.setAttribute('aria-label', text('Дыбыс ұзақтығы','Длительность звука'));
    }
    modeSelect.addEventListener('change', () => { stopVoiceGame(); mode = modeSelect.value; });
    labelControls(); controls.append(modeSelect); controls.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin:12px 0';
    modeSelect.style.cssText = 'max-width:100%;padding:10px;border-radius:12px;color:#17213a;background:#fff';
    document.getElementById('voiceFeedback').before(controls);
    window.addEventListener('profile-language-change',labelControls);

    const center = document.getElementById('voiceCenterBtn');
    center.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleVoiceCenterClick(); } });
    window.addEventListener('profile-language-change', labelNote);
    const observer = new MutationObserver(() => { if (!voiceScreen.classList.contains('active')) stopVoiceGame(); else if (!busy()) initialize(); });
    observer.observe(voiceScreen, {attributes:true,attributeFilter:['class']});
    initialize();
  });
})();
