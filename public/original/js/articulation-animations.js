(function () {
  'use strict';

  // Self-contained vector lessons. Nothing is recorded, fetched or played automatically.
  const mounted = new WeakMap();
  let sequence = 0;
  const durationMs = 10000;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const smooth = value => value * value * (3 - 2 * value);
  const easeRange = (value, start, end) => smooth(clamp((value - start) / (end - start), 0, 1));
  const ids = ['teeth', 'ball', 'hill'];
  const phases = {
    teeth: ['prepare', 'upper', 'lower', 'relax'],
    ball: ['prepare', 'left', 'right', 'relax'],
    hill: ['prepare', 'lift', 'hold', 'relax']
  };

  function definitions(id) {
    return `<defs>
      <linearGradient id="${id}-sky" x2="1" y2="1"><stop stop-color="#edf9ff"/><stop offset="1" stop-color="#f5edff"/></linearGradient>
      <radialGradient id="${id}-skin" cx=".4" cy=".3" r=".8"><stop stop-color="#ffe0c9"/><stop offset=".56" stop-color="#f7c2a5"/><stop offset="1" stop-color="#dc967e"/></radialGradient>
      <radialGradient id="${id}-cheek" cx=".4" cy=".35"><stop stop-color="#ffd9ba"/><stop offset=".7" stop-color="#f5b69c"/><stop offset="1" stop-color="#e49883"/></radialGradient>
      <linearGradient id="${id}-hair" x2=".8" y2="1"><stop stop-color="#754535"/><stop offset=".5" stop-color="#4b2a28"/><stop offset="1" stop-color="#301e26"/></linearGradient>
      <radialGradient id="${id}-mouth"><stop stop-color="#773747"/><stop offset="1" stop-color="#3c2338"/></radialGradient>
      <linearGradient id="${id}-lip" x2="0" y2="1"><stop stop-color="#f6a69e"/><stop offset="1" stop-color="#d97480"/></linearGradient>
      <linearGradient id="${id}-tooth" x2=".1" y2="1"><stop stop-color="#fff"/><stop offset=".65" stop-color="#fffdf5"/><stop offset="1" stop-color="#dce1e9"/></linearGradient>
      <linearGradient id="${id}-tongue" x2=".3" y2="1"><stop stop-color="#ffb5b7"/><stop offset=".45" stop-color="#ee8498"/><stop offset="1" stop-color="#c35d7d"/></linearGradient>
      <linearGradient id="${id}-shirt" x2="1" y2="1"><stop stop-color="#69b5df"/><stop offset="1" stop-color="#6d79cc"/></linearGradient>
      <filter id="${id}-shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#676298" flood-opacity=".18"/></filter>
      <filter id="${id}-soft"><feGaussianBlur stdDeviation="7"/></filter>
      <marker id="${id}-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="none" stroke="#7466bc" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></marker>
    </defs>`;
  }

  function frame(id) {
    return `<rect class="art-scene-background" x="8" y="8" width="784" height="544" rx="38" fill="url(#${id}-sky)"/>
      <circle cx="94" cy="110" r="42" fill="#fff" opacity=".45"/>
      <circle cx="728" cy="430" r="70" fill="#dbe9f7" opacity=".48"/>
      <path d="M686 88h24m-12-12v24M80 438h18m-9-9v18" stroke="#b4a5d3" stroke-width="5" stroke-linecap="round" opacity=".65"/>
      <ellipse cx="400" cy="501" rx="229" ry="17" fill="#a4a1cb" opacity=".13"/>`;
  }

  function eyes(id, y, spacing) {
    return `<g class="art-eyes">
      <path d="M${400 - spacing - 26} ${y - 34}q26-17 52-1M${400 + spacing - 26} ${y - 35}q26-16 52 1" fill="none" stroke="#644137" stroke-width="9" stroke-linecap="round"/>
      ${[-1, 1].map(side => `<g transform="translate(${400 + side * spacing} ${y})"><ellipse rx="25" ry="28" fill="#fff8f0"/><ellipse rx="16" ry="22" fill="#556b79"/><ellipse rx="10" ry="17" fill="#283345"/><ellipse cx="-5" cy="-8" rx="5" ry="7" fill="#fff"/><circle cx="7" cy="8" r="3" fill="#fff" opacity=".8"/></g>`).join('')}
      <path d="M389 ${y + 44}q11 8 22 0" fill="none" stroke="#d78b75" stroke-width="6" stroke-linecap="round"/>
    </g>`;
  }

  function hair(id, top) {
    return `<path d="M186 ${top + 111}C174 ${top + 9} 258 ${top - 43} 390 ${top - 26}C510 ${top - 59} 637 ${top + 23} 616 ${top + 133}L592 ${top + 82}C558 ${top + 77} 514 ${top + 52} 491 ${top + 27}C424 ${top + 86} 308 ${top + 73} 252 ${top + 55}L208 ${top + 125}Z" fill="url(#${id}-hair)"/>
      <path d="M243 ${top + 24}C322 ${top - 15} 387 ${top + 8} 421 ${top + 22}M484 ${top + 5}q63 4 93 48" stroke="#a57253" stroke-width="10" stroke-linecap="round" opacity=".45" fill="none"/>`;
  }

  function toothRow(id, upper) {
    const widths = [34, 39, 42, 43, 43, 42, 39, 34];
    let x = 242;
    return widths.map((width, index) => {
      const arch = Math.abs(index - 3.5) * 3;
      const y = upper ? 209 + arch : 364 - arch;
      const height = upper ? 50 - arch * .6 : 35;
      const shape = `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${upper ? 10 : 8}" fill="url(#${id}-tooth)" stroke="#d3c5ca" stroke-width="1.5"/>`;
      x += width + 1;
      return shape;
    }).join('');
  }

  function teethScene(id) {
    return `<g filter="url(#${id}-shadow)">
      <path d="M215 508q13-85 125-93h120q112 8 125 93" fill="url(#${id}-shirt)"/>
      <path d="M352 434v53q48 36 96 0v-53" fill="url(#${id}-skin)"/>
      <ellipse cx="194" cy="270" rx="29" ry="47" fill="#edb198"/><ellipse cx="606" cy="270" rx="29" ry="47" fill="#edb198"/>
      <path d="M400 57C244 57 186 150 197 302C207 428 281 474 400 476C519 474 593 428 603 302C614 150 556 57 400 57Z" fill="url(#${id}-skin)"/>
      ${hair(id, 61)}${eyes(id, 167, 91)}
      <ellipse cx="249" cy="294" rx="39" ry="20" fill="#ee9e98" opacity=".3"/><ellipse cx="551" cy="294" rx="39" ry="20" fill="#ee9e98" opacity=".3"/>
      <ellipse cx="400" cy="314" rx="193" ry="118" fill="url(#${id}-lip)" stroke="#cf7d82" stroke-width="3"/>
      <ellipse cx="400" cy="309" rx="179" ry="103" fill="url(#${id}-mouth)"/>
      <clipPath id="${id}-mouthclip"><ellipse cx="400" cy="309" rx="179" ry="103"/></clipPath>
      <g clip-path="url(#${id}-mouthclip)">
        <path d="M215 205Q400 188 585 205v30Q400 220 215 237Z" fill="#d38391"/>
        <path data-art="tongue" fill="url(#${id}-tongue)" stroke="#ca647f" stroke-width="3" stroke-linejoin="round"/>
        <path data-art="tongue-shine" fill="none" stroke="#ffc4c7" stroke-width="8" stroke-linecap="round" opacity=".64"/>
        ${toothRow(id, true)}
        <path d="M216 390Q400 417 584 390v25H216Z" fill="#c87586"/>
        ${toothRow(id, false)}
      </g>
      <path d="M275 224q112-33 249 0" fill="none" stroke="#ffe0d5" stroke-width="5" opacity=".62" stroke-linecap="round"/>
      <path d="M292 422q109 21 214-2" fill="none" stroke="#ffc7b3" stroke-width="6" opacity=".65" stroke-linecap="round"/>
    </g>
    <path data-art="guide" fill="none" stroke="#7a68bf" stroke-width="4" stroke-linecap="round" stroke-dasharray="2 10" opacity=".6"/>
    <circle data-art="target" r="9" fill="#fff" stroke="#8672c8" stroke-width="3"/>
    <g transform="translate(686 270)"><circle r="34" fill="#fff" opacity=".9"/><path d="M-15-7h30M-15 7h30" stroke="#9ba7b5" stroke-width="5" stroke-linecap="round"/><path data-art="side-arrow" d="M-20 0H20" fill="none" stroke="#7966bc" stroke-width="4" marker-end="url(#${id}-arrow)"/></g>`;
  }

  function ballScene(id) {
    return `<g filter="url(#${id}-shadow)">
      <path d="M209 513q22-87 132-97h118q110 10 132 97" fill="url(#${id}-shirt)"/>
      <path d="M352 432v51q48 39 96 0v-51" fill="url(#${id}-skin)"/>
      <ellipse cx="185" cy="254" rx="27" ry="44" fill="#edb198"/><ellipse cx="615" cy="254" rx="27" ry="44" fill="#edb198"/>
      <path data-art="face" fill="url(#${id}-skin)"/>
      ${hair(id, 78)}${eyes(id, 212, 83)}
      <g data-art="left-cheek"><ellipse cx="260" cy="348" rx="62" ry="60" fill="url(#${id}-cheek)"/><ellipse cx="245" cy="342" rx="25" ry="19" fill="#edaaa1" opacity=".35"/><path d="M229 311q-22 30-8 54" fill="none" stroke="#ffe6cf" stroke-width="8" opacity=".65" stroke-linecap="round"/></g>
      <g data-art="right-cheek"><ellipse cx="540" cy="348" rx="62" ry="60" fill="url(#${id}-cheek)"/><ellipse cx="555" cy="342" rx="25" ry="19" fill="#edaaa1" opacity=".35"/><path d="M571 311q22 30 8 54" fill="none" stroke="#ffe6cf" stroke-width="8" opacity=".65" stroke-linecap="round"/></g>
      <path d="M353 337Q382 326 400 333Q417 326 447 337Q426 357 400 356Q374 357 353 337Z" fill="url(#${id}-lip)"/>
      <path d="M355 339q45 5 90 0" fill="none" stroke="#bc7480" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M373 331q10-2 17 0" fill="none" stroke="#ffd0c2" stroke-width="4" stroke-linecap="round"/>
    </g>
    <g data-art="air-left" opacity="0"><ellipse cx="245" cy="344" rx="38" ry="35" fill="#fff" opacity=".2"/><path d="M219 342q-2-21 19-25" stroke="#fff" stroke-width="4" opacity=".65" fill="none" stroke-linecap="round"/></g>
    <g data-art="air-right" opacity="0"><ellipse cx="555" cy="344" rx="38" ry="35" fill="#fff" opacity=".2"/><path d="M568 320q20 9 15 30" stroke="#fff" stroke-width="4" opacity=".65" fill="none" stroke-linecap="round"/></g>
    <g data-art="air-guide"><path d="M273 402Q400 459 527 402" fill="none" stroke="#7e70b7" stroke-width="4" stroke-dasharray="2 11" stroke-linecap="round" opacity=".6"/><circle data-art="air-dot" r="10" fill="#a192d7" stroke="#fff" stroke-width="3"/></g>
    <g transform="translate(105 355)"><circle r="33" fill="#fff" opacity=".86"/><path d="M-13-3q13-18 26 0q-13 18-26 0Z" fill="none" stroke="#9b7f9e" stroke-width="3"/><path d="M-15 0H15" stroke="#9b7f9e" stroke-width="3" stroke-linecap="round"/></g>`;
  }

  function hillScene(id) {
    return `<g filter="url(#${id}-shadow)">
      <path d="M198 482Q151 455 158 390L132 347Q123 333 150 316L129 284Q120 273 153 262L190 239Q195 173 246 123Q324 48 456 81Q609 96 625 231L602 444Q578 482 530 483Z" fill="url(#${id}-skin)" stroke="#d39380" stroke-width="3"/>
      <path d="M198 239Q190 126 294 78Q414 20 537 107Q625 165 616 257L574 194Q533 177 480 131Q369 169 291 134L220 204Z" fill="url(#${id}-hair)"/>
      <path d="M254 111q102-39 169 1" stroke="#a57253" stroke-width="10" fill="none" opacity=".5" stroke-linecap="round"/>
      <path d="M201 481Q336 466 520 483L551 512H205Z" fill="url(#${id}-shirt)"/>
      <ellipse cx="234" cy="209" rx="19" ry="17" fill="#fff8f1"/><circle cx="225" cy="210" r="12" fill="#3c5065"/><circle cx="221" cy="205" r="4" fill="#fff"/>
      <path d="M212 177q20-13 40-4" stroke="#604033" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M181 275Q297 182 494 215Q555 228 566 285L556 409Q365 440 187 360Z" fill="url(#${id}-mouth)" stroke="#b9737f" stroke-width="5"/>
      <path d="M186 275Q335 204 494 232" stroke="#e6a1a8" stroke-width="18" fill="none" stroke-linecap="round"/>
      <path d="M183 276l33-5v41q-15 8-27 1Z" fill="url(#${id}-tooth)" stroke="#d4c8cf" stroke-width="2"/>
      <path d="M187 348l30-6v40q-14 3-25-5Z" fill="url(#${id}-tooth)" stroke="#d4c8cf" stroke-width="2"/>
      <path data-art="tongue" fill="url(#${id}-tongue)" stroke="#c76982" stroke-width="4" stroke-linejoin="round"/>
      <path data-art="tongue-shine" fill="none" stroke="#ffc5c8" stroke-width="7" opacity=".6" stroke-linecap="round"/>
      <path d="M191 381Q347 429 548 409" stroke="#d58c9b" stroke-width="9" fill="none"/>
      <path d="M162 319q-13 4-13 14q4 17 36 15" stroke="#df8b89" stroke-width="12" fill="none" stroke-linecap="round"/>
      <path d="M162 319q-13 4-13 14" stroke="#ffc4b6" stroke-width="4" fill="none" stroke-linecap="round"/>
    </g>
    <circle cx="220" cy="357" r="8" fill="#fff" stroke="#8e79c7" stroke-width="3"/>
    <path d="M220 357L117 409" stroke="#8e79c7" stroke-width="3" stroke-dasharray="3 7" stroke-linecap="round"/>
    <g transform="translate(86 424)"><circle r="28" fill="#fff"/><path d="M-12 1l8 8L14-11" fill="none" stroke="#7b6bb4" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g>
    <path data-art="lift-arrow" d="M386 367V295" stroke="#8c7bcb" stroke-width="5" fill="none" stroke-linecap="round" marker-end="url(#${id}-arrow)"/>
    <g transform="translate(686 280)"><circle r="42" fill="#fff" opacity=".9"/><path data-art="hill-icon" d="M-27 17Q0-34 27 17Z" fill="#b7cbe4"/><path d="M-28 18H28" stroke="#7e92bb" stroke-width="4" stroke-linecap="round"/></g>`;
  }

  function mount(container, exerciseId, options) {
    if (!(container instanceof Element)) throw new TypeError('An animation container is required.');
    if (!ids.includes(exerciseId)) throw new RangeError('Unknown articulation exercise.');
    if (mounted.has(container)) mounted.get(container).destroy();
    const settings = options || {};
    const id = `art-lesson-${++sequence}`;
    const wrapper = document.createElement('div');
    wrapper.className = `art-vector-lesson art-vector-${exerciseId}`;
    const scene = exerciseId === 'teeth' ? teethScene(id) : exerciseId === 'ball' ? ballScene(id) : hillScene(id);
    wrapper.innerHTML = `<svg class="art-lesson-svg" viewBox="0 0 800 560" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="${id}-title ${id}-description"><title id="${id}-title"></title><desc id="${id}-description"></desc>${definitions(id)}${frame(id)}${scene}<g class="art-phase-dots">${[0, 1, 2, 3].map(index => `<circle data-art="phase-${index}" cx="${367 + index * 22}" cy="530" r="5" fill="#a494c9"/>`).join('')}</g></svg>`;
    wrapper.querySelector('title').textContent = settings.label || ({ teeth: 'Тіс тазалау', ball: 'Доп', hill: 'Төбешік' })[exerciseId];
    wrapper.querySelector('desc').textContent = settings.description || ({ teeth: 'Тіл жоғарғы және төменгі тістердің ішкі жағымен қозғалады.', ball: 'Ерін жабық. Ауа бір ұрттан екінші ұртқа ауысады.', hill: 'Тіл ұшы төменгі тістердің артында. Тілдің ортаңғы бөлігі жоғары көтеріледі.' })[exerciseId];
    container.appendChild(wrapper);
    const nodes = {};
    wrapper.querySelectorAll('[data-art]').forEach(node => { nodes[node.dataset.art] = node; });
    let progress = 0;
    let speed = 1;
    let playing = false;
    let destroyed = false;
    let animationFrame = 0;
    let previousTime = 0;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const attr = (name, values) => Object.keys(values).forEach(key => nodes[name].setAttribute(key, String(values[key])));

    function render() {
      const p = progress;
      const phase = Math.min(3, Math.floor(p * 4));
      let displayProgress = p;
      // Explicit playback is allowed, but reduced-motion avoids continuous morphing.
      if (reduced.matches) displayProgress = [0, .375, .625, .98][phase];
      const t = displayProgress;
      if (exerciseId === 'teeth') {
        const upper = t >= .25 && t < .5;
        const lower = t >= .5 && t < .75;
        let x = 400;
        let y = 344;
        if (upper || lower) {
          const stageProgress = (t - (upper ? .25 : .5)) * 4;
          x = 400 - 125 * Math.sin(stageProgress * Math.PI * 2);
          const moveDown = easeRange(t, .45, .55);
          y = 258 + 100 * moveDown + Math.abs(x - 400) * (-.03 + .045 * moveDown);
        } else if (t < .25) y = 344 - easeRange(t, .12, .25) * 86;
        else y = 358 - easeRange(t, .75, 1) * 14;
        attr('tongue', { d: `M310 404Q321 365 ${x - 26} ${y + 16}Q${x - 35} ${y - 7} ${x} ${y - 8}Q${x + 35} ${y - 7} ${x + 26} ${y + 16}Q485 365 490 404Q400 438 310 404Z` });
        attr('tongue-shine', { d: `M365 395Q${x - 4} ${y + 37} ${x} ${y + 5}` });
        attr('target', { cx: x, cy: y - 4, opacity: upper || lower ? .78 : 0 });
        attr('guide', { d: upper ? 'M279 252Q400 232 521 252' : 'M279 363Q400 377 521 363', opacity: upper || lower ? .65 : 0 });
        attr('side-arrow', { opacity: upper || lower ? .85 : .2 });
      } else if (exerciseId === 'ball') {
        const left = easeRange(t, .12, .3) * (1 - easeRange(t, .45, .57));
        const right = easeRange(t, .45, .57) * (1 - easeRange(t, .74, .93));
        const leftEdge = 197 - left * 37;
        const rightEdge = 603 + right * 37;
        attr('face', { d: `M400 78C244 78 184 178 197 290C${leftEdge - 22} 357 ${leftEdge + 25} 442 400 473C${rightEdge - 25} 442 ${rightEdge + 22} 357 603 290C616 178 556 78 400 78Z` });
        attr('left-cheek', { transform: `translate(260 348) scale(${.76 + left * .54} ${.78 + left * .34}) translate(-260 -348)` });
        attr('right-cheek', { transform: `translate(540 348) scale(${.76 + right * .54} ${.78 + right * .34}) translate(-540 -348)` });
        attr('air-left', { opacity: left * .7 });
        attr('air-right', { opacity: right * .7 });
        const airPosition = easeRange(t, .45, .57);
        attr('air-dot', { cx: 273 + airPosition * 254, cy: 402 + 27 * Math.sin(airPosition * Math.PI) });
        attr('air-guide', { opacity: t >= .25 && t <= .75 ? .75 : .15 });
      } else {
        const lift = easeRange(t, .2, .43) * (1 - easeRange(t, .78, .96));
        const height = 372 - lift * 116;
        // The tip at (220, 357) stays anchored behind the lower incisors.
        attr('tongue', { d: `M220 357C249 360 264 ${height} 380 ${height}C469 ${height} 518 315 548 353L547 404Q367 422 250 390Q221 380 220 357Z` });
        attr('tongue-shine', { d: `M260 369C293 ${height + 18} 350 ${height + 5} 407 ${height + 14}` });
        attr('lift-arrow', { d: `M386 ${height - 12}V${Math.max(239, height - 70)}`, opacity: t >= .25 && t < .5 ? .75 : 0 });
        attr('hill-icon', { d: `M-27 17Q0 ${9 - lift * 45} 27 17Z` });
      }
      for (let index = 0; index < 4; index++) attr(`phase-${index}`, { r: index === phase ? 6 : 4, opacity: index === phase ? 1 : .35 });
      if (typeof settings.onFrame === 'function') settings.onFrame({ progress, phaseKey: phases[exerciseId][phase], phaseIndex: phase, playing, durationMs, reducedMotion: reduced.matches });
    }

    function tick(now) {
      if (!playing || destroyed || document.hidden) return;
      if (previousTime) progress = (progress + Math.min(now - previousTime, 100) * speed / durationMs) % 1;
      previousTime = now;
      render();
      animationFrame = requestAnimationFrame(tick);
    }

    function visibilityChanged() {
      cancelAnimationFrame(animationFrame);
      previousTime = 0;
      if (playing && !document.hidden) animationFrame = requestAnimationFrame(tick);
    }

    function reducedChanged() { if (!destroyed) render(); }
    document.addEventListener('visibilitychange', visibilityChanged);
    reduced.addEventListener('change', reducedChanged);
    const controller = {
      play() {
        if (destroyed || playing) return;
        playing = true;
        previousTime = 0;
        render();
        if (!document.hidden) animationFrame = requestAnimationFrame(tick);
      },
      pause() {
        if (destroyed) return;
        playing = false;
        cancelAnimationFrame(animationFrame);
        previousTime = 0;
        render();
      },
      restart() {
        if (destroyed) return;
        progress = 0;
        previousTime = 0;
        render();
      },
      seek(value) {
        if (destroyed || !Number.isFinite(Number(value))) return;
        progress = clamp(Number(value), 0, 1);
        previousTime = 0;
        render();
      },
      setSpeed(value) {
        if (!destroyed && Number.isFinite(Number(value))) speed = clamp(Number(value), .25, 2);
      },
      getState() {
        const phaseIndex = Math.min(3, Math.floor(progress * 4));
        return { progress, phaseKey: phases[exerciseId][phaseIndex], playing, speed, durationMs, destroyed };
      },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        playing = false;
        cancelAnimationFrame(animationFrame);
        document.removeEventListener('visibilitychange', visibilityChanged);
        reduced.removeEventListener('change', reducedChanged);
        wrapper.remove();
        if (mounted.get(container) === controller) mounted.delete(container);
      }
    };
    mounted.set(container, controller);
    render();
    return controller;
  }

  window.EduArticulationAnimations = Object.freeze({ mount, durationMs });
})();
