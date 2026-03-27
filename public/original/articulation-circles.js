// ========== ARTICULATION MAP - DYBYS KARTASY ==========
// Reworked to match the three-ring logic requested for the original static page.
// The existing articulation modal markup stays untouched; this file only controls the map.

const ARTIC_PRIME_REGEX = /['’ʼ]/g;

const ARTIC_RING_1 = ['С', 'Ш', 'И', 'Л', 'Ө', 'К', 'А', 'П', 'Ә', 'М', 'Т', 'О', 'Ү', 'Ф', 'Н', 'У', 'В', 'І'];
// "Ң" is included because the requested mapping contains "Н-Ң".
const ARTIC_RING_2 = ['Ж', 'И', 'Р', 'Қ', 'Г', 'Х', 'Б', 'Д', 'Ұ', 'Ң', 'Ы', 'З'];
// The outer ring keeps "Т" without a prime to match the provided photo/list.
const ARTIC_RING_3 = ["Л'", "Р'", 'Ғ', "Г'", "К'", "Х'", 'Һ', "Б'", "П'", "М'", "Д'", 'Т', "Ф'", "Я'", "З'", "С'", "Ц'", 'Ж', 'Ч', 'Щ'];

const ARTIC_RING_1_TO_2 = {
  'Ш': ['Ж'],
  'И': ['И'],
  'Л': ['Р'],
  'К': ['Қ', 'Г', 'Х'],
  'П': ['Б'],
  'Т': ['Д'],
  'Ү': ['Ұ'],
  'Н': ['Ң'],
  'І': ['Ы'],
  'С': ['З'],
};

const ARTIC_RING_2_TO_3 = {
  'Ж': ['Ж', 'Ч', 'Щ'],
  'Р': ["Р'"],
  'Қ': ['Ғ'],
  'Г': ["Г'"],
  'Х': ['Һ', "Х'"],
  'Б': ["Б'"],
  'Д': ["Д'"],
  'З': ["З'"],
};

const ARTIC_RING_1_TO_3 = {
  'Л': ["Л'"],
  'К': ['Ғ', "К'"],
  'П': ["П'"],
  'М': ["М'"],
  'Т': ['Т'],
  'Ф': ["Ф'"],
  'В': ["Я'"],
  'С': ["С'", "Ц'"],
};

const ARTIC_CANVAS = {
  width: 920,
  height: 920,
  centerX: 460,
  centerY: 470,
};

const ARTIC_LAYOUT = {
  centerRadius: 84,
  ring1Radius: 160,
  ring2Radius: 260,
  ring3Radius: 364,
  ring1NodeRadius: 22,
  ring2NodeRadius: 20,
  ring3NodeRadius: 18,
  ring1Angles: createAngleSeries(180, -160, ARTIC_RING_1.length),
  ring2Angles: createAngleSeries(166, -154, ARTIC_RING_2.length),
  ring3Angles: createAngleSeries(142, -200, ARTIC_RING_3.length),
};

const ARTIC_MOUTH_INDEX_MAP = {
  'А': 6,
  'Ә': 6,
  'Я': 6,
  'О': 7,
  'Ө': 7,
  'У': 3,
  'Ұ': 3,
  'Ү': 3,
  'Ю': 3,
  'Ы': 2,
  'И': 9,
  'І': 9,
  'Й': 9,
  'Е': 1,
  'Э': 1,
  'М': 5,
  'Б': 5,
  'П': 5,
  'Н': 8,
  'Ң': 8,
  'Л': 8,
  'Р': 8,
  'Д': 8,
  'Т': 8,
  'К': 4,
  'Г': 4,
  'Қ': 4,
  'Ғ': 4,
  'Х': 4,
  'Һ': 4,
  'С': 9,
  'З': 9,
  'Ш': 9,
  'Ж': 9,
  'Ч': 9,
  'Щ': 9,
  'Ц': 9,
  'Ф': 2,
  'В': 2,
};

const articState = {
  isOpen: false,
  selectedRing1: null,
  selectedRing2: null,
  selectedRing3: null,
  pendingModalKey: null,
};

let articPositions = null;

function createAngleSeries(startDeg, endDeg, count) {
  if (count <= 1) {
    return [startDeg];
  }

  const step = (endDeg - startDeg) / (count - 1);
  return Array.from({ length: count }, (_, index) => startDeg + step * index);
}

function normalizeArticulationLetter(letter) {
  return String(letter || '').replace(ARTIC_PRIME_REGEX, '').trim().toUpperCase();
}

function getArticulationPronunciation(letter) {
  const normalized = normalizeArticulationLetter(letter);
  return normalized ? normalized.toLowerCase() : '';
}

function getArticulationMouthIndex(letter) {
  const normalized = normalizeArticulationLetter(letter);
  return ARTIC_MOUTH_INDEX_MAP[normalized] || 4;
}

function getSpriteAxisPosition(indexPart) {
  if (indexPart <= 0) return '0%';
  if (indexPart === 1) return '50%';
  return '100%';
}

window.updateArticulationMouthVisual = function updateArticulationMouthVisual(letter) {
  const mouthEl = document.getElementById('lessonMouth');
  if (!mouthEl) return;

  const mouthIndex = getArticulationMouthIndex(letter);
  const zeroBased = mouthIndex - 1;
  const col = zeroBased % 3;
  const row = Math.floor(zeroBased / 3);

  mouthEl.style.backgroundPosition = `${getSpriteAxisPosition(col)} ${getSpriteAxisPosition(row)}`;
  mouthEl.setAttribute('data-mouth-index', String(mouthIndex));
  mouthEl.setAttribute('title', `Положение рта ${mouthIndex}`);
};

function buildArticulationPositions() {
  return {
    ring1: buildRingPositions(ARTIC_RING_1, ARTIC_LAYOUT.ring1Radius, ARTIC_LAYOUT.ring1Angles),
    ring2: buildRingPositions(ARTIC_RING_2, ARTIC_LAYOUT.ring2Radius, ARTIC_LAYOUT.ring2Angles),
    ring3: buildRingPositions(ARTIC_RING_3, ARTIC_LAYOUT.ring3Radius, ARTIC_LAYOUT.ring3Angles),
  };
}

function buildRingPositions(labels, radius, angles) {
  return labels.reduce((acc, label, index) => {
    const radians = (angles[index] * Math.PI) / 180;
    acc[label] = {
      x: ARTIC_CANVAS.centerX + Math.cos(radians) * radius,
      y: ARTIC_CANVAS.centerY + Math.sin(radians) * radius,
    };
    return acc;
  }, {});
}

function getVisibleRing2Letters() {
  return new Set(articState.selectedRing1 ? (ARTIC_RING_1_TO_2[articState.selectedRing1] || []) : []);
}

function getDirectRing3Letters() {
  return new Set(articState.selectedRing1 ? (ARTIC_RING_1_TO_3[articState.selectedRing1] || []) : []);
}

function getVisibleRing3Letters() {
  const visible = getDirectRing3Letters();

  if (articState.selectedRing2) {
    (ARTIC_RING_2_TO_3[articState.selectedRing2] || []).forEach((letter) => visible.add(letter));
  }

  return visible;
}

function createSvgEl(tag, attrs = {}, text = '') {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);

  Object.entries(attrs).forEach(([key, value]) => {
    el.setAttribute(key, value);
  });

  if (text) {
    el.textContent = text;
  }

  return el;
}

