
// ========== 1-СЫНЫП ТАПСЫРМАЛАРЫ ==========

// Глобальные переменные для 1-сынып
let currentFrequency = '';
let currentWildAnimal = '';
let currentFamiliarWord = '';

// ТАПСЫРМА 1: Дыбыс жиілігі
function checkFrequency(choice) {
  const feedback = document.getElementById('g1t1Feedback');
  if (!currentFrequency) {
    feedback.innerHTML = "Алдымен дыбысты тыңдаңыз! 🔊";
    feedback.className = "feedback";
    return;
  }

  const freqNames = {
    'high': 'Жоғары',
    'mid': 'Орташа',
    'low': 'Төмен'
  };

  if (choice === currentFrequency) {
    feedback.innerHTML = "Дұрыс! Жиілік: " + freqNames[choice];
    feedback.className = "feedback success";
    showReward();
    currentFrequency = '';
  } else {
    feedback.innerHTML = "Қате! Қайта тыңдап көріңіз.";
    feedback.className = "feedback error";
    playError();
  }
}

// ТАПСЫРМА 2: Жабайы жануарлар дауысы
function playRandomWildAnimal() {
  const animals = ['lion', 'wolf', 'bear', 'elephant'];
  const chosen = animals[Math.floor(Math.random() * animals.length)];
  currentWildAnimal = chosen;

  const audio = document.getElementById(chosen + 'Audio');
  if (audio) {
    limitAudioDurationG234(audio);
  } else {
    // attempt new Audio if element not found
    new Audio(`sounds/wild_animals/${chosen}.mp3`).play().catch(e => console.error(e));
  }
}

function checkWildAnimal(choice) {
  const feedback = document.getElementById('g1t2Feedback');
  if (!currentWildAnimal) {
    feedback.innerHTML = "Алдымен дыбысты тыңдаңыз! 🔊";
    feedback.className = "feedback";
    return;
  }

  const animalNames = {
    'lion': 'Арыстан',
    'wolf': 'Қасқыр',
    'bear': 'Аю',
    'elephant': 'Піл'
  };

  if (choice === currentWildAnimal) {
    feedback.innerHTML = "Дұрыс! Бұл: " + animalNames[choice];
    feedback.className = "feedback success";
    showReward();
    currentWildAnimal = '';
  } else {
    feedback.innerHTML = "Қате! Қайта тыңдап көріңіз.";
    feedback.className = "feedback error";
    playError();
  }
}

// ТАПСЫРМА 3: Таныс сөздер мен сөз тіркестері
function playRandomFamiliarWord() {
  const words = ['hello', 'goodbye', 'thankyou', 'goodmorning'];
  const chosen = words[Math.floor(Math.random() * words.length)];
  currentFamiliarWord = chosen;

  const audioMap = {
    'hello': 'word1Audio',
    'goodbye': 'word2Audio',
    'thankyou': 'word3Audio',
    'goodmorning': 'phrase1Audio'
  };

  const audio = document.getElementById(audioMap[chosen]);
  if (audio) {
    limitAudioDurationG234(audio);
  } else {
    new Audio(`sounds/familiar_words/${chosen}.mp3`).play().catch(e => console.error(e));
  }
}

function checkFamiliarWord(choice) {
  const feedback = document.getElementById('g1t3Feedback');
  if (!currentFamiliarWord) {
    feedback.innerHTML = "Алдымен дыбысты тыңдаңыз! 🔊";
    feedback.className = "feedback";
    return;
  }

  const wordNames = {
    'hello': 'Сәлеметсіз бе',
    'goodbye': 'Сау болыңыз',
    'thankyou': 'Рахмет',
    'goodmorning': 'Қайырлы таң'
  };

  if (choice === currentFamiliarWord) {
    feedback.innerHTML = "Дұрыс! Бұл: " + wordNames[choice];
    feedback.className = "feedback success";
    showReward();
    currentFamiliarWord = '';
  } else {
    feedback.innerHTML = "Қате! Қайта тыңдап көріңіз.";
    feedback.className = "feedback error";
    playError();
  }
}

// ========== 2-СЫНЫП ТАПСЫРМАЛАРЫ ==========

// ========== ДЫБЫС ҰЗАҚТЫҒЫН ШЕКТЕУ ==========
const MAX_AUDIO_DURATION_G234 = 3; // 3 секунд

