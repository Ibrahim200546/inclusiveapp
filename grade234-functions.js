// ========== 2-СЫНЫП ТАПСЫРМАЛАРЫ ==========

// Глобальные переменные для 2-сынып
let currentVehicle = '';
let currentSyllableWord = '';
let currentSyllableCount = 0;
let currentLetter = '';
let currentMathAnswer = '';

// ТАПСЫРМА 1: Көліктер дыбысы
function checkVehicle(choice) {
  const feedback = document.getElementById('g2t1Feedback');
  if (!currentVehicle) {
    feedback.innerHTML = "Алдымен дыбысты тыңдаңыз! 🔊";
    feedback.className = "feedback";
    return;
  }

  if (choice === currentVehicle) {
    feedback.innerHTML = "Дұрыс! Бұл - " + choice;
    feedback.className = "feedback success";
    showReward();
    currentVehicle = ''; // Сброс
  } else {
    feedback.innerHTML = "Қате! Қайта тыңдап көріңіз.";
    feedback.className = "feedback error";
    playError();
  }
}

// ТАПСЫРМА 2: Буындар
function checkSyllables(count) {
  const feedback = document.getElementById('g2t2Feedback');
  if (!currentSyllableCount) {
    feedback.innerHTML = "Алдымен сөзді тыңдаңыз! 🔊";
    feedback.className = "feedback";
    return;
  }

  if (count === currentSyllableCount) {
    feedback.innerHTML = "Дұрыс! " + count + " буын!";
    feedback.className = "feedback success";
    showReward();
    currentSyllableCount = 0;
  } else {
    feedback.innerHTML = "Қате! Буын санын дұрыс санаңыз.";
    feedback.className = "feedback error";
    playError();
  }
}

// ТАПСЫРМА 3: С-Ш, З-Ж айыру
function checkLetter(letter) {
  const feedback = document.getElementById('g2t3Feedback');
  if (!currentLetter) {
    feedback.innerHTML = "Алдымен сөзді тыңдаңыз! 🔊";
    feedback.className = "feedback";
    return;
  }

  if (letter === currentLetter) {
    feedback.innerHTML = "Дұрыс! Дыбыс: " + letter;
    feedback.className = "feedback success";
    showReward();
    currentLetter = '';
  } else {
    feedback.innerHTML = "Қате! Бұл басқа дыбыс.";
    feedback.className = "feedback error";
    playError();
  }
}

// ТАПСЫРМА 4: Математика тілі
function checkMath(choice) {
  const feedback = document.getElementById('g2t4Feedback');
  if (!currentMathAnswer) {
    feedback.innerHTML = "Алдымен терминді тыңдаңыз! 🔊";
    feedback.className = "feedback";
    return;
  }

  const mathNames = {
    'plus': 'Қосу',
    'minus': 'Азайту',
    'more': 'Артық',
    'less': 'Кем'
  };

  if (choice === currentMathAnswer) {
    feedback.innerHTML = "Дұрыс! Бұл: " + mathNames[choice];
    feedback.className = "feedback success";
    showReward();
    currentMathAnswer = '';
  } else {
    feedback.innerHTML = "Қате! Қайта тыңдап көріңіз.";
    feedback.className = "feedback error";
    playError();
  }
}

// ========== 3-СЫНЫП ТАПСЫРМАЛАРЫ ==========

// Глобальные переменные для 3-сынып
let currentMusicTempo = '';
let currentIntonation = '';
let currentStress = 0;

// ТАПСЫРМА 1: Музыкалық ырғақ
function checkMusicTempo(tempo) {
  const feedback = document.getElementById('g3t1Feedback');
  if (!currentMusicTempo) {
    feedback.innerHTML = "Алдымен музыканы тыңдаңыз! 🔊";
    feedback.className = "feedback";
    return;
  }

  const tempoNames = {
    'fast': 'Жылдам',
    'medium': 'Орташа',
    'slow': 'Баяу'
  };

  if (tempo === currentMusicTempo) {
    feedback.innerHTML = "Дұрыс! Қарқын: " + tempoNames[tempo];
    feedback.className = "feedback success";
    showReward();
    currentMusicTempo = '';
  } else {
    feedback.innerHTML = "Қате! Қайта тыңдап көріңіз.";
    feedback.className = "feedback error";
    playError();
  }
}