function formatArticCoord(value) {
  return Number(value.toFixed(2));
}

function renderArticulationMap() {
  const svg = document.getElementById('articulationCircle');
  if (!svg) return;

  if (!articPositions) {
    articPositions = buildArticulationPositions();
  }

  const visibleRing2 = getVisibleRing2Letters();
  if (articState.selectedRing2 && !visibleRing2.has(articState.selectedRing2)) {
    articState.selectedRing2 = null;
  }

  const directRing3 = getDirectRing3Letters();
  const visibleRing3 = getVisibleRing3Letters();
  if (articState.selectedRing3 && !visibleRing3.has(articState.selectedRing3)) {
    articState.selectedRing3 = null;
  }

  svg.innerHTML = '';

  const showRing1 = articState.isOpen;
  const showRing2 = articState.isOpen && visibleRing2.size > 0;
  const showRing3 = articState.isOpen && visibleRing3.size > 0;

  if (showRing1) {
    svg.appendChild(createSvgEl('circle', {
      cx: String(ARTIC_CANVAS.centerX),
      cy: String(ARTIC_CANVAS.centerY),
      r: String(ARTIC_LAYOUT.ring1Radius),
      class: 'artic-map-ring',
    }));
  }

  if (showRing2) {
    svg.appendChild(createSvgEl('circle', {
      cx: String(ARTIC_CANVAS.centerX),
      cy: String(ARTIC_CANVAS.centerY),
      r: String(ARTIC_LAYOUT.ring2Radius),
      class: 'artic-map-ring',
    }));
  }

  if (showRing3) {
    svg.appendChild(createSvgEl('circle', {
      cx: String(ARTIC_CANVAS.centerX),
      cy: String(ARTIC_CANVAS.centerY),
      r: String(ARTIC_LAYOUT.ring3Radius),
      class: 'artic-map-ring',
    }));
  }

  if (articState.selectedRing1) {
    const from = articPositions.ring1[articState.selectedRing1];

    visibleRing2.forEach((target) => {
      const to = articPositions.ring2[target];
      svg.appendChild(createSvgEl('line', {
        x1: String(formatArticCoord(from.x)),
        y1: String(formatArticCoord(from.y)),
        x2: String(formatArticCoord(to.x)),
        y2: String(formatArticCoord(to.y)),
        class: 'artic-map-connection',
      }));
    });

    directRing3.forEach((target) => {
      const to = articPositions.ring3[target];
      svg.appendChild(createSvgEl('line', {
        x1: String(formatArticCoord(from.x)),
        y1: String(formatArticCoord(from.y)),
        x2: String(formatArticCoord(to.x)),
        y2: String(formatArticCoord(to.y)),
        class: 'artic-map-connection',
      }));
    });
  }

  if (articState.selectedRing2) {
    const from = articPositions.ring2[articState.selectedRing2];

    (ARTIC_RING_2_TO_3[articState.selectedRing2] || []).forEach((target) => {
      const to = articPositions.ring3[target];
      svg.appendChild(createSvgEl('line', {
        x1: String(formatArticCoord(from.x)),
        y1: String(formatArticCoord(from.y)),
        x2: String(formatArticCoord(to.x)),
        y2: String(formatArticCoord(to.y)),
        class: 'artic-map-connection',
      }));
    });
  }

  ARTIC_RING_1.forEach((letter) => {
    const point = articPositions.ring1[letter];
    svg.appendChild(createArticulationNode({
      letter,
      point,
      radius: ARTIC_LAYOUT.ring1NodeRadius,
      className: `artic-map-node ring-1${showRing1 ? ' is-visible' : ''}${articState.selectedRing1 === letter ? ' is-active' : ''}`,
      onClick: () => handleRing1Click(letter),
    }));
  });

  ARTIC_RING_2.forEach((letter) => {
    const point = articPositions.ring2[letter];
    const isVisible = showRing2 && visibleRing2.has(letter);
    svg.appendChild(createArticulationNode({
      letter,
      point,
      radius: ARTIC_LAYOUT.ring2NodeRadius,
      className: `artic-map-node ring-2${isVisible ? ' is-visible' : ''}${articState.selectedRing2 === letter ? ' is-active' : ''}`,
      onClick: () => {
        if (isVisible) {
          handleRing2Click(letter);
        }
      },
    }));
  });

  ARTIC_RING_3.forEach((letter) => {
    const point = articPositions.ring3[letter];
    const isVisible = showRing3 && visibleRing3.has(letter);
    svg.appendChild(createArticulationNode({
      letter,
      point,
      radius: ARTIC_LAYOUT.ring3NodeRadius,
      className: `artic-map-node ring-3${isVisible ? ' is-visible' : ''}${articState.selectedRing3 === letter ? ' is-active' : ''}`,
      onClick: () => {
        if (isVisible) {
          handleRing3Click(letter);
        }
      },
    }));
  });

  svg.appendChild(createArticulationCenterButton());
  updateArticResetBtn();
}

