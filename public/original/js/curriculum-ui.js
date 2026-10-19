(function () {
  'use strict';
  const content = window.CorexCurriculumContent, engine = window.CorexCurriculum;
  if (!content || !engine) return;
  const tr = (kk, ru) => window.getProfileLang?.() === 'ru' ? ru : kk;
  const categories = { comprehension: ['Түсіну', 'Понимание'], phonetics: ['Дыбыстар', 'Звуки'], speech: ['Сөйлеу', 'Речь'], math: ['Математика', 'Математика'], sentence: ['Сөйлем', 'Предложение'] };
  let grade = 0, category = 'comprehension', parent = 'grade0Menu', lesson, session, catalog, practice, grid, tabs, heading, gradeSelect;
  let playback = null, playToken = 0, pending = null, playing = false, pausedByUser = false, rewarded = false, participation = 'together', active = false, options = [];
  let language = window.getProfileLang?.() || 'kk';
  let catalogPage = 0, catalogPager, catalogLegend, orderSelection;
  const ui = {}, entries = [];
  function node(tag, text, className) {
    const result = document.createElement(tag); if (text !== undefined) result.textContent = text; if (className) result.className = className; return result;
  }
  function button(label, action, className = 'btn btn-secondary') {
    const result = node('button', label, className); result.type = 'button'; result.addEventListener('click', action); return result;
  }
  function lessonIcon(item) {
    const icons = { 'one-breath': '🌬️', 'voice-strength': '🔊', 'word-stress': '🎯', 'logical-stress': '🗣️', 'g4-syntagms': '⏸️' };
    if (icons[item.id]) return icons[item.id];
    const subjects = [[/school|familiar-6/, '🏫'], [/walk/, '🌳'], [/apple/, '🍎'], [/pencil/, '✏️'], [/library|familiar-8|familiar-10/, '📚'], [/shop/, '🏪'], [/unfamiliar-9/, '🐦'], [/unfamiliar-5/, '🧤'], [/unfamiliar-11/, '🌱'], [/extended-14/, '🧹'], [/disputed-15/, '🖼️'], [/extended-15/, '💧'], [/complex-8/, '🗓️'], [/intonation/, '🎶'], [/division/, '➗'], [/times-/, '✖️'], [/comparison/, '⚖️']];
    return subjects.find(([pattern]) => pattern.test(item.id))?.[1] || { comprehension: '📖', phonetics: '🔤', speech: '🗣️', math: '🧮', sentence: '📝' }[item.category] || '📚';
  }
  function answerIcon(label) {
    const subjects = [[/мектеп/i, '🏫'], [/дүкен/i, '🏪'], [/кітап/i, '📚'], [/қалам/i, '✏️'], [/алма/i, '🍎'], [/құс/i, '🐦'], [/^(су|суды)(?:\s|$)/i, '💧']];
    return subjects.find(([pattern]) => pattern.test(label))?.[1] || (/^[\d\s+−×÷=<>–-]+$/.test(label) ? '🧮' : label.length <= 6 ? '🔤' : '📝');
  }
  function illustrate(control, illustration, caption) {
    return window.CorexExerciseOrbit.illustrate(control, illustration, caption, { iconClass: 'curriculum-orbit-icon', captionClass: 'curriculum-orbit-caption' });
  }
  function pictureOrbit(menu, title) {
    menu.classList.add('exercise-picture-orbit'); window.CorexExerciseOrbit.layout(menu, title);
  }
  function stop() {
    playToken++; playing = false; pausedByUser = false;
    if (playback) { playback.pause(); playback.currentTime = 0; playback = null; }
    if (pending) { const finish = pending; pending = null; finish(false); }
    refreshControls();
  }
  function top() { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }
  async function play(path, isModel) {
    stop(); const token = playToken; playing = true; refreshControls();
    ui.feedback.textContent = tr('Тыңдаңыз…', 'Слушайте…');
    const candidate = new Audio(path); playback = window.trackAudio?.(candidate) || candidate; refreshControls();
    let interrupted = false;
    const completed = await new Promise(resolve => {
      let settled = false;
      const finish = success => {
        if (settled) return; settled = true; clearInterval(timeout); candidate.removeEventListener('ended', ended); candidate.removeEventListener('error', failed);
        candidate.removeEventListener('play', registered); candidate.removeEventListener('pause', paused);
        if (pending === finish) pending = null; resolve(success);
      };
      const ended = () => finish(true), failed = () => finish(false);
      const registered = () => { if (Array.isArray(window._activeAudios) && !window._activeAudios.includes(candidate)) window._activeAudios.push(candidate); };
      const paused = () => {
        if (candidate.paused && !candidate.ended && !pausedByUser && token === playToken) { interrupted = true; finish(false); }
      };
      let lastTime = -1, lastAdvance = Date.now();
      const timeout = setInterval(() => {
        if (pausedByUser || candidate.currentTime !== lastTime) { lastTime = candidate.currentTime; lastAdvance = Date.now(); }
        else if (Date.now() - lastAdvance > 30000) finish(false);
      }, 2000);
      pending = finish; candidate.addEventListener('ended', ended, { once: true }); candidate.addEventListener('error', failed, { once: true });
      candidate.addEventListener('play', registered); candidate.addEventListener('pause', paused);
      candidate.play().then(() => { if (token === playToken) refreshControls(); }).catch(failed);
    });
    if (token !== playToken || !active) return;
    playing = false;
    if (completed) {
      if (isModel) session.hear();
      ui.feedback.textContent = session.state.solved ? tr('✓ Орындалды.', '✓ Выполнено.') : tr('Енді тапсырманы орындаңыз.', 'Теперь выполните задание.');
    } else {
      candidate.pause();
      ui.feedback.textContent = interrupted ? tr('Ойнату тоқтатылды. Қайта тыңдауға болады.', 'Воспроизведение остановлено. Можно послушать снова.')
        : tr('Дыбыс жүктелмеді. Қайта тыңдап көріңіз.', 'Не удалось воспроизвести звук. Повторите прослушивание.');
    }
    refreshControls();
  }
  function storageKey() {
    const learner = typeof currentUserId === 'string' && currentUserId ? currentUserId : 'guest';
    return 'eduCorex.curriculum.v1:' + learner;
  }
  function readProgress() {
    try { const data = JSON.parse(localStorage.getItem(storageKey()) || '{}'); return data && typeof data === 'object' && !Array.isArray(data) ? data : {}; } catch { return {}; }
  }
  function save() {
    const state = session.state;
    try {
      const data = readProgress(), prior = data[engine.identity(lesson)]; data[engine.identity(lesson)] = { grade, table: lesson.table, strand: lesson.strand, objectiveCodes: lesson.objectiveCodes,
        lessonId: lesson.id, completed: state.complete, everCompleted: Boolean(state.complete || prior?.everCompleted || prior?.completed), results: state.records,
        index: state.index, solved: state.solved, attempts: state.attempts, order: state.order, supportUsed: state.supportUsed, participation,
        assessment: state.records.some(r => r.assessment === 'teacher') ? 'mixed-or-teacher' : 'choice', updatedAt: new Date().toISOString() };
      localStorage.setItem(storageKey(), JSON.stringify(data)); return true;
    } catch { return false; }
  }
  function refreshControls() {
    if (!session || !ui.listen) return;
    const state = session.state, step = session.step;
    ui.listen.disabled = playing; ui.next.disabled = !state.solved || playing;
    ui.pause.disabled = !playing || !playback; ui.stop.disabled = !playing;
    ui.pause.textContent = pausedByUser ? tr('▶ Жалғастыру', '▶ Продолжить') : tr('⏸ Кідірту', '⏸ Пауза');
    ui.pause.setAttribute('aria-pressed', String(pausedByUser));
    ui.question.disabled = playing;
    ui.model.disabled = playing || state.heard;
    for (const control of ui.responses.querySelectorAll('button:not(.radial-center-btn)')) {
      if (control === ui.model) continue;
      control.disabled = playing || !state.heard || state.solved || control.dataset.boundary === 'true';
    }
    if (step?.kind === 'teacher') ui.confirm.disabled = playing || !state.heard || state.solved;
  }
  function respond(value) {
    if (playing) return;
    const verdict = session.answer(value); if (!verdict.accepted) return;
    ui.feedback.textContent = verdict.correct
      ? session.step.kind === 'teacher' ? tr('✓ Педагог орындауды белгіледі.', '✓ Выполнение отмечено педагогом.') : tr('✓ Дұрыс!', '✓ Правильно!')
      : tr('Әзірше сәйкес емес. Қайта тыңдап көріңіз.', 'Пока не совпадает. Послушайте ещё раз.');
    save();
    if (verdict.correct) {
      if (session.step.reveal) ui.feedback.textContent += ' ' + session.step.reveal;
      for (const control of ui.responses.querySelectorAll('[data-choice]')) control.setAttribute('aria-pressed', String(control.dataset.choice === value));
    }
    refreshControls();
  }
  function scene(kind) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 160 100'); svg.setAttribute('aria-hidden', 'true'); svg.classList.add('curriculum-scene');
    const shape = (tag, attrs, text) => { const element = document.createElementNS(svg.namespaceURI, tag); for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value); if (text) element.textContent = text; svg.append(element); };
    shape('rect', { width: '160', height: '100', rx: '14', fill: '#dff2fd' }); shape('path', { d: 'M0 78 Q80 65 160 78 V100 H0Z', fill: '#f6fbff' });
    const symbols = { winter: ['🌲', '🐦', '❄️'], build: ['👨', '👧', '🛠️'], seed: ['👧', '🌾', '🏠'], birds: ['🐦', '🏠', '🐦'] }[kind];
    symbols.forEach((symbol, i) => shape('text', { x: String(8 + i * 50), y: String(i === 1 ? 70 : 52), 'font-size': '36' }, symbol)); return svg;
  }
  function display(step) {
    ui.display.replaceChildren(); ui.display.hidden = !step.display;
    if (!step.display) return;
    if (step.stressedWordIndex !== undefined) {
      step.words.forEach((word, i) => { ui.display.append(node(i === step.stressedWordIndex ? 'mark' : 'span', word + ' ')); });
    } else if (step.stressedSyllableIndex !== undefined) {
      step.syllables.forEach((syllable, i) => { if (i) ui.display.append(document.createTextNode('–')); ui.display.append(node(i === step.stressedSyllableIndex ? 'mark' : 'span', syllable)); });
    } else if (step.groups) ui.display.textContent = step.groups.join(' / ');
    else ui.display.textContent = step.display;
  }
  function renderOrder() {
    const step = session.step, state = session.state;
    ui.responses.replaceChildren(); const orbit = node('div'), list = node('div', undefined, 'curriculum-order');
    if (!state.order.includes(orderSelection)) orderSelection = state.order[0];
    state.order.forEach((value, index) => {
      const item = step.orderItems.find(entry => entry.value === value);
      const pick = button('', () => { orderSelection = value; renderOrder(); refreshControls(); }, 'curriculum-order-pick');
      pick.dataset.orderPick = value; pick.setAttribute('aria-label', `${index + 1}. ${item.label}`); pick.setAttribute('aria-pressed', String(orderSelection === value));
      const caption = `${index + 1}. ${item.label.length > 34 ? item.label.slice(0, 32) + '…' : item.label}`;
      illustrate(pick, item.scene ? scene(item.scene) : '🧩', caption);
      orbit.append(pick);
      if (value !== orderSelection) return;
      const row = node('div'); row.dataset.orderValue = value;
      if (item.scene) row.append(scene(item.scene));
      row.append(node('span', `${index + 1}. ${item.label}`, 'curriculum-order-text'));
      const controls = node('div', undefined, 'curriculum-order-controls');
      for (const direction of [-1, 1]) {
        const move = button(direction === -1 ? '↑' : '↓', () => {
          if (!session.move(index, index + direction)) return; save(); renderOrder(); refreshControls();
          const focus = ui.responses.querySelector(`[data-order-value="${value}"] button:not(:disabled)`); focus?.focus({ preventScroll: true });
        }, '');
        move.dataset.boundary = String(index + direction < 0 || index + direction >= state.order.length);
        move.setAttribute('aria-label', tr('Жоғары / төмен жылжыту: ', 'Переместить вверх / вниз: ') + item.label + ' ' + (direction === -1 ? '↑' : '↓'));
        controls.append(move);
      }
      row.append(controls); list.append(row);
    });
    pictureOrbit(orbit, lesson.title);
    ui.responses.append(orbit, list, button(tr('Тексеру', 'Проверить'), () => respond('check-order')));
  }
  function renderStep() {
    stop(); const state = session.state; ui.responses.replaceChildren(); ui.legend.replaceChildren(); ui.feedback.textContent = ''; ui.summary.hidden = true;
    ui.responses.className = 'curriculum-options'; ui.actions.append(ui.model);
    ui.body.hidden = state.complete; ui.restart.hidden = false;
    ui.title.textContent = lesson.title; ui.counter.textContent = `${state.complete ? state.total : state.index + 1} / ${state.total}`;
    if (state.complete) {
      const persisted = save(); ui.summary.hidden = false;
      const automated = state.records.filter(r => r.assessment === 'choice').length, manual = state.records.filter(r => r.assessment === 'teacher').length;
      const attempts = state.records.reduce((sum, r) => sum + r.attempts, 0), support = state.records.filter(r => r.supportUsed).length;
      ui.summary.textContent = tr(`Орындалды: ${state.total}. Таңдау: ${automated}. Педагог белгісі: ${manual}. Әрекет: ${attempts}. Көмек қолданылды: ${support}.`,
        `Выполнено: ${state.total}. Выбор: ${automated}. Отметка педагога: ${manual}. Попыток: ${attempts}. С помощью: ${support}.`);
      if (!persisted) ui.summary.textContent += tr(' Нәтиже осы экранда көрсетіледі.', ' Результат доступен на этом экране.');
      if (!rewarded) { rewarded = true; window.showReward?.(); } return;
    }
    const step = session.step;
    ui.mode.hidden = step.kind !== 'teacher';
    for (const control of ui.mode.querySelectorAll('button')) control.setAttribute('aria-pressed', String(control.dataset.participation === participation));
    ui.level.textContent = step.level || (step.speaker || ''); ui.prompt.textContent = step.prompt; display(step);
    ui.listen.hidden = !step.audio; ui.question.hidden = !step.questionAudio; ui.model.hidden = !step.teacherModel;
    ui.pause.hidden = ui.stop.hidden = !step.audio && !step.questionAudio;
    ui.stop.textContent = tr('⏹ Тоқтату', '⏹ Остановить');
    ui.model.textContent = tr('Педагог: үлгі көрсетілді', 'Педагог: образец показан');
    ui.listen.textContent = tr('🔊 Қайта тыңдау', '🔊 Слушать ещё раз'); ui.question.textContent = tr('🔊 Сұрақты тыңдау', '🔊 Послушать вопрос');
    ui.next.textContent = tr('Келесі', 'Далее'); ui.confirm.textContent = tr('Педагог: қайталады', 'Педагог: повторил');
    ui.support.hidden = !step.supportText; ui.support.open = false; ui.supportText.textContent = step.supportText || '';
    ui.supportSummary.textContent = tr('Мәтінді көмек ретінде көрсету', 'Показать текст для помощи');
    if (step.kind === 'choice') {
      options = window.CorexLearning.shuffle(step.options);
      for (const [index, option] of options.entries()) {
        const control = button(option.label, () => respond(option.value), ''); control.lang = 'kk'; control.dataset.choice = option.value; control.setAttribute('aria-pressed', String(state.solved && option.value === step.answer));
        if (options.some(item => item.label.length > 32)) {
          control.textContent = String(index + 1); control.setAttribute('aria-label', option.label);
          ui.legend.append(node('p', `${index + 1}. ${option.label}`));
        }
        illustrate(control, answerIcon(option.label), control.textContent);
        ui.responses.append(control);
      }
      pictureOrbit(ui.responses, lesson.title);
    } else if (step.kind === 'teacher') {
      for (const control of [ui.model, ui.confirm]) control.removeAttribute('aria-label');
      illustrate(ui.model, '🧑‍🏫', tr('Үлгі', 'Образец')); illustrate(ui.confirm, '🗣️', tr('Қайталау', 'Повторение'));
      ui.responses.append(ui.model, ui.confirm); pictureOrbit(ui.responses, lesson.title);
    }
    else renderOrder();
    ui.feedback.textContent = state.solved ? tr('✓ Орындалды.', '✓ Выполнено.') : step.teacherModel
      ? tr('Педагог үлгіні көрсетеді. Тыңдап, қайталаңыз.', 'Педагог показывает образец. Послушайте и повторите.')
      : tr('Алдымен үлгіні толық тыңдаңыз.', 'Сначала полностью прослушайте образец.');
    refreshControls();
  }
  function renderCatalog() {
    heading.textContent = tr('Оқу тапсырмалары', 'Учебные задания'); gradeSelect.value = String(grade);
    const available = content.lessons.filter(item => item.grade === grade);
    if (!available.some(item => item.category === category)) category = available[0]?.category || 'comprehension';
    tabs.replaceChildren(); grid.replaceChildren(); const progress = readProgress();
    for (const [key, labels] of Object.entries(categories)) {
      if (!available.some(item => item.category === key)) continue;
      const control = button(tr(...labels), () => { category = key; catalogPage = 0; renderCatalog(); document.getElementById('curriculum-tab-' + key)?.focus({ preventScroll: true }); }, '');
      control.id = 'curriculum-tab-' + key; control.tabIndex = category === key ? 0 : -1; control.setAttribute('aria-controls', 'curriculum-lessons'); control.setAttribute('role', 'tab'); control.setAttribute('aria-selected', String(category === key)); tabs.append(control);
    }
    grid.setAttribute('aria-labelledby', 'curriculum-tab-' + category);
    const lessons = available.filter(l => l.category === category), pageSize = 4, pages = Math.ceil(lessons.length / pageSize);
    catalogPage = Math.min(catalogPage, Math.max(0, pages - 1)); catalogLegend.replaceChildren(); catalogPager.replaceChildren();
    for (const [index, item] of lessons.slice(catalogPage * pageSize, (catalogPage + 1) * pageSize).entries()) {
      const card = button('', () => openLesson(item), 'curriculum-card'); card.dataset.lesson = item.id;
      card.setAttribute('aria-label', item.title); card.title = item.title;
      illustrate(card, lessonIcon(item), item.title);
      const saved = progress[engine.identity(item)];
      if (saved?.completed || saved?.everCompleted) card.querySelector('p').append(node('span', tr(' ✓ Орындалды', ' ✓ Выполнено'), 'curriculum-completed'));
      grid.append(card);
      catalogLegend.append(node('p', `${catalogPage * pageSize + index + 1}. ${item.title}`));
    }
    pictureOrbit(grid, tr('Оқу тапсырмалары', 'Учебные задания'));
    if (pages > 1) {
      const previous = button(tr('← Алдыңғы', '← Предыдущие'), () => { catalogPage--; renderCatalog(); top(); }); previous.disabled = catalogPage === 0;
      const next = button(tr('Келесі →', 'Следующие →'), () => { catalogPage++; renderCatalog(); top(); }); next.disabled = catalogPage === pages - 1;
      catalogPager.append(previous, node('span', `${catalogPage + 1} / ${pages}`), next);
    }
  }
  function openLesson(item) {
    stop(); lesson = item; orderSelection = undefined; const prior = readProgress()[engine.identity(lesson)];
    session = engine.create(lesson, prior?.completed ? undefined : prior); rewarded = false; participation = prior?.participation === 'independent' ? 'independent' : 'together';
    window.showScreen('curriculumPractice'); active = true; renderStep();
    ui.title.focus({ preventScroll: true });
  }
  function openCatalog(selectedGrade, from) {
    stop(); grade = selectedGrade; catalogPage = 0; parent = from; active = false; window.showScreen('curriculumCatalog'); renderCatalog();
  }
  function initialize() {
    const root = document.getElementById('grade0Menu').parentElement;
    catalog = node('section', undefined, 'screen curriculum-screen'); catalog.id = 'curriculumCatalog'; catalog.setAttribute('data-i18n-managed', 'true');
    const catalogPanel = node('div', undefined, 'curriculum-panel'), toolbar = node('div', undefined, 'curriculum-toolbar');
    const back = button(tr('⬅ Артқа', '⬅ Назад'), () => window.showScreen(parent)); entries.push(() => { back.textContent = tr('⬅ Артқа', '⬅ Назад'); });
    const gradeLabel = node('label'), gradeCaption = node('span', tr('Сынып: ', 'Класс: ')); gradeSelect = node('select'); gradeSelect.setAttribute('aria-label', tr('Сынып', 'Класс'));
    for (const value of [0, 1, 2, 3, 4]) { const option = node('option', String(value)); option.value = String(value); gradeSelect.append(option); }
    gradeSelect.addEventListener('change', () => { grade = Number(gradeSelect.value); catalogPage = 0; renderCatalog(); }); gradeLabel.append(gradeCaption, gradeSelect);
    entries.push(() => { gradeCaption.textContent = tr('Сынып: ', 'Класс: '); gradeSelect.setAttribute('aria-label', tr('Сынып', 'Класс')); });
    toolbar.append(back, gradeLabel); heading = node('h2'); tabs = node('div', undefined, 'curriculum-tabs'); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', tr('Бөлімдер', 'Разделы'));
    entries.push(() => tabs.setAttribute('aria-label', tr('Бөлімдер', 'Разделы')));
    grid = node('div', undefined, 'curriculum-cards'); grid.id = 'curriculum-lessons'; grid.setAttribute('role', 'tabpanel');
    tabs.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const controls = [...tabs.querySelectorAll('button')], index = controls.indexOf(document.activeElement); if (index < 0) return;
      event.preventDefault(); const target = event.key === 'Home' ? 0 : event.key === 'End' ? controls.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + controls.length) % controls.length;
      controls[target].click();
    });
    catalogPager = node('nav', undefined, 'curriculum-pager'); catalogLegend = node('div', undefined, 'curriculum-legend'); catalogLegend.lang = 'kk'; catalogLegend.hidden = true;
    catalogPanel.append(toolbar, heading, tabs, grid, catalogPager, catalogLegend); catalog.append(catalogPanel); root.append(catalog);
    practice = node('section', undefined, 'screen curriculum-screen'); practice.id = 'curriculumPractice'; practice.setAttribute('data-i18n-managed', 'true');
    const panel = node('div', undefined, 'curriculum-panel'), navigation = node('div', undefined, 'curriculum-toolbar');
    ui.back = button('', () => { stop(); active = false; window.showScreen('curriculumCatalog'); renderCatalog(); });
    ui.restart = button('', () => { stop(); session.restart(); rewarded = false; renderStep(); top(); });
    const update = () => { ui.back.textContent = tr('⬅ Тапсырмалар', '⬅ К заданиям'); ui.restart.textContent = tr('Қайта бастау', 'Начать заново'); };
    entries.push(update); update(); navigation.append(ui.back, ui.restart);
    ui.title = node('h2'); ui.title.tabIndex = -1; ui.counter = node('p'); ui.body = node('div'); ui.level = node('p'); ui.prompt = node('p', undefined, 'curriculum-step-title'); ui.prompt.lang = 'kk'; ui.display = node('div', undefined, 'curriculum-display'); ui.display.lang = 'kk';
    const actions = node('div', undefined, 'curriculum-actions'); ui.actions = actions;
    ui.listen = button('', () => { void play(session.step.audio, true); }); ui.question = button('', () => { void play(session.step.questionAudio, false); });
    ui.listen.classList.add('curriculum-listen'); ui.question.classList.add('curriculum-question');
    ui.pause = button('', () => {
      if (!playing || !playback) return;
      if (pausedByUser) {
        pausedByUser = false; const token = playToken, finish = pending;
        void playback.play().then(() => { if (token === playToken) refreshControls(); }).catch(() => { if (token === playToken) finish?.(false); });
      }
      else { pausedByUser = true; playback.pause(); } refreshControls();
    });
    ui.stop = button('', () => { stop(); ui.feedback.textContent = tr('Тоқтатылды. Қайта тыңдауға болады.', 'Остановлено. Можно прослушать снова.'); });
    ui.model = button('', () => { session.model(); ui.feedback.textContent = tr('Үлгі көрсетілді. Енді қайталаңыз.', 'Образец показан. Теперь повторите.'); refreshControls(); });
    actions.append(ui.listen, ui.question, ui.model, ui.pause, ui.stop);
    const mode = node('div', undefined, 'curriculum-mode'); ui.mode = mode;
    for (const [value, kk, ru] of [['together', 'Бірге', 'Вместе'], ['independent', 'Өздігінен', 'Самостоятельно']]) {
      const control = button(tr(kk, ru), () => { participation = value; for (const b of mode.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b === control)); }, '');
      control.setAttribute('aria-pressed', String(value === participation)); mode.append(control); entries.push(() => { control.textContent = tr(kk, ru); });
      control.dataset.participation = value;
    }
    ui.responses = node('div', undefined, 'curriculum-options'); ui.confirm = button('', () => respond('teacher-confirmed'));
    ui.legend = node('div', undefined, 'curriculum-legend'); ui.legend.lang = 'kk';
    ui.support = node('details', undefined, 'curriculum-support'); ui.supportSummary = node('summary'); ui.supportText = node('p'); ui.support.append(ui.supportSummary, ui.supportText);
    ui.support.addEventListener('toggle', () => { if (ui.support.open && active) session.support(); });
    ui.feedback = node('p', undefined, 'curriculum-feedback'); ui.feedback.setAttribute('role', 'status'); ui.feedback.setAttribute('aria-live', 'polite');
    ui.next = button('', () => { if (session.next()) { save(); renderStep(); top(); ui.title.focus({ preventScroll: true }); } });
    ui.summary = node('p', undefined, 'curriculum-summary'); ui.summary.setAttribute('role', 'status');
    ui.body.append(ui.level, ui.prompt, ui.display, mode, actions, ui.responses, ui.legend, ui.support, ui.feedback, ui.next);
    panel.append(navigation, ui.title, ui.counter, ui.body, ui.summary); practice.append(panel); root.append(practice);
    for (const [id, value] of [['grade0Menu', 0], ['grade2Menu', 2], ['grade3Menu', 3], ['grade4Menu', 4]]) {
      const menu = document.querySelector('#' + id + ' .radial-menu-container'); if (!menu) continue;
      const control = button('', () => openCatalog(value, id), 'btn btn-secondary curriculum-entry');
      control.setAttribute('data-i18n-managed', 'true');
      const localize = () => { control.textContent = '📚 ' + tr('Оқу тапсырмалары', 'Учебные задания'); }; localize(); entries.push(localize); menu.before(control);
    }
    const previousShow = window.showScreen;
    window.showScreen = function (id) {
      stop(); if (id !== 'curriculumPractice') active = false; const result = previousShow(id);
      if (['grade0Menu', 'grade2Menu', 'grade3Menu', 'grade4Menu', 'learningHubScreen', 'learningPracticeScreen', 'curriculumCatalog', 'curriculumPractice'].includes(id)) top();
      return result;
    };
    window.addEventListener('profile-language-change', () => {
      const next = window.getProfileLang?.() || 'kk'; if (next === language) return; language = next; stop(); entries.forEach(fn => fn());
      if (catalog.classList.contains('active')) renderCatalog(); if (active) renderStep();
    });
    window.addEventListener('pagehide', stop); document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
    window.CorexCurriculumUI = { open: openCatalog, getState: () => ({ grade, lesson: lesson?.id, active, playing, ...(session?.state || {}) }) };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize); else initialize();
})();