// ТАПСЫРМА 2: Интонация
function checkIntonation(type) {
  const feedback = document.getElementById('g3t2Feedback');
  if (!currentIntonation) {
    feedback.innerHTML = "Алдымен сөйлемді тыңдаңыз! 🔊";
    feedback.className = "feedback";
    return;
  }

  const typeNames = {
    'question': 'Сұрақ',
    'statement': 'Хабарлау',
    'exclamation': 'Леп'
  };

  if (type === currentIntonation) {
    feedback.innerHTML = "Дұрыс! Интонация: " + typeNames[type];
    feedback.className = "feedback success";
    showReward();
    currentIntonation = '';
  } else {
    feedback.innerHTML = "Қате! Интонацияны дұрыс анықтаңыз.";
    feedback.className = "feedback error";
    playError();
  }
}

// ТАПСЫРМА 3: Екпін
function checkStress(syllable) {
  const feedback = document.getElementById('g3t3Feedback');
  if (!currentStress) {
    feedback.innerHTML = "Алдымен сөзді тыңдаңыз! 🔊";
    feedback.className = "feedback";
    return;
  }

  if (syllable === currentStress) {
    feedback.innerHTML = "Дұрыс! Екпін " + syllable + "-ші буында!";
    feedback.className = "feedback success";
    showReward();
    currentStress = 0;
  } else {
    feedback.innerHTML = "Қате! Екпін басқа буында.";
    feedback.className = "feedback error";
    playError();
  }
}

// ========== 4-СЫНЫП ТАПСЫРМАЛАРЫ ==========

// Глобальные переменные для 4-сынып
let currentStoryAnswer = 0;
let currentDialogSpeaker = '';
let currentTechItem = '';
let isReading = false;

// ТАПСЫРМА 1: Әңгімелерді тыңдау
function checkStoryAnswer(answer) {
  const feedback = document.getElementById('g4t1Feedback');
  if (!currentStoryAnswer) {
    feedback.innerHTML = "Алдымен әңгімені тыңдаңыз! 🔊";
    feedback.className = "feedback";
    return;
  }

  // Для простоты, допустим правильный ответ всегда 1 для истории 1, 2 для истории 2...
  if (answer === currentStoryAnswer) {
    feedback.innerHTML = "Дұрыс жауап! Керемет!";
    feedback.className = "feedback success";
    showReward();
    currentStoryAnswer = 0;
  } else {
    feedback.innerHTML = "Қате жауап, қайта тыңдап көріңіз.";
    feedback.className = "feedback error";
    playError();
  }
}

// ТАПСЫРМА 2: Диалог
function checkDialog(speaker) {
  const feedback = document.getElementById('g4t2Feedback');
  if (!currentDialogSpeaker) {
    feedback.innerHTML = "Алдымен диалогты тыңдаңыз! 🔊";
    feedback.className = "feedback";
    return;
  }

  const speakerNames = {
    'child': 'Бала',
    'adult': 'Ересек',
    'both': 'Екеуі де'
  };

  if (speaker === currentDialogSpeaker) {
    feedback.innerHTML = "Дұрыс! Сөйлеп тұрған: " + speakerNames[speaker];
    feedback.className = "feedback success";
    showReward();
    currentDialogSpeaker = '';
  } else {
    feedback.innerHTML = "Қате! Дұрыстап тыңдаңыз.";
    feedback.className = "feedback error";
    playError();
  }
}

