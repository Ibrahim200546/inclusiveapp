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
}

// ========== КЕЙІПКЕР ТАҢДАУ ==========
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
  playSuccess();
  addCoins(10);
  document.getElementById('rewardModal').classList.add('active');
}

function closeModal() {
  playClick();
  document.getElementById('rewardModal').classList.remove('active');
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
    if (hasSound) {
      playFakeBeep();
    }
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
async function startVoicePractice() {
  const feedback = document.getElementById('g0t2Feedback');
  const train = document.getElementById('trainEmoji');
  const progressBar = document.getElementById('voiceProgress');

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    microphoneStream = audioContext.createMediaStreamSource(stream);
    microphoneStream.connect(analyser);
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    isListening = true;
    document.getElementById('voiceBtn').style.display = 'none';
    document.getElementById('stopVoiceBtn').style.display = 'inline-block';
    feedback.innerHTML = "Сөйлеңіз! Пойыз қозғалуда...";

    let trainPosition = 0;

    function analyze() {
      if (!isListening) return;
      requestAnimationFrame(analyze);
      analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      let average = sum / bufferLength;

      const bars = document.querySelectorAll('.wave-bar');
      bars.forEach(bar => {
        bar.style.height = Math.max(10, average * 1.5) + 'px';
      });

      if (average > 30) {
        trainPosition += 0.5;
        if (trainPosition > 100) trainPosition = 100;

        train.style.transform = `translateX(${trainPosition * 4}px)`;
        progressBar.style.width = trainPosition + '%';
        progressBar.innerText = Math.floor(trainPosition) + '%';

        if (trainPosition >= 100) {
          stopVoicePractice();
          feedback.innerHTML = "Керемет! Пойыз жетті!";
          feedback.className = "feedback success";
          showReward();
        }
      }
    }
    analyze();

  } catch (err) {
    console.error(err);
    feedback.innerHTML = "Микрофон қосылмады. Рұқсат беріңіз.";
    feedback.className = "feedback error";
  }
}

function stopVoicePractice() {
  isListening = false;
  if (audioContext) audioContext.close();
  document.getElementById('voiceBtn').style.display = 'inline-block';
  document.getElementById('stopVoiceBtn').style.display = 'none';
}

// ========== 0-СЫНЫП: ТАПСЫРМА 3 - АСПАПТАР ==========
const instruments = ['piano', 'drum', 'guitar', 'violin'];

function playInstrumentSound() {
  currentSoundTarget = instruments[Math.floor(Math.random() * instruments.length)];
  const feedback = document.getElementById('g0t3Feedback');
  feedback.innerHTML = "🎵 Дыбыс ойнауда...";

  const audio = document.getElementById(currentSoundTarget + 'Audio');
  if (audio) {
    audio.currentTime = 0;
    audio.play().catch(e => console.log("Audio play failed"));
  }
}

function checkInstrument(choice) {
  const feedback = document.getElementById('g0t3Feedback');
  if (!currentSoundTarget) {
    feedback.innerHTML = "Алдымен дыбысты тыңдаңыз!";
    return;
  }

  if (choice === currentSoundTarget) {
    feedback.innerHTML = "Дұрыс! Бұл - " + choice;
    feedback.className = "feedback success";
    showReward();
    currentSoundTarget = null;
  } else {
    playError();
    feedback.innerHTML = "Қате! Қайта тыңдап көріңіз.";
    feedback.className = "feedback error";
  }
}

// ========== 0-СЫНЫП: ТАПСЫРМА 4 - ЖАНУАРЛАР ==========
const animals = ['horse', 'cow', 'sheep', 'cat', 'dog'];

function playRandomAnimal() {
  currentSoundTarget = animals[Math.floor(Math.random() * animals.length)];
  const feedback = document.getElementById('g0t4Feedback');
  feedback.innerHTML = "🔊 Жануар дыбысы шығуда...";

  const audio = document.getElementById(currentSoundTarget + 'Audio');
  if (audio) {
    audio.currentTime = 0;
    audio.play().catch(e => console.log("Audio play error"));
  }
}

function checkAnimal(choice) {
  const feedback = document.getElementById('g0t4Feedback');
  if (!currentSoundTarget) {
    feedback.innerHTML = "Алдымен дыбысты тыңдаңыз!";
    return;
  }

  if (choice === currentSoundTarget) {
    feedback.innerHTML = "Дұрыс! Өте жақсы!";
    feedback.className = "feedback success";
    showReward();
    currentSoundTarget = null;
  } else {
    playError();
    feedback.innerHTML = "Жоқ, бұл басқа жануар.";
    feedback.className = "feedback error";
  }
}

