(function () {
  'use strict';
  const screens = new Map([['0-1', 'grade0Menu'], ['2', 'grade2Menu'], ['3', 'grade3Menu'], ['4', 'grade4Menu']]);

  function openGrade() {
    const params = new URLSearchParams(window.location.search);
    const screen = screens.get(params.get('grade'));
    if (!screen || !document.getElementById(screen) || typeof window.showScreen !== 'function') return;
    const language = params.get('lang');
    if (language === 'kk' || language === 'ru') window.applyProfileLanguage?.(language);
    window.showScreen(screen);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', openGrade, { once: true });
  else openGrade();
})();
