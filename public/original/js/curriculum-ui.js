(function () {
  'use strict';
  const content = window.CorexCurriculumContent, engine = window.CorexCurriculum;
  if (!content || !engine) return;
  const tr = (kk, ru) => window.getProfileLang?.() === 'ru' ? ru : kk;
  const categories = { comprehension: ['Түсіну', 'Понимание'], phonetics: ['Дыбыстар', 'Звуки'], speech: ['Сөйлеу', 'Речь'], math: ['Математика', 'Математика'], sentence: ['Сөйлем', 'Предложение'] };
  let grade = 0, category = null, parent = 'grade0Menu', lesson, session, catalog, practice, grid, tabs, heading, gradeSelect;
  let playback = null, playToken = 0, pending = null, playing = false, pausedByUser = false, rewarded = false, participation = 'together', active = false, options = [];
  let language = window.getProfileLang?.() || 'kk';
  let breathSyllable = 'та', lessonReturn = 'curriculumCatalog';
  let pairTools;
  let catalogLegend, catalogSearch, catalogCount, orderSelection;
  let searchQuery = '';
  let catalogPath = [], legacyReturn = null, catalogGrade = 0;
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
        lessonId: lesson.id, ...(lesson.pairVariant ? { sequence: lesson.steps.map(s => s.id) } : {}), completed: state.complete, everCompleted: Boolean(state.complete || prior?.everCompleted || prior?.completed), results: state.records,
        index: state.index, solved: state.solved, attempts: state.attempts, order: state.order, supportUsed: state.supportUsed, participation,
        assessment: state.records.some(r => r.assessment === 'teacher') ? 'mixed-or-teacher' : 'choice', updatedAt: new Date().toISOString() };
      localStorage.setItem(storageKey(), JSON.stringify(data)); return true;
    } catch { return false; }
  }
  function refreshControls() {
    if (!session || !ui.listen) return;
    const state = session.state, step = session.step;
    ui.listen.disabled = playing; ui.next.disabled = !state.solved || playing;
    ui.next.hidden = !state.solved; ui.pause.hidden = ui.stop.hidden = !playing;
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
    const wasSolved = session.state.solved;
    const verdict = session.answer(value); if (!verdict.accepted) return;
    ui.feedback.textContent = verdict.correct
      ? session.step.kind === 'teacher' ? tr('✓ Педагог орындауды белгіледі.', '✓ Выполнение отмечено педагогом.') : tr('✓ Дұрыс!', '✓ Правильно!')
      : tr('Әзірше сәйкес емес. Қайта тыңдап көріңіз.', 'Пока не совпадает. Послушайте ещё раз.');
    save();
    if (verdict.correct) {
      if (!wasSolved) window.showReward?.();
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
    if (step.repetitions) {
      const presets = node('div', undefined, 'breath-presets');
      for (const syllable of ['та', 'ма', 'па', 'ко']) {
        const choice = button(syllable, () => { breathSyllable = syllable; display(step); refreshControls(); });
        choice.setAttribute('aria-pressed', String(syllable === breathSyllable));
        choice.disabled = session.state.heard || session.state.solved;
        presets.append(choice);
      }
      const pyramid = node('ol', undefined, 'breath-pyramid');
      for (const count of [1, 2, 3]) {
        const row = node('li', breathSyllable.repeat(count));
        if (count === step.repetitions) row.setAttribute('aria-current', 'step');
        pyramid.append(row);
      }
      ui.display.append(presets, pyramid);
    } else if (step.stressedWordIndex !== undefined) {
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
    ui.body.hidden = state.complete; ui.restart.hidden = !state.complete;
    ui.title.textContent = lesson.title; ui.counter.textContent = `${state.complete ? state.total : state.index + 1} / ${state.total}`;
    if (state.complete) {
      const persisted = save(); ui.summary.hidden = false;
      const automated = state.records.filter(r => r.assessment === 'choice').length, manual = state.records.filter(r => r.assessment === 'teacher').length;
      const attempts = state.records.reduce((sum, r) => sum + r.attempts, 0), support = state.records.filter(r => r.supportUsed).length;
      ui.summary.textContent = tr(`Орындалды: ${state.total}. Таңдау: ${automated}. Педагог белгісі: ${manual}. Әрекет: ${attempts}. Көмек қолданылды: ${support}.`,
        `Выполнено: ${state.total}. Выбор: ${automated}. Отметка педагога: ${manual}. Попыток: ${attempts}. С помощью: ${support}.`);
      if (!persisted) ui.summary.textContent += tr(' Нәтиже осы экранда көрсетіледі.', ' Результат доступен на этом экране.');
      rewarded = true; return;
    }
    const step = session.step;
    ui.mode.hidden = step.kind !== 'teacher';
    for (const control of ui.mode.querySelectorAll('button')) control.setAttribute('aria-pressed', String(control.dataset.participation === participation));
    ui.level.textContent = step.level || (step.speaker || ''); ui.prompt.textContent = step.prompt; display(step);
    ui.listen.hidden = !step.audio; ui.question.hidden = !step.questionAudio; ui.model.hidden = !step.teacherModel;
    ui.pause.hidden = ui.stop.hidden = !step.audio && !step.questionAudio;
    ui.stop.textContent = tr('⏹ Тоқтату', '⏹ Остановить');
    ui.model.textContent = tr('Педагог: үлгі көрсетілді', 'Педагог: образец показан');
    ui.listen.textContent = tr('🔊 Тыңдау', '🔊 Слушать'); ui.question.textContent = tr('🔊 Сұрақты тыңдау', '🔊 Послушать вопрос');
    ui.next.textContent = tr('Келесі', 'Далее'); ui.confirm.textContent = tr('Педагог: қайталады', 'Педагог: повторил');
    ui.support.hidden = !step.supportText; ui.support.open = false; ui.supportText.textContent = step.supportText || '';
    ui.supportSummary.textContent = tr('Мәтінді көмек ретінде көрсету', 'Показать текст для помощи');
    if (step.kind === 'choice') {
      options = window.CorexLearning.shuffle(step.options);
      for (const [index, option] of options.entries()) {
        const control = button(option.label, () => respond(option.value), ''); control.lang = 'kk'; control.dataset.choice = option.value; control.setAttribute('aria-pressed', String(state.solved && option.value === step.answer));
        illustrate(control, answerIcon(option.label), control.textContent);
        ui.responses.append(control);
      }
      ui.responses.classList.add('curriculum-simple-choices');
    } else if (step.kind === 'teacher') {
      for (const control of [ui.model, ui.confirm]) control.removeAttribute('aria-label');
      illustrate(ui.model, '🧑‍🏫', tr('Үлгі', 'Образец')); illustrate(ui.confirm, '🗣️', tr('Қайталау', 'Повторение'));
      ui.responses.append(ui.model, ui.confirm); ui.responses.classList.add('curriculum-simple-choices');
    }
    else renderOrder();
    ui.feedback.textContent = state.solved ? tr('✓ Орындалды.', '✓ Выполнено.') : step.teacherModel
      ? tr('Педагог үлгіні көрсетеді. Тыңдап, қайталаңыз.', 'Педагог показывает образец. Послушайте и повторите.')
      : tr('Алдымен үлгіні толық тыңдаңыз.', 'Сначала полностью прослушайте образец.');
    refreshControls();
  }
  // Reuse the real menu actions, including their setup and return context.
  // Never reconstruct an exercise by showing its screen alone.
  const activityRegistry = new Map();
  function activityIndex() {
    if (activityRegistry.has(grade)) return activityRegistry.get(grade);
    const level = grade < 2 ? 0 : grade, seen = new Set(), items = [];
    const screens = [...document.querySelectorAll('.screen')].filter(screen =>
      screen.id === 'grade' + level + 'Menu' || screen.id === 'grade0SoundsMenu' || (level === 0 &&
        (/^grade0.*Menu$/.test(screen.id) || ['sentenceModuleScreen', 'learningHubScreen'].includes(screen.id))));
    for (const screen of screens) {
      const controls = [...screen.querySelectorAll('.radial-menu-container > .radial-item, .learning-shared-reading')];
      controls.forEach((source, index) => {
        if (source.classList.contains('curriculum-entry')) return;
        if (grade >= 2 && screen.id === 'grade0SoundsMenu' && !source.dataset.soundCategory) return;
        const action = source.getAttribute('onclick') || '';
        const target = source.dataset.catalogTarget || source.dataset.artModuleTarget || action.match(/showScreen\(['"]([^'"]+)['"]\)/)?.[1];
        if (target && (/Menu$/.test(target) || ['sentenceModuleScreen', 'learningHubScreen'].includes(target))) return;
        const key = source.dataset.catalogKey || target || (action || screen.id + ':' + index);
        if (seen.has(key)) return; seen.add(key);
        const captionNode = (source.querySelector('p') || source).cloneNode(true);
        captionNode.querySelectorAll('br').forEach(br => br.replaceWith(' '));
        const caption = captionNode.textContent;
        let title = caption.replace(/\s+/g, ' ').trim(); if (!title) return;
        if (source.dataset.catalogKey) title += ' (' + (source.dataset.catalogKey.endsWith(':voice') ? tr('Дауыс', 'Голос') : tr('Дыбыстар', 'Звуки')) + ')';
        items.push({ id: key, grade, category: 'activities', title, source, originalAction: source.onclick, sourceScreen: screen.id,
          icon: source.querySelector('div')?.textContent?.trim() || '🎯' });
      });
    }
    return items;
  }
  const modules = {
    math: { label: ['Математика', 'Математика'], icon: '🔢' },
    listening: { label: ['Тыңдау', 'Слушаем'], icon: '🎧' },
    breathing: { label: ['Тыныс', 'Дыхание'], icon: '🫁' },
    phonetics: { label: ['Дыбыстау', 'Произносим'], icon: '👄' },
    speech: { label: ['Сөйлеу', 'Речь'], icon: '🗣️' },
    comprehension: { label: ['Түсіну', 'Понимание'], icon: '📖' },
    sentence: { label: ['Сөйлем', 'Предложения'], icon: '🧩' },
    spatial: { label: ['Бағыттар', 'Ориентация'], icon: '🧭' },
  };
  function moduleFor(item) {
    if (!item.source) return item.id === 'one-breath' ? 'breathing' : item.category;
    const id = item.id;
    if (['g2Task4', 'learningHubScreen:0', 'learningHubScreen:1'].includes(id)) return 'math';
    if (/Spatial|g4Task6/.test(id)) return 'spatial';
    if (/sentenceBuilder|g2VerbModule/.test(id)) return 'sentence';
    if (/Tynys/.test(id) || item.sourceScreen === 'grade0TynysByMenu') return 'breathing';
    if (/Articulation|ArticulationMap|QSound|syllable-reading|g0TaskSyllables|g2Task3/.test(id)) return 'phonetics';
    if (/Autumn|g2Task6|g4Task[123]/.test(id)) return 'comprehension';
    if (item.sourceScreen === 'grade0SoundsMenu' || item.sourceScreen === 'learningHubScreen' || ['g3Task1', 'g4Task5'].includes(id)) return 'listening';
    return 'speech';
  }
  function lessonsForGrade(value) {
    const seen = new Set();
    return content.lessons.filter(item => (item.grade === value || (value === 0 && item.grade === 1)) && !seen.has(item.id) && seen.add(item.id));
  }
  function topicPath(item) {
    const id = item.id, title = item.title;
    if (category === 'listening') {
      if (/g0Task3|g0Task5|g3Task1|g4Task5|learningHub|RepeatRhythm/.test(id)) return [['music','Музыка','Музыка','🎵']];
      if (/g0Task4|g0Task6|Wild/.test(id)) return [['nature','Табиғат','Природа','🌳']];
      return [['everyday','Күнделікті дыбыстар','Звуки вокруг','🏠']];
    }
    if (category === 'phonetics') {
      if (/^[А-ЯӘҒҚҢӨҰҮҺІЁ]\s*[–—-]\s*[А-ЯӘҒҚҢӨҰҮҺІЁ]$/u.test(title)) {
        const first = title[0];
        if ('АӘОӨУҰҮЫІИЭЕ'.includes(first)) {
          const band = 'АӘО'.includes(first) ? 'А · Ә · О' : 'УҰҮӨ'.includes(first) ? 'У · Ү · Ө' : 'Ы · І · И · Е';
          return [['vowels','Дауысты дыбыстар','Гласные','🔤'],[band,band,band,'🔤']];
        }
        const band = 'МНЛРТ'.includes(first) ? 'М · Н · Л · Р · Т' : 'ПБФ'.includes(first) ? 'П · Б · Ф' : 'СЗШЖДЧЩ'.includes(first) ? 'С · Ш · Д · Ч' : 'К · Г · Қ · Х';
        const path = [['consonants','Дауыссыз дыбыстар','Согласные','🔤'],[band,band,band,'🔤']];
        if (band === 'К · Г · Қ · Х') {
          const group = first === 'Қ' ? 'Қ · Х · Һ' : 'К · Г · Х';
          path.push([group,group,group,'🔤']);
        }
        return path;
      }
      if (/syllable|Syllables|g2Task3/.test(id)) return [['syllables','Буындар','Слоги','👏']];
      return [['articulation','Артикуляция','Артикуляция','👄']];
    }
    if (category === 'comprehension') {
      if (/Диалог|Диалог|g4Task2/.test(title + id)) return [['dialogues','Диалогтар','Диалоги','💬']];
      if (/phrase|sentence/.test(id)) return [['phrases','Сөйлемдер','Фразы','📝']];
      if (/objects/.test(id)) return [['objects','Заттар','Предметы','🧸']];
      const kind = /library|school|familiar|extended-14|disputed/.test(id) ? ['school','Мектеп пен кітаптар','Школа и книги','📚'] : /walk|seed|birds|unfamiliar|extended-15/.test(id) ? ['nature','Табиғат','Природа','🌳'] : ['stories','Әңгімелер','Истории','📖'];
      return [kind, [title.split(' · ')[0],title.split(' · ')[0],title.split(' · ')[0],lessonIcon(item)]];
    }
    if (category === 'speech') {
      if (/Frog|g0Task2|DShak/.test(id)) return [['games','Дауыс ойындары','Игры с голосом','🎲']];
      if (/stress|g3Task[35]|syntagm/.test(id)) return [['words','Сөздер мен екпін','Слова и ударение','🗣️']];
      return [['voice','Дауыс пен интонация','Голос и интонация','🎤']];
    }
    if (category === 'math') {
      if (/times|multiply/.test(id)) { const band = Number(id.split('-').at(-1)) <= 5 ? '2 · 3 · 4 · 5' : '6 · 7 · 8 · 9'; return [['multiply','Көбейту','Умножение','✖️'],[band,band,band,'✖️']]; }
      if (/division/.test(id)) return [['division','Бөлу','Деление','➗']];
      if (/compar|g2Task4/.test(id)) return [['signs','Таңбалар','Знаки','➕']];
      return [['numbers','Сандар','Числа','🔢']];
    }
    return [];
  }
  function topicTree(items) {
    const root = { children: [], leaves: [] };
    for (const item of items) {
      let branch = root; branch.leaves.push(item);
      for (const [key,kk,ru,icon] of topicPath(item)) {
        let child = branch.children.find(child => child.key === key);
        if (!child) { child = { key, label: [kk,ru], icon, children: [], leaves: [] }; branch.children.push(child); }
        child.leaves.push(item); branch = child;
      }
    }
    return root;
  }
  function renderCatalog() {
    gradeSelect.value = String(grade);
    const activities = activityIndex().map(item => ({ ...item, title: window.translateProfileText?.(item.title, language) || item.title }));
    const available = [...lessonsForGrade(grade), ...activities];
    tabs.replaceChildren(); grid.replaceChildren(); catalogLegend.replaceChildren();
    catalogSearch.hidden = true; catalogCount.hidden = true;
    grid.removeAttribute('aria-labelledby'); grid.setAttribute('role', 'group');
    if (!category) category = Object.keys(modules).find(key => available.some(item => moduleFor(item) === key));
    const module = modules[category];
    heading.textContent = module.icon + ' ' + tr(...module.label);
    grid.className = 'curriculum-topic-orbits';
    grid.setAttribute('aria-label', tr(...module.label));
    const progress = readProgress();
    const topicItems = available.filter(item => moduleFor(item) === category);
    let branch = topicTree(topicItems);
    for (const key of catalogPath) branch = branch.children.find(child => child.key === key) || branch;
    const orbit = node('div', undefined, 'curriculum-topic-orbit'); grid.append(orbit);
    const direct = branch.leaves.length <= 6 || !branch.children.length;
    if (!direct) {
      for (const group of branch.children) {
        const control = button('', () => { catalogPath.push(group.key); renderCatalog(); top(); }, 'curriculum-task-tile');
        control.dataset.topicGroup = group.key; control.setAttribute('aria-label', tr(...group.label));
        illustrate(control, group.icon, tr(...group.label)); orbit.append(control);
      }
    } else for (const item of branch.leaves) {
      const card = button('', () => {
        if (item.source) { stop(); active = false; legacyReturn = null; window.showScreen(item.sourceScreen); if (item.originalAction) item.originalAction.call(item.source, new MouseEvent('click')); else item.source.click(); legacyReturn = item.sourceScreen; }
        else openLesson(item);
      }, 'curriculum-task-tile');
      if (item.source) card.dataset.activity = item.id; else card.dataset.lesson = item.id;
      card.setAttribute('aria-label', item.title); card.title = item.title;
      illustrate(card, item.icon || lessonIcon(item), item.title);
      const saved = item.source ? null : progress[engine.identity(item)];
      if (saved?.completed || saved?.everCompleted) card.append(node('span', '✓', 'curriculum-completed'));
      orbit.append(card);
    }
    pictureOrbit(orbit, branch.label ? tr(...branch.label) : tr(...module.label));
  }

  function buildPairTools() {
    const panel = node('details', undefined, 'curriculum-pair-tools');
    const summary = node('summary'), body = node('div'), search = node('input');
    search.type = 'search';
    const pairs = node('select'), level = node('select'), mode = node('select');
    const fields = [[search, 'Жұпты іздеу', 'Поиск пары'], [pairs, 'Дыбыс жұбы', 'Пара звуков'],
      [level, 'Деңгей', 'Уровень'], [mode, 'Тапсырма', 'Задание']];
    const levels = [['syllables', 'Буындар', 'Слоги'], ['words', 'Сөздер', 'Слова'], ['sentences', 'Сөйлемдер', 'Предложения']];
    const modes = [['choice', 'Тыңда да, таңда', 'Послушай и выбери'], ['repeat', 'Қайтала', 'Повтори']];
    for (const [select, rows] of [[level, levels], [mode, modes]]) {
      for (const [value, kk, ru] of rows) {
        const option = node('option'); option.value = value;
        const update = () => { option.textContent = tr(kk, ru); }; update(); entries.push(update); select.append(option);
      }
    }
    for (const [field, kk, ru] of fields) {
      const label = node('label'), caption = node('span'); label.append(caption, field); body.append(label);
      const update = () => { caption.textContent = tr(kk, ru); field.setAttribute('aria-label', caption.textContent); }; update(); entries.push(update);
    }
    let bank = [];
    const selectedPair = () => bank.find(p => p.id === pairs.value);
    const samples = node('div', undefined, 'curriculum-pair-samples');
    const start = button('', () => {
      const base = selectedPair(); if (!base) return;
      const variant = { ...base, id: [base.id, level.value, mode.value].join('/'), pairVariant: true };
      const available = base.steps.filter(s => s.id.startsWith(level.value + '-'));
      const previous = readProgress()[engine.identity(variant)];
      const sequence = !previous?.completed && previous?.sequence;
      const ordered = Array.isArray(sequence) && sequence.length === available.length && available.every(s => sequence.includes(s.id))
        ? sequence.map(id => available.find(s => s.id === id)) : window.CorexLearning.shuffle(available);
      variant.steps = mode.value === 'repeat' ? ordered.map(s => ({ ...s, kind: 'teacher', prompt: 'Тыңдап, дауыстап қайталаңыз.', display: s.stimulus })) : ordered;
      beginLesson(variant, lessonReturn);
    });
    function renderSamples() {
      samples.replaceChildren(); const item = selectedPair(); start.disabled = !item;
      for (const step of item?.steps || []) {
        if (!step.id.startsWith(level.value + '-')) continue;
        const sample = button('🔊 ' + step.stimulus, () => { void play(step.audio, false); });
        sample.lang = 'kk'; samples.append(sample);
      }
    }
    function filter(current) {
      const query = search.value.trim().toLocaleLowerCase().replace(/[-–—\s]/g, '');
      pairs.replaceChildren();
      for (const item of bank) {
        if (!item.title.toLocaleLowerCase().replace(/[-–—\s]/g, '').includes(query)) continue;
        const option = node('option', item.title); option.value = item.id; pairs.append(option);
      }
      if ([...pairs.options].some(o => o.value === current)) pairs.value = current;
      renderSamples();
    }
    search.addEventListener('input', () => filter(pairs.value));
    pairs.addEventListener('change', renderSamples); level.addEventListener('change', renderSamples);
    const update = () => { summary.textContent = tr('Жұп пен деңгейді таңдау', 'Выбрать пару и уровень'); start.textContent = tr('Бастау', 'Начать'); };
    update(); entries.push(update); body.append(samples, start); panel.append(summary, body);
    return { panel, reset(item) {
      panel.open = false; panel.hidden = !/^pair-\d+$/.test(item.id);
      if (panel.hidden) return;
      bank = content.lessons.filter(l => l.grade === item.grade && /^pair-\d+$/.test(l.id));
      search.value = ''; level.value = 'syllables'; mode.value = 'choice'; filter(item.id);
    } };
  }
  function openLesson(item, from = 'curriculumCatalog') {
    pairTools.reset(item); beginLesson(item, from);
  }
  function beginLesson(item, from) {
    grade = item.grade; lessonReturn = from; breathSyllable = 'та';
    stop(); lesson = item; orderSelection = undefined; const prior = readProgress()[engine.identity(lesson)];
    session = engine.create(lesson, prior?.completed ? undefined : prior); rewarded = false; participation = prior?.participation === 'independent' ? 'independent' : 'together';
    window.showScreen('curriculumPractice'); active = true; renderStep();
    ui.title.focus({ preventScroll: true });
  }
  function openCatalog(selectedGrade, from, selectedModule) {
    stop(); legacyReturn = null; window.CorexGrades?.select?.(selectedGrade); grade = selectedGrade; catalogGrade = selectedGrade; catalogPath = []; category = selectedModule || 'math'; searchQuery = ''; catalogSearch.value = ''; parent = from; active = false; window.showScreen('curriculumCatalog'); renderCatalog();
  }
  function initialize() {
    const root = document.getElementById('grade0Menu').parentElement;
    catalog = node('section', undefined, 'screen curriculum-screen'); catalog.id = 'curriculumCatalog'; catalog.setAttribute('data-i18n-managed', 'true');
    const catalogPanel = node('div', undefined, 'curriculum-panel'), toolbar = node('div', undefined, 'curriculum-toolbar');
    const back = button(tr('⬅ Артқа', '⬅ Назад'), () => { if (catalogPath.length) { catalogPath.pop(); renderCatalog(); top(); } else window.showScreen(parent); }); entries.push(() => { back.textContent = tr('⬅ Артқа', '⬅ Назад'); });
    const gradeLabel = node('label'), gradeCaption = node('span', tr('Сынып: ', 'Класс: ')); gradeSelect = node('select'); gradeSelect.setAttribute('aria-label', tr('Сынып', 'Класс'));
    for (const value of [0, 1, 2, 3, 4]) { const option = node('option', String(value)); option.value = String(value); gradeSelect.append(option); }
    gradeSelect.addEventListener('change', () => { grade = Number(gradeSelect.value); catalogGrade = grade; window.CorexGrades?.select?.(grade); catalogPath = []; renderCatalog(); }); gradeLabel.append(gradeCaption, gradeSelect);
    entries.push(() => { gradeCaption.textContent = tr('Сынып: ', 'Класс: '); gradeSelect.setAttribute('aria-label', tr('Сынып', 'Класс')); });
    const levelSettings = node('details', undefined, 'curriculum-level-settings'), levelSummary = node('summary');
    const labelLevelSettings = () => { levelSummary.textContent = tr('Педагогке', 'Для педагога'); }; labelLevelSettings(); entries.push(labelLevelSettings);
    levelSettings.append(levelSummary, gradeLabel); toolbar.append(back, levelSettings); heading = node('h2'); heading.tabIndex = -1; tabs = node('div', undefined, 'curriculum-tabs'); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', tr('Бөлімдер', 'Разделы'));
    entries.push(() => tabs.setAttribute('aria-label', tr('Бөлімдер', 'Разделы')));
    grid = node('div', undefined, 'curriculum-cards'); grid.id = 'curriculum-lessons'; grid.setAttribute('role', 'tabpanel');
    tabs.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const controls = [...tabs.querySelectorAll('button')], index = controls.indexOf(document.activeElement); if (index < 0) return;
      event.preventDefault(); const target = event.key === 'Home' ? 0 : event.key === 'End' ? controls.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + controls.length) % controls.length;
      controls[target].click();
    });
    catalogLegend = node('div', undefined, 'curriculum-legend'); catalogLegend.lang = 'kk'; catalogLegend.hidden = true;
    catalogSearch = node('input'); catalogSearch.type = 'search'; catalogSearch.className = 'curriculum-search';
    const searchLabel = node('label'); searchLabel.append(catalogSearch);
    const localizeSearch = () => { catalogSearch.placeholder = tr('Тапсырманы табу', 'Найти задание'); catalogSearch.setAttribute('aria-label', catalogSearch.placeholder); };
    localizeSearch(); entries.push(localizeSearch);
    catalogSearch.addEventListener('input', () => { searchQuery = catalogSearch.value; renderCatalog(); });
    catalogCount = node('p'); catalogCount.setAttribute('role', 'status'); catalogCount.setAttribute('aria-live', 'polite');
    catalogPanel.append(toolbar, heading, searchLabel, catalogCount, tabs, grid, catalogLegend); catalog.append(catalogPanel); root.append(catalog);
    practice = node('section', undefined, 'screen curriculum-screen'); practice.id = 'curriculumPractice'; practice.setAttribute('data-i18n-managed', 'true');
    const panel = node('div', undefined, 'curriculum-panel'), navigation = node('div', undefined, 'curriculum-toolbar');
    ui.back = button('', () => { stop(); active = false; if (lessonReturn === 'curriculumCatalog') grade = catalogGrade; window.showScreen(lessonReturn); if (lessonReturn === 'curriculumCatalog') renderCatalog(); });
    ui.restart = button('', () => { stop(); session.restart(); rewarded = false; renderStep(); top(); });
    const update = () => { ui.back.textContent = tr('⬅ Тапсырмалар', '⬅ К заданиям'); ui.restart.textContent = tr('Қайта бастау', 'Начать заново'); };
    entries.push(update); update(); navigation.append(ui.back, ui.restart);
    ui.title = node('h2'); ui.title.tabIndex = -1; ui.counter = node('p', undefined, 'curriculum-progress'); ui.body = node('div'); ui.level = node('p'); ui.prompt = node('p', undefined, 'curriculum-step-title'); ui.prompt.lang = 'kk'; ui.display = node('div', undefined, 'curriculum-display'); ui.display.lang = 'kk';
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
    ui.model = button('', () => { session.model(); if (session.step.repetitions) display(session.step); ui.feedback.textContent = tr('Үлгі көрсетілді. Енді қайталаңыз.', 'Образец показан. Теперь повторите.'); refreshControls(); });
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
    ui.next.classList.add('curriculum-next');
    ui.summary = node('p', undefined, 'curriculum-summary'); ui.summary.setAttribute('role', 'status');
    ui.body.append(ui.level, ui.prompt, ui.display, mode, actions, ui.responses, ui.legend, ui.support, ui.feedback, ui.next);
    pairTools = buildPairTools();
    panel.append(navigation, ui.title, pairTools.panel, ui.counter, ui.body, ui.summary); practice.append(panel); root.append(practice);
    // Capture original exercise actions before turning existing class entries into module doors.
    const savedGrade = grade;
    for (const value of [0, 1, 2, 3, 4]) { grade = value; activityRegistry.set(value, activityIndex()); }
    grade = savedGrade;
    const existingModules = {
      0: { breathing: "grade0TynysByMenu", listening: "grade0SoundsMenu", phonetics: "openArticulationMap", speech: "grade0DauyspenmMenu", sentence: "sentenceModuleScreen", spatial: "grade0SpatialMatrixScreen" },
      2: { math: "g2Task4", phonetics: "g2Task3", comprehension: "g2Task6" },
      3: { listening: "g3Task1", speech: "g3Task2", phonetics: "openArticulationMap" },
      4: { listening: "g4Task5", comprehension: "g4Task1", spatial: "g4Task6", phonetics: "openArticulationMap" },
    };
    for (const [id, value] of [['grade0Menu', 0], ['grade2Menu', 2], ['grade3Menu', 3], ['grade4Menu', 4]]) {
      const menu = document.querySelector('#' + id + ' .radial-menu-container'); if (!menu) continue;
      const available = [...lessonsForGrade(value), ...activityRegistry.get(value)];
      menu.querySelector('[data-catalog-target="learningHubScreen"]')?.remove();
      for (const [key, module] of Object.entries(modules)) {
        if (!available.some(item => moduleFor(item) === key)) continue;
        const match = existingModules[value]?.[key];
        let control = match ? [...menu.querySelectorAll(':scope > .radial-item')].find(node => node.getAttribute('onclick')?.includes(match)) : null;
        if (control) {
          control.removeAttribute('onclick');
          control.addEventListener('click', () => openCatalog(value === 0 ? Math.min(window.CorexGrades?.current || 0, 1) : value, id, key));
        } else {
          control = button('', () => openCatalog(value === 0 ? Math.min(window.CorexGrades?.current || 0, 1) : value, id, key), 'radial-item');
          const icon = node('div', module.icon), caption = node('p'); control.append(icon, caption);
          const localize = () => { caption.textContent = tr(...module.label); }; localize(); entries.push(localize); menu.append(control);
          control.setAttribute('data-i18n-managed', 'true');
        }
        const caption = control.querySelector('p');
        if (caption) { const localize = () => { caption.textContent = tr(...module.label); }; localize(); entries.push(localize); }
        control.setAttribute('data-i18n-managed', 'true');
        control.dataset.curriculumModule = key;
      }
      // Originals remain captured as leaf actions inside their one thematic doorway.
      menu.querySelectorAll(':scope > .radial-item:not([data-curriculum-module])').forEach(item => item.remove());
      menu.classList.add('curriculum-class-orbit');
      const items = [...menu.querySelectorAll(':scope > .radial-item')];
      items.forEach((item, index) => item.style.setProperty('--class-angle', (index * 360 / items.length - 90) + 'deg'));
    }
    const previousShow = window.showScreen;
    window.showScreen = function (id) {
      if (legacyReturn && id === legacyReturn) { legacyReturn = null; stop(); active = false; const result = previousShow('curriculumCatalog'); renderCatalog(); top(); return result; }
      if (['grade0Menu', 'grade2Menu', 'grade3Menu', 'grade4Menu', 'mainScreen'].includes(id)) legacyReturn = null;
      stop(); if (id !== 'curriculumPractice') active = false; const result = previousShow(id);
      if (['grade0Menu', 'grade2Menu', 'grade3Menu', 'grade4Menu', 'learningHubScreen', 'learningPracticeScreen', 'curriculumCatalog', 'curriculumPractice'].includes(id)) top();
      return result;
    };
    window.addEventListener('profile-language-change', () => {
      const next = window.getProfileLang?.() || 'kk'; if (next === language) return; language = next; stop(); entries.forEach(fn => fn());
      if (catalog.classList.contains('active')) renderCatalog(); if (active) renderStep();
    });
    window.addEventListener('pagehide', stop); document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
    window.CorexCurriculumUI = { open: openCatalog, openLesson, lessonIcon, getState: () => ({ grade, lesson: lesson?.id, active, playing, ...(session?.state || {}) }) };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize); else initialize();
})();
