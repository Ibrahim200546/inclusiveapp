// ========== ГЛОБАЛДЫ АЙНЫМАЛЫЛАР ==========
let currentCharacter = 'fox';
let currentSoundTarget = '';
let currentTask = "";
let correctAnswer = "";
let isPlaying = false;

// Audio playback and effects are owned by src/features/practice/audio.

// ========== ЭКРАНДАРДЫ АУЫСТЫРУ ==========
// window.showScreen belongs to src/features/practice/navigation. Legacy
// screens react to navigation through hooks instead of wrapping it.
(window.practiceNavigationHooks = window.practiceNavigationHooks || []).push({
  name: 'legacy-shell',
  enter({ to }) {
    const feedback = document.getElementById('gameFeedback');
    if (feedback) feedback.innerHTML = '';
  }
});

// ========== ADDED MISSING FUNCTIONS (FIX) ==========
function toggleRadialGradeMenu(btn) {
  const container = btn.closest('.radial-menu-container');
  if (container) container.classList.toggle('active');
}

function selectCharacter(char) {
  playClick();
  currentCharacter = char;
  document.querySelectorAll('.character').forEach(c => c.classList.remove('selected'));
  const elements = document.querySelectorAll('.character');
  if (char === 'fox') elements[0].classList.add('selected');
  if (char === 'rabbit') elements[1].classList.add('selected');
  if (char === 'robot') elements[2].classList.add('selected');
}

function showReward() {
  console.log('Executing safe showReward...');
  try { playSuccess(); } catch (e) { }
  try { addCoins(10); } catch (e) { }

  const modal = document.getElementById('rewardModal');
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
  }
}

function closeModal() {
  playClick();
  const modal = document.getElementById('rewardModal');
  modal.classList.remove('active');
  modal.style.display = '';
}

// Profile state and persistence are owned by src/features/practice/profile.
const GUEST_LOGIN_NOTICE_KEY = 'eduCorexGuestLoginNoticeShown';

function getGuestProfileLabels() {
  const lang = typeof window.getProfileLang === 'function' ? window.getProfileLang() : localStorage.getItem('profileLang');
  const isRu = lang === 'ru';
  return {
    name: isRu ? 'Гость' : 'Қонақ',
    email: isRu ? 'Вход необязателен' : 'Кіру міндетті емес',
    login: isRu ? 'Войти' : 'Кіру',
    notice: isRu
      ? 'Вход необязателен. В гостевом режиме имя, аватар и монеты не сохраняются.'
      : 'Кіру міндетті емес. Қонақ режимінде аты, аватар және монеталар сақталмайды.'
  };
}

function showGuestLoginNoticeOnce() {
  const auth = getSupaAuth();
  if (auth || localStorage.getItem(GUEST_LOGIN_NOTICE_KEY) === 'true') return;

  localStorage.setItem(GUEST_LOGIN_NOTICE_KEY, 'true');
  const labels = getGuestProfileLabels();
  const notice = document.createElement('div');
  notice.className = 'guest-login-toast';
  notice.innerHTML = `
    <span>${labels.notice}</span>
    <button type="button" class="guest-login-toast-btn">${labels.login}</button>
    <button type="button" class="guest-login-toast-close" aria-label="Close">×</button>
  `;

  notice.querySelector('.guest-login-toast-btn')?.addEventListener('click', () => {
    window.location.href = '/login';
  });
  notice.querySelector('.guest-login-toast-close')?.addEventListener('click', () => {
    notice.remove();
  });

  const host = document.querySelector('.container') || document.body;
  host.append(notice);
  setTimeout(() => notice.remove(), 9000);
}

document.addEventListener('DOMContentLoaded', showGuestLoginNoticeOnce);

// ========== 0-СЫНЫП: ТАПСЫРМА 1 - ДЫБЫСТЫ ТАНУ ==========
let isSoundPlaying = false;

