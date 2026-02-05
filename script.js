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

// ========== 1-СЫНЫП ТАПСЫРМАЛАРЫ (Grade 1 Tasks) ==========

function startTask(type) {
  currentTask = type;
  showScreen('gamePlay');
  const container = document.getElementById('optionsContainer');
  if (container) {
    container.innerHTML = '<div class="center-circle" id="actionElement" onclick="playCurrentAudio()"><img src="assets/img/speaker.png" style="width:60%; height:60%; object-fit:contain;"></div>';
    // Ensure the container is ready for new items
    container.classList.remove('active');
  }
  const fb = document.getElementById('gameFeedback');
  if (fb) fb.innerHTML = "";

  let options = [];

  if (type === 'claps') {
    document.getElementById('taskTitle').innerText = "Дыбыс санын анықта";
    document.getElementById('taskDesc').innerText = "Шапалақ неше рет соғылды?";
    options = [{ val: 1, icon: '1', label: 'Біреу' }, { val: 2, icon: '2', label: 'Екеу' }, { val: 3, icon: '3', label: 'Үшеу' }];
    generateClaps();
  }
  else if (type === 'pitch') {
    document.getElementById('taskTitle').innerText = "Кімнің дауысы?";
    document.getElementById('taskDesc').innerText = "Дауыс жиілігін ажырат";
    options = [{ val: 'low', icon: 'assets/img/man.png', label: 'Төмен' }, { val: 'mid', icon: 'assets/img/woman.png', label: 'Орта' }, { val: 'high', icon: 'assets/img/child.png', label: 'Жоғары' }];
    generatePitch();
  }
  else if (type === 'home') {
    document.getElementById('taskTitle').innerText = "Тұрмыстық дыбыстар";
    document.getElementById('taskDesc').innerText = "Бұл ненің дыбысы?";
    options = [
      { val: 'phone', icon: 'https://img.icons8.com/3d-fluency/94/iphone.png', label: 'Телефон' },
      { val: 'clock', icon: 'https://img.icons8.com/3d-fluency/94/alarm-clock--v2.png', label: 'Сағат' },
      { val: 'bike', icon: 'https://img.icons8.com/3d-fluency/94/bicycle.png', label: 'Велосипед' },
      { val: 'doorbell', icon: 'https://img.icons8.com/3d-fluency/94/doorbell.png', label: 'Есік' },
      { val: 'schoolbell', icon: 'https://img.icons8.com/3d-fluency/94/school-building.png', label: 'Мектеп' }
    ];
    generateHomeSound();
  }
  else if (type === 'tempo') {
    document.getElementById('taskTitle').innerText = "Би ырғағы";
    document.getElementById('taskDesc').innerText = "Музыканың қарқынын тап";
    options = [{ val: 'fast', icon: 'assets/img/rocket.png', label: 'Тез' }, { val: 'slow', icon: 'assets/img/turtle.png', label: 'Баяу' }];
    generateTempo();
  }

  renderRadialOptions(options);
}

function renderRadialOptions(options) {
  const container = document.getElementById('optionsContainer');
  if (!container) return;

  const radius = 220;
  const count = options.length;

  options.forEach((opt, index) => {
    const angleDeg = (360 / count) * index - 90;
    const div = document.createElement('div');
    div.className = "option-circle";
    div.style.setProperty('--angle', angleDeg + 'deg');
    div.style.setProperty('--dist', radius + 'px');
    div.onclick = () => {
      // Logic: 1st click = Play Sound & Highlight. 2nd click = Check Answer.

      const isSelected = div.classList.contains('active-selection');

      // Reset all others
      const allOps = container.querySelectorAll('.option-circle');
      allOps.forEach(el => el.classList.remove('active-selection'));

      if (!isSelected) {
        // First click
        div.classList.add('active-selection');
        playOptionSound(currentTask, opt.val);
      } else {
        // Second click (Confirm)
        div.classList.remove('active-selection');
        checkGenericAnswer(opt.val);
      }
    };

    const iconHtml = opt.icon.includes('/')
      ? `<img src="${opt.icon}" style="width:60px; height:60px; object-fit:contain;">`
      : `<div style="font-size: 40px;">${opt.icon}</div>`;
    div.innerHTML = `${iconHtml}<p style="margin:0; font-size:16px;">${opt.label}</p>`;
    container.appendChild(div);
  });

  // Trigger animation
  setTimeout(() => container.classList.add('active'), 50);
}

