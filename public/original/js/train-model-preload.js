(function () {
  'use strict';
  function initialize() {
    const model = window.TrainPhonemeSession;
    if (!model || document.getElementById('trainModelStatus')) return;
    const text = (kk, ru) => (typeof window.getProfileLang === 'function'
      ? window.getProfileLang() : localStorage.getItem('locale')) === 'kk' ? kk : ru;
    const card = document.createElement('aside'); card.id = 'trainModelStatus'; card.className = 'train-model-status';
    const caption = document.createElement('span'); caption.setAttribute('role','status'); caption.setAttribute('aria-live','polite');
    const percent = document.createElement('span'); percent.setAttribute('aria-hidden','true');
    const progress = document.createElement('progress'); progress.max = 100;
    const retry = document.createElement('button'); retry.type = 'button'; retry.hidden = true; retry.textContent = '↻';
    retry.addEventListener('click', () => { void model.preload().catch(() => {}); });
    card.append(caption,percent,retry,progress); document.body.append(card);
    let readyTimer;
    function render(state) {
      clearTimeout(readyTimer); card.hidden = false; card.dataset.state = state.status;
      const ready = state.status === 'ready', failed = state.status === 'error';
      const label = ready ? text('✓ Дыбыс дайын','✓ Голос готов')
        : failed ? text('Дыбыс дайын емес','Голос не готов') : text('Дыбыс дайындалуда','Подготовка голоса');
      if (caption.textContent !== label) caption.textContent = label;
      percent.textContent = ready || failed ? '' : `${Math.round(state.progress)}%`;
      progress.hidden = ready || failed;
      progress.setAttribute('aria-label',text('Дыбысты тануды жүктеу','Загрузка распознавания'));
      if (state.progress > 0) progress.value = state.progress; else progress.removeAttribute('value');
      retry.hidden = !failed;
      retry.setAttribute('aria-label',text('Қайта жүктеу','Загрузить снова'));
      retry.title = text('Дыбысты тануды қайта дайындау','Повторить подготовку распознавания');
      if (ready) readyTimer = setTimeout(() => { card.hidden = true; },3500);
    }
    model.subscribeModel(render);
    window.addEventListener('profile-language-change', () => render(model.modelState));
    setTimeout(() => { void model.preload().catch(() => {}); },0);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',initialize);
  else initialize();
})();
