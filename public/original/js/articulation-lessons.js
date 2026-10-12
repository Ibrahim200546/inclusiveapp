(function () {
  'use strict';

  const menuScreen = document.getElementById('grade0DauysShakMenu');
  const menu = menuScreen?.querySelector('.radial-menu-container');
  const container = document.querySelector('.container');
  if (!menu || !container) return;

  const copy = {
    kk: {
      title: 'Артикуляция', game: 'Жоғалған Қ', autumn: 'Күзгі оқиға', back: 'Дауыс шақыруға оралу',
      breadcrumb: '1-деңгей · Дауыс шақыру', intro: 'Қараңыз. Бірге қайталаңыз.',
      note: 'Үш шағын жаттығу — асықпай, өз қарқыныңызбен.',
      play: 'Көрсету', pause: 'Кідірту', restart: 'Қайта көрсету', speed: 'Қарқын',
      slow: 'Баяу', normal: 'Қалыпты', progress: 'Анимацияның барысы',
      steps: 'Қалай орындау керек?', phase: 'Қазір', prev: 'Алдыңғы', next: 'Келесі',
      learn: 'Бірге орындаймыз', quiz: 'Үш жануарға жоғалған дыбысты қайтарыңыз.', autumnIntro: 'Анимацияны көріп, дұрыс суретті таңдаңыз.',
      unavailable: 'Анимация жүктелмеді. Бетті жаңартып көріңіз.',
      teeth: { title: 'Тіс тазалау', hint: 'Тіл ұшымен — оңға, солға.', steps: ['Ауызды ашыңыз.', 'Тіл ұшын үстіңгі тістердің ішкі жағына тигізіп, оңға-солға жылжытыңыз.', 'Төменгі тістердің ішкі жағында да қайталаңыз.'] },
      ball: { title: 'Доп', hint: 'Бір ұрттан — екінші ұртқа.', steps: ['Ерінді жұмып, ұртқа аздап ауа жинаңыз.', 'Ауаны бір ұрттан екіншісіне кезекпен ауыстырыңыз.', 'Ерінді қозғалтпай, жай қайталаңыз.'] },
      hill: { title: 'Төбешік', hint: 'Тіл ұшы төменде, ортасы жоғарыда.', steps: ['Ауызды ашыңыз.', 'Тіл ұшын төменгі тістердің артына тіреңіз.', 'Тілдің ортаңғы бөлігін жоғары көтеріп, төбешік жасаңыз.'] },
      phases: { prepare: 'Дайындаламыз', upper: 'Үстіңгі тістер', lower: 'Төменгі тістер', left: 'Бірінші ұрт', right: 'Екінші ұрт', lift: 'Тілдің ортасын көтереміз', hold: 'Төбешікті ұстаймыз', relax: 'Демаламыз' },
    },
    ru: {
      title: 'Артикуляция', game: 'Пропавшая Қ', autumn: 'Осенняя история', back: 'Назад к вызову голоса',
      breadcrumb: 'Уровень 1 · Вызов голоса', intro: 'Посмотрите. Повторите вместе.',
      note: 'Три небольших упражнения — спокойно, в своём темпе.',
      play: 'Показать', pause: 'Пауза', restart: 'Показать снова', speed: 'Темп',
      slow: 'Медленно', normal: 'Обычно', progress: 'Ход анимации',
      steps: 'Как выполнять?', phase: 'Сейчас', prev: 'Предыдущее', next: 'Следующее',
      learn: 'Выполняем вместе', quiz: 'Верните пропавший звук трём животным.', autumnIntro: 'Посмотрите анимацию и выберите верную картинку.',
      unavailable: 'Анимация не загрузилась. Попробуйте обновить страницу.',
      teeth: { title: 'Чистим зубы', hint: 'Кончиком языка — вправо, влево.', steps: ['Откройте рот.', 'Кончиком языка проведите вправо-влево по внутренней стороне верхних зубов.', 'Повторите по внутренней стороне нижних зубов.'] },
      ball: { title: 'Мяч', hint: 'Из одной щеки — в другую.', steps: ['Сомкните губы и наберите немного воздуха в щёку.', 'Попеременно перемещайте воздух из одной щеки в другую.', 'Повторяйте спокойно, не двигая губами.'] },
      hill: { title: 'Горка', hint: 'Кончик внизу, середина вверху.', steps: ['Откройте рот.', 'Уприте кончик языка за нижними зубами.', 'Поднимите среднюю часть языка, чтобы получилась горка.'] },
      phases: { prepare: 'Готовимся', upper: 'Верхние зубы', lower: 'Нижние зубы', left: 'Первая щека', right: 'Вторая щека', lift: 'Поднимаем середину языка', hold: 'Держим горку', relax: 'Отдыхаем' },
    },
  };
  const exercises = ['teeth', 'ball', 'hill'];
  let selected = 'teeth';
  let animation = null;
  let adventure = null;
  let autumn = null;
  let currentScreen = '';
  let speed = 0.75;
  let lastPhase = '';

  function locale() {
    return (localStorage.getItem('profileLang') || localStorage.getItem('locale') || 'kk').startsWith('ru') ? 'ru' : 'kk';
  }
  function labels() { return copy[locale()]; }

  const icons = {
    articulation: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M7 25c5-13 29-13 34 0-6 13-28 13-34 0Z" fill="#df7690"/><path d="M12 25c6-6 18-6 24 0-6 7-18 7-24 0Z" fill="#793e59"/><path d="M17 27c4-4 10-4 14 0-2 5-12 5-14 0Z" fill="#ffabb8"/></svg>',
    game: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="5" y="6" width="38" height="36" rx="13" fill="#367b72"/><text x="24" y="33" text-anchor="middle" font-size="28" font-weight="800" fill="white">Қ</text></svg>',
    autumn: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M37 6C19 7 8 19 13 32c15 7 27-7 24-26Z" fill="#c28037"/><path d="M9 42 32 15M19 31 19 20M26 24 35 23" stroke="#6f4b2c" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
  };
  function addMenuItem(id, angle, icon) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'radial-item art-module-nav';
    button.style.setProperty('--angle', `${angle}deg`);
    button.style.setProperty('--dist', '220px');
    button.innerHTML = icons[icon] + '<p></p>';
    button.dataset.artModuleTarget = id;
    button.addEventListener('click', () => window.showScreen(id));
    menu.appendChild(button);
  }
  addMenuItem('g0ArticulationLessons', 0, 'articulation');
  addMenuItem('g0QSoundAdventure', 180, 'game');
  addMenuItem('g0AutumnStory', 225, 'autumn');
  // Give all five choices equal space around the existing central circle.
  menu.querySelectorAll(':scope > .radial-item').forEach((item, index) => item.style.setProperty('--angle', `${270 + index * 72}deg`));

  const lessonScreen = document.createElement('section');
  lessonScreen.id = 'g0ArticulationLessons';
  lessonScreen.className = 'screen art-module-screen';
  lessonScreen.setAttribute('aria-labelledby', 'artModuleTitle');
  const gameScreen = document.createElement('section');
  gameScreen.id = 'g0QSoundAdventure';
  gameScreen.className = 'screen art-module-screen';
  gameScreen.setAttribute('aria-labelledby', 'artGameTitle');
  const autumnScreen = document.createElement('section');
  autumnScreen.id = 'g0AutumnStory';
  autumnScreen.className = 'screen art-module-screen';
  autumnScreen.setAttribute('aria-labelledby', 'artAutumnTitle');
  container.append(lessonScreen, gameScreen, autumnScreen);

  function updateNav() {
    menu.querySelector('[data-art-module-target="g0ArticulationLessons"] p').textContent = labels().title;
    menu.querySelector('[data-art-module-target="g0QSoundAdventure"] p').textContent = labels().game;
    menu.querySelector('[data-art-module-target="g0AutumnStory"] p').textContent = labels().autumn;
  }
  function backButton() {
    const button = document.createElement('button');
    button.className = 'art-module-back';
    button.type = 'button';
    button.textContent = `← ${labels().back}`;
    button.addEventListener('click', () => window.showScreen('grade0DauysShakMenu'));
    return button;
  }
  function renderLesson() {
    animation?.destroy();
    animation = null;
    lastPhase = '';
    const l = labels();
    const lesson = l[selected];
    const number = exercises.indexOf(selected) + 1;
    lessonScreen.innerHTML = `
      <div class="art-module-wrap">
        <div class="art-module-breadcrumb">${l.breadcrumb}</div>
        <header class="art-module-header"><div><p class="art-module-eyebrow">${l.learn}</p><h2 id="artModuleTitle">${l.title}</h2><p>${l.note}</p></div><span class="art-module-count">0${number} / 03</span></header>
        <div class="art-module-tabs" role="group" aria-label="${l.title}">${exercises.map((id, i) => `<button type="button" data-art-lesson="${id}" aria-pressed="${id === selected}" class="art-module-tab"><span>0${i + 1}</span><strong>${l[id].title}</strong></button>`).join('')}</div>
        <div class="art-module-workspace">
          <div class="art-module-stage-panel"><div class="art-module-stage-heading"><span>${l.intro}</span><span class="art-module-stage-dot" aria-hidden="true"></span></div><div id="artModuleStage" class="art-module-stage"></div><p class="art-module-phase" aria-live="polite"><span>${l.phase}: </span><strong id="artModulePhase">${l.phases.prepare}</strong></p></div>
          <article class="art-module-guide"><span class="art-module-lesson-number">0${number}</span><h3>${lesson.title}</h3><p class="art-module-hint">${lesson.hint}</p><h4>${l.steps}</h4><ol>${lesson.steps.map(step => `<li>${step}</li>`).join('')}</ol></article>
        </div>
        <div class="art-module-controls">
          <div class="art-module-playback"><button type="button" id="artModulePlay" class="art-module-primary" aria-pressed="false">▶ ${l.play}</button><button type="button" id="artModuleRestart" class="art-module-secondary">↻ ${l.restart}</button></div>
          <label class="art-module-speed">${l.speed}<select id="artModuleSpeed"><option value="0.5">${l.slow} · 0.5×</option><option value="0.75">0.75×</option><option value="1">${l.normal} · 1×</option></select></label>
          <label class="art-module-timeline"><span>${l.progress}</span><input type="range" id="artModuleProgress" min="0" max="100" step="0.1" value="0"></label>
        </div>
        <div class="art-module-bottom"><div id="artModuleBackSlot"></div><div class="art-module-nextprev"><button type="button" id="artModulePrev">← ${l.prev}</button><button type="button" id="artModuleNext">${l.next} →</button></div></div>
      </div>`;
    lessonScreen.querySelector('#artModuleBackSlot').appendChild(backButton());
    lessonScreen.querySelectorAll('[data-art-lesson]').forEach(button => button.addEventListener('click', () => selectLesson(button.dataset.artLesson)));
    const play = lessonScreen.querySelector('#artModulePlay');
    const progress = lessonScreen.querySelector('#artModuleProgress');
    const speedControl = lessonScreen.querySelector('#artModuleSpeed');
    speedControl.value = String(speed);
    const onFrame = frame => {
      if (Number.isFinite(frame.progress)) progress.value = String(frame.progress * 100);
      const playing = Boolean(frame.playing);
      play.setAttribute('aria-pressed', String(playing));
      play.textContent = playing ? `Ⅱ ${l.pause}` : `▶ ${l.play}`;
      if (frame.phaseKey !== lastPhase) {
        lastPhase = frame.phaseKey;
        lessonScreen.querySelector('#artModulePhase').textContent = l.phases[frame.phaseKey] || l.phases.prepare;
      }
    };
    if (window.EduArticulationAnimations) {
      animation = window.EduArticulationAnimations.mount(lessonScreen.querySelector('#artModuleStage'), selected, { onFrame, label: lesson.title, description: lesson.hint });
      animation.setSpeed(speed);
    } else {
      lessonScreen.querySelector('#artModuleStage').textContent = l.unavailable;
      play.disabled = true;
    }
    play.addEventListener('click', () => {
      if (play.getAttribute('aria-pressed') === 'true') animation?.pause();
      else animation?.play();
    });
    lessonScreen.querySelector('#artModuleRestart').addEventListener('click', () => { animation?.restart(); animation?.play(); });
    progress.addEventListener('input', () => {
      const requestedProgress = Number(progress.value) / 100;
      animation?.pause();
      animation?.seek(requestedProgress);
    });
    speedControl.addEventListener('change', () => { speed = Number(speedControl.value); animation?.setSpeed(speed); });
    const prev = lessonScreen.querySelector('#artModulePrev');
    const next = lessonScreen.querySelector('#artModuleNext');
    prev.disabled = number === 1;
    next.disabled = number === 3;
    prev.addEventListener('click', () => selectLesson(exercises[number - 2]));
    next.addEventListener('click', () => selectLesson(exercises[number]));
  }
  function selectLesson(id) {
    if (!exercises.includes(id)) return;
    selected = id;
    renderLesson();
    lessonScreen.querySelector(`[data-art-lesson="${id}"]`)?.focus({ preventScroll: true });
  }
  function renderGame() {
    adventure?.destroy();
    gameScreen.innerHTML = `<div class="art-module-wrap"><div class="art-module-breadcrumb">${labels().breadcrumb}</div><header class="art-module-header"><div><p class="art-module-eyebrow">Қ · К · Ғ</p><h2 id="artGameTitle">${labels().game}</h2><p>${labels().quiz}</p></div></header><div id="artQGame"></div><div class="art-module-bottom" id="artGameBackSlot"></div></div>`;
    gameScreen.querySelector('#artGameBackSlot').appendChild(backButton());
    if (!window.EduQSoundAdventure) {
      gameScreen.querySelector('#artQGame').textContent = labels().unavailable;
      return;
    }
    adventure = window.EduQSoundAdventure.mount(gameScreen.querySelector('#artQGame'), {
      locale: locale(),
      onComplete: () => { if (gameScreen.classList.contains('active')) window.showReward?.(); },
      onSpeak: async text => {
        const result = await window.appTts?.speakText(text, 'kk-KZ', { waitUntilEnd: true });
        return result === true || result?.ok === true;
      },
      onStopSpeech: () => window.appTts?.stop(),
    });
  }
  function screenChanged() {
    const next = lessonScreen.classList.contains('active') ? lessonScreen.id : gameScreen.classList.contains('active') ? gameScreen.id : autumnScreen.classList.contains('active') ? autumnScreen.id : '';
    if (next === currentScreen) return;
    animation?.destroy();
    animation = null;
    adventure?.destroy();
    adventure = null;
    autumn?.destroy();
    autumn = null;
    if (currentScreen && window.appTts?.stop) window.appTts.stop();
    currentScreen = next;
    if (next === lessonScreen.id) renderLesson();
    if (next === gameScreen.id) renderGame();
    if (next === autumnScreen.id) renderAutumn();
  }
  function renderAutumn() {
    autumn?.destroy();
    autumnScreen.innerHTML = `<div class="art-module-wrap"><div class="art-module-breadcrumb">${labels().breadcrumb}</div><header class="art-module-header"><div><p class="art-module-eyebrow">${labels().learn}</p><h2 id="artAutumnTitle">${labels().autumn}</h2><p>${labels().autumnIntro}</p></div></header><div id="artAutumnGame"></div><div class="art-module-bottom" id="artAutumnBackSlot"></div></div>`;
    autumnScreen.querySelector('#artAutumnBackSlot').appendChild(backButton());
    if (!window.EduAutumnStory) {
      autumnScreen.querySelector('#artAutumnGame').textContent = labels().unavailable;
      return;
    }
    autumn = window.EduAutumnStory.mount(autumnScreen.querySelector('#artAutumnGame'), {
      locale: locale(),
      onComplete: () => { if (autumnScreen.classList.contains('active')) window.showReward?.(); },
      onSpeak: async (text, lang) => {
        const result = await window.appTts?.speakText(text, lang === 'ru' ? 'ru-RU' : 'kk-KZ', { waitUntilEnd: true });
        return result === true || result?.ok === true;
      },
      onStopSpeech: () => window.appTts?.stop(),
    });
  }
  const observer = new MutationObserver(screenChanged);
  observer.observe(lessonScreen, { attributes: true, attributeFilter: ['class'] });
  observer.observe(gameScreen, { attributes: true, attributeFilter: ['class'] });
  observer.observe(autumnScreen, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('profile-language-change', () => {
    updateNav();
    if (currentScreen === lessonScreen.id) {
      const savedPlayback = animation?.getState?.();
      const focusedControlId = lessonScreen.contains(document.activeElement) ? document.activeElement.id : '';
      renderLesson();
      if (savedPlayback) {
        animation?.seek(savedPlayback.progress);
        if (savedPlayback.playing && !document.hidden) animation?.play();
      }
      if (focusedControlId) document.getElementById(focusedControlId)?.focus({ preventScroll: true });
    }
    if (currentScreen === gameScreen.id) adventure?.setLocale?.(locale());
    if (currentScreen === gameScreen.id) {
      gameScreen.querySelector('#artGameTitle').textContent = labels().game;
      gameScreen.querySelector('.art-module-header p:last-child').textContent = labels().quiz;
      const back = gameScreen.querySelector('.art-module-back');
      if (back) back.textContent = `← ${labels().back}`;
      gameScreen.querySelector('.art-module-breadcrumb').textContent = labels().breadcrumb;
    }
    if (currentScreen === autumnScreen.id) {
      autumn?.setLocale?.(locale());
      autumnScreen.querySelector('#artAutumnTitle').textContent = labels().autumn;
      autumnScreen.querySelector('.art-module-header p:last-child').textContent = labels().autumnIntro;
      autumnScreen.querySelector('.art-module-eyebrow').textContent = labels().learn;
      autumnScreen.querySelector('.art-module-breadcrumb').textContent = labels().breadcrumb;
      autumnScreen.querySelector('.art-module-back').textContent = `← ${labels().back}`;
    }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) animation?.pause(); });
  window.EduArticulationLessons = { selectLesson, getState: () => ({ selected, currentScreen, animation: animation?.getState?.(), game: adventure?.getState?.(), autumn: autumn?.getState?.() }) };
  updateNav();
  screenChanged();
})();