function startSoundDetection() {
  const indicator = document.getElementById('soundIndicator');
  const btnGroup = document.getElementById('soundButtons');
  const startBtn = document.getElementById('startSoundBtn');
  const feedback = document.getElementById('g0t1Feedback');

  feedback.innerHTML = "";
  indicator.innerHTML = "👂";
  startBtn.style.display = "none";

  const hasSound = Math.random() < 0.7;
  isSoundPlaying = hasSound;

  setTimeout(() => {
    indicator.innerHTML = "❓";
    if (hasSound) playFakeBeep();
    btnGroup.style.display = "block";
  }, 1500);
}

function playFakeBeep() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  osc.connect(ctx.destination);
  osc.frequency.value = 440;
  osc.start();
  setTimeout(() => osc.stop(), 500);
}

function checkSound(userAnswer) {
  const feedback = document.getElementById('g0t1Feedback');
  document.getElementById('soundButtons').style.display = "none";
  document.getElementById('startSoundBtn').style.display = "inline-block";
  document.getElementById('soundIndicator').innerHTML = "🔇";

  if (userAnswer === isSoundPlaying) {
    feedback.className = "feedback success";
    feedback.innerHTML = "Дұрыс! Жарайсың!";
    showReward();
  } else {
    playError();
    feedback.className = "feedback error";
    feedback.innerHTML = "Қателестің, қайтадан көр!";
  }
}

// Train capture and assessment are owned by src/features/practice/train.

// ========== 0-СЫНЫП LOGIC ==========
const instruments = ['drum', 'guitar', 'dombra'];
function playInstrumentSound() {
  currentSoundTarget = instruments[Math.floor(Math.random() * instruments.length)];
  const feedback = document.getElementById('g0t3Feedback');
  feedback.innerHTML = "🎵 Дыбыс ойнауда...";
  const audio = document.getElementById(currentSoundTarget + 'Audio');
  if (audio) { audio.currentTime = 0; audio.play().catch(e => { }); }
}
function checkInstrument(choice) {
  const feedback = document.getElementById('g0t3Feedback');
  if (!currentSoundTarget) { feedback.innerHTML = "Алдымен дыбысты тыңдаңыз!"; return; }
  if (choice === currentSoundTarget) { feedback.innerHTML = "Дұрыс! " + choice; feedback.className = "feedback success"; showReward(); currentSoundTarget = null; }
  else { playError(); feedback.innerHTML = "Қате!"; feedback.className = "feedback error"; }
}

const animals = ['horse', 'cow', 'sheep'];
function playRandomAnimal() {
  currentSoundTarget = animals[Math.floor(Math.random() * animals.length)];
  const audio = document.getElementById(currentSoundTarget + 'Audio');
  if (audio) { audio.currentTime = 0; audio.play().catch(e => { }); }
}
function checkAnimal(choice) {
  const feedback = document.getElementById('g0t4Feedback');
  if (!currentSoundTarget) { feedback.innerHTML = "Алдымен дыбысты тыңдаңыз!"; return; }
  if (choice === currentSoundTarget) { feedback.innerHTML = "Дұрыс!"; feedback.className = "feedback success"; showReward(); currentSoundTarget = null; }
  else { playError(); feedback.innerHTML = "Жоқ, бұл басқа жануар."; feedback.className = "feedback error"; }
}

const natureSounds = ['bird', 'water', 'wind'];
function playRandomNature() {
  currentSoundTarget = natureSounds[Math.floor(Math.random() * natureSounds.length)];
  const audio = document.getElementById(currentSoundTarget + 'Audio');
  if (audio) { audio.currentTime = 0; audio.play().catch(e => { }); }
}
function checkNature(choice) {
  const feedback = document.getElementById('g0t6Feedback');
  if (!currentSoundTarget) { feedback.innerHTML = "Алдымен дыбысты тыңдаңыз!"; return; }
  if (choice === currentSoundTarget) { feedback.innerHTML = "Дұрыс!"; feedback.className = "feedback success"; showReward(); currentSoundTarget = null; }
  else { playError(); feedback.innerHTML = "Қате!"; feedback.className = "feedback error"; }
}

