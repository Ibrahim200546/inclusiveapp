(function () {
  'use strict';
  const data = window.CorexLearning;
  if (!data) return;
  const text = (kk, ru) => window.getProfileLang?.() === 'ru' ? ru : kk;
  const labels = {
    numbers: ['Санды тап', 'Найди число', '🔢'], count: ['Неше рет естідің?', 'Сколько сигналов?', '👏'],
    rhythm: ['Ырғақты таңда', 'Выбери ритм', '🥁'], tempo: ['Тез / Баяу', 'Быстро / Медленно', '⏱️'], pitch: ['Дыбыс биіктігі', 'Высота звука', '🎵'],
  };
  let mode = 'numbers', grade = 0, session, audio, audioContext, generation = 0, playing = false, context = 'breathing';
  let screen, hub, ui, choices = [], saved = false, heardSyllables = false, syllableToken = 0;
  const localized = [];
  const gradeControls = [];
  const stops = new Set();
  function button(label, action, className = 'btn btn-secondary') {
    const node = document.createElement('button'); node.type = 'button'; node.className = className;
    const setLabel = () => { node.textContent = typeof label === 'function' ? label() : label; };
    setLabel(); if (typeof label === 'function') localized.push(setLabel);
    node.addEventListener('click', action); return node;
  }
  function gradePicker() {
    const label = document.createElement('label'), caption = document.createTextNode(''), select = document.createElement('select');
    for (const value of [0, 1]) { const option = document.createElement('option'); option.value = String(value); option.textContent = String(value); select.append(option); }
    const update = () => { caption.nodeValue = text('Сынып: ', 'Класс: '); select.setAttribute('aria-label', text('Сынып', 'Класс')); select.value = String(grade); };
    localized.push(update); gradeControls.push(select); update();
    select.addEventListener('change', () => {
      grade = Number(select.value); gradeControls.forEach(node => { node.value = String(grade); });
      heardSyllables = false; syllableToken++; window.tynsbyStopPlay2?.();
      const result = document.querySelector('.learning-context-progress'); if (result) result.textContent = '';
    });
    label.append(caption, select); return label;
  }
  function stop() {
    generation++; playing = false;
    for (const cancel of stops) cancel(); stops.clear();
    if (audio) { audio.pause(); audio.currentTime = 0; audio = null; }
    if (audioContext) { void audioContext.close().catch(() => {}); audioContext = null; }
    if (ui) ui.listen.disabled = false;
  }
  function learnerKey() {
    const learner = typeof currentUserId === 'string' && currentUserId ? currentUserId : 'guest';
    return 'eduCorex.learning.v1:' + learner;
  }
  function record(objective, result) {
    try {
      const key = learnerKey(); let previous;
      try { previous = JSON.parse(localStorage.getItem(key) || '{}'); } catch { previous = {}; }
      if (!previous || typeof previous !== 'object' || Array.isArray(previous)) previous = {};
      const table = objective === 'syllable-reading-2' ? (grade === 0 ? 6 : 8) : (grade === 0 ? 5 : 7);
      previous[data.progressKey(grade, context, objective, table)] = { ...result, grade, table, context, objective, updatedAt: new Date().toISOString() };
      localStorage.setItem(key, JSON.stringify(previous));
      return true;
    } catch { return false; }
  }
  function playFile(path) {
    return new Promise((resolve, reject) => {
      const candidate = new Audio(path); audio = window.trackAudio?.(candidate) || candidate;
      let settled = false;
      function finish(error) {
        if (settled) return; settled = true; clearTimeout(timer);
        candidate.removeEventListener('ended', ended); candidate.removeEventListener('error', failed); stops.delete(cancel);
        error ? reject(error) : resolve();
      }
      const ended = () => finish(), failed = () => finish(new Error('Audio unavailable')), cancel = () => finish(new Error('Cancelled'));
      const timer = setTimeout(() => finish(new Error('Audio timeout')), 15000);
      candidate.addEventListener('ended', ended, { once: true }); candidate.addEventListener('error', failed, { once: true }); stops.add(cancel);
      candidate.play().catch(finish);
    });
  }
  async function playEvents(events) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)(); audioContext = ctx;
    await ctx.resume(); if (audioContext !== ctx) return;
    return new Promise(resolve => {
      const start = ctx.currentTime + .05;
      for (const event of events) {
        const oscillator = ctx.createOscillator(), gain = ctx.createGain();
        oscillator.frequency.value = event.frequency;
        gain.gain.setValueAtTime(0, start + event.start);
        gain.gain.linearRampToValueAtTime(.12, start + event.start + .01);
        gain.gain.setValueAtTime(.12, start + event.start + event.duration - .02);
        gain.gain.linearRampToValueAtTime(0, start + event.start + event.duration);
        oscillator.connect(gain).connect(ctx.destination); oscillator.start(start + event.start); oscillator.stop(start + event.start + event.duration);
      }
      let settled = false;
      const finish = () => { if (settled) return; settled = true; clearTimeout(timer); stops.delete(finish); resolve(); };
      const end = Math.max(...events.map(event => event.start + event.duration));
      const timer = setTimeout(finish, (end + .1) * 1000); stops.add(finish);
    });
  }
  async function listen() {
    stop(); const token = generation, item = session?.current;
    if (!item) return;
    playing = true; ui.listen.disabled = true; ui.feedback.textContent = text('Тыңдаңыз…', 'Слушайте…');
    setChoicesDisabled(true);
    try {
      if (mode === 'numbers') await playFile(window.getProfileLang?.() === 'ru' ? item.audioRu : item.audio);
      else await playEvents(item.events);
      if (generation !== token) return;
      playing = false; session.markHeard(); ui.listen.disabled = false; setChoicesDisabled(session.state.answered);
      ui.feedback.textContent = text('Жауапты таңдаңыз.', 'Выберите ответ.');
    } catch {
      if (generation !== token) return;
      playing = false; ui.listen.disabled = false; setChoicesDisabled(true);
      ui.feedback.textContent = text('Дыбыс жүктелмеді. «Қайта тыңдау» батырмасын басыңыз.', 'Звук не загрузился. Нажмите «Слушать ещё раз».');
    }
  }
  function setChoicesDisabled(disabled) {
    [...ui.answers.querySelectorAll('button:not(.radial-center-btn)'), ...ui.samples.querySelectorAll('button')].forEach(node => { node.disabled = disabled; });
  }
  function answer(value, node) {
    if (playing) return;
    const verdict = session.answer(value);
    if (!verdict.accepted) return;
    ui.feedback.textContent = verdict.correct ? text('✓ Дұрыс!', '✓ Правильно!') : text('↻ Қайта көр. Сол дыбысты қайта тыңдауға болады.', '↻ Попробуйте ещё раз. Можно повторить тот же звук.');
    if (verdict.correct) { node.setAttribute('aria-pressed', 'true'); setChoicesDisabled(true); ui.next.disabled = false; }
  }
  async function compareRhythm(item) {
    stop(); const token = generation; playing = true; setChoicesDisabled(true);
    ui.feedback.textContent = text('Үлгіні тыңдаңыз…', 'Послушайте образец…');
    try {
      await playEvents(item.events);
      if (generation !== token) return;
      playing = false; setChoicesDisabled(session.state.answered || !session.state.heard);
      ui.feedback.textContent = text('Естіген ырғаққа сәйкес жауапты таңдаңыз.', 'Выберите ответ, совпадающий с целевым ритмом.');
    } catch {
      if (generation !== token) return;
      playing = false; setChoicesDisabled(session.state.answered || !session.state.heard);
      ui.feedback.textContent = text('Үлгі ойнатылмады. Қайталап көріңіз.', 'Не удалось проиграть образец. Повторите.');
    }
  }
  function renderRound() {
    stop(); ui.next.disabled = true; ui.answers.replaceChildren(); ui.samples.replaceChildren(); ui.summary.hidden = true; ui.feedback.textContent = '';
    ui.title.textContent = text(...labels[mode]); ui.drawing.hidden = mode !== 'numbers';
    const state = session.state;
    ui.next.disabled = !state.answered;
    ui.counter.textContent = (state.complete ? state.total : state.index + 1) + ' / ' + state.total;
    ui.listen.hidden = state.complete; ui.next.hidden = state.complete;
    ui.samples.hidden = mode !== 'rhythm' || state.complete;
    if (state.complete) {
      const firstCompletion = !saved;
      const persisted = saved || record(mode, { completed: state.total, attempts: state.attempts, results: state.results }); saved = true;
      ui.summary.hidden = false; ui.summary.textContent = text(`Орындалды: ${state.total}. Әрекет саны: ${state.attempts}.`, `Выполнено: ${state.total}. Попыток: ${state.attempts}.`);
      if (!persisted) ui.summary.textContent += text(' Нәтиже осы экранда ғана көрсетіледі.', 'Результат доступен только на этом экране.');
      if (firstCompletion) window.showReward?.(); return;
    }
    ui.listen.textContent = text('🔊 Қайта тыңдау', '🔊 Слушать ещё раз');
    const available = mode === 'numbers' ? data.numbers.map(item => ({ value: item.answer, label: String(item.answer) }))
      : mode === 'count' ? [1, 2, 3].map(value => ({ value, label: String(value) }))
      : mode === 'pitch' ? [{ value: 'low', label: text('Төмен', 'Низкий') }, { value: 'mid', label: text('Орташа', 'Средний') }, { value: 'high', label: text('Жоғары', 'Высокий') }]
      : mode === 'tempo' ? [{ value: 'fast', label: text('Тез', 'Быстро') }, { value: 'slow', label: text('Баяу', 'Медленно') }]
      : [{ value: 'one', label: 'ТА' }, { value: 'two', label: 'ТА–ТА' }];
    choices = data.shuffle(available);
    ui.answers.className = mode === 'numbers' ? 'learning-number-grid' : 'learning-sound-options exercise-picture-orbit';
    for (const choice of choices) {
      const node = button(choice.label, () => answer(choice.value, node), ''); node.disabled = true;
      node.dataset.answer = String(choice.value);
      node.setAttribute('aria-pressed', String(state.answered && choice.value === session.current.answer));
      if (mode === 'numbers') {
        node.setAttribute('aria-label', choice.label); node.dataset.number = String(choice.value);
        const accessible = document.createElement('span'); accessible.className = 'exercise-sr-only'; accessible.textContent = choice.label;
        node.replaceChildren(window.CorexExerciseOrbit.number(choice.value), accessible);
        node.style.setProperty('--ink-tilt', (Math.random() * 12 - 6) + 'deg');
      }
      if (mode !== 'numbers') {
        const icon = mode === 'count' ? '👏' : mode === 'rhythm' ? '🥁' : mode === 'tempo' ? (choice.value === 'fast' ? '🐇' : '🐢')
          : { low: '⬇️', mid: '↔️', high: '⬆️' }[choice.value];
        window.CorexExerciseOrbit.illustrate(node, icon, choice.label);
      }
      ui.answers.append(node);
      if (mode === 'rhythm') {
        const sample = data.soundItems('rhythm').find(item => item.answer === choice.value);
        const listenSample = button('🔊 ' + choice.label, () => { void compareRhythm(sample); });
        listenSample.setAttribute('aria-label', text('Үлгіні тыңдау: ', 'Послушать образец: ') + choice.label);
        listenSample.disabled = true; ui.samples.append(listenSample);
      }
    }
    window.CorexExerciseOrbit.layout(ui.answers, text(...labels[mode]), { scattered: mode === 'numbers' });
    ui.feedback.textContent = state.answered ? text('✓ Дұрыс!', '✓ Правильно!') : text('Тыңда да, таңда.', 'Послушайте и выберите.');
  }
  function open(kind) {
    mode = kind; context = 'listening'; saved = false;
    session = data.create(kind === 'numbers' ? data.numbers : data.soundItems(kind));
    window.showScreen('learningPracticeScreen'); renderRound(); void listen();
  }
  function radialItem(menu, icon, label, action) {
    const distance = menu.querySelector(':scope > .radial-item')?.style.getPropertyValue('--dist') || '220px';
    const node = button('', action, 'radial-item'), symbol = document.createElement('div'), caption = document.createElement('p');
    symbol.textContent = icon;
    const setLabel = () => { caption.textContent = typeof label === 'function' ? label() : label; };
    setLabel(); if (typeof label === 'function') localized.push(setLabel);
    node.append(symbol, caption); menu.append(node);
    const items = [...menu.querySelectorAll(':scope > .radial-item')];
    items.forEach((item, index) => { item.style.setProperty('--angle', (index * 360 / items.length - 90) + 'deg'); item.style.setProperty('--dist', distance); });
    return node;
  }
  function updateSyllableContext() {
    const bar = document.getElementById('learningSyllableContext'); if (!bar) return;
    bar.querySelector('p').textContent = context === 'voice' ? text('Үлгіні тыңдаңыз. Буындарды анық дауыспен қайталаңыз.', 'Послушайте образец. Повторите слоги отчётливым голосом.')
      : context === 'sounds' ? text('Буындарды тыңдап, дыбыстарды анық қайталаңыз.', 'Послушайте слоги и отчётливо повторите звуки.')
      : text('Буындарды бір деммен айтыңыз. Қиналсаңыз, тоқтап, демалыңыз.', 'Произнесите слоги на одном выдохе. Если трудно, остановитесь и отдохните.');
  }
  function initialize() {
    screen = document.createElement('div'); screen.id = 'learningPracticeScreen'; screen.className = 'screen';
    const wrap = document.createElement('div'); wrap.className = 'learning-wrap';
    const title = document.createElement('h2'), counter = document.createElement('p'), feedback = document.createElement('p'), answers = document.createElement('div'), summary = document.createElement('div');
    const samples = document.createElement('div'); samples.className = 'learning-rhythm-samples'; samples.hidden = true;
    feedback.className = 'learning-feedback'; feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite'); summary.className = 'learning-summary';
    const actions = document.createElement('div'); actions.className = 'learning-actions';
    const listenButton = button('', () => { void listen(); }), next = button(() => text('Келесі', 'Далее'), () => { if (session.next()) { renderRound(); if (session.current) void listen(); } });
    const restart = button(() => text('Қайта бастау', 'Начать заново'), () => { session.restart(); saved = false; renderRound(); void listen(); });
    const back = button(() => text('⬅ Артқа', '⬅ Назад'), () => window.showScreen('learningHubScreen'));
    const drawing = document.createElement('details'); drawing.className = 'learning-drawing';
    const drawingTitle = document.createElement('summary'), hint = document.createElement('p'), canvas = document.createElement('canvas');
    const localizeDrawing = () => {
      drawingTitle.textContent = text('✍ Цифрды жазып көр', '✍ Попробуй написать цифру');
      hint.textContent = text('Саусақпен немесе тінтуірмен жазыңыз. Жауапты жоғарыдағы цифрдан таңдаңыз.', 'Рисуйте пальцем или мышью. Ответ выбирайте среди цифр выше.');
      canvas.setAttribute('aria-label', text('Цифр жазуға арналған орын', 'Область для рисования цифр'));
    }; localizeDrawing(); localized.push(localizeDrawing);
    canvas.width = 640; canvas.height = 260; let previousPoint = null;
    const point = event => { const bounds = canvas.getBoundingClientRect(); return { x: (event.clientX - bounds.left) * canvas.width / bounds.width, y: (event.clientY - bounds.top) * canvas.height / bounds.height }; };
    canvas.addEventListener('pointerdown', event => {
      if (event.button !== 0) return; canvas.setPointerCapture(event.pointerId); previousPoint = point(event);
      const ctx = canvas.getContext('2d'); ctx.fillStyle = getComputedStyle(canvas).color; ctx.beginPath(); ctx.arc(previousPoint.x, previousPoint.y, 3, 0, Math.PI * 2); ctx.fill();
    });
    canvas.addEventListener('pointermove', event => {
      if (!previousPoint || !canvas.hasPointerCapture(event.pointerId)) return;
      const nextPoint = point(event), ctx = canvas.getContext('2d'); ctx.strokeStyle = getComputedStyle(canvas).color; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(previousPoint.x, previousPoint.y); ctx.lineTo(nextPoint.x, nextPoint.y); ctx.stroke(); previousPoint = nextPoint;
    });
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(event, () => { previousPoint = null; });
    drawing.append(drawingTitle, hint, canvas, button(() => text('Тазалау', 'Очистить'), () => canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)));
    actions.append(listenButton, next, restart, back); wrap.append(title, counter, answers, samples, feedback, summary, actions, drawing); screen.append(wrap);
    ui = { title, counter, feedback, answers, summary, listen: listenButton, next, drawing, samples }; document.querySelector('#grade0Menu').parentElement.append(screen);
    hub = document.createElement('div'); hub.id = 'learningHubScreen'; hub.className = 'screen';
    const flex = document.createElement('div'); flex.className = 'task-flex-container';
    const content = document.createElement('div'); content.className = 'task-content-wrapper';
    const menu = document.createElement('div'); menu.className = 'radial-menu-container active';
    menu.append(button(() => text('Тыңдап үйрен', 'Слушай и учись'), event => window.toggleRadialGradeMenu(event.currentTarget), 'radial-center-btn'));
    for (const kind of Object.keys(labels)) radialItem(menu, labels[kind][2], () => text(...labels[kind]), () => open(kind));
    const navigation = document.createElement('div'); navigation.className = 'learning-hub-nav';
    navigation.append(button(() => text('⬅ Артқа', '⬅ Назад'), () => window.showScreen('grade0Menu')));
    content.append(navigation, menu); flex.append(content); hub.append(flex); screen.after(hub);
    radialItem(document.querySelector('#grade0Menu .radial-menu-container'), '🔢', () => text('Тыңдап үйрен', 'Слушай и учись'), () => window.showScreen('learningHubScreen'));
    for (const [id, kind] of [['grade0DauyspenmMenu', 'voice'], ['grade0VoiceMenu', 'voice'], ['grade0SoundsMenu', 'sounds']]) {
      const parent = document.querySelector('#' + id + ' .radial-menu-container'); if (!parent) continue;
      const enter = () => { context = kind; heardSyllables = false; syllableToken++; syllableReturn = id; window.showScreen('g0TynysByTask2'); updateSyllableContext(); };
      if (id === 'grade0SoundsMenu') {
        // Keep the existing two sound rings intact; a thirteenth orbit item
        // would crowd their labels on a phone.
        const reading = button(() => '🎓 ' + text('Буындап оқу', 'Чтение по слогам'), enter);
        reading.classList.add('learning-shared-reading'); parent.before(reading);
      } else radialItem(parent, '🎓', () => text('Буындап оқу', 'Чтение по слогам'), enter);
    }
    const originalBack = document.querySelector('#g0TynysByTask2 button[onclick*="grade0TynysByMenu"]');
    if (originalBack) { originalBack.removeAttribute('onclick'); originalBack.addEventListener('click', () => { window.tynsbyStopPlay2?.(); window.showScreen(syllableReturn); }); }
    const bar = document.createElement('div'); bar.id = 'learningSyllableContext'; bar.className = 'learning-context-bar'; bar.append(document.createElement('p'), gradePicker());
    bar.append(button(() => text('⏹ Тоқтату', '⏹ Остановить'), () => window.tynsbyStopPlay2?.()));
    bar.append(button(() => text('Қайта бастау', 'Начать заново'), () => { heardSyllables = false; syllableToken++; result.textContent = ''; window.tynsbyGenerate2?.(); }));
    const result = document.createElement('p'); result.className = 'learning-context-progress'; result.setAttribute('role', 'status');
    bar.append(button(() => text('Педагог: қайталады', 'Педагог: повторил'), () => {
      if (!heardSyllables) { result.textContent = text('Алдымен үлгіні тыңдаңыз.', 'Сначала прослушайте образец.'); return; }
      const persisted = record('syllable-reading-2', { listened: true, repeatedWithTeacher: true, sample: document.getElementById('tynsbyInput2').value });
      result.textContent = persisted ? text('✓ Педагог белгісі сақталды.', '✓ Отметка педагога сохранена.') : text('✓ Қайталанды. Нәтиже осы экранда.', '✓ Повторено. Результат на этом экране.');
    })); bar.append(result); document.getElementById('tynsbyWrap2').prepend(bar); updateSyllableContext();
    const priorPlay = window.tynsbyPlayAudioUrl2;
    const priorAudioUrl = window.tynsbyGetYandexAudioUrl2;
    const presetFiles = { 'ТА': 'ta', 'МА': 'ma', 'КО': 'ko', 'РА': 'ra', 'ЛА': 'la' };
    window.tynsbyGetYandexAudioUrl2 = function (syllable) {
      const file = presetFiles[String(syllable).toUpperCase()];
      return file ? Promise.resolve('sounds/syllable-reading/' + file + '.mp3') : priorAudioUrl(syllable);
    };
    window.tynsbyPlayAudioUrl2 = async function (...args) {
      const token = syllableToken, played = await priorPlay.apply(this, args);
      if (played && token === syllableToken && document.getElementById('g0TynysByTask2').classList.contains('active') && !heardSyllables) {
        heardSyllables = true;
        record('syllable-reading-2', { listened: true, repeatedWithTeacher: false, sample: document.getElementById('tynsbyInput2').value });
        result.textContent = text('✓ Үлгі тыңдалды. Енді қайталаңыз.', '✓ Образец прослушан. Теперь повторите.');
      }
      return played;
    };
    const invalidate = () => { heardSyllables = false; syllableToken++; result.textContent = ''; };
    document.getElementById('tynsbyInput2').addEventListener('input', invalidate);
    document.getElementById('tynsbyPresets2').addEventListener('click', invalidate, true);
    const previousShow = window.showScreen;
    window.showScreen = function (id) {
      stop();
      if (id === 'g0TynysByTask2' && !['grade0DauyspenmMenu', 'grade0VoiceMenu', 'grade0SoundsMenu'].includes(document.querySelector('.screen.active')?.id)) {
        context = 'breathing'; syllableReturn = 'grade0TynysByMenu'; heardSyllables = false;
      }
      if (id !== 'g0TynysByTask2') { syllableToken++; window.tynsbyStopPlay2?.(); }
      const result = previousShow(id); updateSyllableContext(); return result;
    };
    let lastLanguage = window.getProfileLang?.() || 'kk';
    window.addEventListener('profile-language-change', () => {
      const language = window.getProfileLang?.() || 'kk';
      // Existing navigation reapplies the same language after every screen change.
      if (language === lastLanguage) return;
      lastLanguage = language;
      stop(); invalidate(); window.tynsbyStopPlay2?.(); localized.forEach(update => update()); updateSyllableContext();
      if (screen.classList.contains('active')) renderRound();
    });
    window.addEventListener('pagehide', stop); document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  }
  let syllableReturn = 'grade0TynysByMenu';
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize); else initialize();
})();
