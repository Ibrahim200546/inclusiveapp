


// ========== 2-СЫНЫП ТАПСЫРМАЛАРЫ ==========

// ========== ДЫБЫС ҰЗАҚТЫҒЫН ШЕКТЕУ ==========
const MAX_AUDIO_DURATION_G234 = 5; // 5 секунд

function limitAudioDurationG234(audioElement) {
  if (!audioElement) return;

  // Трекерге қосу
  if (typeof trackAudio === 'function') trackAudio(audioElement);

  // Ограничиваем воспроизведение до 5 секунд
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
// currentDirection and currentHumanSoundG4 declared in 4-сынып globals section below
// === WEB AUDIO API for 3D Spatial Sound (Дыбыс бағыты) ===
let spatialAudioCtx = null;

function getSpatialAudioCtx() {
  if (!spatialAudioCtx) {
    spatialAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (spatialAudioCtx.state === 'suspended') spatialAudioCtx.resume();
  return spatialAudioCtx;
}

function createSpatialSoundBuffer(ctx, type) {
  const duration = 1.5;
  const sampleRate = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < sampleRate * duration; i++) {
    let sample = Math.random() * 2 - 1;
    if (type === 'low') sample *= Math.sin(i * 0.01);
    if (type === 'high') sample *= (i / (sampleRate * duration));
    data[i] = sample;
  }
  return buffer;
}

function playSpatial3D(x, y, z, type) {
  const ctx = getSpatialAudioCtx();
  const source = ctx.createBufferSource();
  source.buffer = createSpatialSoundBuffer(ctx, type);

  const panner = ctx.createPanner();
  panner.panningModel = 'HRTF';
  panner.distanceModel = 'inverse';
  panner.positionX.value = x;
  panner.positionY.value = y;
  panner.positionZ.value = z;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.7, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.4);

  source.connect(panner).connect(gain).connect(ctx.destination);
  source.start();
}

function playDirectionSound() {
  const directions = ['left', 'right', 'front', 'back'];
  const direction = directions[Math.floor(Math.random() * directions.length)];
  currentDirection = direction;

  // Map direction to 3D coordinates
  const coordMap = {
    'left': { x: -5, y: 0, z: 0, type: 'mid' },
    'right': { x: 5, y: 0, z: 0, type: 'mid' },
    'front': { x: 0, y: 0, z: -5, type: 'high' },
    'back': { x: 0, y: 0, z: 5, type: 'low' }
  };

  const coords = coordMap[direction];
  playSpatial3D(coords.x, coords.y, coords.z, coords.type);

  const feedback = document.getElementById('g4t6Feedback');
  if (feedback) {
    feedback.innerHTML = '🎧 Тыңдаңыз... Дыбыс қай жақтан шықты?';
    feedback.className = 'feedback';
  }
}

// ТАПСЫРМА 1: Көліктер дыбысы
function checkVehicle(choice) {
  console.log('checkVehicle called with choice:', choice);
  console.log('currentVehicle value:', currentVehicle);

  const feedback = document.getElementById('g2t1Feedback');
  if (!currentVehicle) {
    console.log('No vehicle sound played yet');
    feedback.innerHTML = "Алдымен дыбысты тыңдаңыз! 🔊";
    feedback.className = "feedback";
    return;
  }

  if (choice === currentVehicle || (choice === 'moto' && (currentVehicle === 'motorcycle' || currentVehicle === 'moto'))) {
    console.log('Correct answer!');
    feedback.innerHTML = "Дұрыс! Бұл - " + (choice === 'moto' ? 'Мотоцикл' : choice);
    feedback.className = "feedback success";
    showReward();
    currentVehicle = '';
  } else {
    console.log('Wrong answer');
    feedback.innerHTML = "Қате! Қайта тыңдап көріңіз.";
    feedback.className = "feedback error";
    playError();
  }
}