const vehicles0 = ['car', 'plane', 'train'];
window.g0VehicleTarget = null;
window.startVehicleGame = function () {
  window.g0VehicleTarget = vehicles0[Math.floor(Math.random() * vehicles0.length)];
  const vehicleAudioPath = window.g0VehicleTarget === 'tractor'
    ? 'sounds/technical/tractor.mp3'
    : `sounds/transport/${window.g0VehicleTarget}.mp3`;
  const audio = new Audio(vehicleAudioPath);
  audio.play().catch(e => { });
  shuffleCardsInTask('g0Task8');
}
window.verifyVehicleChoice = function (choice) {
  const feedback = document.getElementById('g0t8Feedback');
  if (!window.g0VehicleTarget) {
    const samplePath = choice === 'tractor' ? 'sounds/technical/tractor.mp3' : `sounds/transport/${choice}.mp3`;
    new Audio(samplePath).play().catch(e => { }); return;
  }
  if (choice === window.g0VehicleTarget) {
    feedback.innerHTML = "Дұрыс!"; feedback.className = "feedback success"; showReward(); window.g0VehicleTarget = null;
  } else {
    playError(); feedback.innerHTML = "Қате!"; feedback.className = "feedback error";
  }
}

const homeSounds = ['phone', 'clock', 'bike'];
function playRandomHomeSound() {
  currentSoundTarget = homeSounds[Math.floor(Math.random() * homeSounds.length)];
  const audioFileMap = { 'phone': 'phone.mp3', 'clock': 'clock.mp3', 'bike': 'bike.mp3', 'doorbell': 'doorbell.mp3', 'schoolbell': 'school_bell.mp3' };
  const filename = audioFileMap[currentSoundTarget];
  new Audio(`sounds/Household sounds/${filename}`).play().catch(e => { });
  shuffleCardsInTask('g0Task9');
}
function checkHomeSound0(choice) {
  const feedback = document.getElementById('g0t9Feedback');
  if (!currentSoundTarget) {
    const audioFileMap = { 'phone': 'phone.mp3', 'clock': 'clock.mp3', 'bike': 'bike.mp3', 'doorbell': 'doorbell.mp3', 'schoolbell': 'school_bell.mp3' };
    new Audio(`sounds/Household sounds/${audioFileMap[choice]}`).play().catch(e => { }); return;
  }
  if (choice === currentSoundTarget) {
    feedback.innerHTML = "Дұрыс!"; feedback.className = "feedback success"; showReward(); currentSoundTarget = null;
  } else {
    playError(); feedback.innerHTML = "Қате!"; feedback.className = "feedback error";
  }
}

function shuffleCardsInTask(screenId) {
  const screen = document.getElementById(screenId);
  if (!screen) return;
  const grid = screen.querySelector('.images-grid');
  if (!grid) return;
  for (let i = grid.children.length; i >= 0; i--) {
    grid.appendChild(grid.children[Math.random() * i | 0]);
  }
}


// ========== 1-СЫНЫП ТІЗБЕК (SEQUENCE TASKS) ==========

let targetSequence = [];
let userSequence = [];
let isPlayingSequence = false;

// --- Helper: Play sequence of audio ---
function playSequenceAudio(sequence, interval = 1500) {
  if (isPlayingSequence) return;
  isPlayingSequence = true;
  let index = 0;

  function playNext() {
    if (index >= sequence.length) {
      isPlayingSequence = false;
      return;
    }
    const audioSrc = sequence[index];
    const audio = new Audio(audioSrc);
    audio.play().catch(e => console.error("Audio play error:", e));

    // Animate center circle if wanted
    const activeScreen = document.querySelector('.screen.active');
    if (activeScreen) {
      const centerBtn = activeScreen.querySelector('.center-circle');
      if (centerBtn) {
        centerBtn.style.transform = "scale(1.1)";
        setTimeout(() => centerBtn.style.transform = "scale(1)", 200);
      }
    }

    index++;
    setTimeout(playNext, interval);
  }
  playNext();
}

// --- TASK 1: ANIMALS SEQUENCE (Active Listening) ---
let animalSequenceNames = [];