function generateClaps() { correctAnswer = Math.floor(Math.random() * 3) + 1; }
function generatePitch() { const p = ['low', 'mid', 'high']; correctAnswer = p[Math.floor(Math.random() * 3)]; }
function generateHomeSound() { const s = ['phone', 'clock', 'bike', 'doorbell', 'schoolbell']; correctAnswer = s[Math.floor(Math.random() * s.length)]; }
function generateTempo() { correctAnswer = Math.random() > 0.5 ? 'fast' : 'slow'; }

function playCurrentAudio() {
  if (isPlaying) return;
  isPlaying = true;
  let audioElement = null;

  if (currentTask === 'claps') { playClapsSequence(correctAnswer); return; }
  else if (currentTask === 'pitch') {
    if (correctAnswer === 'low') audioElement = document.getElementById('lowVoice');
    else if (correctAnswer === 'mid') audioElement = document.getElementById('midVoice');
    else if (correctAnswer === 'high') audioElement = document.getElementById('highVoice');
  } else if (currentTask === 'home') {
    if (correctAnswer === 'phone') audioElement = document.getElementById('phoneSound');
    else if (correctAnswer === 'clock') audioElement = document.getElementById('clockSound');
    else if (correctAnswer === 'bike') audioElement = document.getElementById('bikeSound');
    else if (correctAnswer === 'doorbell') audioElement = document.getElementById('doorbellAudio');
    else if (correctAnswer === 'schoolbell') audioElement = document.getElementById('schoolbellAudio');
  } else if (currentTask === 'tempo') {
    if (correctAnswer === 'fast') audioElement = document.getElementById('fastRhythm');
    else if (correctAnswer === 'slow') audioElement = document.getElementById('slowRhythm');
  }

  if (audioElement) {
    audioElement.currentTime = 0;
    audioElement.play().catch(e => console.log("Audio play failed: ", e))
      .finally(() => { setTimeout(() => { isPlaying = false; }, 500); });
  } else {
    isPlaying = false;
  }
}

function playClapsSequence(count) {
  const clapAudio = document.getElementById('clapAudio');
  let played = 0;
  function playNext() {
    if (played < count) {
      clapAudio.currentTime = 0;
      clapAudio.play().catch(e => console.log("Clap play failed"));
      played++;
      setTimeout(playNext, 600);
    } else { isPlaying = false; }
  }
  playNext();
}

// Helper to play sound for an option
function playOptionSound(task, val) {
  let elem = null;

  if (task === 'claps') {
    // Manual clap playback for generic options
    // Assuming simple playback is enough or reuse sequence logic?
    // playClapsSequence expects global state, better to play simple click or reuse carefully.
    // Let's use simple logic: play clap sound N times rapidly or just once?
    // User wants "sound of that button". Button is "1 clap". So play 1 clap.
    // But playClapsSequence plays sequence.
    // Lets just play one clap for feedback or try to call playClapsSequence(val) detached from 'isPlaying' lock if possible.
    // For now, let's play the Click/Clap sound once.
    const clap = document.getElementById('clapAudio');
    if (clap) { clap.currentTime = 0; clap.play().catch(() => { }); }
    return;
  }

  if (task === 'pitch') {
    if (val === 'low') elem = document.getElementById('lowVoice');
    else if (val === 'mid') elem = document.getElementById('midVoice');
    else if (val === 'high') elem = document.getElementById('highVoice');
  }
  else if (task === 'home') {
    if (val === 'phone') elem = document.getElementById('phoneSound');
    else if (val === 'clock') elem = document.getElementById('clockSound');
    else if (val === 'bike') elem = document.getElementById('bikeSound');
    else if (val === 'doorbell') elem = document.getElementById('doorbellAudio');
    else if (val === 'schoolbell') elem = document.getElementById('schoolbellAudio');
  }
  else if (task === 'tempo') {
    if (val === 'fast') elem = document.getElementById('fastRhythm');
    else if (val === 'slow') elem = document.getElementById('slowRhythm');
  }

  if (elem) {
    elem.currentTime = 0;
    elem.play().catch(e => console.log("Option sound error:", e));
  }
}