function createArticulationNode({ letter, point, radius, className, onClick }) {
  const group = createSvgEl('g', {
    class: className,
  });

  group.addEventListener('click', (event) => {
    event.stopPropagation();
    onClick();
  });

  group.appendChild(createSvgEl('circle', {
    cx: String(formatArticCoord(point.x)),
    cy: String(formatArticCoord(point.y)),
    r: String(radius),
    class: 'artic-map-node-circle',
  }));

  group.appendChild(createSvgEl('text', {
    x: String(formatArticCoord(point.x)),
    y: String(formatArticCoord(point.y + 0.5)),
    class: 'artic-map-node-text',
  }, letter));

  return group;
}

function createArticulationCenterButton() {
  const group = createSvgEl('g', {
    class: 'artic-center-group',
  });

  group.addEventListener('click', (event) => {
    event.stopPropagation();
    handleArticulationCenterClick();
  });

  group.appendChild(createSvgEl('circle', {
    cx: String(ARTIC_CANVAS.centerX),
    cy: String(ARTIC_CANVAS.centerY),
    r: String(ARTIC_LAYOUT.centerRadius),
    class: 'artic-center-circle',
  }));

  const title = createSvgEl('text', {
    x: String(ARTIC_CANVAS.centerX),
    y: String(ARTIC_CANVAS.centerY - 8),
    class: 'artic-center-title',
  });
  title.appendChild(createSvgEl('tspan', { x: String(ARTIC_CANVAS.centerX), dy: '0' }, 'Дыбыс'));
  title.appendChild(createSvgEl('tspan', { x: String(ARTIC_CANVAS.centerX), dy: '28' }, 'картасы'));
  group.appendChild(title);

  group.appendChild(createSvgEl('text', {
    x: String(ARTIC_CANVAS.centerX),
    y: String(ARTIC_CANVAS.centerY + 52),
    class: 'artic-center-subtitle',
  }, articState.isOpen ? 'таңдау' : 'ашу'));

  return group;
}