function generateAndPlayAnimalSequence() {
  const container = document.getElementById('animalSequenceRow');
  const btn = document.getElementById('btnListenAnimals');

  if (!container) return;

  // Disable button
  btn.disabled = true;
  btn.style.opacity = "0.7";
  btn.textContent = "🔊 Тыңдалуда...";

  // 1. Generate new sequence
  animalSequenceNames = [];
  const animals = ['cat', 'dog', 'cow', 'sheep'];
  const count = 5;

  container.innerHTML = "";

  for (let i = 0; i < count; i++) {
    const animal = animals[Math.floor(Math.random() * animals.length)];
    animalSequenceNames.push(animal);

    // Create Item
    const itemDiv = document.createElement('div');
    itemDiv.id = `seq-anim-${i}`;
    itemDiv.style.transition = "all 0.3s";
    itemDiv.style.padding = "20px";
    itemDiv.style.borderRadius = "20px";
    itemDiv.style.background = "rgba(255,255,255,0.2)";

    const emojiMap = { cat: '🐱', dog: '🐶', cow: '🐮', sheep: '🐑' };

    const content = document.createElement('div');
    content.textContent = emojiMap[animal];
    content.style.fontSize = "80px";
    itemDiv.appendChild(content);

    container.appendChild(itemDiv);
  }

  // 2. Play Sequence
  let index = 0;

  function playNext() {
    if (index >= animalSequenceNames.length) {
      btn.disabled = false;
      btn.style.opacity = "1";
      btn.textContent = "🔊 Тыңдау (Жаңа)";
      // Reset last highlight
      if (index > 0) {
        const prev = document.getElementById(`seq-anim-${index - 1}`);
        if (prev) {
          prev.style.transform = "scale(1)";
          prev.style.background = "rgba(255,255,255,0.2)";
          prev.style.boxShadow = "none";
        }
      }
      return;
    }

    const currentItem = document.getElementById(`seq-anim-${index}`);
    // Reset previous
    if (index > 0) {
      const prev = document.getElementById(`seq-anim-${index - 1}`);
      if (prev) {
        prev.style.transform = "scale(1)";
        prev.style.background = "rgba(255,255,255,0.2)";
        prev.style.boxShadow = "none";
      }
    }

    if (currentItem) {
      currentItem.style.transform = "scale(1.3)";
      currentItem.style.background = "rgba(255, 235, 59, 0.6)"; // Yellowish
      currentItem.style.boxShadow = "0 0 30px #ffeb3b";
      currentItem.style.zIndex = "10";
    }

    const animal = animalSequenceNames[index];
    const path = `sounds/animals/${animal}.mp3`;
    const audio = new Audio(path);
    audio.play().catch(e => console.error(e));

    index++;
    setTimeout(playNext, 1500);
  }

  setTimeout(playNext, 500);
}

function addToSequence(item) {
  if (isPlayingSequence) return;
  userSequence.push(item);
  updateSequenceDisplay();
}

function updateSequenceDisplay() {
  // Update UI for Animals
  const animDisplay = document.getElementById('seqAnimalsDisplay');
  if (animDisplay) {
    animDisplay.innerHTML = "";
    userSequence.forEach(item => {
      const div = document.createElement('div');
      div.className = "selected-item";
      div.style.fontSize = "40px";
      // Map item to emoji
      const emojis = { cat: '🐱', dog: '🐶', cow: '🐮', sheep: '🐑', big_drum: '🥁', small_drum: '🥁' };
      div.textContent = emojis[item] || item;

      if (item === 'big_drum') div.style.fontSize = "60px";
      if (item === 'small_drum') div.style.fontSize = "30px";

      animDisplay.appendChild(div);
    });
  }

  // Update UI for Drum
  const drumDisplay = document.getElementById('seqDrumDisplay');
  if (drumDisplay) {
    drumDisplay.innerHTML = "";
    userSequence.forEach(item => {
      const div = document.createElement('div');
      div.className = "selected-item";
      // Map item to content
      if (item === 'big_drum') {
        div.textContent = '🥁';
        div.style.fontSize = "60px";
      } else if (item === 'small_drum') {
        div.textContent = '🥁';
        div.style.fontSize = "30px";
      }
      drumDisplay.appendChild(div);
    });
  }
}

