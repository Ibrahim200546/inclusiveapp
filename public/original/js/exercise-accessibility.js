(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', () => {
    const nodes = document.querySelectorAll('.radial-menu-container .radial-center, .radial-menu-container .radial-item, #g0Task3 .center-circle, #g0Task3 .option-circle, #g0TaskSyllables .center-circle, #g0TaskSyllables .option-circle');
    for (const node of nodes) {
      if (node.tagName === 'BUTTON') continue;
      node.setAttribute('role', 'button');
      node.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); node.click(); }
      });
    }
    const update = () => {
      for (const node of nodes) {
        const menu = node.closest('.radial-menu-container');
        const collapsedItem = node.classList.contains('radial-item') && menu && !menu.classList.contains('active');
        node.tabIndex = node.closest('.screen')?.classList.contains('active') && !collapsedItem ? 0 : -1;
        if (node.classList.contains('radial-center')) node.setAttribute('aria-expanded', String(menu.classList.contains('active')));
      }
    };
    update();
    const observer = new MutationObserver(update);
    for (const node of document.querySelectorAll('.screen, .radial-menu-container')) observer.observe(node, {attributes:true,attributeFilter:['class']});
  });
})();