// ========== 0-СЫНЫП: ТАПСЫРМА 5 - ЫРҒАҚ ==========
function hitDrum() {
  const drum = document.getElementById('rhythmDrum');
  drum.style.transform = "scale(0.9)";
  setTimeout(() => drum.style.transform = "scale(1)", 100);

  // Используем clap.mp3 для звука барабана
  const drumSound = document.getElementById('clickSound');
  drumSound.currentTime = 0;
  drumSound.play().catch(e => console.log("Drum sound failed"));
}

function playRhythm(type) {
  // Используем файлы из Dance rhythm
  const audio = type === 'march' ? document.getElementById('fastRhythm') : document.getElementById('slowRhythm');
  if (audio) {
    audio.currentTime = 0;
    audio.play().catch(e => console.log("Rhythm play failed"));
  }
}

// ========== 0-СЫНЫП: ТАПСЫРМА 6 - ТАБИҒАТ ==========
const natureSounds = ['bird', 'water', 'wind'];

function playRandomNature() {
  currentSoundTarget = natureSounds[Math.floor(Math.random() * natureSounds.length)];
  const feedback = document.getElementById('g0t6Feedback');
  feedback.innerHTML = "🌳 Табиғат дыбысы...";

  const audio = document.getElementById(currentSoundTarget + 'Audio');
  if (audio) {
    audio.currentTime = 0;
    audio.play().catch(e => { });
  }
}

function checkNature(choice) {
  const feedback = document.getElementById('g0t6Feedback');
  if (!currentSoundTarget) {
    feedback.innerHTML = "Алдымен дыбысты тыңдаңыз!";
    return;
  }
  if (choice === currentSoundTarget) {
    feedback.innerHTML = "Дұрыс!";
    feedback.className = "feedback success";
    showReward();
    currentSoundTarget = null;
  } else {
    playError();
    feedback.innerHTML = "Қате!";
    feedback.className = "feedback error";
  }
}

// ========== 0-СЫНЫП: ТАПСЫРМА 7 - АДАМ ДЫБЫСТАРЫ ==========
const humanSounds = ['laugh', 'cry', 'sneeze', 'cough'];

function playRandomHumanSound() {
  currentSoundTarget = humanSounds[Math.floor(Math.random() * humanSounds.length)];
  const feedback = document.getElementById('g0t7Feedback');
  feedback.innerHTML = "🗣️ Адам дыбысы...";

  const audio = document.getElementById(currentSoundTarget + 'Audio');
  if (audio) {
    audio.currentTime = 0;
    audio.play().catch(e => { });
  }
}

function checkHumanSound(choice) {
  const feedback = document.getElementById('g0t7Feedback');
  if (!currentSoundTarget) {
    feedback.innerHTML = "Алдымен дыбысты тыңдаңыз!";
    return;
  }
  if (choice === currentSoundTarget) {
    feedback.innerHTML = "Дұрыс! Өте жақсы!";
    feedback.className = "feedback success";
    showReward();
    currentSoundTarget = null;
  } else {
    playError();
    feedback.innerHTML = "Қате! Қайта тыңдап көріңіз.";
    feedback.className = "feedback error";
  }
}

// ========== 1-СЫНЫП ТАПСЫРМАЛАРЫ ==========
function startTask(type) {
  currentTask = type;
  showScreen('gamePlay');
  const container = document.getElementById('optionsContainer');
  container.innerHTML = "";
  document.getElementById('gameFeedback').innerHTML = "";

  if (type === 'claps') {
    document.getElementById('taskTitle').innerText = "Дыбыс санын анықта";
    document.getElementById('taskDesc').innerText = "Шапалақ неше рет соғылды?";
    ['1 (Бірену)', '2 (Екеу)', '3 (Үшеу)'].forEach((text, i) => createOption(i + 1, text));
    generateClaps();
  }
  else if (type === 'pitch') {
    document.getElementById('taskTitle').innerText = "Кімнің дауысы?";
    document.getElementById('taskDesc').innerText = "Дауыс жиілігін ажырат (Төмен-Жоғары)";
    createOption('low', '👨 Ер адам (Төмен)');
    createOption('mid', '👩 Әйел адам (Орта)');
    createOption('high', '🧒 Бала (Жоғары)');
    generatePitch();
  }
  else if (type === 'home') {
    document.getElementById('taskTitle').innerText = "Тұрмыстық дыбыстар";
    document.getElementById('taskDesc').innerText = "Бұл ненің дыбысы?";
    createOption('phone', '📱 Телефон');
    createOption('clock', '⏰ Сағат');
    createOption('bike', '🚲 Велосипед');
    createOption('doorbell', '🔔 Есік қоңырауы');
    createOption('schoolbell', '🏫 Мектеп қоңырауы');
    generateHomeSound();
  }
  else if (type === 'tempo') {
    document.getElementById('taskTitle').innerText = "Би ырғағы";
    document.getElementById('taskDesc').innerText = "Музыканың қарқынын тап";
    createOption('fast', '🚀 Тез');
    createOption('slow', '🐢 Баяу');
    generateTempo();
  }
}

