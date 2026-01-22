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

  // Show header only on main menu (levelsScreen)
  const header = document.querySelector('.header');
  if (header) {
    if (screenId === 'levelsScreen') {
      header.style.display = 'block';
    } else {
      header.style.display = 'none';
    }
  }
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

// ========== 0-СЫНЫП: ТАПСЫРМА 8 - КӨЛІКТЕР ДЫБЫСЫ ==========
// ========== 0-СЫНЫП: ТАПСЫРМА 8 - КӨЛІКТЕР ДЫБЫСЫ ==========
const vehicles = ['car', 'motorcycle', 'plane', 'train'];

function playRandomVehicle() {
  currentSoundTarget = vehicles[Math.floor(Math.random() * vehicles.length)];
  const feedback = document.getElementById('g0t8Feedback');
  feedback.innerHTML = "🚗 Көлік дыбысы...";

  // Load audio from sounds/transport/ folder
  const audio = new Audio(`sounds/transport/${currentSoundTarget}.mp3`);
  audio.play().catch(e => console.error('Vehicle audio error:', e));

  // Shuffle cards
  shuffleCardsInTask('g0Task8');
}

function checkVehicle0(choice) {
  const feedback = document.getElementById('g0t8Feedback');

  // Если игра не начата (не нажали "Тыңдау"), просто воспроизводим звук предмета
  if (!currentSoundTarget) {
    const audio = new Audio(`sounds/transport/${choice}.mp3`);
    audio.play().catch(e => console.error('Preview audio error:', e));
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

// ========== 0-СЫНЫП: ТАПСЫРМА 9 - ҮЙ ДЫБЫСТАРЫ ==========
const homeSounds = ['phone', 'clock', 'bike', 'doorbell', 'schoolbell'];

function playRandomHomeSound() {
  currentSoundTarget = homeSounds[Math.floor(Math.random() * homeSounds.length)];
  const feedback = document.getElementById('g0t9Feedback');
  feedback.innerHTML = "📱 Үй дыбысы...";

  // Map internal names to actual filenames
  const audioFileMap = {
    'phone': 'phone.mp3',
    'clock': 'clock.mp3',
    'bike': 'bike.mp3',
    'doorbell': 'doorbell.mp3',
    'schoolbell': 'school_bell.mp3'
  };

  const filename = audioFileMap[currentSoundTarget];
  const audio = new Audio(`sounds/Household sounds/${filename}`);
  audio.play().catch(e => console.error('Home sound audio error:', e));

  // Shuffle cards
  shuffleCardsInTask('g0Task9');
}

function checkHomeSound0(choice) {
  const feedback = document.getElementById('g0t9Feedback');

  // Preview sound if game not started
  if (!currentSoundTarget) {
    const audioFileMap = {
      'phone': 'phone.mp3',
      'clock': 'clock.mp3',
      'bike': 'bike.mp3',
      'doorbell': 'doorbell.mp3',
      'schoolbell': 'school_bell.mp3'
    };
    const filename = audioFileMap[choice];
    const audio = new Audio(`sounds/Household sounds/${filename}`);
    audio.play().catch(e => console.error('Preview audio error:', e));
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

// Helper to shuffle cards in a task screen
function shuffleCardsInTask(screenId) {
  const screen = document.getElementById(screenId);
  if (!screen) return;
  const grid = screen.querySelector('.images-grid');
  if (!grid) return;

  for (let i = grid.children.length; i >= 0; i--) {
    grid.appendChild(grid.children[Math.random() * i | 0]);
  }
}

// ========== 1-СЫНЫП: ТАПСЫРМА 1 - ӘРІПТЕР (КРУГОВОЙ ИНТЕРФЕЙС) ==========
const kazakhLetters = ['А', 'Ә', 'Б', 'В', 'Г', 'Ғ', 'Д', 'Е', 'Ё', 'Ж', 'З', 'И', 'К', 'Қ', 'Л', 'М', 'Н', 'Ң', 'О', 'Ө', 'П', 'Р', 'С', 'Т', 'У', 'Ұ', 'Ү', 'Ф', 'Х', 'Һ', 'Ц', 'Ч', 'Ш', 'Щ', 'Ы', 'Э', 'Ю', 'Я'];

// Состояния игры
let letterGameState = 'initial'; // initial, listened, selected
let correctLetterAnswer = '';
let selectedLetterAnswer = '';
let currentLetterOptions = [];

// Поздравительные сообщения на казахском
const congratsMessages = [
  "Керемет! Өте жақсы!",
  "Жарайсың! Тамаша!",
  "Біліктісің! Жалғастыр!",
  "Өте дұрыс! Мықтысың!",
  "Супер! Жақсы жұмыс!"
];

function initializeLetterGame() {
  // Выбираем случайную правильную букву
  correctLetterAnswer = kazakhLetters[Math.floor(Math.random() * kazakhLetters.length)];

  // Создаем массив из 6 букв (правильная + 5 случайных)
  currentLetterOptions = [correctLetterAnswer];

  while (currentLetterOptions.length < 6) {
    const randomLetter = kazakhLetters[Math.floor(Math.random() * kazakhLetters.length)];
    if (!currentLetterOptions.includes(randomLetter)) {
      currentLetterOptions.push(randomLetter);
    }
  }

  // Перемешиваем массив
  currentLetterOptions.sort(() => Math.random() - 0.5);

  // Заполняем маленькие круги
  const taskContainer = document.getElementById('g1TaskLetters');
  if (!taskContainer) return;
  const optionCircles = taskContainer.querySelectorAll('.option-circle');
  optionCircles.forEach((circle, index) => {
    const letterSpan = circle.querySelector('.letter-option');
    letterSpan.textContent = currentLetterOptions[index];
    circle.classList.remove('selected', 'disabled');
    circle.classList.add('disabled'); // Блокируем до прослушивания
  });

  // Сброс центра
  document.getElementById('centerContent').textContent = '🔊';
  document.getElementById('centerCircle').classList.remove('disabled', 'highlight');

  // Активируем контейнер для анимации появления букв
  const container = document.getElementById('letterCircleContainer');
  if (container) {
    // Сначала убираем класс, чтобы анимация сработала заново
    container.classList.remove('active');
    // Добавляем через небольшую задержку для триггера анимации
    setTimeout(() => {
      container.classList.add('active');
    }, 50);
  }

  letterGameState = 'initial';
  selectedLetterAnswer = '';

  // Очистка feedback
  document.getElementById('g1t1Feedback').innerHTML = '';
}

function handleCenterClick() {
  const centerCircle = document.getElementById('centerCircle');
  const centerContent = document.getElementById('centerContent');
  const feedback = document.getElementById('g1t1Feedback');

  if (letterGameState === 'initial') {
    // Шаг 1: Проигрываем звук
    playLetterSound();

    // Меняем смайлик на текст "Таңдау"
    centerContent.textContent = 'Таңдау';
    centerContent.style.fontSize = '32px';

    // Разблокируем варианты ответов
    const optionCircles = document.querySelectorAll('.option-circle');
    optionCircles.forEach(circle => circle.classList.remove('disabled'));

    // Блокируем центр до выбора ответа
    centerCircle.classList.add('disabled');

    letterGameState = 'listened';
    feedback.innerHTML = '👂 Дыбысты тыңдадыңыз! Енді дұрыс әріпті таңдаңыз.';
    feedback.className = 'feedback';

  } else if (letterGameState === 'selected') {
    // Шаг 3: Проверка ответа
    checkLetterAnswer();
  }
}

function playLetterSound() {
  const letter = correctLetterAnswer;
  const letterLower = letter.toLowerCase();

  console.log('Attempting to play letter sound:', letter);

  // Try multiple audio path variations
  const audioPaths = [
    `sounds/letters/letter_${letterLower}.mp3`,
    `sounds/letters/letter_${letter}.mp3`,
    `sounds/letters/${letterLower}.mp3`,
    `sounds/letters/${letter}.mp3`
  ];

  let attemptIndex = 0;

  function tryNextAudio() {
    if (attemptIndex >= audioPaths.length) {
      console.error('All audio attempts failed for letter:', letter);
      // Show visual feedback that audio is missing
      const feedback = document.getElementById('g1t1Feedback');
      if (feedback) {
        feedback.innerHTML = `⚠️ Дыбыс файлы табылмады: ${letter}`;
        feedback.className = 'feedback error';
      }
      return;
    }

    const audioPath = audioPaths[attemptIndex];
    console.log(`Trying audio path ${attemptIndex + 1}/${audioPaths.length}:`, audioPath);

    const audio = new Audio(audioPath);

    // Add load event listener
    audio.addEventListener('canplaythrough', () => {
      console.log('Audio loaded successfully:', audioPath);
    });

    audio.play()
      .then(() => {
        console.log('Audio playing successfully:', audioPath);
      })
      .catch(err => {
        console.warn(`Failed to play ${audioPath}:`, err.message);
        attemptIndex++;
        tryNextAudio();
      });
  }

  tryNextAudio();
}

function selectLetterOption(circleElement, optionIndex) {
  // Разрешаем выбор, если слушали (listened) ИЛИ уже выбрали (selected) - для перевыбора
  if (letterGameState !== 'listened' && letterGameState !== 'selected') {
    return; // Блокировка если еще не прослушали
  }

  // Убираем выделение с предыдущего выбора
  document.querySelectorAll('.option-circle').forEach(c => c.classList.remove('selected'));

  // Выделяем выбранный вариант
  circleElement.classList.add('selected');

  selectedLetterAnswer = currentLetterOptions[optionIndex];

  // ПРОИГРЫВАЕМ ЗВУК ВЫБРАННОЙ БУКВЫ
  const letterCode = selectedLetterAnswer.toLowerCase();
  const audio = new Audio(`sounds/letters/letter_${letterCode}.mp3`);
  audio.play().catch(e => {
    // Попытка с заглавной, если не вышло
    const audioBackup = new Audio(`sounds/letters/letter_${selectedLetterAnswer}.mp3`);
    audioBackup.play().catch(err => { });
  });

  // Разблокируем центральный круг и подсвечиваем его
  const centerCircle = document.getElementById('centerCircle');
  centerCircle.classList.remove('disabled');
  centerCircle.classList.add('highlight');

  // Сохраняем состояние selected
  letterGameState = 'selected';

  const feedback = document.getElementById('g1t1Feedback');
  feedback.innerHTML = '💡 Таңдалды: ' + selectedLetterAnswer + '. Енді "Таңдау" батырмасын басыңыз!';
  feedback.className = 'feedback';
}

function checkLetterAnswer() {
  const feedback = document.getElementById('g1t1Feedback');
  const centerCircle = document.getElementById('centerCircle');

  // Убираем подсветку
  centerCircle.classList.remove('highlight');

  if (selectedLetterAnswer === correctLetterAnswer) {
    // Правильный ответ
    const randomCongrats = congratsMessages[Math.floor(Math.random() * congratsMessages.length)];
    feedback.innerHTML = "✅ " + randomCongrats;
    feedback.className = "feedback success";
    playSuccess();
    showReward();

    // Следующий раунд - быстрый переход
    setTimeout(() => {
      initializeLetterGame();
    }, 800);

  } else {
    // Неправильный ответ
    playError();
    feedback.innerHTML = "❌ Қате! Дұрыс жауап: " + correctLetterAnswer + ". Қайталап көріңіз!";
    feedback.className = "feedback error";

    // Сброс для повторной попытки - показываем правильный ответ дольше
    setTimeout(() => {
      initializeLetterGame();
    }, 2000);
  }
}

function resetLetterGame() {
  letterGameState = 'initial';
  correctLetterAnswer = '';
  selectedLetterAnswer = '';
  currentLetterOptions = [];
}

// Инициализация при открытии экрана g1Task1
document.addEventListener('DOMContentLoaded', () => {
  const g1Task1Screen = document.getElementById('g1Task1');
  if (g1Task1Screen) {
    const observer = new MutationObserver(() => {
      if (g1Task1Screen.classList.contains('active')) {
        initializeLetterGame();
      }
    });
    observer.observe(g1Task1Screen, { attributes: true, attributeFilter: ['class'] });
  }
});

// ========== 1-СЫНЫП ТАПСЫРМАЛАРЫ (СТАРЫЕ) ==========
function startTask(type) {
  currentTask = type;
  showScreen('gamePlay');
  const container = document.getElementById('optionsContainer');
  // Restore Center Button
  container.innerHTML = '<div class="center-circle" id="actionElement" onclick="playCurrentAudio()">🔊</div>';
  document.getElementById('gameFeedback').innerHTML = "";

  let options = [];

  if (type === 'claps') {
    document.getElementById('taskTitle').innerText = "Дыбыс санын анықта";
    document.getElementById('taskDesc').innerText = "Шапалақ неше рет соғылды?";
    options = [
      { val: 1, icon: '1', label: 'Біреу' },
      { val: 2, icon: '2', label: 'Екеу' },
      { val: 3, icon: '3', label: 'Үшеу' }
    ];
    generateClaps();
  }
  else if (type === 'pitch') {
    document.getElementById('taskTitle').innerText = "Кімнің дауысы?";
    document.getElementById('taskDesc').innerText = "Дауыс жиілігін ажырат";
    options = [
      { val: 'low', icon: '👨', label: 'Төмен' },
      { val: 'mid', icon: '👩', label: 'Орта' },
      { val: 'high', icon: '🧒', label: 'Жоғары' }
    ];
    generatePitch();
  }
  else if (type === 'home') {
    document.getElementById('taskTitle').innerText = "Тұрмыстық дыбыстар";
    document.getElementById('taskDesc').innerText = "Бұл ненің дыбысы?";
    options = [
      { val: 'phone', icon: '📱', label: 'Телефон' },
      { val: 'clock', icon: '⏰', label: 'Сағат' },
      { val: 'bike', icon: '🚲', label: 'Велосипед' },
      { val: 'doorbell', icon: '🔔', label: 'Есік' },
      { val: 'schoolbell', icon: '🏫', label: 'Мектеп' }
    ];
    generateHomeSound();
  }
  else if (type === 'tempo') {
    document.getElementById('taskTitle').innerText = "Би ырғағы";
    document.getElementById('taskDesc').innerText = "Музыканың қарқынын тап";
    options = [
      { val: 'fast', icon: '🚀', label: 'Тез' },
      { val: 'slow', icon: '🐢', label: 'Баяу' }
    ];
    generateTempo();
  }

  renderRadialOptions(options);
}

function renderRadialOptions(options) {
  const container = document.getElementById('optionsContainer');
  const radius = 220;
  const count = options.length;

  options.forEach((opt, index) => {
    // Start from -90deg (Top)
    const angleDeg = (360 / count) * index - 90;

    const div = document.createElement('div');
    div.className = "option-circle";
    div.style.setProperty('--angle', angleDeg + 'deg');
    div.style.setProperty('--dist', radius + 'px');
    div.onclick = () => checkAnswer(opt.val);

    div.innerHTML = `<div style="font-size: 40px;">${opt.icon}</div><p style="margin:0; font-size:16px;">${opt.label}</p>`;

    container.appendChild(div);
  });
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