function checkSequence(type) {
  let feedbackId = '';
  if (type === 'animals') feedbackId = 'g1SeqAnimalsFeedback';
  else if (type === 'drum') feedbackId = 'g1SeqDrumFeedback';

  const feedback = document.getElementById(feedbackId);

  if (userSequence.length !== targetSequence.length) {
    feedback.innerHTML = "Қате! Саны сәйкес келмейді. (" + userSequence.length + "/" + targetSequence.length + ")";
    feedback.className = "feedback error";
    playError();
    return;
  }

  let correct = true;
  for (let i = 0; i < targetSequence.length; i++) {
    if (targetSequence[i] !== userSequence[i]) {
      correct = false;
      break;
    }
  }

  if (correct) {
    feedback.innerHTML = "Жарайсың! Дұрыс! 🎉";
    feedback.className = "feedback success";
    showReward();
    resetSequence(false);
  } else {
    feedback.innerHTML = "Қате! Қайтадан тыңдап көр.";
    feedback.className = "feedback error";
    playError();
    userSequence = [];
    updateSequenceDisplay();
  }
}

function resetSequence(clearDisplay = true) {
  userSequence = [];
  if (clearDisplay) updateSequenceDisplay();

  const f1 = document.getElementById('g1SeqAnimalsFeedback');
  if (f1) { f1.innerHTML = ""; f1.className = "feedback"; }

  const f2 = document.getElementById('g1SeqDrumFeedback');
  if (f2) { f2.innerHTML = ""; f2.className = "feedback"; }
}

// --- TASK 2: DRUM ---
function playDrumSequence() {
  resetSequence();
  const drums = ['big_drum', 'small_drum'];
  const count = 3;

  targetSequence = [];
  for (let i = 0; i < count; i++) {
    targetSequence.push(drums[Math.floor(Math.random() * drums.length)]);
  }

  const mappedPaths = targetSequence.map(item => {
    if (item === 'big_drum') return 'sounds/rhythm/big_drum.mp3';
    return 'sounds/rhythm/small_drum.mp3';
  });

  playSequenceAudio(mappedPaths, 1200);
  const feedback = document.getElementById('g1SeqDrumFeedback');
  if (feedback) {
    feedback.innerHTML = "Ырғақты тыңдап, қайтала! 🥁";
    feedback.className = "feedback";
  }
}

function playAudio(path) {
  const audio = new Audio(path);
  audio.play().catch(e => console.error(e));
}


// --- TASK 1 RE-IMPLEMENTATION: DRAG & DROP ---
let animTarget = [];
let animUserSlots = [];
let animPool = [];

function generateAndPlayAnimalSequence() {
  const targetRow = document.getElementById('animalTargetRow');
  const btn = document.getElementById('btnListenAnimals');

  // If we are on the old HTML for some reason or element missing
  if (!targetRow) return;

  // 1. Generate Target Sequence
  animTarget = [];
  const animals = ['cat', 'dog', 'cow', 'sheep'];
  const count = 5;
  for (let i = 0; i < count; i++) {
    animTarget.push(animals[Math.floor(Math.random() * animals.length)]);
  }

  // 2. Prepare Pool (Shuffled Target with ID)
  animPool = animTarget.map((anim, i) => ({ animal: anim, id: i, used: false }));
  animPool.sort(() => Math.random() - 0.5);

  // 3. Prepare Slots (Empty)
  animUserSlots = Array(count).fill(null);

  // 4. Render Target Row
  renderTargetRow();

  // 5. Render User Area
  renderUserArea();

  // Play audio immediately
  playTargetSequence();
}

function renderTargetRow() {
  const row = document.getElementById('animalTargetRow');
  if (!row) return;
  row.innerHTML = "";
  const emojiMap = { cat: '🐱', dog: '🐶', cow: '🐮', sheep: '🐑' };

  animTarget.forEach((anim, i) => {
    const div = document.createElement('div');
    div.id = `target-anim-${i}`;
    div.style.fontSize = "50px";
    div.style.padding = "10px";
    div.style.borderRadius = "10px";
    div.style.transition = "transform 0.2s, background 0.2s";
    div.textContent = emojiMap[anim];
    row.appendChild(div);
  });
}

