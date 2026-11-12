(function () {
  'use strict';
  const tr = (kk, ru) => window.getProfileLang?.() === 'ru' ? ru : kk;
  const menuOf = id => document.querySelector('#' + id + ' .radial-menu-container');
  const gradeMenu = grade => 'grade' + (grade < 2 ? 0 : grade) + 'Menu';
  function lessonMenu(lesson) {
    if (lesson.id === 'one-breath' && lesson.grade < 2) return 'grade0TynysByMenu';
    if (lesson.category === 'phonetics') return 'grade0SoundsMenu';
    if (lesson.grade >= 2) return gradeMenu(lesson.grade);
    if (lesson.category === 'speech') return 'grade0DauyspenmMenu';
    if (lesson.category === 'sentence') return 'sentenceModuleScreen';
    return 'learningHubScreen';
  }
  function initialize() {
    const curriculum = window.CorexCurriculumUI, grades = window.CorexGrades;
    const menus = new Set(), refreshers = [];
    function add(parent, label, icon, action) {
      const menu = menuOf(parent); menus.add(menu);
      const control = document.createElement('button'); control.type = 'button'; control.className = 'radial-item';
      control.setAttribute('data-i18n-managed', 'true');
      const picture = document.createElement('div'), caption = document.createElement('p');
      picture.textContent = icon; picture.setAttribute('aria-hidden', 'true');
      const update = () => { caption.textContent = label(); control.setAttribute('aria-label', caption.textContent); };
      update(); refreshers.push(update); control.append(picture, caption);
      control.addEventListener('click', action); menu.append(control); return control;
    }
    for (const grade of [2, 3, 4]) add(gradeMenu(grade), () => tr('Дыбыспен жұмыс', 'Работа со звуком'), '🔊', () => window.showScreen('grade0SoundsMenu'));
    for (const lesson of window.CorexCurriculumContent.lessons) {
      const parent = lessonMenu(lesson);
      if (parent === 'grade0TynysByMenu') continue; // 'Бір деммен' is not offered in the breathing section.
      const control = add(parent, () => lesson.title, curriculum.lessonIcon(lesson), () => curriculum.openLesson(lesson, parent));
      control.dataset.grade = lesson.grade; control.dataset.curriculumId = lesson.id; control.lang = 'kk';
    }
    const voicePresence = add('grade0SoundsMenu', () => tr('Дауыс бар ма?', 'Есть ли голос?'), '🗣️', () => window.showScreen('voicePresenceScreen'));
    voicePresence.dataset.junior = 'true';
    const soundMenu = menuOf('grade0SoundsMenu');
    for (const [category, definition] of Object.entries(window.CorexGradeSounds.categories)) {
      const control = soundMenu.querySelector(`[onclick*="'${definition.screen}'"]`);
      control.dataset.soundCategory = category; control.setAttribute('data-i18n-managed', 'true');
      const update = () => { control.querySelector('p').textContent = category === 'instruments' ? tr('Аспаптар', 'Инструменты') : tr(...definition.labels); control.setAttribute('aria-label', tr(...definition.labels)); control.querySelector('div').textContent = definition.icon; };
      update(); refreshers.push(update);
    }
    const soundBack = document.querySelector('#grade0SoundsMenu button[onclick*="grade0Menu"]');
    soundBack.removeAttribute('onclick'); soundBack.addEventListener('click', () => window.showScreen(grades.parent));
    // Keep the original signal, rhythm and syllable-count mechanics in the junior section.
    for (const control of soundMenu.querySelectorAll('.radial-item[onclick]:not([data-sound-category])')) control.dataset.junior = 'true';
    for (const id of ['grade0VoiceMenu', 'grade0DauyspenmMenu', 'grade0TynysByMenu']) menus.add(menuOf(id));
    const pages = new Map();
    for (const menu of menus) {
      const parent = menu.closest('.screen').id, wrapper = menu.parentElement;
      wrapper.classList.add('grade-menu-wrapper'); menu.classList.add('paged-grade-menu');
      const fixedGrade = /^grade([234])Menu$/.exec(parent);
      const all = [...menu.querySelectorAll(':scope > .radial-item')];
      const nav = document.createElement('nav'); nav.className = 'grade-menu-pages'; nav.setAttribute('data-i18n-managed', 'true');
      const prev = document.createElement('button'), next = document.createElement('button'), index = document.createElement('span');
      prev.type = next.type = 'button'; prev.textContent = '←'; next.textContent = '→'; index.setAttribute('aria-live','polite');
      nav.append(prev, index, next); menu.after(nav);
      function render(offset = 0) {
        const grade = fixedGrade ? Number(fixedGrade[1]) : grades.current;
        const key = parent + ':' + grade;
        const list = all.filter(item => (!item.dataset.junior || grade < 2) && (!item.dataset.grade || Number(item.dataset.grade) === grade));
        const size = 5, count = Math.max(1, Math.ceil(list.length / size));
        const page = Math.max(0, Math.min((pages.get(key) || 0) + offset, count - 1)); pages.set(key, page);
        const shown = list.slice(page * size, (page + 1) * size);
        for (const item of all) {
          const i = shown.indexOf(item); item.hidden = i < 0;
          if (i >= 0) {
            item.style.setProperty('--angle', (i * 360 / shown.length - 90) + 'deg');
            item.style.setProperty('--orbit', '34cqw');
          }
        }
        nav.hidden = count === 1; prev.disabled = page === 0; next.disabled = page === count - 1;
        nav.setAttribute('aria-label', tr('Мәзір беттері', 'Страницы меню'));
        prev.setAttribute('aria-label', tr('Алдыңғы бет', 'Предыдущая страница')); next.setAttribute('aria-label', tr('Келесі бет', 'Следующая страница'));
        index.textContent = (page + 1) + ' / ' + count;
        window.dispatchEvent(new Event('grade-menu-page'));
      }
      prev.addEventListener('click', () => render(-1)); next.addEventListener('click', () => render(1));
      render(); window.addEventListener('learning-grade-change', () => render());
      refreshers.push(() => render());
    }
    let language = window.getProfileLang?.();
    window.addEventListener('profile-language-change', () => {
      const next = window.getProfileLang?.(); if (next === language) return;
      language = next; refreshers.forEach(update => update());
    });
    const show = window.showScreen;
    window.showScreen = function (id) {
      if (id === 'grade0DauyspenmMenu' && document.querySelector('.screen.active')?.id === 'grade0Menu') {
        // Open straight onto the lessons instead of a collapsed centre button.
        const menu = menuOf(id); pages.set(id + ':' + grades.current, 0);
        menu.classList.add('active');
        menu.querySelector(':scope > .radial-center-btn')?.setAttribute('aria-expanded', 'true');
        window.dispatchEvent(new Event('learning-grade-change'));
      }
      return show(id);
    };
  }
  document.addEventListener('DOMContentLoaded', initialize);
})();
