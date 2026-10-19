(function () {
  'use strict';
  const ns = 'http://www.w3.org/2000/svg';
  // Local vector strokes keep the handwritten numbers identical on every device.
  const digits = [
    'M17 7 C3 8 1 41 12 42 C25 43 31 5 17 7Z',
    'M7 17 L19 7 L14 42 M5 42 L25 42',
    'M5 16 C11 0 34 7 22 21 L3 41 L26 41',
    'M6 9 C29 0 33 18 15 23 C34 18 29 46 5 40',
    'M20 6 L3 29 L29 29 M24 7 L18 43',
    'M29 7 L11 7 L6 24 C32 13 33 46 4 40',
    'M28 7 C8 10 0 37 12 42 C32 46 34 21 13 25',
    'M4 8 L31 8 C20 18 15 29 10 43',
    'M17 23 C-2 16 13 0 25 8 C36 20 2 27 5 38 C10 53 39 32 17 23Z',
    'M25 25 C-2 34 4 4 22 7 C38 12 19 39 7 43',
  ];
  function number(value) {
    const svg = document.createElementNS(ns, 'svg'), chars = String(value).split('');
    svg.setAttribute('viewBox', `0 0 ${chars.length * 36 + 8} 52`); svg.setAttribute('aria-hidden', 'true'); svg.classList.add('handwritten-number');
    chars.forEach((char, index) => {
      const path = document.createElementNS(ns, 'path'); path.setAttribute('d', digits[Number(char)]);
      path.setAttribute('transform', `translate(${index * 36 + 8} 2) skewX(-9)`); svg.append(path);
    }); return svg;
  }
  function layout(menu, title, { scattered = false, items = [...menu.children] } = {}) {
    menu.querySelector(':scope > .radial-center-btn')?.remove();
    menu.classList.add('radial-menu-container', 'exercise-orbit', 'active'); menu.classList.toggle('exercise-orbit-numbers', scattered);
    menu.dataset.longTitle = String(title.length > 30);
    items.forEach((item, index) => {
      item.classList.add('radial-item');
      // Disjoint angular slots allow randomness without colliding touch targets.
      const angle = -90 + index * 360 / items.length + (scattered ? (Math.random() - .5) * 8 : 0);
      item.style.setProperty('--angle', angle + 'deg');
      item.style.setProperty('--orbit', scattered ? (36.5 + Math.random() * 4) + 'cqw' : '34cqw');
    });
    const center = document.createElement('button'); center.type = 'button'; center.className = 'radial-center-btn'; center.textContent = title;
    center.setAttribute('aria-expanded', 'true');
    center.addEventListener('click', () => window.toggleRadialGradeMenu(center)); menu.append(center); return center;
  }
  function illustrate(control, illustration, caption, { iconClass = '', captionClass = '' } = {}) {
    const label = control.getAttribute('aria-label') || control.textContent;
    const picture = document.createElement('div'), description = document.createElement('p');
    picture.className = 'exercise-orbit-icon' + (iconClass ? ' ' + iconClass : ''); picture.setAttribute('aria-hidden', 'true');
    if (typeof illustration === 'string') picture.textContent = illustration; else picture.append(illustration);
    description.className = 'exercise-orbit-caption' + (captionClass ? ' ' + captionClass : ''); description.textContent = caption ?? label;
    control.replaceChildren(picture, description); control.setAttribute('aria-label', label); return control;
  }
  window.CorexExerciseOrbit = { layout, number, illustrate };
})();