function renderUserArea() {
  const slotsDiv = document.getElementById('animalUserSlots');
  const poolDiv = document.getElementById('animalSourcePool');
  const emojiMap = { cat: '🐱', dog: '🐶', cow: '🐮', sheep: '🐑' };

  if (!slotsDiv || !poolDiv) return;

  // Render Slots
  slotsDiv.innerHTML = "";
  animUserSlots.forEach((anim, i) => {
    const slot = document.createElement('div');
    slot.style.width = "70px";
    slot.style.height = "70px";
    slot.style.border = "3px dashed rgba(255,255,255,0.7)";
    slot.style.borderRadius = "10px";
    slot.style.display = "flex";
    slot.style.justifyContent = "center";
    slot.style.alignItems = "center";
    slot.style.cursor = "pointer";
    slot.style.background = "rgba(255,255,255,0.2)";
    slot.style.transition = "all 0.2s";

    if (anim) {
      slot.textContent = emojiMap[anim.animal];
      slot.style.fontSize = "40px";
      slot.style.border = "3px solid white";
      slot.style.background = "white";
      slot.onclick = () => returnToPool(i);
    }
    slotsDiv.appendChild(slot);
  });

  // Render Pool
  poolDiv.innerHTML = "";
  animPool.forEach((item, i) => {
    if (!item.used) {
      const card = document.createElement('div');
      card.textContent = emojiMap[item.animal];
      card.style.fontSize = "40px";
      card.style.padding = "10px";
      card.style.background = "white";
      card.style.borderRadius = "10px";
      card.style.cursor = "pointer";
      card.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
      card.onclick = () => moveFromPoolToSlot(i);
      poolDiv.appendChild(card);
    }
  });

  checkAnimalCompletion();
}

function moveFromPoolToSlot(poolIndex) {
  const emptySlotIndex = animUserSlots.findIndex(s => s === null);
  if (emptySlotIndex !== -1) {
    animPool[poolIndex].used = true;
    animUserSlots[emptySlotIndex] = animPool[poolIndex];
    renderUserArea();
    playClick();
  }
}

function returnToPool(slotIndex) {
  const item = animUserSlots[slotIndex];
  if (item) {
    const poolItem = animPool.find(p => p.id === item.id);
    if (poolItem) poolItem.used = false;
    animUserSlots[slotIndex] = null;
    renderUserArea();
    playClick();
  }
}

function checkAnimalCompletion() {
  if (animUserSlots.every(s => s !== null)) {
    const currentSeq = animUserSlots.map(s => s.animal);
    const isCorrect = currentSeq.every((val, index) => val === animTarget[index]);

    if (isCorrect) {
      showReward();
      const slots = document.getElementById('animalUserSlots');
      if (slots) slots.style.background = "rgba(76, 175, 80, 0.4)";
    } else {
      playError();
    }
  }
}

function playTargetSequence() {
  const btn = document.getElementById('btnListenAnimals');
  if (btn) { btn.disabled = true; btn.style.opacity = "0.7"; }

  let index = 0;
  function next() {
    if (index >= animTarget.length) {
      if (btn) { btn.disabled = false; btn.style.opacity = "1"; }
      for (let i = 0; i < animTarget.length; i++) {
        const node = document.getElementById(`target-anim-${i}`);
        if (node) { node.style.transform = "scale(1)"; node.style.background = "none"; }
      }
      return;
    }

    const node = document.getElementById(`target-anim-${index}`);
    if (node) {
      node.style.transform = "scale(1.4)";
      node.style.background = "white";
    }
    if (index > 0) {
      const prev = document.getElementById(`target-anim-${index - 1}`);
      if (prev) {
        prev.style.transform = "scale(1)";
        prev.style.background = "none";
      }
    }

    const path = `sounds/animals/${animTarget[index]}.mp3`;
    const audio = new Audio(path);
    audio.play().catch(() => { });

    index++;
    setTimeout(next, 1200);
  }
  next();
}