function limitAudioDurationG234(audioElement) {
  if (!audioElement) return;

  // Ограничиваем воспроизведение до 3 секунд
  const stopAudioAfterLimit = () => {
    setTimeout(() => {
      if (!audioElement.paused && audioElement.currentTime > 0) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
    }, MAX_AUDIO_DURATION_G234 * 1000);
  };

  audioElement.play().catch(e => { });
  stopAudioAfterLimit();
}

// Глобальные переменные для 2-сынып
let currentVehicle = '';
let currentSyllableWord = '';
let currentSyllableCount = 0;
let currentLetter = '';
let currentMathAnswer = '';
let currentSoundDuration = '';
let currentSoundIntensity = '';
let currentMusicalTale = '';
let currentTechnicalNoise = '';

// ТАПСЫРМА 1: Көліктер дыбысы
function checkVehicle(choice) {
  const feedback = document.getElementById('g2t1Feedback');
  if (!currentVehicle) {
    feedback.innerHTML = "Алдымен дыбысты тыңдаңыз! 🔊";
    feedback.className = "feedback";
    return;
  }

  if (choice === currentVehicle || (choice === 'moto' && (currentVehicle === 'motorcycle' || currentVehicle === 'moto'))) {
    feedback.innerHTML = "Дұрыс! Бұл - " + (choice === 'moto' ? 'Мотоцикл' : choice);
    feedback.className = "feedback success";
    showReward();
    currentVehicle = '';
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

// ТАПСЫРМА 5: Дыбыс сипаты
function checkSoundProperty(choice, propertyType) {
  const feedback = document.getElementById('g2t5Feedback');

  if (propertyType === 'duration') {
    if (!currentSoundDuration) {
      feedback.innerHTML = "Алдымен дыбысты тыңдаңыз! 🔊";
      feedback.className = "feedback";
      return;
    }

    const durationNames = { 'long': 'Ұзақ', 'short': 'Қысқа' };

    if (choice === currentSoundDuration) {
      feedback.innerHTML = "Дұрыс! Ұзақтығы: " + durationNames[choice];
      feedback.className = "feedback success";
      showReward();
      currentSoundDuration = '';
    } else {
      feedback.innerHTML = "Қате! Қайта тыңдап көріңіз.";
      feedback.className = "feedback error";
      playError();
    }
  } else if (propertyType === 'intensity') {
    if (!currentSoundIntensity) {
      feedback.innerHTML = "Алдымен дыбысты тыңдаңыз! 🔊";
      feedback.className = "feedback";
      return;
    }

    const intensityNames = { 'loud': 'Қатты', 'quiet': 'Ақырын', 'calm': 'Тыныш' };

    if (choice === currentSoundIntensity) {
      feedback.innerHTML = "Дұрыс! Қаттылығы: " + intensityNames[choice];
      feedback.className = "feedback success";
      showReward();
      currentSoundIntensity = '';
    } else {
      feedback.innerHTML = "Қате! Қайта тыңдап көріңіз.";
      feedback.className = "feedback error";
      playError();
    }
  }
}

// ТАПСЫРМА 6: Музыкалық ертегілер
function playRandomMusicalTale() {
  const tales = ['redridinghood', 'pinocchio', 'threebears', 'snowwhite'];
  const chosen = tales[Math.floor(Math.random() * tales.length)];
  currentMusicalTale = chosen;

  const audioMap = {
    'redridinghood': 'redRidingHoodAudio',
    'pinocchio': 'pinocchioAudio',
    'threebears': 'threeBearsAudio',
    'snowwhite': 'snowWhiteAudio'
  };

  const audio = document.getElementById(audioMap[chosen]);
  if (audio) {
    limitAudioDurationG234(audio);
  } else {
    alert("Аудио файл табылмады! sounds/musical_tales/" + chosen + ".mp3");
  }
}

function checkMusicalTale(choice) {
  const feedback = document.getElementById('g2t6Feedback');
  if (!currentMusicalTale) {
    feedback.innerHTML = "Алдымен ертегіні тыңдаңыз! 🔊";
    feedback.className = "feedback";
    return;
  }

  const taleNames = {
    'redridinghood': 'Қызыл телпек',
    'pinocchio': 'Буратино',
    'threebears': 'Үш аю',
    'snowwhite': 'Ақшақар'
  };

  if (choice === currentMusicalTale) {
    feedback.innerHTML = "Дұрыс! Бұл: " + taleNames[choice];
    feedback.className = "feedback success";
    showReward();
    currentMusicalTale = '';
  } else {
    feedback.innerHTML = "Қате! Қайта тыңдап көріңіз.";
    feedback.className = "feedback error";
    playError();
  }
}

// ТАПСЫРМА 7: Техникалық дыбыстар
function playRandomTechnicalNoise() {
  const noises = ['rifle', 'machinegun', 'cannon'];
  const chosen = noises[Math.floor(Math.random() * noises.length)];
  currentTechnicalNoise = chosen;

  const audioMap = {
    'rifle': 'rifleAudio',
    'machinegun': 'machineGunAudio',
    'cannon': 'cannonAudio'
  };

  const audio = document.getElementById(audioMap[chosen]);
  if (audio) {
    limitAudioDurationG234(audio);
  } else {
    alert("Аудио файл табылмады! sounds/technical_noises/" + chosen + ".mp3");
  }
}

function checkTechnicalNoise(choice) {
  const feedback = document.getElementById('g2t7Feedback');
  if (!currentTechnicalNoise) {
    feedback.innerHTML = "Алдымен дыбысты тыңдаңыз! 🔊";
    feedback.className = "feedback";
    return;
  }

  const noiseNames = {
    'rifle': 'Мылтық атысы',
    'machinegun': 'Пулемет',
    'cannon': 'Зеңбірек'
  };

  if (choice === currentTechnicalNoise) {
    feedback.innerHTML = "Дұрыс! Бұл: " + noiseNames[choice];
    feedback.className = "feedback success";
    showReward();
    currentTechnicalNoise = '';
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
let currentAppliance = '';
let currentWordType = '';
let currentNationalSong = '';

// ТАПСЫРМА 1: Музыкалық ырғақ
function checkMusicTempo(tempo) {
  const feedback = document.getElementById('g3t1Feedback');
  if (!currentMusicTempo) {
    feedback.innerHTML = "Алдымен музыканы тыңдаңыз! 🔊";
    feedback.className = "feedback";
    return;
  }

  const tempoNames = { 'fast': 'Жылдам', 'medium': 'Орташа', 'slow': 'Баяу' };

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

  const typeNames = { 'question': 'Сұрақ', 'statement': 'Хабарлау', 'exclamation': 'Леп' };

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

// ТАПСЫРМА 4: Тұрмыстық техника
function playRandomAppliance() {
  const apps = ['fridge', 'vacuum', 'washing_machine', 'hair_dryer'];
  const chosen = apps[Math.floor(Math.random() * apps.length)];
  currentAppliance = chosen;

  const audioMap = {
    'fridge': 'fridgeAudio',
    'vacuum': 'vacuumAudio',
    'washing_machine': 'washingMachineAudio',
    'hair_dryer': 'hairDryerAudio'
  };

  const audio = document.getElementById(audioMap[chosen]);
  if (audio) {
    limitAudioDurationG234(audio);
  } else {
    alert("Аудио файл табылмады! sounds/appliances/" + chosen + ".mp3");
  }
}

function checkAppliance(choice) {
  const feedback = document.getElementById('g3t4Feedback');
  if (!currentAppliance) {
    feedback.innerHTML = "Алдымен дыбысты тыңдаңыз! 🔊";
    feedback.className = "feedback";
    return;
  }

  if (choice === 'washing_machine' && currentAppliance === 'washing_machine') choice = 'washing_machine';
  else if (choice === 'hair_dryer' && currentAppliance === 'hair_dryer') choice = 'hair_dryer';

  const appNames = {
    'fridge': 'Тоңазытқыш',
    'vacuum': 'Шаңсорғыш',
    'washing_machine': 'Киім жуғыш',
    'hair_dryer': 'Фен'
  };

  if (choice === currentAppliance) {
    feedback.innerHTML = "Дұрыс! Бұл: " + appNames[choice];
    feedback.className = "feedback success";
    showReward();
    currentAppliance = '';
  } else {
    feedback.innerHTML = "Қате! Қайта тыңдап көріңіз.";
    feedback.className = "feedback error";
    playError();
  }
}

// ТАПСЫРМА 5: Сөздерді тану
function checkWordType(type) {
  const feedback = document.getElementById('g3t5Feedback');
  if (!currentWordType) {
    feedback.innerHTML = "Алдымен дыбысты тыңдаңыз! 🔊";
    feedback.className = "feedback";
    return;
  }

  const typeNames = { 'familiar': 'Таныс сөз', 'question': 'Сұрақ', 'task': 'Тапсырма' };

  if (type === currentWordType) {
    feedback.innerHTML = "Дұрыс! Бұл: " + typeNames[type];
    feedback.className = "feedback success";
    showReward();
    currentWordType = '';
  } else {
    feedback.innerHTML = "Қате! Дұрыс анықтаңыз.";
    feedback.className = "feedback error";
    playError();
  }
}

// ТАПСЫРМА 6: Ұлттық әндер
function playRandomNationalSong() {
  const songs = ['kazakh', 'russian', 'english'];
  const chosen = songs[Math.floor(Math.random() * songs.length)];
  currentNationalSong = chosen;

  const audioMap = {
    'kazakh': 'kazakhSongAudio',
    'russian': 'russianSongAudio',
    'english': 'englishSongAudio'
  };

  const audio = document.getElementById(audioMap[chosen]);
  if (audio) {
    limitAudioDurationG234(audio);
  } else {
    alert("Аудио файл табылмады! sounds/national_songs/" + chosen + ".mp3");
  }
}

function checkNationalSong(choice) {
  const feedback = document.getElementById('g3t6Feedback');
  if (!currentNationalSong) {
    feedback.innerHTML = "Алдымен әнді тыңдаңыз! 🔊";
    feedback.className = "feedback";
    return;
  }

  const songNames = {
    'kazakh': 'Қазақ әні',
    'russian': 'Орыс әні',
    'english': 'Ағылшын әні'
  };

  if (choice === currentNationalSong) {
    feedback.innerHTML = "Дұрыс! Бұл: " + songNames[choice];
    feedback.className = "feedback success";
    showReward();
    currentNationalSong = '';
  } else {
    feedback.innerHTML = "Қате! Қайта тыңдап көріңіз.";
    feedback.className = "feedback error";
    playError();
  }
}

// ========== 4-СЫНЫП ТАПСЫРМАЛАРЫ ==========

// Глобальные переменные для 4-сынып
let currentStoryAnswer = 0;
let currentDialogSpeaker = '';
let currentTechItem = '';
let isReadingG4 = false;
let currentComplexRhythm = 0;
let currentDirection = '';
let currentHumanSoundG4 = '';

// ТАПСЫРМА 1: Әңгімелерді тыңдау
function checkStoryAnswer(answer) {
  const feedback = document.getElementById('g4t1Feedback');
  if (!currentStoryAnswer) {
    feedback.innerHTML = "Алдымен әңгімені тыңдаңыз! 🔊";
    feedback.className = "feedback";
    return;
  }

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

  const speakerNames = { 'child': 'Бала', 'adult': 'Ересек', 'both': 'Екеуі де' };

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
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = ac.createAnalyser();
    const microphone = ac.createMediaStreamSource(stream);
    microphone.connect(analyser);
    analyser.fftSize = 256;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    isReadingG4 = true;
    readBtn.style.display = 'none';
    stopBtn.style.display = 'inline-block';
    feedback.innerHTML = "Оқып жатырсыз... Жақсы!";
    feedback.className = "feedback";

    let progress = 0;

    function analyze() {
      if (!isReadingG4) {
        ac.close();
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
  isReadingG4 = false;
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

  const techNames = { 'tractor': 'Трактор', 'saw': 'Ара', 'sewing': 'Тігін машинасы' };

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

// ТАПСЫРМА 5: Күрделі ырғақ
function checkComplexRhythm(count) {
  const feedback = document.getElementById('g4t5Feedback');
  if (!currentComplexRhythm) {
    feedback.innerHTML = "Алдымен ырғақты тыңдаңыз! 🔊";
    feedback.className = "feedback";
    return;
  }

  if (count === currentComplexRhythm) {
    feedback.innerHTML = "Дұрыс! " + count + " соққы!";
    feedback.className = "feedback success";
    showReward();
    currentComplexRhythm = 0;
  } else {
    feedback.innerHTML = "Қате! Санын дұрыс санаңыз.";
    feedback.className = "feedback error";
    playError();
  }
}

// ТАПСЫРМА 6: Дыбыс бағыты
function checkDirection(direction) {
  const feedback = document.getElementById('g4t6Feedback');
  if (!currentDirection) {
    feedback.innerHTML = "Алдымен дыбысты тыңдаңыз! 🔊";
    feedback.className = "feedback";
    return;
  }

  const dirNames = { 'left': 'Сол жақтан', 'right': 'Оң жақтан', 'front': 'Алдынан', 'back': 'Артынан' };

  if (direction === currentDirection) {
    feedback.innerHTML = "Дұрыс! Дыбыс " + dirNames[direction] + " шықты!";
    feedback.className = "feedback success";
    showReward();
    currentDirection = '';
  } else {
    feedback.innerHTML = "Қате! Бағытты дұрыс анықтаңыз.";
    feedback.className = "feedback error";
    playError();
  }
}

// ТАПСЫРМА 7: Адам эмоциясы мен дыбыстары
function playRandomHumanSoundG4() {
  const sounds = ['laugh', 'cry', 'cough', 'sneeze'];
  const chosen = sounds[Math.floor(Math.random() * sounds.length)];
  currentHumanSoundG4 = chosen;
  // Use HTML entity or standard play
  new Audio(`sounds/human_complex/${chosen}.mp3`).play().catch(() => {
    alert(`Аудио файл табылмады! sounds/human_complex/${chosen}.mp3`);
  });
}

function checkHumanSoundG4(type) {
  const feedback = document.getElementById('g4t7Feedback');
  if (!currentHumanSoundG4) {
    feedback.innerHTML = "Алдымен дыбысты тыңдаңыз! 🔊";
    feedback.className = "feedback";
    return;
  }

  const soundNames = { 'laugh': 'Күлкі', 'cry': 'Жылау', 'cough': 'Жөтелу', 'sneeze': 'Түшкіру' };

  if (type === currentHumanSoundG4) {
    feedback.innerHTML = "Дұрыс! Бұл: " + soundNames[type];
    feedback.className = "feedback success";
    showReward();
    currentHumanSoundG4 = '';
  } else {
    feedback.innerHTML = "Қате! Қайта тыңдап көріңіз.";
    feedback.className = "feedback error";
    playError();
  }
}

// ========== ЖАЛПЫ ФУНКЦИЯ - ДЫБЫС ОЙНАТУ ==========
function playSound(type) {
  let audioPath = '';

  // 1-СЫНЫП
  if (type === 'soundFrequency') {
    const frequencies = ['high', 'mid'];
    const freq = frequencies[Math.floor(Math.random() * frequencies.length)];
    currentFrequency = freq;
    if (freq === 'high') audioPath = 'sounds/voice frequency/baby high.mp3';
    else if (freq === 'mid') audioPath = 'sounds/voice frequency/woman mid.mp3';
  }

  // 2-СЫНЫП
  else if (type === 'vehicle') {
    const vehicles = ['car', 'plane', 'train', 'moto'];
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
  else if (type === 'soundProperty') {
    const propertyTypes = ['duration', 'intensity'];
    const chosenProperty = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];

    if (chosenProperty === 'duration') {
      const durations = ['long', 'short'];
      const duration = durations[Math.floor(Math.random() * durations.length)];
      currentSoundDuration = duration;
      currentSoundIntensity = '';
      audioPath = `sounds/sound_properties/duration_${duration}.mp3`;
    } else {
      const intensities = ['loud', 'quiet', 'calm'];
      const intensity = intensities[Math.floor(Math.random() * intensities.length)];
      currentSoundIntensity = intensity;
      currentSoundDuration = '';
      audioPath = `sounds/sound_properties/intensity_${intensity}.mp3`;
    }
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
  else if (type === 'wordType') {
    const types = ['familiar', 'question', 'task'];
    const wordType = types[Math.floor(Math.random() * types.length)];
    currentWordType = wordType;
    audioPath = `sounds/word_types/${wordType}.mp3`;
  }
  else if (type === 'appliance') {
    playRandomAppliance();
    return;
  }
  else if (type === 'nationalSong') {
    playRandomNationalSong();
    return;
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
  else if (type === 'complexRhythm') {
    const counts = [4, 5, 6];
    const count = counts[Math.floor(Math.random() * counts.length)];
    currentComplexRhythm = count;
    audioPath = `sounds/complex_rhythms/rhythm_${count}.mp3`;
  }
  else if (type === 'direction') {
    const directions = ['left', 'right', 'front', 'back'];
    const direction = directions[Math.floor(Math.random() * directions.length)];
    currentDirection = direction;
    audioPath = `sounds/directions/${direction}.mp3`;
  }

  if (audioPath) {
    const audio = new Audio(audioPath);
    console.log('Playing:', audioPath);

    audio.addEventListener('error', () => {
      console.error("Audio not found:", audioPath);
      // alert disabled to avoid spam, or enable if needed
    });

    limitAudioDurationG234(audio);
  }
}

// ========== NEW INTERFACE LOGIC & RANDOMIZATION (REPAIRED) ==========

// 1. Radial Main Menu Logic
function toggleMainMenu() {
  const menu = document.getElementById('mainRadialMenu');
  if (menu) {
    if (menu.classList.contains('active')) {
      menu.classList.remove('active');
    } else {
      menu.classList.add('active');
      playClick();
    }
  }
}

// 2. Randomization History (For "No Repeat > 2 times")
const audioHistory = {
  animals: [],
  nature: [],
  human: [],
  instruments: [],
  vehicles: [],
  appliances: []
};

function getNextRandom(list, historyKey) {
  const history = audioHistory[historyKey] || [];
  const lastTwo = history.slice(-2);
  const available = list.filter(item => !lastTwo.includes(item));
  const pool = available.length > 0 ? available : list;
  const chosen = pool[Math.floor(Math.random() * pool.length)];

  history.push(chosen);
  if (history.length > 5) history.shift();
  audioHistory[historyKey] = history;

  return chosen;
}

// Overrides for Random Functions (Grade 0)

// Grade 0 Task 4: Animals
window.playRandomAnimal = function () {
  const animals = ['horse', 'cow', 'sheep', 'cat', 'dog'];
  const chosen = getNextRandom(animals, 'animals');

  // Set global variable
  currentSoundTarget = chosen;

  const audio = document.getElementById(chosen + 'Audio');
  if (audio) {
    audio.currentTime = 0;
    audio.play().catch(e => console.log('Audio play error:', e));
  } else {
    console.error('Audio element not found:', chosen + 'Audio');
  }
};

// Grade 0 Task 6: Nature
window.playRandomNature = function () {
  const nature = ['bird', 'water', 'wind'];
  const chosen = getNextRandom(nature, 'nature');

  // Set global variable
  currentSoundTarget = chosen;

  const audio = document.getElementById(chosen + 'Audio');
  if (audio) {
    audio.currentTime = 0;
    audio.play().catch(e => console.log('Audio play error:', e));
  } else {
    console.error('Audio element not found:', chosen + 'Audio');
  }
};

// Grade 0 Task 7: Human Sounds
window.playRandomHumanSound = function () {
  const sounds = ['laugh', 'cry', 'sneeze', 'cough'];
  const chosen = getNextRandom(sounds, 'human');

  // Set global variable
  currentSoundTarget = chosen;

  // Play audio
  const audio = document.getElementById(chosen + 'Audio');
  if (audio) {
    audio.currentTime = 0;
    audio.play().catch(e => console.log('Audio play error:', e));
  } else {
    // Fallback to creating new Audio element
    new Audio(`sounds/human/${chosen}.mp3`).play().catch(e => {
      new Audio(`sounds/human_complex/${chosen}.mp3`).play().catch(err => console.error('Human sound not found:', chosen));
    });
  }
};

// Grade 0 Task 3: Instruments
window.playInstrumentSound = function () {
  const instruments = ['piano', 'drum', 'guitar', 'violin'];
  const chosen = getNextRandom(instruments, 'instruments');

  // Set global variable
  currentSoundTarget = chosen;

  const audio = document.getElementById(chosen + 'Audio');
  if (audio) {
    audio.currentTime = 0;
    audio.play().catch(e => console.log('Audio play error:', e));
  } else {
    console.error('Audio element not found:', chosen + 'Audio');
  }
};

// Grade 0 Task 8: Vehicles
window.playRandomVehicle = function () {
  const vehicles = ['car', 'plane', 'train', 'motorcycle'];
  const chosen = getNextRandom(vehicles, 'vehicles');
  // Usually checkVehicle0 uses 'correctAnswer' or 'currentVehicle'?
  // In `script.js`, it likely uses `correctAnswer`.
  if (typeof correctAnswer !== 'undefined') correctAnswer = chosen;

  // Note: 'motorcycle' vs 'moto' mismatch might exist.
  // We use the ID `motorcycleAudio` if exists.
  let audio = document.getElementById(chosen + 'Audio');
  if (!audio && chosen === 'motorcycle') audio = document.getElementById('motoAudio');
  if (audio) {
    audio.currentTime = 0;
    audio.play();
  }
};

// 3. VOICE TASK (Дауыс созу) - New Bubble Logic
let voiceState = 'idle';
// Kazakh letters for bubbles
let voiceLetters = ['А', 'Ә', 'Б', 'В', 'Г', 'Ғ', 'Д', 'Е'];
let selectedVoiceLetter = '';

function initVoiceGame() {
  voiceState = 'idle';
  const container = document.getElementById('voiceGameContainer');
  const centerBtn = document.getElementById('voiceCenterBtn');
  const trainContainer = document.getElementById('voiceTrainContainer');
  const feedback = document.getElementById('voiceFeedback');

  if (trainContainer) trainContainer.style.display = 'none';
  if (container) container.classList.remove('hidden', 'expanded');
  if (feedback) feedback.innerText = '';

  if (container) {
    const oldBubbles = container.querySelectorAll('.small-bubble');
    oldBubbles.forEach(b => b.remove());
  }

  if (centerBtn) {
    centerBtn.innerText = "Дауыс созу";
    centerBtn.style.fontSize = "22px";
    centerBtn.style.background = "linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)";
  }
}

function handleVoiceCenterClick() {
  const container = document.getElementById('voiceGameContainer');
  const centerBtn = document.getElementById('voiceCenterBtn');

  if (typeof playClick === 'function') playClick();

  if (voiceState === 'idle') {
    generateVoiceBubbles();
    void container.offsetWidth; // force reflow
    setTimeout(() => {
      container.classList.add('expanded');
      positionBubblesExpanded();
    }, 50);
    voiceState = 'expanded';

  } else if (voiceState === 'expanded') {
    container.classList.remove('expanded');
    positionBubblesCenter();
    setTimeout(() => {
      const bubbles = container.querySelectorAll('.small-bubble');
      bubbles.forEach(b => b.remove());
      voiceState = 'idle';
    }, 600);

  } else if (voiceState === 'selected') {
    startVoicePractice();
  }
}

function generateVoiceBubbles() {
  const container = document.getElementById('voiceGameContainer');
  const allLetters = ['А', 'Ә', 'Б', 'В', 'Г', 'Ғ', 'Д', 'Е', 'Ж', 'З', 'И', 'К', 'Қ', 'Л', 'М', 'Н', 'О', 'Ө', 'П', 'Р', 'С', 'Т', 'У', 'Ұ', 'Ү', 'Ш', 'Ы', 'І'];
  const chosen = [];
  while (chosen.length < 8) {
    const r = allLetters[Math.floor(Math.random() * allLetters.length)];
    if (!chosen.includes(r)) chosen.push(r);
  }

  chosen.forEach((letter, i) => {
    const b = document.createElement('div');
    b.className = 'small-bubble';
    b.innerText = letter;
    b.style.left = '50%';
    b.style.top = '50%';
    b.onclick = (e) => {
      e.stopPropagation();
      selectVoiceLetter(letter);
    };
    container.appendChild(b);
  });
}

function positionBubblesExpanded() {
  const bubbles = document.querySelectorAll('.voice-bubble-container .small-bubble');
  const count = bubbles.length;
  const radius = 180;
  bubbles.forEach((b, i) => {
    const angle = (i * (360 / count)) * (Math.PI / 180);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    b.style.left = `calc(50% + ${x}px)`;
    b.style.top = `calc(50% + ${y}px)`;
    b.style.transform = 'translate(-50%, -50%) scale(1)';
  });
}

function positionBubblesCenter() {
  const bubbles = document.querySelectorAll('.voice-bubble-container .small-bubble');
  bubbles.forEach(b => {
    b.style.left = '50%';
    b.style.top = '50%';
    b.style.transform = 'translate(-50%, -50%) scale(0)';
  });
}

function selectVoiceLetter(letter) {
  selectedVoiceLetter = letter;
  const centerBtn = document.getElementById('voiceCenterBtn');
  centerBtn.innerText = "Таңдау";
  centerBtn.style.fontSize = "32px";
  centerBtn.style.background = "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)";

  // Attempt to play letter sound
  const audio = new Audio(`sounds/letters/letter_${letter}.mp3`);
  audio.play().catch(e => { });

  voiceState = 'selected';
}

function startVoicePractice() {
  const feedback = document.getElementById('voiceFeedback');
  const container = document.getElementById('voiceGameContainer');
  const trainContainer = document.getElementById('voiceTrainContainer');
  const progressBar = document.getElementById('voiceProgressBar');

  // Reset progress bar
  if (progressBar) {
    progressBar.style.width = '0%';
    progressBar.innerText = '0%';
  }

  // Hide bubbles first
  const bubbles = container.querySelectorAll('.small-bubble');
  bubbles.forEach(b => {
    b.style.opacity = '0';
    b.style.transform = 'translate(-50%, -50%) scale(0)';
  });

  // Hide center button
  const centerBtn = document.getElementById('voiceCenterBtn');
  if (centerBtn) centerBtn.style.display = 'none';

  // Show train container after bubbles disappear
  setTimeout(() => {
    container.style.display = 'none';
    trainContainer.style.display = 'block';

    feedback.innerText = `Микрофонға ұзақ "${selectedVoiceLetter}-${selectedVoiceLetter}..." деп созып айтыңыз!`;
    feedback.className = 'feedback';

    const train = document.getElementById('trainIcon');
    if (train) train.style.transform = 'rotate(90deg)';

    // Try to use microphone for real detection
    startMicrophoneDetection(train, feedback);
  }, 600);
}

async function startMicrophoneDetection(train, feedback) {
  const progressBar = document.getElementById('voiceProgressBar');

  console.log('Starting microphone detection...');

  try {
    console.log('Requesting microphone access...');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log('Microphone access granted!');

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    microphone.connect(analyser);
    analyser.fftSize = 256;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let progress = 0;
    let isActive = true;

    console.log('Starting audio analysis...');

    function analyze() {
      if (!isActive || progress >= 100) {
        console.log('Stopping microphone, progress:', progress);
        audioContext.close();
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      requestAnimationFrame(analyze);
      analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      let average = sum / bufferLength;

      // Log audio level periodically
      if (Math.random() < 0.1) { // 10% of the time
        console.log('Audio level:', average);
      }

      // Only progress if sound detected (threshold > 30)
      if (average > 30) {
        progress += 0.8;
        if (progress > 100) progress = 100;

        // Update progress bar
        if (progressBar) {
          progressBar.style.width = progress + '%';
          progressBar.innerText = Math.floor(progress) + '%';
        }

        if (progress >= 100) {
          isActive = false;
          feedback.innerText = "Пойыз жүріп кетеді! Тамаша! 🎉";
          feedback.className = "feedback success";
          if (typeof playSuccess === 'function') playSuccess();

          setTimeout(() => {
            const container = document.getElementById('voiceGameContainer');
            const trainContainer = document.getElementById('voiceTrainContainer');
            container.style.display = 'block';
            trainContainer.style.display = 'none';
            const centerBtn = document.getElementById('voiceCenterBtn');
            if (centerBtn) centerBtn.style.display = 'flex';
            initVoiceGame();
          }, 3000);
        }
      }
    }
    analyze();

  } catch (err) {
    console.error('Microphone access denied or error:', err);
    feedback.innerText = "Микрофон қосылмады. Рұқсат беріңіз немесе браузер параметрлерін тексеріңіз.";
    feedback.className = "feedback error";

    // Show error for 3 seconds then go back
    setTimeout(() => {
      const container = document.getElementById('voiceGameContainer');
      const trainContainer = document.getElementById('voiceTrainContainer');
      container.style.display = 'block';
      trainContainer.style.display = 'none';
      const centerBtn = document.getElementById('voiceCenterBtn');
      if (centerBtn) centerBtn.style.display = 'flex';
      initVoiceGame();
    }, 3000);
  }
}

// Init observer
document.addEventListener('DOMContentLoaded', () => {
  const screen = document.getElementById('g0Task2');
  if (screen) {
    const observer = new MutationObserver(() => {
      if (screen.classList.contains('active')) {
        initVoiceGame();
        toggleMainMenu(); // Close menu if open?
      }
    });
    observer.observe(screen, { attributes: true, attributeFilter: ['class'] });
  }
});
