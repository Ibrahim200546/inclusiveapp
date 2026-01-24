// ========== ГЛОБАЛДЫ АЙНЫМАЛЫЛАР ==========
let coins = 0;
let currentCharacter = 'fox';
let currentSoundTarget = '';
let audioContext = null;
let microphoneStream = null;
let isListening = false;
let currentTask = "";
let correctAnswer = "";
let isPlaying = false;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// ========== ДЫБЫС ЭФФЕКТІЛЕРІ ==========
function playClick() { document.getElementById('clickSound').play().catch(e => { }); }
function playSuccess() { document.getElementById('successSound').play().catch(e => { }); }
function playError() { document.getElementById('errorSound').play().catch(e => { }); }

// ========== ЭКРАНДАРДЫ АУЫСТЫРУ ==========
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
  window.scrollTo(0, 0);
  document.getElementById('gameFeedback') && (document.getElementById('gameFeedback').innerHTML = "");

  const header = document.querySelector('.header');
  if (header) {
    if (screenId === 'levelsScreen') {
      header.style.display = 'block';
    } else {
      header.style.display = 'none';
    }
  }

  if (typeof initAlippeLocal === 'function') {
    setTimeout(initAlippeLocal, 100);
  }
}

// ========== ADDED MISSING FUNCTIONS (FIX) ==========
function toggleMainMenu() {
  const menu = document.getElementById('mainRadialMenu');
  if (menu) menu.classList.toggle('active');
}

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

// ========== ТЕҢГЕ ЖИНАУ ==========
function addCoins(amount) {
  coins += amount;
  const coinSpan = document.getElementById('coinCount');
  coinSpan.style.transform = "scale(1.5)";
  coinSpan.innerText = coins;
  setTimeout(() => {
    coinSpan.style.transform = "scale(1)";
  }, 300);
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

// ========== 0-СЫНЫП: ТАПСЫРМА 2 - ДАУЫС СОЗУ ==========
function calcRMS(buffer) {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

let autocorrBuffer = null;

function autoCorrelate(buffer, sampleRate) {
  const SIZE = buffer.length;
  const rms = calcRMS(buffer);
  if (rms < 0.015) return -1;

  if (!autocorrBuffer || autocorrBuffer.length !== SIZE) {
    autocorrBuffer = new Float32Array(SIZE);
  }
  const c = autocorrBuffer;
  c.fill(0);

  let r1 = 0, r2 = SIZE - 1, thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < thres) { r1 = i; } else { break; }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buffer[SIZE - i]) < thres) { r2 = SIZE - i; } else { break; }
  }

  const buf = buffer.slice(r1, r2);
  const len = buf.length;

  for (let i = 0; i < len; i++) {
    for (let j = 0; j < len - i; j++) {
      c[i] = c[i] + buf[j] * buf[j + i];
    }
  }

  let d = 0; while (c[d] > c[d + 1]) d++;
  let maxval = -1, maxpos = -1;
  for (let i = d; i < len; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }
  let T0 = maxpos;

  let x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
  let a = (x1 + x3 - 2 * x2) / 2;
  let b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);

  return sampleRate / T0;
}

async function startVoicePractice() {
  const feedback = document.getElementById('g0t2Feedback');
  const train = document.getElementById('trainEmoji');
  const progressBar = document.getElementById('voiceProgress');

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;

    microphoneStream = audioContext.createMediaStreamSource(stream);
    microphoneStream.connect(analyser);

    const buffer = new Float32Array(analyser.fftSize);

    isListening = true;
    document.getElementById('voiceBtn').style.display = 'none';
    document.getElementById('stopVoiceBtn').style.display = 'inline-block';
    feedback.innerHTML = "Енді 'О-о-о' деп созып көріңіз...";

    let sustainTime = 0;
    let badFrames = 0;
    let lastTime = Date.now();
    const REQUIRED_DURATION = 1000;
    const MIN_FREQ = 150;
    const MAX_FREQ = 350;
    const MIN_RMS = 0.015;

    function analyze() {
      if (!isListening) return;
      requestAnimationFrame(analyze);

      const now = Date.now();
      const deltaTime = now - lastTime;
      lastTime = now;

      analyser.getFloatTimeDomainData(buffer);
      const rms = calcRMS(buffer);
      const pitch = autoCorrelate(buffer, audioContext.sampleRate);

      const bars = document.querySelectorAll('.wave-bar');
      bars.forEach(bar => {
        bar.style.height = Math.max(10, rms * 500) + 'px';
      });

      let isO = false;
      if (rms > MIN_RMS) {
        if (pitch > MIN_FREQ && pitch < MAX_FREQ) {
          isO = true;
        }
      }

      if (isO) {
        sustainTime += deltaTime;
        badFrames = 0;
      } else {
        badFrames++;
        if (badFrames > 3) {
          sustainTime = 0;
        }
      }

      let progress = (sustainTime / REQUIRED_DURATION) * 100;
      if (progress > 100) progress = 100;

      train.style.transform = `translateX(${progress * 4}px)`;
      progressBar.style.width = progress + '%';
      progressBar.innerText = Math.floor(progress) + '%';

      if (progress >= 100) {
        stopVoicePractice();
        feedback.innerHTML = "Керемет! 'О' дыбысы анықталды!";
        feedback.className = "feedback success";
        showReward();
      }
    }
    analyze();

  } catch (err) {
    console.error(err);
    feedback.innerHTML = "Микрофонға рұқсат беріңіз!";
    feedback.className = "feedback error";
  }
}

