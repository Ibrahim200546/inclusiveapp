(function () {
  'use strict';
  const text = (kk, ru) => window.getProfileLang?.() === 'ru' ? ru : kk;
  const labels = {
    numbers: ['Санды тап', 'Найди число', '🔢'], count: ['Неше рет естідің?', 'Сколько сигналов?', '👏'],
    rhythm: ['Ырғақты таңда', 'Выбери ритм', '🥁'], tempo: ['Тез / Баяу', 'Быстро / Медленно', '⏱️'], pitch: ['Дыбыс биіктігі', 'Высота звука', '🎵'],
  };
  let grade = 0, context = 'breathing';
  let heardSyllables = false, syllableToken = 0;
  const localized = [];
  const gradeControls = [];
  let juniorGrade = 0;
  const grades = window.CorexGrades = {
    recordListening(objective, detail) { return record(objective, detail, 'listening'); },
    get current() { return grade; },
    get parent() { return 'grade' + (grade < 2 ? 0 : grade) + 'Menu'; },
  };
  function selectGrade(value) {
    if (value < 2) juniorGrade = value;
    gradeControls.forEach(node => { node.value = String(juniorGrade); });
    if (value === grade) return;
    grade = value;
    window.dispatchEvent(new Event('learning-grade-change'));
  }
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
      selectGrade(Number(select.value));
      heardSyllables = false; syllableToken++; window.tynsbyStopPlay2?.();
      const result = document.querySelector('.learning-context-progress'); if (result) result.textContent = '';
    });
    label.append(caption, select); return label;
  }
  // Listening sessions, playback and progress now belong to the React application.
  function record(objective, result, recordContext = context) {
    return window.practiceListening.saveProgress(grade, recordContext, objective, result);
  }
  function open(kind) { window.practiceListening.open(kind); }
  function radialItem(menu, icon, label, action) {
    const distance = menu.querySelector(':scope > .radial-item')?.style.getPropertyValue('--dist') || '220px';
    const node = button('', action, 'radial-item'), symbol = document.createElement('div'), caption = document.createElement('p');
    symbol.textContent = icon; symbol.setAttribute('aria-hidden', 'true');
    const setLabel = () => {
      caption.textContent = typeof label === 'function' ? label() : label;
      node.setAttribute('aria-label', caption.textContent);
    };
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
    const screen = document.getElementById('learningPracticeScreen');
    const hub = document.createElement('div'); hub.id = 'learningHubScreen'; hub.className = 'screen';
    const flex = document.createElement('div'); flex.className = 'task-flex-container';
    const content = document.createElement('div'); content.className = 'task-content-wrapper';
    const menu = document.createElement('div'); menu.className = 'radial-menu-container active';
    menu.append(button(() => text('Тыңдап үйрен', 'Слушай и учись'), event => window.toggleRadialGradeMenu(event.currentTarget), 'radial-center-btn'));
    for (const kind of Object.keys(labels)) radialItem(menu, labels[kind][2], () => text(...labels[kind]), () => open(kind));
    const gradeChoice = gradePicker(); gradeChoice.className = 'junior-grade-picker';
    const gradeMenu = document.querySelector('#grade0Menu .radial-menu-container'); gradeMenu.before(gradeChoice);
    const navigation = document.createElement('div'); navigation.className = 'learning-hub-nav';
    navigation.append(button(() => text('⬅ Артқа', '⬅ Назад'), () => window.showScreen('grade0Menu')));
    navigation.append(gradePicker()); content.append(navigation, menu); flex.append(content); hub.append(flex); screen.after(hub);
    radialItem(document.querySelector('#grade0Menu .radial-menu-container'), '🔢', () => text('Тыңдап үйрен', 'Слушай и учись'), () => window.showScreen('learningHubScreen'));
    for (const [id, kind] of [['grade0DauyspenmMenu', 'voice'], ['grade0VoiceMenu', 'voice']]) {
      const parent = document.querySelector('#' + id + ' .radial-menu-container'); if (!parent) continue;
      const enter = () => { context = kind; heardSyllables = false; syllableToken++; syllableReturn = id; window.showScreen('g0TynysByTask2'); updateSyllableContext(); };
      radialItem(parent, '🎓', () => text('Буындап оқу', 'Чтение по слогам'), enter);
    }
    const originalBack = document.querySelector('#g0TynysByTask2 button[onclick*="grade0TynysByMenu"]');
    if (originalBack) { originalBack.removeAttribute('onclick'); originalBack.addEventListener('click', () => { window.tynsbyStopPlay2?.(); window.showScreen(syllableReturn); }); }
    const bar = document.createElement('div'); bar.id = 'learningSyllableContext'; bar.className = 'learning-context-bar'; bar.append(document.createElement('p'), gradePicker());
    bar.append(button(() => text('⏹ Тоқтату', '⏹ Остановить'), () => window.tynsbyStopPlay2?.()));
    bar.append(button(() => text('Қайта бастау', 'Начать заново'), () => { heardSyllables = false; syllableToken++; result.textContent = ''; window.tynsbyGenerate2?.(); }));
    const result = document.createElement('p'); result.className = 'learning-context-progress'; result.setAttribute('role', 'status');
    bar.append(button(() => text('Педагог: қайталады', 'Педагог: повторил'), () => {
      if (!heardSyllables) { result.textContent = text('Алдымен үлгіні тыңдаңыз.', 'Сначала прослушайте образец.'); return; }
      const persisted = record('syllable-reading-2', { listened: true, repeatedWithTeacher: true, sample: lastSample });
      result.textContent = persisted ? text('✓ Педагог белгісі сақталды.', '✓ Отметка педагога сохранена.') : text('✓ Қайталанды. Нәтиже осы экранда.', '✓ Повторено. Результат на этом экране.');
    })); bar.append(result); document.getElementById('tynsbyWrap2').prepend(bar); updateSyllableContext();
    const priorPlay = window.tynsbyPlayAudioUrl2;
    const priorAudioUrl = window.tynsbyGetYandexAudioUrl2;
    const presetFiles = { 'ТА': 'ta', 'МА': 'ma', 'КО': 'ko', 'РА': 'ra', 'ЛА': 'la' };
    window.tynsbyGetYandexAudioUrl2 = function (syllable) {
      if (String(syllable).toUpperCase() === 'ПА') return Promise.resolve('sounds/curriculum/2d38fc570da73b5ba98a.mp3');
      const file = presetFiles[String(syllable).toUpperCase()];
      return file ? Promise.resolve('sounds/syllable-reading/' + file + '.mp3') : priorAudioUrl(syllable);
    };
    window.tynsbyPlayAudioUrl2 = async function (...args) {
      const token = syllableToken, played = await priorPlay.apply(this, args);
      if (played && token === syllableToken && document.getElementById('g0TynysByTask2').classList.contains('active') ) {
        lastSample = args[2] || document.getElementById('tynsbyInput2').value;
        heardSyllables = true;
        record('syllable-reading-2', { listened: true, repeatedWithTeacher: false, sample: lastSample });
        result.textContent = text('✓ Үлгі тыңдалды. Енді қайталаңыз.', '✓ Образец прослушан. Теперь повторите.');
      }
      return played;
    };
    const invalidate = () => { heardSyllables = false; syllableToken++; result.textContent = ''; };
    document.getElementById('tynsbyInput2').addEventListener('input', invalidate);
    document.getElementById('tynsbyPresets2').addEventListener('click', invalidate, true);
    window.practiceNavigationHooks.push({
      name: 'learning-work',
      prepare({ from, to }) {
        const match = /^grade([0234])Menu$/.exec(to);
        if (match) selectGrade(match[1] === '0' ? juniorGrade : Number(match[1]));
        if (to === 'g0TynysByTask2' && !['grade0DauyspenmMenu', 'grade0VoiceMenu', 'grade0SoundsMenu'].includes(from)) {
          context = 'breathing'; syllableReturn = 'grade0TynysByMenu'; heardSyllables = false;
        }
        if (to !== 'g0TynysByTask2') { syllableToken++; window.tynsbyStopPlay2?.(); }
      },
      enter: updateSyllableContext,
    });
    let lastLanguage = window.getProfileLang?.() || 'kk';
    window.addEventListener('profile-language-change', () => {
      const language = window.getProfileLang?.() || 'kk';
      // Existing navigation reapplies the same language after every screen change.
      if (language === lastLanguage) return;
      lastLanguage = language;
      invalidate(); window.tynsbyStopPlay2?.(); localized.forEach(update => update()); updateSyllableContext();
    });
  }
  let lastSample = '';
  let syllableReturn = 'grade0TynysByMenu';
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize); else initialize();
})();
