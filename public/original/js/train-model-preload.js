(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', () => {
    const model = window.TrainPhonemeSession;
    if (!model) return;
    const widgets = [];
    const text = (kk, ru) => typeof window.getProfileLang === 'function' && window.getProfileLang() === 'ru' ? ru : kk;
    function create(id) {
      const card = document.createElement('section'); card.id = id; card.className = 'train-model-status';
      const row = document.createElement('div'); row.className = 'train-model-status-row';
      const caption = document.createElement('span'); caption.setAttribute('role','status'); caption.setAttribute('aria-live','polite');
      const percent = document.createElement('span'); percent.setAttribute('aria-hidden','true');
      const progress = document.createElement('progress'); progress.max = 100;
      const retry = document.createElement('button'); retry.type = 'button'; retry.hidden = true;
      retry.addEventListener('click', () => { void model.preload().catch(() => {}); });
      row.append(caption,percent); card.append(row,progress,retry);
      widgets.push({ card, caption, percent, progress, retry }); return card;
    }
    document.querySelector('.header')?.append(create('trainModelStatus'));
    const feedback = document.getElementById('voiceFeedback');
    feedback?.before(create('trainModelExerciseStatus'));
    function render(state) {
      const ready = state.status === 'ready', failed = state.status === 'error';
      const label = ready ? text('✓ Дыбысты тануға дайын','✓ Распознавание готово')
        : failed ? text('Жүктеу үзілді. Қайталап көріңіз.','Загрузка прервалась. Повторите попытку.')
        : state.phase === 'initializing' ? text('Дыбысты тану дайындалуда…','Подготавливаем распознавание…')
        : text('Дыбысты тану жүктелуде…','Загружаем распознавание…');
      for (const { card, caption, percent, progress, retry } of widgets) {
        card.dataset.state = state.status;
        if (caption.textContent !== label) caption.textContent = label;
        percent.textContent = ready || failed ? '' : `${Math.round(state.progress)}%`;
        progress.hidden = ready || failed;
        progress.setAttribute('aria-label',text('Дыбысты тануды жүктеу','Загрузка распознавания'));
        // Unknown download size stays indeterminate; 100% means the worker is ready.
        if (state.progress > 0) progress.value = state.progress; else progress.removeAttribute('value');
        retry.hidden = !failed; retry.textContent = text('Қайта жүктеу','Загрузить снова');
      }
    }
    model.subscribeModel(render);
    window.addEventListener('profile-language-change', () => render(model.modelState));
    // Prepare weights/runtime while the child chooses a level and a letter.
    // This never requests the microphone or records audio.
    setTimeout(() => { void model.preload().catch(() => {}); },0);
  });
})();