function stopVoicePractice() {
  isListening = false;
  if (audioContext) audioContext.close();
  document.getElementById('voiceBtn').style.display = 'inline-block';
  document.getElementById('stopVoiceBtn').style.display = 'none';
}

// ========== 0-СЫНЫП LOGIC ==========
const instruments = ['piano', 'drum', 'guitar', 'violin'];
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

const animals = ['horse', 'cow', 'sheep', 'cat', 'dog'];
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

function hitDrum() {
  const drum = document.getElementById('rhythmDrum');
  drum.style.transform = "scale(0.9)";
  setTimeout(() => drum.style.transform = "scale(1)", 100);
  const drumSound = document.getElementById('clickSound');
  drumSound.currentTime = 0;
  drumSound.play().catch(e => { });
}
function playRhythm(type) {
  const audio = type === 'march' ? document.getElementById('fastRhythm') : document.getElementById('slowRhythm');
  if (audio) { audio.currentTime = 0; audio.play().catch(e => { }); }
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

const humanSounds = ['laugh', 'cry', 'sneeze', 'cough'];
function playRandomHumanSound() {
  currentSoundTarget = humanSounds[Math.floor(Math.random() * humanSounds.length)];
  const audio = document.getElementById(currentSoundTarget + 'Audio');
  if (audio) { audio.currentTime = 0; audio.play().catch(e => { }); }
}
function checkHumanSound(choice) {
  const feedback = document.getElementById('g0t7Feedback');
  if (!currentSoundTarget) { feedback.innerHTML = "Алдымен дыбысты тыңдаңыз!"; return; }
  if (choice === currentSoundTarget) { feedback.innerHTML = "Дұрыс!"; feedback.className = "feedback success"; showReward(); currentSoundTarget = null; }
  else { playError(); feedback.innerHTML = "Қате!"; feedback.className = "feedback error"; }
}

const vehicles0 = ['car', 'motorcycle', 'plane', 'train'];
window.g0VehicleTarget = null;
window.startVehicleGame = function () {
  window.g0VehicleTarget = vehicles0[Math.floor(Math.random() * vehicles0.length)];
  const audio = new Audio(`sounds/transport/${window.g0VehicleTarget}.mp3`);
  audio.play().catch(e => { });
  shuffleCardsInTask('g0Task8');
}
window.verifyVehicleChoice = function (choice) {
  const feedback = document.getElementById('g0t8Feedback');
  if (!window.g0VehicleTarget) {
    new Audio(`sounds/transport/${choice}.mp3`).play().catch(e => { }); return;
  }
  if (choice === window.g0VehicleTarget) {
    feedback.innerHTML = "Дұрыс!"; feedback.className = "feedback success"; showReward(); window.g0VehicleTarget = null;
  } else {
    playError(); feedback.innerHTML = "Қате!"; feedback.className = "feedback error";
  }
}

const homeSounds = ['phone', 'clock', 'bike', 'doorbell', 'schoolbell'];
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

// ========== 1-СЫНЫП: ТАПСЫРМА 1 - ӘРІПТЕР ==========
const kazakhLetters = ['А', 'Ә', 'Б', 'В', 'Г', 'Ғ', 'Д', 'Е', 'Ё', 'Ж', 'З', 'И', 'К', 'Қ', 'Л', 'М', 'Н', 'Ң', 'О', 'Ө', 'П', 'Р', 'С', 'Т', 'У', 'Ұ', 'Ү', 'Ф', 'Х', 'Һ', 'Ц', 'Ч', 'Ш', 'Щ', 'Ы', 'Э', 'Ю', 'Я'];
let letterGameState = 'initial';
let correctLetterAnswer = '';
let selectedLetterAnswer = '';
let currentLetterOptions = [];
const congratsMessages = ["Керемет! Өте жақсы!", "Жарайсың! Тамаша!", "Біліктісің!", "Керемет!"];

function initializeLetterGame() {
  correctLetterAnswer = kazakhLetters[Math.floor(Math.random() * kazakhLetters.length)];
  currentLetterOptions = [correctLetterAnswer];
  while (currentLetterOptions.length < 6) {
    const r = kazakhLetters[Math.floor(Math.random() * kazakhLetters.length)];
    if (!currentLetterOptions.includes(r)) currentLetterOptions.push(r);
  }
  currentLetterOptions.sort(() => Math.random() - 0.5);

  const screen = document.getElementById('g1TaskLetters');
  if (!screen) return;

  const optionCircles = screen.querySelectorAll('.option-circle');
  optionCircles.forEach((circle, index) => {
    const letterSpan = circle.querySelector('.letter-option');
    if (letterSpan) {
      letterSpan.textContent = currentLetterOptions[index];
    }
    circle.classList.remove('selected', 'disabled');
    circle.classList.add('disabled');
  });

  const centerContent = document.getElementById('centerContent');
  if (centerContent) centerContent.textContent = '🔊';

  const centerCircle = document.getElementById('centerCircle');
  if (centerCircle) centerCircle.classList.remove('disabled', 'highlight');

  // ANIMATION FIX: Ensure container has active class to show circles
  const container = document.getElementById('letterCircleContainer');
  if (container) {
    container.classList.remove('active');
    setTimeout(() => container.classList.add('active'), 100);
  }

  letterGameState = 'initial';
  selectedLetterAnswer = '';
  const fb = document.getElementById('g1t1Feedback');
  if (fb) fb.innerHTML = '';
}

function handleCenterClick() {
  const centerCircle = document.getElementById('centerCircle');
  const centerContent = document.getElementById('centerContent');
  const feedback = document.getElementById('g1t1Feedback');

  if (letterGameState === 'initial') {
    playLetterSound();
    if (centerContent) {
      centerContent.textContent = 'Таңдау';
      centerContent.style.fontSize = '24px';
    }

    document.querySelectorAll('#g1TaskLetters .option-circle').forEach(c => c.classList.remove('disabled'));

    if (centerCircle) centerCircle.classList.add('disabled');
    letterGameState = 'listened';
    if (feedback) feedback.innerHTML = 'Енді дұрыс әріпті таңдаңыз!';
  }
  else if (letterGameState === 'selected') {
    checkLetterAnswer();
  }
}

function playLetterSound() {
  const letter = correctLetterAnswer;
  const letterLower = letter.toLowerCase();

  // Use sounds/letters/
  const path = `sounds/letters/letter_${letterLower}.mp3`;
  new Audio(path).play().catch(() => {
    new Audio(`sounds/letters/letter_${letter}.mp3`).play().catch(() => { });
  });
}

function selectLetterOption(circleElement, optionIndex) {
  if (letterGameState !== 'listened' && letterGameState !== 'selected') return;

  document.querySelectorAll('#g1TaskLetters .option-circle').forEach(c => c.classList.remove('selected'));
  circleElement.classList.add('selected');

  selectedLetterAnswer = currentLetterOptions[optionIndex];

  // Play sound from letters/
  const letterLower = selectedLetterAnswer.toLowerCase();
  new Audio(`sounds/letters/letter_${letterLower}.mp3`).play().catch(() => { });

  const centerCircle = document.getElementById('centerCircle');
  if (centerCircle) {
    centerCircle.classList.remove('disabled');
    centerCircle.classList.add('highlight');
  }

  letterGameState = 'selected';
}

function checkLetterAnswer() {
  const feedback = document.getElementById('g1t1Feedback');
  const centerCircle = document.getElementById('centerCircle');
  if (centerCircle) centerCircle.classList.remove('highlight');

  if (selectedLetterAnswer === correctLetterAnswer) {
    const msg = congratsMessages[Math.floor(Math.random() * congratsMessages.length)];
    if (feedback) {
      feedback.innerHTML = "✅ " + msg;
      feedback.className = "feedback success";
    }
    playSuccess();
    showReward();
    setTimeout(initializeLetterGame, 1500);
  } else {
    playError();
    if (feedback) {
      feedback.innerHTML = "❌ Қате! Дұрыс жауап: " + correctLetterAnswer;
      feedback.className = "feedback error";
    }
    setTimeout(initializeLetterGame, 2000);
  }
}

// ========== ALIPPE LOCAL (INJECTED) ==========
function playAlippeSoundLocal(letter) {
  const letterLower = letter.toLowerCase();
  const path = `sounds/Alippe/Alippe_${letterLower}.mp3`;
  new Audio(path).play().catch(e => {
    const oldPath = `sounds/letters/letter_${letterLower}.mp3`;
    new Audio(oldPath).play().catch(() => { });
  });
}

function initAlippeLocal() {
  const grids = document.querySelectorAll(".alippe-grid");
  if (grids.length === 0) return;

  const alippeData = [
    { letter: "А", word: "Алма", icon: "🍎" },
    { letter: "Ә", word: "Әтеш", icon: "🐓" },
    { letter: "Б", word: "Бақа", icon: "🐸" },
    { letter: "В", word: "Вагон", icon: "🚃" },
    { letter: "Г", word: "Гүл", icon: "🌺" },
    { letter: "Ғ", word: "Ғарыш", icon: "🚀" },
    { letter: "Д", word: "Доп", icon: "⚽" },
    { letter: "Е", word: "Есік", icon: "🚪" },
    { letter: "Ё", word: "Шахтёр", icon: "👷" },
    { letter: "Ж", word: "Жүзім", icon: "🍇" },
    { letter: "З", word: "Зебра", icon: "🦓" },
    { letter: "И", word: "Ит", icon: "🐕" },
    { letter: "Й", word: "Ай", icon: "🌙" },
    { letter: "К", word: "Күн", icon: "☀️" },
    { letter: "Қ", word: "Қоян", icon: "🐇" },
    { letter: "Л", word: "Лақ", icon: "🐐" },
    { letter: "М", word: "Мысық", icon: "🐱" },
    { letter: "Н", word: "Нан", icon: "🍞" },
    { letter: "Ң", word: "Қоңыз", icon: "🪲" },
    { letter: "О", word: "Орындық", icon: "🪑" },
    { letter: "Ө", word: "Өрік", icon: "🍑" },
    { letter: "П", word: "Піл", icon: "🐘" },
    { letter: "Р", word: "Робот", icon: "🤖" },
    { letter: "С", word: "Сәбіз", icon: "🥕" },
    { letter: "Т", word: "Тышқан", icon: "🐁" },
    { letter: "У", word: "Аққу", icon: "🦢" },
    { letter: "Ұ", word: "Ұшақ", icon: "✈️" },
    { letter: "Ү", word: "Үкі", icon: "🦉" },
    { letter: "Ф", word: "Фонтан", icon: "⛲" },
    { letter: "Х", word: "Алхоры", icon: "🫐" },
    { letter: "Һ", word: "Айдаһар", icon: "🐉" },
    { letter: "Ц", word: "Цирк", icon: "🎪" },
    { letter: "Ч", word: "Чемодан", icon: "🧳" },
    { letter: "Ш", word: "Шар", icon: "🎈" },
    { letter: "Щ", word: "Щетка", icon: "🪥" },
    { letter: "Ъ", word: "Объектив", icon: "📷" },
    { letter: "Ы", word: "Ыдыс", icon: "🥣" },
    { letter: "І", word: "Ірімшік", icon: "🧀" },
    { letter: "Ь", word: "Апельсин", icon: "🍊" },
    { letter: "Э", word: "Экскаватор", icon: "🏗️" },
    { letter: "Ю", word: "Аю", icon: "🐻" },
    { letter: "Я", word: "Қияр", icon: "🥒" }
  ];

  grids.forEach(grid => {
    grid.innerHTML = "";
    alippeData.forEach(itemData => {
      const item = document.createElement("div");
      item.className = "alippe-item";
      item.style.padding = "4px";
      item.style.gap = "2px";

      const iconDiv = document.createElement("div");
      iconDiv.textContent = itemData.icon;
      iconDiv.style.fontSize = "24px";
      iconDiv.style.lineHeight = "1.2";

      const letterDiv = document.createElement("div");
      letterDiv.textContent = itemData.letter;
      letterDiv.style.fontSize = "18px";
      letterDiv.style.fontWeight = "bold";
      letterDiv.style.color = "#155724";

      const wordDiv = document.createElement("div");
      wordDiv.textContent = itemData.word;
      wordDiv.style.fontSize = "10px";
      wordDiv.style.color = "#333";
      wordDiv.style.marginTop = "0px";

      item.appendChild(iconDiv);
      item.appendChild(letterDiv);
      item.appendChild(wordDiv);

      item.onclick = () => {
        playAlippeSoundLocal(itemData.letter);
        item.style.transform = "scale(0.95)";
        setTimeout(() => item.style.transform = "scale(1)", 150);
      };

      grid.appendChild(item);
    });
  });
}

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
  // INIT ALIPPE LOCAL ON LOAD
  if (typeof initAlippeLocal === 'function') {
    initAlippeLocal();
  }

  // THEME TOGGLE LOGIC
  const themeChk = document.getElementById('themeChk');
  if (themeChk) {
    themeChk.addEventListener('change', () => {
      document.body.style.backgroundImage = themeChk.checked ?
        "url('assets/night.jpg')" :
        "url('assets/background.jpg')";
    });
  }
});