function handleArticulationCenterClick() {
  if (!articState.isOpen) {
    articState.isOpen = true;
  } else {
    articState.selectedRing1 = null;
    articState.selectedRing2 = null;
    articState.selectedRing3 = null;
    articState.pendingModalKey = null;
  }

  renderArticulationMap();
}

function handleRing1Click(letter) {
  playArticulationSound(letter);

  const key = `ring1:${letter}`;
  const shouldOpenModal = articState.pendingModalKey === key && articState.selectedRing1 === letter;

  articState.selectedRing3 = null;

  if (shouldOpenModal) {
    articState.pendingModalKey = null;
    openArticulationModal(letter, getArticulationPronunciation(letter));
    return;
  }

  articState.selectedRing1 = letter;
  articState.selectedRing2 = null;
  articState.pendingModalKey = key;
  renderArticulationMap();
}

function handleRing2Click(letter) {
  playArticulationSound(letter);

  const key = `ring2:${letter}`;
  const shouldOpenModal = articState.pendingModalKey === key && articState.selectedRing2 === letter;

  articState.selectedRing3 = null;

  if (shouldOpenModal) {
    articState.pendingModalKey = null;
    openArticulationModal(letter, getArticulationPronunciation(letter));
    return;
  }

  articState.selectedRing2 = letter;
  articState.pendingModalKey = key;
  renderArticulationMap();
}

function handleRing3Click(letter) {
  playArticulationSound(letter);

  const key = `ring3:${letter}`;
  const shouldOpenModal = articState.pendingModalKey === key && articState.selectedRing3 === letter;

  if (shouldOpenModal) {
    articState.pendingModalKey = null;
    openArticulationModal(letter, getArticulationPronunciation(letter));
    return;
  }

  articState.selectedRing3 = letter;
  articState.pendingModalKey = key;
  renderArticulationMap();
}

function updateArticResetBtn() {
  const btn = document.getElementById('articResetBtn');
  if (btn) {
    btn.classList.toggle('visible', articState.isOpen);
  }
}

function buildArticulationAudioPath(letter) {
  const normalized = normalizeArticulationLetter(letter).toLowerCase();
  return normalized ? `/sounds/letters/letter_${normalized}.mp3` : '';
}

function playArticulationSound(letter) {
  const audioPath = buildArticulationAudioPath(letter);
  if (!audioPath) return;

  const audio = new Audio(audioPath);
  audio.play().catch((error) => {
    console.warn(`Audio error for ${audioPath}:`, error);
  });
}

function initArticulationMap() {
  articState.isOpen = false;
  articState.selectedRing1 = null;
  articState.selectedRing2 = null;
  articState.selectedRing3 = null;
  articState.pendingModalKey = null;

  if (!articPositions) {
    articPositions = buildArticulationPositions();
  }

  renderArticulationMap();
}

function collapseAllArticulationRings() {
  articState.isOpen = false;
  articState.selectedRing1 = null;
  articState.selectedRing2 = null;
  articState.selectedRing3 = null;
  articState.pendingModalKey = null;
  renderArticulationMap();
}

function openArticulationModal(letter, pronunciation) {
  const modal = document.getElementById('articulationModal');
  if (!modal) return;

  const normalizedLetter = normalizeArticulationLetter(letter);
  const lessonLetter = document.getElementById('lessonLetter');
  const lessonDesc = document.getElementById('lessonDesc');

  if (lessonLetter) {
    lessonLetter.textContent = letter;
  }

  if (lessonDesc) {
    lessonDesc.textContent = `Дыбысын дұрыс айтуды үйрен: "${pronunciation || normalizedLetter.toLowerCase()}"`;
  }

  if (typeof window.updateArticulationMouthVisual === 'function') {
    window.updateArticulationMouthVisual(normalizedLetter);
  }

  modal.classList.add('active');
}

function closeArticulationModal() {
  const modal = document.getElementById('articulationModal');
  if (modal) {
    modal.classList.remove('active');
  }

  if (typeof articulationEngine !== 'undefined' && articulationEngine?.isRecording) {
    articulationEngine.stop();
  }

  if (window.stopContentPlayback) {
    window.stopContentPlayback();
  }
}

window.initArticulationMap = initArticulationMap;
window.collapseAllArticulationRings = collapseAllArticulationRings;
window.closeArticulationModal = closeArticulationModal;
