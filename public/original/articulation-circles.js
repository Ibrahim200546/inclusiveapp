// ========== ARTICULATION MAP - CONCENTRIC CIRCLES ==========
// Data structure for Kazakh letters organized by phonetic similarity

const ARTIC_SPOKE_COUNT = 19;

// Ring data: innermost ring (0) is always visible, outer rings reveal on click
const ARTIC_RING_DATA = [
  // Ring 0 — Main letters (always visible)
  [
    { ch: 'А', type: 'V', pron: 'ah' },
    { ch: 'П', type: 'C', pron: 'p' },
    { ch: 'Ә', type: 'V', pron: 'ä' },
    { ch: 'М', type: 'C', pron: 'm' },
    { ch: 'Т', type: 'C', pron: 't' },
    { ch: 'О', type: 'V', pron: 'oh' },
    { ch: 'Ұ', type: 'V', pron: 'uh' },
    { ch: 'У', type: 'V', pron: 'u' },
    { ch: 'Н', type: 'C', pron: 'n' },
    { ch: 'Ф', type: 'C', pron: 'f' },
    { ch: 'В', type: 'C', pron: 'v' },
    { ch: 'І', type: 'V', pron: 'ee' },
    { ch: 'С', type: 'C', pron: 's' },
    { ch: 'Ш', type: 'C', pron: 'sh' },
    { ch: 'И', type: 'V', pron: 'i' },
    { ch: 'Л', type: 'C', pron: 'l' },
    { ch: 'Ө', type: 'V', pron: 'ö' },
    { ch: 'К', type: 'C', pron: 'k' },
    null,
  ],
  // Ring 1 — Similar sounds
  [
    { ch: 'Х', type: 'C', pron: 'kh' },
    { ch: 'Б', type: 'C', pron: 'b' },
    { ch: 'Д', type: 'C', pron: 'd' },
    { ch: 'Д', type: 'C', pron: 'd' },
    { ch: 'Т', type: 'C', pron: 't' },
    { ch: 'Ү', type: 'V', pron: 'ü' },
    { ch: 'Ы', type: 'V', pron: 'ы' },
    { ch: 'З', type: 'C', pron: 'z' },
    null,
    { ch: 'Ж', type: 'C', pron: 'zh' },
    null,
    { ch: 'Ц', type: 'C', pron: 'ts' },
    { ch: 'Ж', type: 'C', pron: 'zh' },
    { ch: 'Ж', type: 'C', pron: 'zh' },
    { ch: 'Ч', type: 'C', pron: 'ch' },
    { ch: 'Щ', type: 'C', pron: 'shch' },
    { ch: 'Е', type: 'V', pron: 'ye' },
    { ch: 'Г', type: 'C', pron: 'g' },
    { ch: 'Ң', type: 'C', pron: 'ŋ' },
  ],
  // Ring 2 — Related sounds
  [
    { ch: 'Ғ', type: 'C', pron: 'gh' },
    { ch: 'Х', type: 'C', pron: 'kh' },
    { ch: 'Б', type: 'C', pron: 'b' },
    { ch: 'П', type: 'C', pron: 'p' },
    { ch: 'М', type: 'C', pron: 'm' },
    { ch: 'Д', type: 'C', pron: 'd' },
    { ch: 'Т', type: 'C', pron: 't' },
    { ch: 'Ы', type: 'V', pron: 'ы' },
    { ch: 'З', type: 'C', pron: 'z' },
    { ch: 'Ж', type: 'C', pron: 'zh' },
    null,
    { ch: 'Ц', type: 'C', pron: 'ts' },
    { ch: 'Ж', type: 'C', pron: 'zh' },
    null,
    { ch: 'Ч', type: 'C', pron: 'ch' },
    { ch: 'Щ', type: 'C', pron: 'shch' },
    { ch: 'Э', type: 'V', pron: 'è' },
    { ch: 'Қ', type: 'C', pron: 'q' },
    { ch: 'Р', type: 'C', pron: 'r' },
  ],
  // Ring 3 — Additional variants
  [
    { ch: 'К', type: 'C', pron: 'k' },
    { ch: 'Х', type: 'C', pron: 'kh' },
    { ch: 'Ң', type: 'C', pron: 'ŋ' },
    { ch: 'Б', type: 'C', pron: 'b' },
    { ch: 'П', type: 'C', pron: 'p' },
    { ch: 'М', type: 'C', pron: 'm' },
    { ch: 'Д', type: 'C', pron: 'd' },
    { ch: 'Т', type: 'C', pron: 't' },
    { ch: 'Ң', type: 'C', pron: 'ŋ' },
    { ch: 'Ф', type: 'C', pron: 'f' },
    null,
    { ch: 'Ц', type: 'C', pron: 'ts' },
    { ch: 'Ж', type: 'C', pron: 'zh' },
    { ch: 'Ж', type: 'C', pron: 'zh' },
    { ch: 'Ч', type: 'C', pron: 'ch' },
    { ch: 'Щ', type: 'C', pron: 'shch' },
    { ch: 'Л', type: 'C', pron: 'l' },
    { ch: 'Р', type: 'C', pron: 'r' },
    { ch: 'Й', type: 'C', pron: 'y' },
  ]
];