function checkGenericAnswer(val) {
  console.log(`Checking answer. Selected: ${val}, Correct: ${correctAnswer}`); // Debugging

  const fb = document.getElementById('gameFeedback');
  if (val == correctAnswer) {
    fb.innerHTML = "Жарайсың! Дұрыс 🎉";
    fb.className = "feedback success";
    addCoins(10);
    showReward();
    setTimeout(() => startTask(currentTask), 2000); // Increased delay to allow sound to finish
  } else {
    fb.innerHTML = "Қате, тағы тыңдап көр ❌";
    fb.className = "feedback error";
    playError();
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


// ========== SOUND MAP (ARTICULATION CIRCLE) LOGIC ==========

const articulationData = [
  // INNER RING (Vowels & Basic)
  { char: 'А', ring: 'inner', status: 'mastered', angle: 0 },
  { char: 'О', ring: 'inner', status: 'mastered', angle: 60 },
  { char: 'У', ring: 'inner', status: 'mastered', angle: 120 },
  { char: 'Ы', ring: 'inner', status: 'progress', angle: 180 },
  { char: 'И', ring: 'inner', status: 'progress', angle: 240 },
  { char: 'Ү', ring: 'inner', status: 'locked', angle: 300 },

  // MIDDLE RING (Consonants)
  { char: 'М', ring: 'middle', status: 'mastered', angle: 15 },
  { char: 'Н', ring: 'middle', status: 'mastered', angle: 55 },
  { char: 'Б', ring: 'middle', status: 'progress', angle: 95 },
  { char: 'П', ring: 'middle', status: 'progress', angle: 135 },
  { char: 'Т', ring: 'middle', status: 'progress', angle: 175 },
  { char: 'Д', ring: 'middle', status: 'locked', angle: 215 },
  { char: 'К', ring: 'middle', status: 'locked', angle: 255 },
  { char: 'Г', ring: 'middle', status: 'locked', angle: 295 },
  { char: 'Л', ring: 'middle', status: 'locked', angle: 335 },

  // OUTER RING (Complex)
  { char: 'Р', ring: 'outer', status: 'locked', angle: 0 },
  { char: 'Ш', ring: 'outer', status: 'locked', angle: 30 },
  { char: 'Ж', ring: 'outer', status: 'locked', angle: 60 },
  { char: 'С', ring: 'outer', status: 'progress', angle: 90 }, // Opened for demo
  { char: 'З', ring: 'outer', status: 'locked', angle: 120 },
  { char: 'Ц', ring: 'outer', status: 'locked', angle: 150 },
  { char: 'Ч', ring: 'outer', status: 'locked', angle: 180 },
  { char: 'Щ', ring: 'outer', status: 'locked', angle: 210 },
  { char: 'Ф', ring: 'outer', status: 'locked', angle: 240 },
  { char: 'Х', ring: 'outer', status: 'locked', angle: 270 },
  { char: 'Ң', ring: 'outer', status: 'locked', angle: 300 },
  { char: 'Қ', ring: 'outer', status: 'locked', angle: 330 }
];

function initArticulationMap() {
  const container = document.getElementById('orbitSystem');
  // Clear existing nodes but keep rings
  const existingNodes = container.querySelectorAll('.sound-node');
  existingNodes.forEach(node => node.remove());

  articulationData.forEach(item => {
    const node = document.createElement('div');
    node.className = `sound-node ${item.status}`;
    node.textContent = item.char;

    // Calculate Position
    let radius = 0;
    if (item.ring === 'inner') radius = 125;
    if (item.ring === 'middle') radius = 225;
    if (item.ring === 'outer') radius = 325;

    // Convert angle to radians and adjust for CSS positioning (center is 0,0 relative to parent loop? No, parent is flex center)
    // Actually, OrbitSystem is 700x700 flex center.
    // We need offset from center.
    const radians = (item.angle - 90) * (Math.PI / 180); // -90 to start at top
    const x = radius * Math.cos(radians);
    const y = radius * Math.sin(radians);

    node.style.transform = `translate(${x}px, ${y}px)`;

    node.onclick = () => {
      if (item.status !== 'locked') {
        openArticulationLesson(item.char);
      } else {
        // Locked animation
        node.style.transform = `translate(${x}px, ${y}px) scale(0.9)`;
        setTimeout(() => node.style.transform = `translate(${x}px, ${y}px)`, 100);
      }
    };

    container.appendChild(node);
  });
}

function openArticulationLesson(char) {
  const modal = document.getElementById('articulationModal');
  modal.classList.add('active');
  document.getElementById('lessonLetter').textContent = char;

  // Reset visualizer
  const viz = document.getElementById('aiVisualizer');
  viz.innerHTML = '';
  for (let i = 0; i < 20; i++) {
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = '5px';
    bar.style.animation = 'none';
    viz.appendChild(bar);
  }

  document.getElementById('aiFeedback').textContent = "";
}

function closeArticulationModal() {
  document.getElementById('articulationModal').classList.remove('active');
}

function playLessonAudio(voiceType) {
  // Simulator: play sound based on letter and voice
  // In real app, would allow dynamic paths.
  console.log(`Playing ${voiceType} voice for current letter`);
  // Just simulate pulsing bars
  const bars = document.querySelectorAll('.bar');
  bars.forEach((bar, i) => {
    bar.style.animation = `soundWave 0.5s ease-in-out ${i * 0.05}s 3`; // Play for 1.5s
  });
}

function startMicrophoneCheck() {
  const bars = document.querySelectorAll('.bar');
  const feedback = document.getElementById('aiFeedback');

  feedback.textContent = "Тыңдауда... 🎤";
  feedback.style.color = "#666";

  // Simulate active recording
  bars.forEach(bar => {
    bar.style.animation = `soundWave 0.2s ease-in-out infinite`;
  });

  // Simulate AI processing delay
  setTimeout(() => {
    bars.forEach(bar => bar.style.animation = 'none');

    // Random success/fail for demo
    const success = Math.random() > 0.3;

    if (success) {
      feedback.textContent = "Керемет! Дұрыс айтылды! ✅";
      feedback.style.color = "#43a047";
      showReward(); // Add coins
    } else {
      feedback.textContent = "Тағы бір рет қайталап көрші... 🔄";
      feedback.style.color = "#fb8c00";
    }
  }, 2000);
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

// ========== ARTICULATION ENGINE (AI SOUND MODULE) ==========
// Implements Single-Target Phoneme Validation using Spectral Centroid Analysis
class ArticulationEngine {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.visualizationId = 'aiVisualizer';
    this.isRecording = false;
    this.animationFrame = null;
    this.history = []; // Stores features {energy, centroid}
    this.targetPhoneme = null; // Current constraint

    // ACOUSTIC PROFILES (Calibrated based on Web Audio API inputs)
    // Ref: Center Mass of Frequency (0-255 scale relative to 22kHz)
    // Current Mic Stats: "И" ~= 92. 
    this.profiles = {
      // Vowels (Low/Mid Freqs)
      'А': { centroidRef: 60, tolerance: 35 }, // Open vowel
      'О': { centroidRef: 50, tolerance: 30 }, // Rounded
      'У': { centroidRef: 35, tolerance: 25 }, // Deepest bass
      'И': { centroidRef: 95, tolerance: 40 }, // Brightest vowel (User got ~92)
      'Ы': { centroidRef: 75, tolerance: 35 },

      // Consonants (High Freqs)
      'С': { centroidRef: 180, tolerance: 60 }, // High hiss
      'Ш': { centroidRef: 140, tolerance: 50 }, // Lower hiss
      'Р': { centroidRef: 80, tolerance: 40 },  // Rolling r (broad spectrum)
    };
  }

  async initialize() {
    if (this.audioContext) return true; // Already init
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048; // Increased resolution again for stability
      this.analyser.smoothingTimeConstant = 0.6; // Smoother readings
      this.microphone.connect(this.analyser);
      return true;
    } catch (e) {
      console.error("Mic access denied:", e);
      alert("Микрофонға рұқсат керек! (Mic permission needed)");
      return false;
    }
  }

  setTarget(phoneme) {
    this.targetPhoneme = phoneme;
    this.history = [];
    console.log(`Target set to: ${phoneme}`);
  }

  startVisualization() {
    const container = document.getElementById(this.visualizationId);
    if (!container) return;

    container.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.width = container.clientWidth || 400;
    canvas.height = container.clientHeight || 100;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const bufferLength = this.analyser.frequencyBinCount; // 512
    const dataArray = new Uint8Array(bufferLength);

    const process = () => {
      if (!this.isRecording) return;
      this.animationFrame = requestAnimationFrame(process);

      this.analyser.getByteFrequencyData(dataArray);

      // --- VISUALIZATION ---
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / 50) - 1; // Draw fewer bars for clean look
      let x = 0;
      // Draw sub-sampled bars
      for (let i = 0; i < 50; i++) {
        const binIdx = Math.floor(i * (bufferLength / 50));
        const val = dataArray[binIdx];
        const barHeight = (val / 255) * canvas.height;

        ctx.fillStyle = val > 128 ? '#ffeb3b' : '#64ffda'; // Yellow/Cyan theme
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 2;
      }

      // --- FEATURE EXTRACTION (Physics) ---
      // 1. Calculate Energy (VAD)
      let sumEnergy = 0;
      let sumCentroid = 0;

      for (let i = 0; i < bufferLength; i++) {
        sumEnergy += dataArray[i];
        sumCentroid += i * dataArray[i];
      }
      const avgEnergy = sumEnergy / bufferLength;

      // VAD Threshold (Noise Gate)
      if (avgEnergy > 15) {
        // 2. Calculate Spectral Centroid (Center of Mass)
        // Low C = Bass/O/U, High C = Treble/S/I
        const centroid = sumCentroid / (sumEnergy || 1);

        this.history.push({
          energy: avgEnergy,
          centroid: centroid
        });
      }
    };

    this.isRecording = true;
    process();
  }

  stop() {
    this.isRecording = false;
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    // Don't disconnect context, just stop recording loop
  }

  // VALIDATION LOGIC
  analyze() {
    // 1. Check VAD (Did they speak?)
    if (this.history.length < 5) {
      return { success: false, score: 0, feedback: "Дыбыс естілмеді (No Sound)" };
    }

    // 2. Aggregate Features
    // Get average centroid of the loudest frames
    const loudFrames = this.history.filter(f => f.energy > 30);
    if (loudFrames.length === 0) {
      return { success: false, score: 0.1, feedback: "Қаттырақ айтшы (Louder)" };
    }

    // Avg Centroid
    const avgCentroid = loudFrames.reduce((sum, f) => sum + f.centroid, 0) / loudFrames.length;
    console.log("Measured Centroid:", avgCentroid);

    // 3. TARGET VALIDATION
    if (!this.targetPhoneme) {
      // Generic mode (accept any loud sound)
      return { success: true, score: 0.8, feedback: "Жақсы! (Good)" };
    }

    const profile = this.profiles[this.targetPhoneme];

    // If we don't have a profile for this letter yet, fallback to generic energy check
    if (!profile) {
      return { success: true, score: 0.7, feedback: "Дыбыс қабылданды (Generic)" };
    }

    // COMPARE
    const distance = Math.abs(avgCentroid - profile.centroidRef);
    const isValid = distance <= profile.tolerance;

    // Score calculation (0 to 1)
    // If distance is 0, score 1. If distance is tolerance, score 0.6.
    let score = Math.max(0, 1.0 - (distance / (profile.tolerance * 2)));

    if (isValid) {
      return {
        success: true,
        score: 0.8 + (score * 0.2),
        feedback: "Керемет! Дұрыс! ✅"
      };
    } else {
      // Diagnostic feedback
      let hint = "Дұрыс емес...";
      if (avgCentroid < profile.centroidRef) hint = "Ашаңдау айт (Brighter)";
      else hint = "Жуандау айт (Darker)";

      return {
        success: false,
        score: score,
        feedback: "Басқа дыбыс сияқты... 🔄",
        debug: `Got ${Math.round(avgCentroid)}, need ${profile.centroidRef}`
      };
    }
  }
}

