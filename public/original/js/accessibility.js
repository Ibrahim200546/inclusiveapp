/* Keyboard and focus support for the legacy lessons. No exercise logic here. */
(function () {
  'use strict';
  const legacyControls = [
    '.radial-center-btn', '.radial-item', '.center-circle', '.option-circle',
    '.alippe-item', '.character[onclick]', '.card[onclick]', '.image-card[onclick]',
    '.profile-btn', '.profile-action-row[onclick]', '.name-edit-icon',
    '.profile-photo-wrapper[onclick]'
  ].join(',');
  const nativeControls = 'button, input, select, textarea, a[href]';
  let currentScreen = null;
  let pending = false;
  let frameId = 0;

  function setAttribute(element, name, value) {
    if (element.getAttribute(name) !== value) element.setAttribute(name, value);
  }

  function enhanceControls(root) {
    root.querySelectorAll(legacyControls).forEach(function (element) {
      if (element.matches(nativeControls)) return;
      setAttribute(element, 'role', 'button');
      const style = window.getComputedStyle(element);
      const unavailable = element.classList.contains('disabled') ||
        style.display === 'none' || style.visibility === 'hidden' ||
        style.opacity === '0' || style.pointerEvents === 'none';
      setAttribute(element, 'tabindex', unavailable ? '-1' : '0');
      if (element.classList.contains('disabled')) setAttribute(element, 'aria-disabled', 'true');
      else element.removeAttribute('aria-disabled');
    });
    root.querySelectorAll('.radial-center-btn').forEach(function (element) {
      const menu = element.closest('.radial-menu-container');
      if (menu) setAttribute(element, 'aria-expanded', String(menu.classList.contains('active')));
    });
    root.querySelectorAll('.feedback').forEach(function (element) {
      setAttribute(element, 'role', 'status');
      setAttribute(element, 'aria-live', 'polite');
      setAttribute(element, 'aria-atomic', 'true');
    });
  }

  function sync() {
    pending = false;
    const screen = document.querySelector('.screen.active');
    if (screen) enhanceControls(screen);
    if (screen && screen !== currentScreen) {
      // Follow navigation, without moving focus during a lesson or on load.
      if (currentScreen) {
        const destination = screen.querySelector('h1, h2, .radial-center-btn, #voiceCenterBtn') || screen;
        if (!destination.matches(nativeControls + ', [tabindex]')) destination.setAttribute('tabindex', '-1');
        destination.focus({ preventScroll: true });
      }
      currentScreen = screen;
    }
  }

  function scheduleSync() {
    if (pending) return;
    pending = true;
    frameId = window.requestAnimationFrame(sync);
  }

  function init() {
    enhanceControls(document);
    document.querySelectorAll('.profile-btn').forEach(function (element) {
      if (!element.hasAttribute('aria-label')) element.setAttribute('aria-label', 'Профиль');
    });
    document.querySelectorAll('.switch input').forEach(function (element) {
      if (!element.hasAttribute('aria-label')) element.setAttribute('aria-label', 'Тақырып / Тема');
    });
    document.querySelectorAll('.profile-close-btn').forEach(function (element) {
      if (element.textContent.trim() === '×') element.setAttribute('aria-label', 'Жабу / Закрыть');
    });
    document.addEventListener('keydown', function (event) {
      const target = event.target;
      if (!(target instanceof Element) || !target.matches(legacyControls) || target.matches(nativeControls)) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      if (event.repeat || target.getAttribute('aria-disabled') === 'true' || target.tabIndex < 0) return;
      target.click();
    });
    const observer = new MutationObserver(function (mutations) {
      if (mutations.some(function (mutation) {
        return mutation.type === 'childList' || mutation.target.matches('.screen, .radial-menu-container, .letter-circle-container, ' + legacyControls);
      })) scheduleSync();
    });
    const observation = { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'disabled'] };
    observer.observe(document.body, observation);
    window.addEventListener('pagehide', function () {
      observer.disconnect();
      window.cancelAnimationFrame(frameId);
      pending = false;
    });
    window.addEventListener('pageshow', function () {
      observer.observe(document.body, observation);
      scheduleSync();
    });
    window.addEventListener('resize', scheduleSync);
    sync();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