const ARTIC_RING_META = [
  { radius: 80, dotR: 17, fontSize: 20 },
  { radius: 150, dotR: 20, fontSize: 24 },
  { radius: 230, dotR: 22, fontSize: 26 },
  { radius: 320, dotR: 24, fontSize: 28 },
];

const ARTIC_TYPE_COLORS = { V: '#5ec4a0', C: '#e8c547', S: '#c87ed4' };

// State management
const articRevealedDepth = new Array(ARTIC_SPOKE_COUNT).fill(0);
const articLetterEls = [[], [], [], []];
const articSpokeSegEls = [[], [], [], []];
const articRingCircleEls = [];
let articActiveGroup = null;

// Build the articulation circle visualization
function initArticulationMap() {
  const svg = document.getElementById('articulationCircle');
  if (!svg || svg.hasChildNodes()) return; // Already initialized

  // Helper function to create SVG elements
  function createSvgEl(tag, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  }

  function angleForSpoke(s) {
    return (s / ARTIC_SPOKE_COUNT) * Math.PI * 2 - Math.PI / 2;
  }

  function ringOuterR(ringIdx) {
    const m = ARTIC_RING_META[ringIdx];
    return m.radius + m.dotR + 6;
  }

  // Add defs (gradients, filters)
  const defs = createSvgEl('defs', {});
  defs.innerHTML = `
    <radialGradient id="articCenterGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="rgba(100,255,218,0.18)"/>
      <stop offset="55%" stop-color="rgba(11,17,24,0.05)"/>
      <stop offset="100%" stop-color="rgba(11,17,24,0)"/>
    </radialGradient>
    <filter id="articLetterShadow" x="-60%" y="-60%" width="220%" height="220%">
      <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="rgba(0,0,0,0.5)"/>
    </filter>`;
  svg.appendChild(defs);

  // Ambient glow (increased for larger circles)
  const glowCircle = createSvgEl('circle', { cx: 0, cy: 0, r: 400, fill: 'url(#articCenterGlow)' });
  svg.appendChild(glowCircle);

  // Ring background circles (all rings, hidden except 0)
  for (let i = 0; i < ARTIC_RING_META.length; i++) {
    const rc = createSvgEl('circle', {
      cx: 0, cy: 0, r: ringOuterR(i),
      class: 'artic-ring-circle' + (i > 0 ? ' hidden' : '')
    });
    svg.appendChild(rc);
    articRingCircleEls[i] = rc;
  }

  // Spoke segments
  for (let s = 0; s < ARTIC_SPOKE_COUNT; s++) {
    const ang = angleForSpoke(s);
    const cosA = Math.cos(ang), sinA = Math.sin(ang);
    for (let i = 0; i < ARTIC_RING_META.length; i++) {
      const r1 = i === 0 ? 0 : ringOuterR(i - 1);
      const r2 = ringOuterR(i);
      const line = createSvgEl('line', {
        x1: cosA * r1, y1: sinA * r1,
        x2: cosA * r2, y2: sinA * r2,
        class: 'artic-spoke-seg' + (i > 0 ? ' hidden' : '')
      });
      svg.appendChild(line);
      if (!articSpokeSegEls[i]) articSpokeSegEls[i] = [];
      articSpokeSegEls[i][s] = line;
    }
  }

  // Letter dots (outermost first so inner paints on top)
  for (let i = ARTIC_RING_META.length - 1; i >= 0; i--) {
    const meta = ARTIC_RING_META[i];
    for (let s = 0; s < ARTIC_SPOKE_COUNT; s++) {
      const letter = ARTIC_RING_DATA[i][s];
      if (!letter) { articLetterEls[i][s] = null; continue; }

      const ang = angleForSpoke(s);
      const x = Math.cos(ang) * meta.radius;
      const y = Math.sin(ang) * meta.radius;

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'artic-letter-group');
      g.setAttribute('data-ring', i);
      g.setAttribute('data-spoke', s);
      g.setAttribute('transform', `translate(${x},${y})`);

      // Start hidden if ring > 0
      if (i > 0) {
        g.style.opacity = '0';
        g.style.transition = 'opacity 0.4s cubic-bezier(.4,0,.2,1)';
      }

      // Dot
      const dot = createSvgEl('circle', {
        cx: 0, cy: 0, r: meta.dotR,
        fill: ARTIC_TYPE_COLORS[letter.type],
        class: 'artic-letter-circle',
        opacity: '0.85',
        filter: 'url(#articLetterShadow)'
      });
      g.appendChild(dot);

      // Text
      const txt = createSvgEl('text', {
        x: 0, y: 0,
        class: 'artic-letter-text',
        'font-size': meta.fontSize
      });
      txt.textContent = letter.ch;
      g.appendChild(txt);

      // Events
      g.addEventListener('click', (e) => {
        e.stopPropagation();
        onArticulationLetterClick(i, s);
      });

      svg.appendChild(g);
      articLetterEls[i][s] = g;
    }
  }

  // Center circle (interactive)
  const centerG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  centerG.setAttribute('class', 'artic-letter-group center-group');
  centerG.style.cursor = 'pointer';

  // Center background
  const centerCircle = createSvgEl('circle', {
    cx: 0, cy: 0, r: 32,
    fill: '#0d1923',
    stroke: 'rgba(100,255,218,0.4)',
    'stroke-width': '2.5',
    class: 'artic-letter-circle'
  });
  centerG.appendChild(centerCircle);

  // Center text
  const centerText = createSvgEl('text', {
    x: 0, y: 0,
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
    'font-size': '18',
    fill: 'rgba(100,255,218,0.6)',
    class: 'artic-letter-text'
  });
  centerText.textContent = 'Ә';
  centerG.appendChild(centerText);

  // Center click event
  centerG.addEventListener('click', (e) => {
    e.stopPropagation();
    onCentralLetterClick(centerG);
  });

  svg.appendChild(centerG);
}