// ТАПСЫРМА 2: Буындар (работает для 0-сынып и 2-сынып)
function checkSyllables(count) {
  const feedback = document.getElementById('g0tSyllablesFeedback') || document.getElementById('g2t2Feedback');
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

  const audio = new Audio(`sounds/national_songs/${chosen}.mp3`);
  audio.onerror = () => {
    alert("Аудио файл табылмады! sounds/national_songs/" + chosen + ".mp3");
  };
  limitAudioDurationG234(audio);
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
    window.g4ReadingStream = stream;
    window.g4ReadingAudioContext = ac;
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
  if (window.g4ReadingAudioContext) {
    window.g4ReadingAudioContext.close().catch?.(() => { });
    window.g4ReadingAudioContext = null;
  }
  if (window.g4ReadingStream) {
    window.g4ReadingStream.getTracks().forEach(track => track.stop());
    window.g4ReadingStream = null;
  }
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
  new Audio(`sounds/human/${chosen}.mp3`).play().catch(() => {
    alert(`Аудио файл табылмады! sounds/human/${chosen}.mp3`);
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
    const vehicles = ['car', 'plane', 'train', 'motorcycle'];
    const chosen = vehicles[Math.floor(Math.random() * vehicles.length)];
    currentVehicle = chosen;
    console.log('Vehicle sound selected:', chosen);
    console.log('currentVehicle set to:', currentVehicle);
    audioPath = `sounds/transport/${chosen}.mp3`;
  }
  else if (type === 'syllable') {
    const counts = [1, 2, 3, 4];
    const count = counts[Math.floor(Math.random() * counts.length)];
    currentSyllableCount = count;
    audioPath = `sounds/syllables/word_${count}.mp3`;
  }
  else if (type === 'letter') {
    const letters = ['с', 'ш', 'з', 'ж'];
    const letterCode = letters[Math.floor(Math.random() * letters.length)];
    const letterMap = { 'с': 'С', 'ш': 'Ш', 'з': 'З', 'ж': 'Ж' };
    currentLetter = letterMap[letterCode];
    // Play Alippe letter sound, fallback to letters folder
    const alippePath = `sounds/Alippe/Alippe_${letterCode}.mp3`;
    const fallbackPath = `sounds/letters/letter_${letterCode}.mp3`;
    const audio = new Audio(alippePath);
    audio.play().catch(() => {
      new Audio(fallbackPath).play().catch(() => { });
    });
    return; // Already handled playback
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
      const durationFileMap = { 'long': 'узак', 'short': 'кыска' };
      audioPath = `sounds/voice_sipat/${durationFileMap[duration]}.mp3`;
    } else {
      const intensities = ['loud', 'quiet', 'calm'];
      const intensity = intensities[Math.floor(Math.random() * intensities.length)];
      currentSoundIntensity = intensity;
      currentSoundDuration = '';
      const intensityFileMap = { 'loud': 'громкий', 'quiet': 'тихий', 'calm': 'тише' };
      audioPath = `sounds/voice_sipat/${intensityFileMap[intensity]}.mp3`;
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
    audioPath = `sounds/ekpin/${syl}buin.mp3`;
  }
  else if (type === 'wordType') {
    const types = ['familiar', 'question', 'task'];
    const wordType = types[Math.floor(Math.random() * types.length)];
    currentWordType = wordType;
    const wordFileMap = { 'familiar': 'tanis', 'question': 'question', 'task': 'task' };
    audioPath = `sounds/wword/${wordFileMap[wordType]}.mp3`;
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
    const counts = [5, 6, 7];
    const count = counts[Math.floor(Math.random() * counts.length)];
    currentComplexRhythm = count;
    const rhythmFileMap = { 5: '5 хлопков', 6: '6 хлопок', 7: '7 хлопков' };
    audioPath = `sounds/igrak/${rhythmFileMap[count]}.mp3`;
  }
  else if (type === 'direction') {
    // Use 3D spatial audio instead of mp3 files
    playDirectionSound();
    return;
  }

  if (audioPath) {
    const audio = new Audio(audioPath);
    if (typeof trackAudio === 'function') trackAudio(audio);
    console.log('Playing:', audioPath);

    audio.addEventListener('error', () => {
      console.error("Audio not found:", audioPath);
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
    new Audio(`sounds/human/${chosen}.mp3`).play().catch(error => {
      currentSoundTarget = '';
      console.warn('Human sound could not play:', error);
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

// The train voice exercise is owned by js/voice-practice.js.
// Keep one controller so navigation and late microphone grants share a lifecycle.

// ========== ӘЛІППЕ (ALIPPE) LOGIC ==========
function initAlippe() {
  const alippeGrid = document.getElementById("alippeGrid");
  if (!alippeGrid) return;

  alippeGrid.innerHTML = ""; // Clear existing

  // Full Kazakh Alphabet
  const alphabet = ["А", "Ә", "Б", "В", "Г", "Ғ", "Д", "Е", "Ё", "Ж", "З", "И", "Й", "К", "Қ", "Л", "М", "Н", "Ң", "О", "Ө", "П", "Р", "С", "Т", "У", "Ұ", "Ү", "Ф", "Х", "Һ", "Ц", "Ч", "Ш", "Щ", "Ы", "І", "Э", "Ю", "Я"];

  alphabet.forEach(letter => {
    const item = document.createElement("div");
    item.className = "alippe-item";
    item.textContent = letter;

    item.onclick = () => {
      playAlippeSound(letter);
    };

    alippeGrid.appendChild(item);
  });
}

function playAlippeSound(letter) {
  const letterLower = letter.toLowerCase();
  // New path: sounds/Alippe/Alippe_x.mp3
  const path = `sounds/Alippe/Alippe_${letterLower}.mp3`;

  const audio = new Audio(path);
  audio.play().catch(e => {
    console.warn("Alippe primary audio failed:", path);
    // Fallback to old path just in case
    const oldPath = `sounds/letters/letter_${letterLower}.mp3`;
    new Audio(oldPath).play().catch(() => { });
  });
}



// Separate Observer for Alippe init to ensure it runs
document.addEventListener("DOMContentLoaded", () => {
  const taskScreen = document.getElementById("g0Task2");
  if (taskScreen) {
    const observer = new MutationObserver(() => {
      if (taskScreen.classList.contains("active")) {
        // Initialize Alippe
        if (typeof initAlippe === "function") {
          initAlippe();
        }
      }
    });
    observer.observe(taskScreen, { attributes: true, attributeFilter: ["class"] });
  }
});



// ========== UNIVERSAL ALIPPE LOGIC (OVERRIDES PREVIOUS) ==========
function initAlippe() {
  const grids = document.querySelectorAll(".alippe-grid");
  if (grids.length === 0) return;

  // New Mappings with Icons and Words
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
    // Force clean init
    // if (grid.children.length > 0) return; // REMOVED to insure update

    grid.innerHTML = "";

    alippeData.forEach(itemData => {
      const item = document.createElement("div");
      item.className = "alippe-item";

      // Inline styles for vertical layout (Minimalistic)
      item.style.display = "flex";
      item.style.flexDirection = "column";
      item.style.alignItems = "center";
      item.style.justifyContent = "center";
      item.style.padding = "10px";
      item.style.gap = "5px";

      // Content
      const iconDiv = document.createElement("div");
      iconDiv.textContent = itemData.icon;
      iconDiv.style.fontSize = "32px";
      iconDiv.style.lineHeight = "1";

      const letterDiv = document.createElement("div");
      letterDiv.textContent = itemData.letter;
      letterDiv.style.fontSize = "24px";
      letterDiv.style.fontWeight = "bold";
      letterDiv.style.color = "#28a745"; // Match theme color

      const wordDiv = document.createElement("div");
      wordDiv.textContent = itemData.word;
      wordDiv.style.fontSize = "12px";
      wordDiv.style.color = "#555";
      wordDiv.style.marginTop = "2px";

      item.appendChild(iconDiv);
      item.appendChild(letterDiv);
      item.appendChild(wordDiv);

      item.onclick = () => {
        playAlippeSound(itemData.letter);

        // Visual click feedback
        item.style.transform = "scale(0.95)";
        setTimeout(() => item.style.transform = "scale(1)", 150);
      };

      grid.appendChild(item);
    });
  });
}

// Universal Observer for Alippe Screens
document.addEventListener("DOMContentLoaded", () => {
  const alippeScreens = ["g0Task2", "g1TaskLetters"];

  alippeScreens.forEach(screenId => {
    const screen = document.getElementById(screenId);
    if (screen) {
      const observer = new MutationObserver(() => {
        if (screen.classList.contains("active")) {
          // Initialize Alippe when screen active
          if (typeof initAlippe === "function") {
            initAlippe();
          }
        }
      });
      observer.observe(screen, { attributes: true, attributeFilter: ["class"] });
    }
  });
});



// ==========================================
// FIXES AND UPDATES (Added dynamically)
// ==========================================

// 1. Fix Nature Random
window.playRandomNature = function () {
  const nature = ['bird', 'water', 'wind'];
  const chosen = nature[Math.floor(Math.random() * nature.length)];
  currentSoundTarget = chosen;

  const audio = document.getElementById(chosen + 'Audio');
  if (audio) {
    audio.currentTime = 0;
    audio.play().catch(e => { });
  } else {
    new Audio(`sounds/nature/${chosen}.mp3`).play().catch(e => { });
  }
};

// ==========================================
// FIXES AND UPDATES (Added dynamically)
// ==========================================

// 1. Fix Nature Random
window.playRandomNature = function () {
  const nature = ['bird', 'water', 'wind'];
  const chosen = nature[Math.floor(Math.random() * nature.length)];
  currentSoundTarget = chosen;

  const audio = document.getElementById(chosen + 'Audio');
  if (audio) {
    audio.currentTime = 0;
    audio.play().catch(e => { });
  } else {
    new Audio(`sounds/nature/${chosen}.mp3`).play().catch(e => { });
  }
};

// 3. Alippe Logic (Restored)
window.initAlippe = function () {
  const grids = document.querySelectorAll(".alippe-grid");
  if (grids.length === 0) return;
  const alphabet = ["А", "Ә", "Б", "В", "Г", "Ғ", "Д", "Е", "Ё", "Ж", "З", "И", "Й", "К", "Қ", "Л", "М", "Н", "Ң", "О", "Ө", "П", "Р", "С", "Т", "У", "Ұ", "Ү", "Ф", "Х", "Һ", "Ц", "Ч", "Ш", "Щ", "Ы", "І", "Э", "Ю", "Я"];

  grids.forEach(grid => {
    if (grid.children.length > 0) return;
    grid.innerHTML = "";
    alphabet.forEach(letter => {
      const item = document.createElement("div");
      item.className = "alippe-item";
      item.textContent = letter;
      item.onclick = () => { playAlippeSound(letter); };
      grid.appendChild(item);
    });
  });
};

window.playAlippeSound = function (letter) {
  const letterLower = letter.toLowerCase();
  const audioPaths = [
    `sounds/letters/letter_${letterLower}.mp3`,
    `sounds/letters/letter_${letter}.mp3`,
    `sounds/letters/${letterLower}.mp3`
  ];
  let attemptIndex = 0;
  function tryNext() {
    if (attemptIndex >= audioPaths.length) return;
    const audio = new Audio(audioPaths[attemptIndex]);
    audio.play().catch(() => {
      attemptIndex++;
      tryNext();
    });
  }
  tryNext();
};



// ==========================================
// G0 TASKS UPDATES (Shuffle + Click-Preview)
// ==========================================

// Helper for shuffling
function shuffleCardsInTask(screenId) {
  const screen = document.getElementById(screenId);
  if (!screen) return;
  const grid = screen.querySelector('.images-grid');
  if (!grid) return;
  for (let i = grid.children.length; i >= 0; i--) {
    grid.appendChild(grid.children[Math.random() * i | 0]);
  }
}

// 1. Instruments (g0Task3)
window.playInstrumentSound = function () {
  const instruments = ['piano', 'drum', 'guitar', 'violin'];
  currentSoundTarget = instruments[Math.floor(Math.random() * instruments.length)];

  const feedback = document.getElementById('g0t3Feedback');
  if (feedback) feedback.innerHTML = " Аспапты табыңыз...";

  new Audio(`sounds/musical/${currentSoundTarget}.mp3`).play().catch(e => { });
  shuffleCardsInTask('g0Task3');
};

window.checkInstrument = function (choice) {
  const feedback = document.getElementById('g0t3Feedback');
  if (!currentSoundTarget) {
    new Audio(`sounds/musical/${choice}.mp3`).play().catch(e => { });
    return;
  }
  if (choice === currentSoundTarget) {
    if (feedback) { feedback.innerHTML = "Дұрыс! Тамаша!"; feedback.className = "feedback success"; }
    showReward();
    currentSoundTarget = null;
  } else {
    playError();
    if (feedback) { feedback.innerHTML = "Қате! Қайта тыңдап көріңіз."; feedback.className = "feedback error"; }
  }
};

// 2. Animals (g0Task4)
window.playRandomAnimal = function () {
  const animals = ['horse', 'cow', 'dog', 'cat', 'sheep'];
  currentSoundTarget = animals[Math.floor(Math.random() * animals.length)];

  const feedback = document.getElementById('g0t4Feedback');
  if (feedback) feedback.innerHTML = " Жануарды табыңыз...";

  new Audio(`sounds/animals/${currentSoundTarget}.mp3`).play().catch(e => { });
  shuffleCardsInTask('g0Task4');
};

window.checkAnimal = function (choice) {
  const feedback = document.getElementById('g0t4Feedback');
  if (!currentSoundTarget) {
    new Audio(`sounds/animals/${choice}.mp3`).play().catch(e => { });
    return;
  }
  if (choice === currentSoundTarget) {
    if (feedback) { feedback.innerHTML = "Дұрыс!"; feedback.className = "feedback success"; }
    showReward();
    currentSoundTarget = null;
  } else {
    playError();
    if (feedback) { feedback.innerHTML = "Қате!"; feedback.className = "feedback error"; }
  }
};

// 3. Nature (g0Task6)
window.playRandomNature = function () {
  const nature = ['bird', 'water', 'wind'];
  currentSoundTarget = nature[Math.floor(Math.random() * nature.length)];

  const feedback = document.getElementById('g0t6Feedback');
  if (feedback) feedback.innerHTML = " Табиғат құбылысын табыңыз...";

  new Audio(`sounds/nature/${currentSoundTarget}.mp3`).play().catch(e => { });
  shuffleCardsInTask('g0Task6');
};

window.checkNature = function (choice) {
  const feedback = document.getElementById('g0t6Feedback');
  if (!currentSoundTarget) {
    new Audio(`sounds/nature/${choice}.mp3`).play().catch(e => { });
    return;
  }
  if (choice === currentSoundTarget) {
    if (feedback) { feedback.innerHTML = "Дұрыс!"; feedback.className = "feedback success"; }
    showReward();
    currentSoundTarget = null;
  } else {
    playError();
    if (feedback) { feedback.innerHTML = "Қате!"; feedback.className = "feedback error"; }
  }
};

// 4. Human Sounds (g0Task7)
window.playRandomHumanSound = function () {
  const human = ['laugh', 'cry', 'sneeze', 'cough'];
  currentSoundTarget = human[Math.floor(Math.random() * human.length)];

  const feedback = document.getElementById('g0t7Feedback');
  if (feedback) feedback.innerHTML = " Дыбысты табыңыз...";

  new Audio(`sounds/human/${currentSoundTarget}.mp3`).play().catch(e => { });
  shuffleCardsInTask('g0Task7');
};

window.checkHumanSound = function (choice) {
  const feedback = document.getElementById('g0t7Feedback');
  if (!currentSoundTarget) {
    new Audio(`sounds/human/${choice}.mp3`).play().catch(e => { });
    return;
  }
  if (choice === currentSoundTarget) {
    if (feedback) { feedback.innerHTML = "Дұрыс!"; feedback.className = "feedback success"; }
    showReward();
    currentSoundTarget = null;
  } else {
    playError();
    if (feedback) { feedback.innerHTML = "Қате!"; feedback.className = "feedback error"; }
  }
};



/* ==========================================
   MOVED/COPIED G0 TASK WRAPPERS
   ========================================== */

// 1. Wild Animals G0
window.playRandomWildAnimalG0 = function () {
  const animals = ['lion', 'wolf', 'bear', 'elephant'];
  currentSoundTarget = animals[Math.floor(Math.random() * animals.length)];
  const feedback = document.getElementById('g0tWildFeedback');
  if (feedback) feedback.innerText = " Жануарды табыңыз...";

  new Audio(`sounds/wild_animals/${currentSoundTarget}.mp3`).play().catch(e => { });
  shuffleCardsInTask('g0TaskWild');
};

window.checkWildAnimalG0 = function (choice) {
  const feedback = document.getElementById('g0tWildFeedback');
  if (!currentSoundTarget) { new Audio(`sounds/wild_animals/${choice}.mp3`).play(); return; }
  if (choice === currentSoundTarget) {
    feedback.innerText = "Дұрыс! Тамаша!"; feedback.className = "feedback success";
    showReward(); currentSoundTarget = null;
  } else {
    playError(); feedback.innerText = "Қате!"; feedback.className = "feedback error";
  }
};

// 2. Technical 2 G0
window.playRandomTechnicalNoiseG0 = function () {
  const map = { 'rifle': 'rifle', 'machinegun': 'machine_gun', 'cannon': 'cannon' };
  const keys = Object.keys(map);
  const chosenKey = keys[Math.floor(Math.random() * keys.length)];

  currentSoundTarget = chosenKey;
  const feedback = document.getElementById('g0tTech2Feedback');
  if (feedback) feedback.innerText = " Дыбысты табыңыз...";

  new Audio(`sounds/technical_noises/${map[chosenKey]}.mp3`).play().catch(e => { });
  shuffleCardsInTask('g0TaskTech2');
};

window.checkTechnicalNoiseG0 = function (choice) {
  const feedback = document.getElementById('g0tTech2Feedback');
  const map = { 'rifle': 'rifle', 'machinegun': 'machine_gun', 'cannon': 'cannon' };

  if (!currentSoundTarget) { new Audio(`sounds/technical_noises/${map[choice]}.mp3`).play(); return; }

  if (choice === currentSoundTarget) {
    feedback.innerText = "Дұрыс!"; feedback.className = "feedback success";
    showReward(); currentSoundTarget = null;
  } else {
    playError(); feedback.innerText = "Қате!"; feedback.className = "feedback error";
  }
};

// 3. Appliances G0
// 3. Appliances G0 (Merged into Household)
// KEPT FOR BACKWARD COMPAT (if needed) but essentially deprecated by Household Logic below

// ========== NEW HOUSEHOLD LOGIC (MERGED) ==========
window.playRandomHouseholdG0 = function () {
  const homeItems = ['phone', 'clock', 'bike', 'doorbell', 'schoolbell'];
  const applianceItems = ['fridge', 'vacuum', 'washing_machine', 'hair_dryer'];
  const workshopItems = ['saw', 'sewing'];
  const allItems = [...homeItems, ...applianceItems, ...workshopItems];

  currentSoundTarget = allItems[Math.floor(Math.random() * allItems.length)];

  const feedback = document.getElementById('g0t9Feedback');
  if (feedback) feedback.innerText = "Дыбысты табыңыз...";

  let path = "";
  if (homeItems.includes(currentSoundTarget)) {
    const fileMap = { 'phone': 'phone.mp3', 'clock': 'clock.mp3', 'bike': 'bike.mp3', 'doorbell': 'doorbell.mp3', 'schoolbell': 'school_bell.mp3' };
    path = `sounds/Household sounds/${fileMap[currentSoundTarget]}`;
  } else if (workshopItems.includes(currentSoundTarget)) {
    const fileMap = { 'saw': 'saw', 'sewing': 'sewing_machine' };
    path = `sounds/technical/${fileMap[currentSoundTarget]}.mp3`;
  } else {
    path = `sounds/appliances/${currentSoundTarget}.mp3`;
  }

  new Audio(path).play().catch(e => { console.error(e); });
  shuffleCardsInTask('g0Task9');
};

window.checkHouseholdG0 = function (choice) {
  const feedback = document.getElementById('g0t9Feedback');
  const homeItems = ['phone', 'clock', 'bike', 'doorbell', 'schoolbell'];
  const workshopItems = ['saw', 'sewing'];

  if (!currentSoundTarget) {
    let path = "";
    if (homeItems.includes(choice)) {
      const fileMap = { 'phone': 'phone.mp3', 'clock': 'clock.mp3', 'bike': 'bike.mp3', 'doorbell': 'doorbell.mp3', 'schoolbell': 'school_bell.mp3' };
      path = `sounds/Household sounds/${fileMap[choice]}`;
    } else if (workshopItems.includes(choice)) {
      const fileMap = { 'saw': 'saw', 'sewing': 'sewing_machine' };
      path = `sounds/technical/${fileMap[choice]}.mp3`;
    } else {
      path = `sounds/appliances/${choice}.mp3`;
    }
    new Audio(path).play().catch(e => { });
    return;
  }

  if (choice === currentSoundTarget) {
    if (feedback) { feedback.innerText = "Дұрыс! Тамаша!"; feedback.className = "feedback success"; }
    showReward();
    currentSoundTarget = null;
  } else {
    playError();
    if (feedback) { feedback.innerText = "Қате!"; feedback.className = "feedback error"; }
  }
};


// 4. Tech 4 G0
window.playRandomTechG0 = function () {
  const items = ['tractor', 'saw', 'sewing'];
  const fileMap = { 'tractor': 'tractor', 'saw': 'saw', 'sewing': 'sewing_machine' };

  currentSoundTarget = items[Math.floor(Math.random() * items.length)];

  const feedback = document.getElementById('g0tTech4Feedback');
  if (feedback) feedback.innerText = " Техниканы табыңыз...";

  new Audio(`sounds/technical/${fileMap[currentSoundTarget]}.mp3`).play().catch(e => { });
  shuffleCardsInTask('g0TaskTech4');
};
window.checkTechG0 = function (choice) {
  const feedback = document.getElementById('g0tTech4Feedback');
  const fileMap = { 'tractor': 'tractor', 'saw': 'saw', 'sewing': 'sewing_machine' };

  if (!currentSoundTarget) { new Audio(`sounds/technical/${fileMap[choice]}.mp3`).play(); return; }
  if (choice === currentSoundTarget) {
    feedback.innerText = "Дұрыс!"; feedback.className = "feedback success";
    showReward(); currentSoundTarget = null;
  } else {
    playError(); feedback.innerText = "Қате!"; feedback.className = "feedback error";
  }
};

// 5. Emotions G0
window.playRandomHumanSoundG0 = function () {
  const items = ['laugh', 'cry', 'cough', 'sneeze'];
  currentSoundTarget = items[Math.floor(Math.random() * items.length)];

  const feedback = document.getElementById('g0tEmotionFeedback');
  if (feedback) feedback.innerText = "Эмоцияны табыңыз...";

  new Audio(`sounds/human/${currentSoundTarget}.mp3`).play().catch(e => { });
  shuffleCardsInTask('g0TaskEmotion');
};
window.checkHumanSoundG0 = function (choice) {
  const feedback = document.getElementById('g0tEmotionFeedback');
  if (!currentSoundTarget) { new Audio(`sounds/human/${choice}.mp3`).play(); return; }

  if (choice === currentSoundTarget) {
    feedback.innerText = "Дұрыс!"; feedback.className = "feedback success";
    showReward(); currentSoundTarget = null;
  } else {
    playError(); feedback.innerText = "Қате!"; feedback.className = "feedback error";
  }
};


/* ==========================================
   RADIAL MENU TOGGLE & ALIPPE FIX
   ========================================== */
window.toggleRadialGradeMenu = function (btn) {
  const container = btn.closest('.radial-menu-container');
  if (container) {
    const isActive = container.classList.toggle('active');

    // Play sound
    const clickSound = document.getElementById('clickSound');
    if (clickSound) clickSound.play().catch(e => { });

    // If active, ensure Alippe is present
    if (isActive) {
      if (window.initAlippe) window.initAlippe();
    }
  }
};

// Ensure Alippe initializes on any screen change or load
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (window.initAlippe) window.initAlippe();
  }, 500);
});

// Hook into showScreen if possible (global override or interval check)
// Since we can't easily override global function from here without race conditions,
// we'll use a periodic check or rely on the toggle/onclick events.


// A previous lesson must never supply the answer for a newly opened lesson.
function resetExerciseAnswers() {
  currentVehicle = currentSyllableWord = currentLetter = currentMathAnswer = '';
  currentSoundDuration = currentSoundIntensity = currentMusicalTale = currentTechnicalNoise = '';
  currentMusicTempo = currentIntonation = currentAppliance = currentWordType = currentNationalSong = '';
  currentDialogSpeaker = currentTechItem = currentDirection = currentHumanSoundG4 = '';
  currentSyllableCount = currentStress = currentStoryAnswer = currentComplexRhythm = 0;
  currentSoundTarget = correctAnswer = '';
  currentRhythm = null;
  window.g0VehicleTarget = null;
}
