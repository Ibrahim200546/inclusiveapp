(() => {
  const widget = document.getElementById('chatbotWidget');
  if (!widget) {
    return;
  }

  const panel = document.getElementById('chatbotPanel');
  const toggleButton = document.getElementById('chatbotToggle');
  const closeButton = document.getElementById('chatbotClose');
  const voiceToggleButton = document.getElementById('chatbotVoiceToggle');
  const micButton = document.getElementById('chatbotMicButton');
  const sendButton = document.getElementById('chatbotSendButton');
  const input = document.getElementById('chatbotInput');
  const messages = document.getElementById('chatbotMessages');
  const status = document.getElementById('chatbotStatus');

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const locale = (document.documentElement.lang || 'kk').toLowerCase().startsWith('ru') ? 'ru' : 'kk';

  const copy = {
    kk: {
      title: 'AI логопед',
      welcome: 'Сәлеметсіз бе! Мен дыбыс, буын, артикуляция және жаттығулар бойынша көмектесе аламын. Сұрағыңызды жазыңыз немесе микрофонды басыңыз.',
      listening: 'Тыңдап тұрмын...',
      thinking: 'Жауап дайындап жатырмын...',
      micUnsupported: 'Бұл браузерде сөйлеуді тану қолжетімсіз.',
      micDenied: 'Микрофонға рұқсат беріңіз.',
      micBusy: 'Микрофон қазір бос емес. Бір сәттен соң қайталап көріңіз.',
      voiceOn: 'Озвучка қосулы.',
      voiceOff: 'Озвучка өшірілді.',
      placeholder: 'Сұрағыңызды жазыңыз немесе айтыңыз...'
    },
    ru: {
      title: 'AI логопед',
      welcome: 'Здравствуйте! Я помогу с постановкой звуков, слогами, артикуляцией и упражнениями. Напишите вопрос или нажмите на микрофон.',
      listening: 'Слушаю вас...',
      thinking: 'Готовлю ответ...',
      micUnsupported: 'Распознавание речи в этом браузере недоступно.',
      micDenied: 'Нужен доступ к микрофону.',
      micBusy: 'Микрофон сейчас занят. Попробуйте ещё раз через секунду.',
      voiceOn: 'Озвучка включена.',
      voiceOff: 'Озвучка выключена.',
      placeholder: 'Напишите вопрос или скажите его вслух...'
    }
  }[locale];

  const state = {
    open: false,
    voiceEnabled: true,
    isListening: false,
    isTyping: false,
    recognition: null,
    replyTimer: null,
    statusTimer: null
  };

  input.placeholder = copy.placeholder;

  function setStatus(text) {
    status.textContent = text || '';
  }

  function flashStatus(text) {
    setStatus(text);
    if (state.statusTimer) {
      window.clearTimeout(state.statusTimer);
    }
    state.statusTimer = window.setTimeout(() => {
      if (!state.isListening && !state.isTyping) {
        setStatus('');
      }
    }, 1800);
  }

  function scrollMessagesToBottom() {
    messages.scrollTop = messages.scrollHeight;
  }

  function resizeInput() {
    input.style.height = '0px';
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
  }

  function createMessageElement(role, text) {
    const bubble = document.createElement('div');
    bubble.className = `chatbot-message ${role}`;
    bubble.textContent = text;

    if (role === 'assistant') {
      const actions = document.createElement('div');
      actions.className = 'chatbot-message-actions';

      const replayButton = document.createElement('button');
      replayButton.type = 'button';
      replayButton.className = 'chatbot-message-voice';
      replayButton.textContent = '🔊';
      replayButton.title = 'Қайта тыңдау';
      replayButton.addEventListener('click', () => {
        speakText(text);
      });

      actions.appendChild(replayButton);
      bubble.appendChild(actions);
    }

    return bubble;
  }

  function appendMessage(role, text) {
    messages.appendChild(createMessageElement(role, text));
    scrollMessagesToBottom();
  }

  function speakText(text) {
    if (!state.voiceEnabled || !text || !window.appTts?.speakText) {
      return Promise.resolve();
    }

    window.stopContentPlayback?.();

    return window.appTts.speakText(text, locale === 'ru' ? 'ru-RU' : 'kk-KZ', {
      provider: 'yandex',
      speed: 0.94
    }).then((result) => {
      if (!result?.ok) {
        console.warn('Static chatbot TTS failed:', result);
      }
    }).catch((error) => {
      console.error('Static chatbot TTS failed:', error);
    });
  }

  function resolveReply(text) {
    const normalized = String(text || '').toLowerCase();

    if (/р дыб|звук р|sound r|р қою|р айту/.test(normalized)) {
      return locale === 'ru'
        ? 'Для звука "Р" сначала укрепляйте язык: упражнения "Грибок", "Лошадка", "Дятел". Затем просите ребёнка тянуть "д-д-д" и добиваться вибрации кончика языка.'
        : '"Р" дыбысын қою үшін тіл ұшын күшейтіңіз: "Саңырауқұлақ", "Ат шауып келеді", "Тоқылдақ" жаттығуларын қайталаңыз. Кейін "д-д-д" деп айтып, тіл ұшының дірілін шығарыңыз.';
    }

    if (/ш дыб|звук ш|с-ш|ш айту|с мен ш/.test(normalized)) {
      return locale === 'ru'
        ? 'Для "Ш" губы слегка вытяните вперёд, язык поднимите к нёбу "чашечкой". Сначала тренируйте протяжное "ш-ш-ш", потом переходите к слогам "ша-шу-ши".'
        : '"Ш" дыбысы үшін ерінді сәл алға созып, тілді таңдайға "кесе" қылып көтеріңіз. Алдымен "ш-ш-ш" деп созып, кейін "ша-шу-ши" буындарына көшіңіз.';
    }

    if (/буын|слог/.test(normalized)) {
      return locale === 'ru'
        ? 'Чтобы ребёнок лучше делил слова на слоги, хлопайте или шагайте на каждый слог. Начинайте с коротких слов из 2 слогов, затем переходите к словам из 3-4 слогов.'
        : 'Буынға бөлуді жеңілдету үшін әр буында шапалақ соғып немесе қадам жасап үйреніңіз. Алдымен 2 буынды сөздерден бастап, кейін 3-4 буынды сөздерге өтіңіз.';
    }

    if (/артикуляц|дыбыс карт|карта звуков|ауыз/.test(normalized)) {
      return locale === 'ru'
        ? 'В "Дыбыс картасы" сначала нажмите на нужную букву, послушайте образец, затем повторно нажмите и откройте тренировку с микрофоном. Так ребёнок слышит образец и сразу закрепляет его.'
        : '"Дыбыс картасында" алдымен әріпті басып үлгіні тыңдаңыз, содан кейін қайта басып микрофонмен жаттығуды ашыңыз. Осылай бала дыбысты естіп, бірден қайталайды.';
    }

    if (/есту|тыңдау|слух|дыбысты тану/.test(normalized)) {
      return locale === 'ru'
        ? 'Для развития слухового внимания лучше заниматься короткими сериями по 3-5 минут: сначала один звук, потом выбор из двух, затем из трёх вариантов.'
        : 'Есту зейінін дамыту үшін 3-5 минуттық қысқа жаттығулар жақсы көмектеседі: алдымен бір дыбыс, кейін екі нұсқадан, содан соң үш нұсқадан таңдату керек.';
    }

    if (/жаттығу|упражн|ойын|игра/.test(normalized)) {
      return locale === 'ru'
        ? 'Выбирайте одно короткое упражнение на слух, одно на артикуляцию и одно на повторение звука. Такой ритм не перегружает ребёнка и даёт заметный результат.'
        : 'Бір қысқа есту жаттығуын, бір артикуляциялық жаттығуды және бір қайталау тапсырмасын таңдаңыз. Осындай ритм баланы шаршатпайды және нәтижені тезірек береді.';
    }

    return locale === 'ru'
      ? 'Я могу подсказать упражнения по звукам, буынам, артикуляции, слуховому вниманию и работе с микрофоном. Напишите, какой звук или навык хотите развивать.'
      : 'Мен дыбыс қою, буын, артикуляция, есту зейіні және микрофонмен жұмыс бойынша кеңес бере аламын. Қай дыбыс не дағдыны дамытқыңыз келетінін жазыңыз.';
  }

  function setControlsDisabled(disabled) {
    sendButton.disabled = disabled;
    if (!state.isListening) {
      micButton.disabled = disabled;
    }
  }

  function clearPendingReply() {
    if (state.replyTimer) {
      window.clearTimeout(state.replyTimer);
      state.replyTimer = null;
    }

    state.isTyping = false;
    setControlsDisabled(false);

    if (!state.isListening) {
      setStatus('');
    }
  }

  function finishReply(userText) {
    const answer = resolveReply(userText);
    clearPendingReply();
    appendMessage('assistant', answer);
    speakText(answer);
  }

  function sendMessage(text) {
    const cleanText = String(text || '').trim();
    if (!cleanText || state.isTyping) {
      return;
    }

    appendMessage('user', cleanText);
    input.value = '';
    resizeInput();

    state.isTyping = true;
    setControlsDisabled(true);
    setStatus(copy.thinking);

    state.replyTimer = window.setTimeout(() => {
      finishReply(cleanText);
    }, 900);
  }

  function stopRecognition() {
    if (state.recognition && state.isListening) {
      try {
        state.recognition.stop();
      } catch (error) {
        console.warn('Unable to stop recognition:', error);
      }
    }

    state.isListening = false;
    micButton.textContent = '🎤';
    micButton.classList.remove('is-listening');

    if (!state.isTyping) {
      micButton.disabled = false;
      setStatus('');
    }
  }

  function initRecognition() {
    if (!SpeechRecognition) {
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = locale === 'ru' ? 'ru-RU' : 'kk-KZ';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      state.isListening = true;
      micButton.textContent = '⏹';
      micButton.disabled = false;
      setStatus(copy.listening);
    };

    recognition.onresult = (event) => {
      let interimText = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }

      input.value = (finalText || interimText).trim();
      resizeInput();

      if (finalText.trim()) {
        stopRecognition();
        sendMessage(finalText.trim());
      } else if (interimText.trim()) {
        setStatus(`${copy.listening} ${interimText.trim()}`);
      }
    };

    recognition.onerror = (event) => {
      stopRecognition();
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setStatus(copy.micDenied);
      } else {
        setStatus(copy.micBusy);
      }
    };

    recognition.onend = () => {
      if (!state.isListening) {
        return;
      }
      stopRecognition();
    };

    return recognition;
  }

  function toggleRecognition() {
    if (!state.recognition) {
      setStatus(copy.micUnsupported);
      return;
    }

    if (state.isTyping) {
      return;
    }

    if (state.isListening) {
      stopRecognition();
      return;
    }

    input.value = '';
    resizeInput();

    try {
      state.recognition.start();
    } catch (error) {
      console.warn('Recognition start failed:', error);
      setStatus(copy.micBusy);
    }
  }

  function updateVoiceToggle() {
    voiceToggleButton.textContent = state.voiceEnabled ? '🔊' : '🔈';
    voiceToggleButton.classList.toggle('is-muted', !state.voiceEnabled);
    voiceToggleButton.title = state.voiceEnabled ? 'Озвучка қосулы' : 'Озвучка өшірулі';
  }

  function toggleWidget(forceOpen) {
    state.open = typeof forceOpen === 'boolean' ? forceOpen : !state.open;
    panel.hidden = !state.open;
    toggleButton.setAttribute('aria-expanded', String(state.open));

    if (state.open) {
      setTimeout(() => {
        input.focus();
        scrollMessagesToBottom();
      }, 0);
      return;
    }

    clearPendingReply();
    stopRecognition();

    window.appTts?.stop?.();
  }

  appendMessage('assistant', copy.welcome);
  resizeInput();
  updateVoiceToggle();
  state.recognition = initRecognition();

  toggleButton.addEventListener('click', () => toggleWidget());
  closeButton.addEventListener('click', () => toggleWidget(false));

  sendButton.addEventListener('click', () => {
    sendMessage(input.value);
  });

  micButton.addEventListener('click', () => {
    toggleRecognition();
  });

  voiceToggleButton.addEventListener('click', () => {
    state.voiceEnabled = !state.voiceEnabled;
    updateVoiceToggle();

    if (!state.voiceEnabled) {
      window.appTts?.stop?.();
      flashStatus(copy.voiceOff);
    } else {
      flashStatus(copy.voiceOn);
    }
  });

  input.addEventListener('input', resizeInput);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage(input.value);
    }
  });

  window.chatbotControls = {
    stopRecognition,
    clearPendingReply
  };
})();