// --- TASK 2: DRUM SEQUENCE (Simon Says) ---
let drumSeq = [];
let drumUserIndex = 0;
let drumLevel = 1;
let isDrumPlaying = false;

function startDrumGame() {
  drumLevel = 1;
  drumSeq = [];
  drumUserIndex = 0;

  const btn = document.getElementById('btnPlayDrum');
  if (btn) btn.textContent = "Қайта бастау 🔄";

  // Start with a small delay
  setTimeout(nextDrumRound, 500);
}

function nextDrumRound() {
  isDrumPlaying = true;
  drumUserIndex = 0;

  const drums = ['kick', 'snare', 'hihat'];
  // Add one random step
  drumSeq.push(drums[Math.floor(Math.random() * drums.length)]);

  const visualRow = document.getElementById('drumVisualRow');
  if (visualRow) {
    visualRow.innerHTML = `<div style="color:white; font-size:24px; animation: bounce 1s infinite;">Раунд ${drumLevel}: Тыңда! 👂</div>`;
  }

  setTimeout(playDrumSequenceFlow, 1000);
}

function playDrumSequenceFlow() {
  let i = 0;
  function tick() {
    if (i >= drumSeq.length) {
      isDrumPlaying = false;
      const visualRow = document.getElementById('drumVisualRow');
      if (visualRow) visualRow.innerHTML = `<div style="color:#00e676; font-size:24px;">Енді сен! (Қайтала) 🥁</div>`;
      return;
    }

    flashDrumPad(drumSeq[i]);
    i++;
    setTimeout(tick, 1000); // Speed of rhythm
  }
  tick();
}

function flashDrumPad(type) {
  const pad = document.getElementById(`pad-${type}`);
  if (pad) {
    pad.style.transform = "scale(1.15)";
    pad.style.borderColor = "#fffacc";
    pad.style.boxShadow = "0 0 40px white";
    setTimeout(() => {
      pad.style.transform = "scale(1)";
      pad.style.borderColor = "white";
      pad.style.boxShadow = "0 10px 20px rgba(0,0,0,0.3)";
    }, 300);
  }

  // Play Sound with Fallback
  const soundMap = {
    'kick': 'sounds/rhythm/big_drum.mp3', // Updated path
    'snare': 'sounds/rhythm/small_drum.mp3', // Updated path
    'hihat': 'sounds/rhythm/hihat.mp3'
  };

  // Try standard name
  let audio = new Audio(`sounds/${type}.mp3`);

  audio.onerror = () => {
    // Fallback if file missing
    if (soundMap[type]) new Audio(soundMap[type]).play().catch(() => { });
  };

  audio.play().catch(e => {
    // Ignore play errors
  });
}

function handleDrumHit(type) {
  if (isDrumPlaying) return; // Ignore input while playing
  if (drumSeq.length === 0) return; // Game not started

  // Immediate feedback
  flashDrumPad(type);

  // Logic Check
  if (type === drumSeq[drumUserIndex]) {
    drumUserIndex++;

    // Correct step visual
    const visualRow = document.getElementById('drumVisualRow');
    if (visualRow) visualRow.innerHTML = `<div style="color:#ffff00; font-size:24px;">... ${drumUserIndex} / ${drumSeq.length} ...</div>`;

    // Round Complete?
    if (drumUserIndex >= drumSeq.length) {
      // Success!
      if (visualRow) visualRow.innerHTML = `<div style="color:#4caf50; font-size:30px; font-weight:bold;">Дұрыс! Келесі деңгей! 🌟</div>`;
      showReward();
      drumLevel++;
      setTimeout(nextDrumRound, 2000);
    }
  } else {
    // Fail
    playError();
    const visualRow = document.getElementById('drumVisualRow');
    if (visualRow) visualRow.innerHTML = `<div style="color:#f44336; font-size:30px; font-weight:bold;">Қате! 😔 Кеттік басынан...</div>`;

    // Reset Game
    setTimeout(() => {
      startDrumGame();
    }, 2000);
  }
}

// Frog reading is owned by src/features/practice/frog.

// Sentence construction and spatial matrix are owned by src/features/practice/cards.