// Show ring function
function showArticulationRing(ringIdx, spokeIdx) {
  if (articRingCircleEls[ringIdx] && articRingCircleEls[ringIdx].classList.contains('hidden')) {
    articRingCircleEls[ringIdx].classList.remove('hidden');
  }
  if (articSpokeSegEls[ringIdx] && articSpokeSegEls[ringIdx][spokeIdx]) {
    articSpokeSegEls[ringIdx][spokeIdx].classList.remove('hidden');
  }
  const g = articLetterEls[ringIdx][spokeIdx];
  if (g) {
    requestAnimationFrame(() => {
      g.style.opacity = '1';
    });
  }
}

// Hide ring function
function hideArticulationRing(ringIdx, spokeIdx) {
  if (articSpokeSegEls[ringIdx] && articSpokeSegEls[ringIdx][spokeIdx]) {
    articSpokeSegEls[ringIdx][spokeIdx].classList.add('hidden');
  }
  const g = articLetterEls[ringIdx][spokeIdx];
  if (g) {
    g.style.opacity = '0';
  }
}

// Collapse all rings
function collapseAllArticulationRings() {
  for (let s = 0; s < ARTIC_SPOKE_COUNT; s++) {
    const depth = articRevealedDepth[s];
    for (let r = 1; r <= depth; r++) {
      hideArticulationRing(r, s);
    }
    articRevealedDepth[s] = 0;
  }
  for (let r = 1; r < ARTIC_RING_META.length; r++) {
    if (articRingCircleEls[r]) articRingCircleEls[r].classList.add('hidden');
  }
  updateArticResetBtn();
  if (articActiveGroup) articActiveGroup.classList.remove('playing');

  // Reset center
  const centerG = document.querySelector('.center-group');
  if (centerG) centerG.classList.remove('first-clicked');

  articActiveGroup = null;
  lastClickedLetter = null;
  lastClickedElement = null;
}