const articulationEngine = new ArticulationEngine();

async function startMicrophoneCheck() {
  const btn = document.querySelector('#articulationModal .btn-primary');
  const feedback = document.getElementById('aiFeedback');
  const lessonLetter = document.getElementById('lessonLetter').textContent; // Get Target

  // Toggle Logic
  if (articulationEngine.isRecording) {
    finishMicrophoneCheck();
    return;
  }

  feedback.textContent = "Микрофон қосылуда...";
  const success = await articulationEngine.initialize();

  if (!success) {
    feedback.textContent = "Микрофонға рұқсат жоқ ❌";
    return;
  }

  // SET TARGET
  articulationEngine.setTarget(lessonLetter);

  btn.textContent = "⏹️ Тоқтату";
  btn.classList.add('btn-danger'); // UI Update

  feedback.textContent = `"${lessonLetter}" дыбысын айт... 🗣️`;
  articulationEngine.startVisualization();

  // Auto-stop limit
  setTimeout(() => {
    if (articulationEngine.isRecording) finishMicrophoneCheck();
  }, 3500);
}

function finishMicrophoneCheck() {
  const result = articulationEngine.analyze();
  articulationEngine.stop();

  const feedback = document.getElementById('aiFeedback');
  const btn = document.querySelector('#articulationModal .btn-primary');

  if (btn) {
    btn.textContent = "🎤 Айтып көр!";
    btn.classList.remove('btn-danger');
  }

  console.log("Analysis Result:", result);

  if (result.success) {
    feedback.textContent = result.feedback;
    feedback.style.color = "#43a047";
    showReward();
  } else {
    // Helpful Debug for Learners: Show what went wrong
    const debugInfo = result.debug ? `\n🔍 ${result.debug}` : "";
    feedback.innerText = result.feedback + debugInfo;
    feedback.style.color = "#e53935";
    playError();
  }
}

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
  // INIT ALIPPE LOCAL ON LOAD
  if (typeof initAlippeLocal === 'function') {
    initAlippeLocal();
  }

  // THEME TOGGLE LOGIC
  const themeChk = document.getElementById('theme_toggle_input');
  if (themeChk) {
    themeChk.addEventListener('change', () => {
      document.body.style.backgroundImage = themeChk.checked ?
        "url('assets/night.jpg')" :
        "url('assets/background.jpg')";
    });
  }
});