// ТАПСЫРМА 3: Мәтін оқу
async function startReading() {
  const feedback = document.getElementById('g4t3Feedback');
  const progressBar = document.getElementById('readingProgress');
  const readBtn = document.getElementById('readBtn');
  const stopBtn = document.getElementById('stopReadBtn');

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    microphone.connect(analyser);
    analyser.fftSize = 256;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    isReading = true;
    readBtn.style.display = 'none';
    stopBtn.style.display = 'inline-block';
    feedback.innerHTML = "Оқып жатырсыз... Жақсы!";
    feedback.className = "feedback";

    let progress = 0;

    function analyze() {
      if (!isReading) {
        audioContext.close();
        return;
      }

      requestAnimationFrame(analyze);
      analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      let average = sum / bufferLength;

      if (average > 30) {
        progress += 0.5;
        if (progress > 100) progress = 100;

        progressBar.style.width = progress + '%';
        progressBar.innerText = Math.floor(progress) + '%';

        if (progress >= 100) {
          stopReading();
          feedback.innerHTML = "Керемет! Сіз мәтінді жақсы оқыдыңыз!";
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

function stopReading() {
  isReading = false;
  document.getElementById('readBtn').style.display = 'inline-block';
  document.getElementById('stopReadBtn').style.display = 'none';
}

// ТАПСЫРМА 4: Техника дыбыстары
function checkTech(choice) {
  const feedback = document.getElementById('g4t4Feedback');
  if (!currentTechItem) {
    feedback.innerHTML = "Алдымен дыбысты тыңдаңыз! 🔊";
    feedback.className = "feedback";
    return;
  }

  const techNames = {
    'tractor': 'Трактор',
    'saw': 'Ара',
    'sewing': 'Тігін машинасы'
  };

  if (choice === currentTechItem) {
    feedback.innerHTML = "Дұрыс! Бұл: " + techNames[choice];
    feedback.className = "feedback success";
    showReward();
    currentTechItem = '';
  } else {
    feedback.innerHTML = "Қате! Қайта тыңдап көріңіз.";
    feedback.className = "feedback error";
    playError();
  }
}

// ========== ЖАЛПЫ ФУНКЦИЯ - ДЫБЫС ОЙНАТУ ==========
function playSound(type) {
  let audioPath = '';

  // 2-СЫНЫП
  if (type === 'vehicle') {
    const vehicles = ['car', 'plane', 'train', 'motorcycle'];
    const chosen = vehicles[Math.floor(Math.random() * vehicles.length)];
    currentVehicle = chosen;
    audioPath = `sounds/transport/${chosen}.mp3`;
  }
  else if (type === 'syllable') {
    const counts = [1, 2, 3, 4];
    const count = counts[Math.floor(Math.random() * counts.length)];
    currentSyllableCount = count;
    audioPath = `sounds/syllables/word_${count}.mp3`;
  }
  else if (type === 'letter') {
    const letters = ['s', 'sh', 'z', 'zh'];
    const letterCode = letters[Math.floor(Math.random() * letters.length)];
    const letterMap = { 's': 'С', 'sh': 'Ш', 'z': 'З', 'zh': 'Ж' };
    currentLetter = letterMap[letterCode];
    audioPath = `sounds/letters/word_${letterCode}.mp3`;
  }
  else if (type === 'math') {
    const terms = ['plus', 'minus', 'more', 'less'];
    const term = terms[Math.floor(Math.random() * terms.length)];
    currentMathAnswer = term;
    audioPath = `sounds/math/${term}.mp3`;
  }

  // 3-СЫНЫП
  else if (type === 'music') {
    const tempos = ['fast', 'medium', 'slow'];
    const tempo = tempos[Math.floor(Math.random() * tempos.length)];
    currentMusicTempo = tempo;
    audioPath = `sounds/music_tempo/${tempo}.mp3`;
  }
  else if (type === 'intonation') {
    const types = ['question', 'statement', 'exclamation'];
    const intType = types[Math.floor(Math.random() * types.length)];
    currentIntonation = intType;
    audioPath = `sounds/intonation/${intType}.mp3`;
  }
  else if (type === 'stress') {
    const syllables = [1, 2, 3];
    const syl = syllables[Math.floor(Math.random() * syllables.length)];
    currentStress = syl;
    audioPath = `sounds/stress/stress_${syl}.mp3`;
  }

  // 4-СЫНЫП
  else if (type === 'story') {
    const storyNum = Math.floor(Math.random() * 3) + 1;
    currentStoryAnswer = storyNum;
    audioPath = `sounds/stories/story_${storyNum}.mp3`;
    const q = document.getElementById('storyQuestion');
    if (q) q.innerText = "Әңгіме #" + storyNum + " тыңдалуда...";
  }
  else if (type === 'dialog') {
    const speakers = ['child', 'adult', 'both'];
    const speaker = speakers[Math.floor(Math.random() * speakers.length)];
    currentDialogSpeaker = speaker;
    audioPath = `sounds/dialog/${speaker}.mp3`;
  }
  else if (type === 'tech') {
    const items = ['tractor', 'saw', 'sewing'];
    const item = items[Math.floor(Math.random() * items.length)];
    currentTechItem = item;
    audioPath = `sounds/technical/${item === 'sewing' ? 'sewing_machine' : item}.mp3`;
  }

  if (audioPath) {
    const audio = new Audio(audioPath);
    console.log('Playing:', audioPath);
    audio.play().catch(e => {
      console.error("Audio not found:", audioPath);
      alert("Аудио файл табылмады: " + audioPath + "\nФайлдарды 'sounds' папкасына жүктеңіз!");
    });
  }
}