// Update reset button visibility
function updateArticResetBtn() {
  const anyRevealed = articRevealedDepth.some(d => d > 0);
  const btn = document.getElementById('articResetBtn');
  if (btn) btn.classList.toggle('visible', anyRevealed);
}

// Letter click handler with two-click logic
let lastClickedLetter = null; // Track which letter was clicked last
let lastClickedElement = null; // Track the DOM element

function playArticulationSound(char) {
  // Format: letter_а.mp3 (lowercase)
  const filename = `letter_${char.toLowerCase()}.mp3`;
  const audioPath = `/sounds/letters/${filename}`;
  const audio = new Audio(audioPath);
  audio.play().catch(e => console.log(`Audio error for ${filename}:`, e));
}

function onArticulationLetterClick(ringIdx, spokeIdx) {
  const letter = ARTIC_RING_DATA[ringIdx][spokeIdx];
  if (!letter) return;

  const clickedId = `${ringIdx}-${spokeIdx}`;
  const isSecondClick = (lastClickedLetter === clickedId);

  // Always play sound
  playArticulationSound(letter.ch);

  // Visual feedback (temporary flash)
  if (articActiveGroup) articActiveGroup.classList.remove('playing');
  const g = articLetterEls[ringIdx][spokeIdx];
  if (g) {
    g.classList.add('playing');
    articActiveGroup = g;
    setTimeout(() => { if (g) g.classList.remove('playing'); }, 900);
  }

  // Reveal next ring on this spoke (always on first click)
  const currentDepth = articRevealedDepth[spokeIdx];
  if (ringIdx === currentDepth && ringIdx < ARTIC_RING_META.length - 1) {
    const next = ringIdx + 1;
    articRevealedDepth[spokeIdx] = next;
    showArticulationRing(next, spokeIdx);
    updateArticResetBtn();
  }

  // FIRST CLICK: Just play sound and reveal, add persistent highlight
  if (!isSecondClick) {
    // Remove highlight from previous first-clicked letter
    if (lastClickedElement) {
      lastClickedElement.classList.remove('first-clicked');
    }

    lastClickedLetter = clickedId;
    lastClickedElement = g;

    // Add persistent highlight to show it's ready for second click
    if (g) {
      g.classList.add('first-clicked');
    }
    return; // Don't open modal yet
  }

  // SECOND CLICK: Open modal for practice
  if (g) g.classList.remove('first-clicked'); // Remove highlight
  lastClickedLetter = null; // Reset for next time
  lastClickedElement = null;
  openArticulationModal(letter.ch, letter.pron);
}

// Open existing articulation modal
function openArticulationModal(letter, pronunciation) {
  const modal = document.getElementById('articulationModal');
  if (!modal) return;

  document.getElementById('lessonLetter').textContent = letter;
  document.getElementById('lessonDesc').textContent = `Дыбысын дұрыс айтуды үйрен: "${pronunciation}"`;

  modal.classList.add('active');
}

function closeArticulationModal() {
  const modal = document.getElementById('articulationModal');
  if (modal) modal.classList.remove('active');
}

// SPECIAL HANDLER FOR CENTRAL LETTER 'Ә'
function onCentralLetterClick(centerG) {
  const CLICKED_ID = 'center-Ә';
  const isSecondClick = (lastClickedLetter === CLICKED_ID);

  // 1. Play Sound (Always)
  playArticulationSound('ә');

  // 2. Visual Feedback (Flash)
  centerG.classList.add('playing');
  setTimeout(() => centerG.classList.remove('playing'), 900);

  // 3. FIRST CLICK LOGIC
  if (!isSecondClick) {
    // Remove previous highlights
    if (lastClickedElement) lastClickedElement.classList.remove('first-clicked');

    // Set new state
    lastClickedLetter = CLICKED_ID;
    lastClickedElement = centerG;
    centerG.classList.add('first-clicked');
    return;
  }

  // 4. SECOND CLICK LOGIC
  centerG.classList.remove('first-clicked');
  lastClickedLetter = null;
  lastClickedElement = null;
  openArticulationModal('Ә', 'ä');
}