function createOption(val, text) {
  const btn = document.createElement('button');
  btn.className = "btn btn-success";
  btn.innerText = text;
  btn.onclick = () => checkAnswer(val);
  document.getElementById('optionsContainer').appendChild(btn);
}

function generateClaps() {
  correctAnswer = Math.floor(Math.random() * 3) + 1;
}
function generatePitch() {
  const p = ['low', 'mid', 'high'];
  correctAnswer = p[Math.floor(Math.random() * 3)];
}
function generateHomeSound() {
  const s = ['phone', 'clock', 'bike', 'doorbell', 'schoolbell'];
  correctAnswer = s[Math.floor(Math.random() * s.length)];
}
function generateTempo() {
  correctAnswer = Math.random() > 0.5 ? 'fast' : 'slow';
}

function playCurrentAudio() {
  if (isPlaying) return;
  isPlaying = true;

  let audioElement = null;

  if (currentTask === 'claps') {
    // Для шапалақ играем clap.mp3 несколько раз
    playClapsSequence(correctAnswer);
    return;
  } else if (currentTask === 'pitch') {
    // Используем голосовые файлы
    if (correctAnswer === 'low') audioElement = document.getElementById('lowVoice');
    else if (correctAnswer === 'mid') audioElement = document.getElementById('midVoice');
    else if (correctAnswer === 'high') audioElement = document.getElementById('highVoice');
  } else if (currentTask === 'home') {
    // Используем тұрмыстық дыбыстар
    if (correctAnswer === 'phone') audioElement = document.getElementById('phoneSound');
    else if (correctAnswer === 'clock') audioElement = document.getElementById('clockSound');
    else if (correctAnswer === 'bike') audioElement = document.getElementById('bikeSound');
    else if (correctAnswer === 'doorbell') audioElement = document.getElementById('doorbellAudio');
    else if (correctAnswer === 'schoolbell') audioElement = document.getElementById('schoolbellAudio');
  } else if (currentTask === 'tempo') {
    // Используем би ырғағы
    if (correctAnswer === 'fast') audioElement = document.getElementById('fastRhythm');
    else if (correctAnswer === 'slow') audioElement = document.getElementById('slowRhythm');
  }

  if (audioElement) {
    audioElement.currentTime = 0;
    audioElement.play().catch(e => console.log("Audio play failed"))
      .finally(() => {
        setTimeout(() => { isPlaying = false; }, 500);
      });
  } else {
    isPlaying = false;
  }
}

// Новая функция для проигрывания последовательности хлопков
function playClapsSequence(count) {
  const clapAudio = document.getElementById('clickSound');
  let played = 0;

  function playNext() {
    if (played < count) {
      clapAudio.currentTime = 0;
      clapAudio.play().catch(e => console.log("Clap play failed"));
      played++;
      setTimeout(playNext, 600); // 600мс между хлопками
    } else {
      isPlaying = false;
    }
  }

  playNext();
}

function checkAnswer(val) {
  const fb = document.getElementById('gameFeedback');
  if (val == correctAnswer) {
    fb.innerHTML = "Жарайсың! Дұрыс 🎉";
    fb.className = "feedback success";
    addCoins(10);
    setTimeout(() => startTask(currentTask), 1500);
  } else {
    fb.innerHTML = "Қате, тағы тыңдап көр ❌";
    fb.className = "feedback error";
  }
}

function playTone(freq, duration) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
  setTimeout(() => { osc.stop(); isPlaying = false; }, duration * 1000);
}

function playBeeps(count, interval, freq) {
  let i = 0;
  const timer = setInterval(() => {
    playTone(freq, 0.2);
    i++;
    if (i >= count) {
      clearInterval(timer);
      isPlaying = false;
    }
  }, interval);
}