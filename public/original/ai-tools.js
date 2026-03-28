/* ai-tools.js — All AI calls go through secure /api/ proxy */

let chatHistory = [
  { role: "system", content: "You are a friendly and professional AI Speech Therapist assistant for an inclusive app for kids with hearing and speech impairments. Speak in Kazakh or Russian depending on the language the user uses. Keep answers brief (max 3 sentences), encouraging, and helpful. Use simple words." }
];

const CHATBOT_TTS_SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAAA=";

document.addEventListener('DOMContentLoaded', () => {
  injectAIToolsHTML();
  initAIAssistantV2();
  initSpeechAssessment();
});

function injectAIToolsHTML() {
  const container = document.createElement('div');
  container.innerHTML = `
    <style>
      .hidden { display: none !important; }
    </style>
    <!-- AI Assistant -->
    <button id="aiChatToggle" class="ai-floating-btn ai-chat-btn">
      <span style="font-size: 24px;">✨</span>
    </button>
    
    <div id="aiChatWindow" class="ai-chat-window hidden">
      <div class="ai-chat-header">
        <div class="ai-chat-header-info">
          <h3>ЖИ-Логопед</h3>
          <p>Сіздің ақылды көмекшіңіз</p>
        </div>
        <button id="aiChatClose" class="ai-close-btn">✖</button>
      </div>
      <div id="aiChatMessages" class="ai-chat-messages">
        <div class="ai-message ai-assistant">
          Сәлеметсіз бе! Мен сіздің ЖИ көмекшіңізбін. Қандай сұрақтарыңыз бар? (Здравствуйте! Я ваш ИИ-помощник. Какие у вас есть вопросы?)
        </div>
      </div>
      <div class="ai-chat-input-area">
        <textarea id="aiChatInput" placeholder="Сұрақ қойыңыз... (Задайте вопрос...)" rows="1"></textarea>
        <button id="aiChatSend" class="ai-send-btn">➤</button>
      </div>
    </div>

    <!-- Speech Assessment -->
    <button id="aiSpeechToggle" class="ai-floating-btn ai-speech-btn">
      <span style="font-size: 24px;">🎤</span>
    </button>
    
    <div id="aiSpeechWindow" class="ai-speech-window hidden">
      <div class="ai-chat-header" style="background: linear-gradient(135deg, #10b981, #059669);">
        <div class="ai-chat-header-info">
          <h3>ЖИ Сөйлеуді бағалау</h3>
          <p>Сөздерді анық айтыңыз</p>
        </div>
        <button id="aiSpeechClose" class="ai-close-btn">✖</button>
      </div>
      <div class="ai-speech-body">
        <div class="ai-speech-target" id="aiSpeechTargetWord">Раушан</div>
        <div class="ai-speech-hint" id="aiSpeechHint">💡 'Р' дыбысы</div>
        
        <button id="aiSpeechMicBtn" class="ai-speech-mic-btn">🎤</button>
        <p id="aiSpeechStatus" class="ai-speech-status">Басып, сөйлеңіз</p>
        
        <div id="aiSpeechResult" class="ai-speech-result hidden">
          <div id="aiSpeechScore" class="ai-speech-score">100%</div>
          <div id="aiSpeechFeedback" class="ai-speech-feedback">Керемет! 🚀</div>
        </div>
        
        <div class="ai-speech-controls">
          <button id="aiSpeechRetryBtn" class="btn btn-secondary">Қайталау</button>
          <button id="aiSpeechNextBtn" class="btn btn-primary" style="background:#1e293b; color:white;">Келесі сөз ✓</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  const chatHeader = document.querySelector('#aiChatWindow .ai-chat-header');
  const closeBtn = document.getElementById('aiChatClose');
  if (chatHeader && closeBtn) {
    const actions = document.createElement('div');
    actions.className = 'ai-chat-header-actions';

    const speechToggle = document.createElement('button');
    speechToggle.id = 'aiChatSpeechToggle';
    speechToggle.className = 'ai-chat-icon-btn';
    speechToggle.type = 'button';
    speechToggle.title = 'Озвучка';
    speechToggle.textContent = '🔊';

    closeBtn.replaceWith(actions);
    actions.appendChild(speechToggle);
    actions.appendChild(closeBtn);
  }

  const inputArea = document.querySelector('#aiChatWindow .ai-chat-input-area');
  const sendBtn = document.getElementById('aiChatSend');
  if (inputArea && sendBtn) {
    const status = document.createElement('div');
    status.id = 'aiChatStatus';
    status.className = 'ai-chat-status';
    inputArea.parentNode.insertBefore(status, inputArea);

    const micBtn = document.createElement('button');
    micBtn.id = 'aiChatMic';
    micBtn.className = 'ai-chat-mic-btn';
    micBtn.type = 'button';
    micBtn.title = 'Дауыспен айту';
    micBtn.textContent = '🎤';
    inputArea.insertBefore(micBtn, sendBtn);
  }
}

// AI Assistant Logic
function initAIAssistant() {
    const toggleBtn = document.getElementById('aiChatToggle');
    const closeBtn = document.getElementById('aiChatClose');
    const chatWindow = document.getElementById('aiChatWindow');
    const sendBtn = document.getElementById('aiChatSend');
    const micBtn = document.getElementById('aiChatMic');
    const input = document.getElementById('aiChatInput');
    const messagesContainer = document.getElementById('aiChatMessages');
    const statusEl = document.getElementById('aiChatStatus');
    const speechToggleBtn = document.getElementById('aiChatSpeechToggle');
    const SpeechRecognitionObj = window.SpeechRecognition || window.webkitSpeechRecognition;

    let recognition = null;
    let isListening = false;
    let speechEnabled = true;
    let activeRequestController = null;
    let activeTypingId = null;

    if (SpeechRecognitionObj) {
        recognition = new SpeechRecognitionObj();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = (document.documentElement.lang || 'kk').toLowerCase().startsWith('ru') ? 'ru-RU' : 'kk-KZ';
    }

    function setStatus(text) {
        if (statusEl) {
            statusEl.innerText = text || '';
        }
    }

    function stopAssistantSpeech() {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }

    function detectReplyLang(text) {
        if (/[ӘәІіҢңҒғҮүҰұҚқӨөҺһ]/.test(text)) {
            return 'kk-KZ';
        }
        return /[А-Яа-яЁё]/.test(text) ? 'ru-RU' : 'kk-KZ';
    }

    function updateSpeechToggle() {
        if (!speechToggleBtn) return;
        speechToggleBtn.textContent = speechEnabled ? '🔊' : '🔈';
        speechToggleBtn.classList.toggle('muted', !speechEnabled);
    }

    function removeTyping() {
        if (activeTypingId) {
            removeElement(activeTypingId);
            activeTypingId = null;
        }
    }

    function stopRecognition() {
        if (recognition && isListening) {
            try {
                recognition.stop();
            } catch (error) {
                console.warn('Failed to stop chat recognition', error);
            }
        }

        isListening = false;
        if (micBtn) {
            micBtn.classList.remove('listening');
            micBtn.textContent = '🎤';
        }
    }

    function clearPendingReply() {
        if (activeRequestController) {
            activeRequestController.abort();
            activeRequestController = null;
        }
        removeTyping();
    }

    window.chatbotControls = {
        stopRecognition,
        clearPendingReply
    };

    function closeChatWindow() {
        chatWindow.classList.add('hidden');
        toggleBtn.style.transform = "scale(1)";
        toggleBtn.style.opacity = "1";
        stopRecognition();
        stopAssistantSpeech();
        setStatus('');
    }

    toggleBtn.addEventListener('click', () => {
        chatWindow.classList.toggle('hidden');
        if (!chatWindow.classList.contains('hidden')) {
            toggleBtn.style.transform = "scale(0.8)";
            toggleBtn.style.opacity = "0";
            input.focus();
        } else {
            closeChatWindow();
        }
    });

    closeBtn.addEventListener('click', closeChatWindow);

    const sendMessage = async (providedText) => {
        const text = (typeof providedText === 'string' ? providedText : input.value).trim();
        if (!text) return;

        stopRecognition();
        appendMessage('user', text);
        input.value = '';
        input.style.height = 'auto';
        setStatus('');

        clearPendingReply();
        activeTypingId = 'typing-' + Date.now();
        appendTypingIndicator(activeTypingId);

        chatHistory.push({ role: "user", content: text });

        try {
            activeRequestController = new AbortController();
            const response = await fetch('/api/ai-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: chatHistory }),
                signal: activeRequestController.signal
            });
            const data = await response.json();
            activeRequestController = null;
            
            if (data && data.reply) {
              chatHistory.push({ role: "assistant", content: data.reply });
              removeTyping();
              appendMessage('assistant', data.reply);
              if (speechEnabled) {
                window.speakText(data.reply, detectReplyLang(data.reply));
              }
            } else {
              throw new Error(data.error || "Invalid AI response");
            }
        } catch (error) {
            activeRequestController = null;
            if (error.name === 'AbortError') {
                removeTyping();
                return;
            }
            console.error(error);
            removeTyping();
            appendMessage('assistant', "Кешіріңіз, байланыс қатесі орын алды. Извините, произошла ошибка сети.");
            chatHistory.pop();
        }
    };

    sendBtn.addEventListener('click', () => sendMessage());
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    if (speechToggleBtn) {
        updateSpeechToggle();
        speechToggleBtn.addEventListener('click', () => {
            speechEnabled = !speechEnabled;
            updateSpeechToggle();
            if (!speechEnabled) {
                stopAssistantSpeech();
            }
        });
    }

    if (recognition && micBtn) {
        recognition.onstart = () => {
            isListening = true;
            micBtn.classList.add('listening');
            micBtn.textContent = '⏹';
            setStatus('Тыңдап тұрмын...');
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
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 120) + 'px';

            if (finalText.trim()) {
                stopRecognition();
                setStatus('');
                sendMessage(finalText.trim());
            } else if (interimText.trim()) {
                setStatus(`Тыңдап тұрмын: ${interimText.trim()}`);
            }
        };

        recognition.onerror = (event) => {
            stopRecognition();
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                setStatus('Микрофонға рұқсат беріңіз.');
            } else if (event.error === 'no-speech') {
                setStatus('Дауыс естілмеді.');
            } else {
                setStatus('Микрофон қатесі: ' + event.error);
            }
        };

        recognition.onend = () => {
            stopRecognition();
        };

        micBtn.addEventListener('click', () => {
            if (isListening) {
                stopRecognition();
                setStatus('');
                return;
            }

            input.value = '';
            input.style.height = 'auto';
            setStatus('Күтілуде...');
            try {
                recognition.start();
            } catch (error) {
                console.warn('Recognition start failed', error);
                setStatus('Микрофон бос емес.');
            }
        });
    } else if (micBtn) {
        micBtn.disabled = true;
        micBtn.title = 'STT бұл браузерде қолжетімсіз';
    }

    function appendMessage(role, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `ai-message ai-${role}`;

        const textDiv = document.createElement('div');
        textDiv.className = 'ai-message-text';
        textDiv.innerText = text;
        msgDiv.appendChild(textDiv);

        if (role === 'assistant') {
            const actionBtn = document.createElement('button');
            actionBtn.className = 'ai-message-audio-btn';
            actionBtn.type = 'button';
            actionBtn.textContent = '🔊';
            actionBtn.title = 'Қайта тыңдау';
            actionBtn.addEventListener('click', () => {
                if (speechEnabled) {
                    window.speakText(text, detectReplyLang(text));
                }
            });
            msgDiv.appendChild(actionBtn);
        }

        messagesContainer.appendChild(msgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function appendTypingIndicator(id) {
        const wrap = document.createElement('div');
        wrap.id = id;
        wrap.className = 'ai-message ai-assistant ai-typing';
        wrap.innerHTML = `<span class="dot"></span><span class="dot"></span><span class="dot"></span>`;
        messagesContainer.appendChild(wrap);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    function removeElement(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }
}

function initAIAssistantV2() {
    const toggleBtn = document.getElementById('aiChatToggle');
    const closeBtn = document.getElementById('aiChatClose');
    const chatWindow = document.getElementById('aiChatWindow');
    const inputArea = document.querySelector('#aiChatWindow .ai-chat-input-area');
    const sendBtn = document.getElementById('aiChatSend');
    const micBtn = document.getElementById('aiChatMic');
    const input = document.getElementById('aiChatInput');
    const messagesContainer = document.getElementById('aiChatMessages');
    const statusEl = document.getElementById('aiChatStatus');
    const speechToggleBtn = document.getElementById('aiChatSpeechToggle');
    const SpeechRecognitionObj = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (inputArea && !document.getElementById('aiChatEnableVoice')) {
        const voiceBar = document.createElement('div');
        voiceBar.className = 'ai-chat-voice-bar';
        voiceBar.innerHTML = `
          <button id="aiChatEnableVoice" class="ai-chat-voice-toggle" type="button">🔈 Включить голос</button>
          <button id="aiChatReplay" class="ai-chat-voice-secondary" type="button" disabled>↻ Повторить</button>
        `;

        const voicePrompt = document.createElement('div');
        voicePrompt.id = 'aiChatVoicePrompt';
        voicePrompt.className = 'ai-chat-voice-prompt hidden';
        voicePrompt.innerHTML = `
          <button id="aiChatUnlockVoice" class="ai-chat-voice-unlock" type="button">
            Нажмите, чтобы включить звук
          </button>
        `;

        const voiceSettings = document.createElement('div');
        voiceSettings.className = 'ai-chat-voice-settings';
        voiceSettings.innerHTML = `
          <label class="ai-chat-voice-setting">
            <span>Жылдамдық</span>
            <input id="aiChatVoiceRate" type="range" min="0.85" max="1.15" step="0.05" value="1">
          </label>
          <label class="ai-chat-voice-setting">
            <span>Дыбыс</span>
            <input id="aiChatVoiceVolume" type="range" min="0" max="1" step="0.05" value="1">
          </label>
        `;

        inputArea.parentNode.insertBefore(voiceBar, inputArea);
        inputArea.parentNode.insertBefore(voicePrompt, inputArea);
        inputArea.parentNode.insertBefore(voiceSettings, inputArea);
    }

    const enableVoiceBtn = document.getElementById('aiChatEnableVoice');
    const replayBtn = document.getElementById('aiChatReplay');
    const unlockVoiceBtn = document.getElementById('aiChatUnlockVoice');
    const voicePromptEl = document.getElementById('aiChatVoicePrompt');
    const voiceRateInput = document.getElementById('aiChatVoiceRate');
    const voiceVolumeInput = document.getElementById('aiChatVoiceVolume');

    let recognition = null;
    let isListening = false;
    let speechEnabled = false;
    let activeRequestController = null;
    let activeTypingId = null;
    let lastAssistantReply = '';

    if (SpeechRecognitionObj) {
        recognition = new SpeechRecognitionObj();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = (document.documentElement.lang || 'kk').toLowerCase().startsWith('ru') ? 'ru-RU' : 'kk-KZ';
    }

    function setStatus(text) {
        if (statusEl) {
            statusEl.innerText = text || '';
        }
    }

    function setVoicePromptVisible(isVisible) {
        if (voicePromptEl) {
            voicePromptEl.classList.toggle('hidden', !isVisible);
        }
    }

    function detectReplyLang(text) {
        if (/[ӘәІіҢңҒғҮүҰұҚқӨөҺһ]/.test(text)) {
            return 'kk-KZ';
        }

        return /[А-Яа-яЁё]/.test(text) ? 'ru-RU' : 'kk-KZ';
    }

    const chatbotTTS = (() => {
        const audio = new Audio();
        audio.preload = 'auto';

        let activeObjectUrl = '';
        let lastText = '';
        let lastLang = 'kk-KZ';
        let playbackPrimed = false;
        let rate = 1;
        let volume = 1;

        function revokeAudioUrl() {
            if (activeObjectUrl) {
                URL.revokeObjectURL(activeObjectUrl);
                activeObjectUrl = '';
            }
        }

        function syncAudioSettings() {
            audio.playbackRate = rate;
            audio.volume = volume;
        }

        async function primePlayback() {
            if (playbackPrimed) {
                return true;
            }

            const previousSrc = audio.src;
            audio.muted = true;
            audio.src = CHATBOT_TTS_SILENT_WAV;

            try {
                await audio.play();
                playbackPrimed = true;
            } catch (error) {
                console.warn('Unable to prime chatbot TTS playback:', error);
            }

            try {
                audio.pause();
                audio.currentTime = 0;
            } catch (error) {
                console.warn('Unable to reset chatbot TTS primer:', error);
            }

            audio.muted = false;
            if (previousSrc && previousSrc !== CHATBOT_TTS_SILENT_WAV) {
                audio.src = previousSrc;
            } else {
                audio.removeAttribute('src');
            }
            syncAudioSettings();

            return playbackPrimed;
        }

        async function requestSpeechAudio(text, lang) {
            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, lang })
            });

            if (!response.ok) {
                let details = '';
                try {
                    const payload = await response.json();
                    details = [payload?.error, payload?.details].filter(Boolean).join(' ');
                } catch (error) {
                    details = '';
                }

                throw new Error(details || `TTS request failed with status ${response.status}`);
            }

            const audioBlob = await response.blob();
            revokeAudioUrl();
            activeObjectUrl = URL.createObjectURL(audioBlob);
            audio.src = activeObjectUrl;
            syncAudioSettings();
        }

        async function playCurrentAudio(showPromptOnBlock = true) {
            syncAudioSettings();

            try {
                await audio.play();
                if (showPromptOnBlock) {
                    setVoicePromptVisible(false);
                }
                return { ok: true };
            } catch (error) {
                if (showPromptOnBlock) {
                    setVoicePromptVisible(true);
                }
                return { ok: false, blocked: true, error };
            }
        }

        async function speakText(text, lang = 'kk-KZ', options = {}) {
            const { showPromptOnBlock = true, onReady = null } = options;
            if (!text) {
                return { ok: false, reason: 'empty' };
            }

            lastText = text;
            lastLang = lang;
            await requestSpeechAudio(text, lang);
            if (typeof onReady === 'function') {
                await onReady();
            }
            return playCurrentAudio(showPromptOnBlock);
        }

        async function replayLast(showPromptOnBlock = true) {
            if (!lastText) {
                return { ok: false, reason: 'empty' };
            }

            if (!audio.src) {
                await requestSpeechAudio(lastText, lastLang);
            }

            try {
                audio.currentTime = 0;
            } catch (error) {
                console.warn('Unable to rewind chatbot TTS audio:', error);
            }

            return playCurrentAudio(showPromptOnBlock);
        }

        async function retryAutoplay() {
            await primePlayback();
            return replayLast(true);
        }

        function stop() {
            try {
                audio.pause();
                audio.currentTime = 0;
            } catch (error) {
                console.warn('Unable to stop chatbot TTS audio:', error);
            }
        }

        function setRate(nextRate) {
            rate = Number(nextRate) || 1;
            syncAudioSettings();
        }

        function setVolume(nextVolume) {
            volume = Number(nextVolume);
            syncAudioSettings();
        }

        function hasReplay() {
            return Boolean(lastText);
        }

        return {
            enablePlayback: primePlayback,
            speakText,
            replayLast,
            retryAutoplay,
            stop,
            setRate,
            setVolume,
            hasReplay
        };
    })();

    window.chatbotTTS = chatbotTTS;

    function stopAssistantSpeech() {
        chatbotTTS.stop();
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }

    function updateReplayButton() {
        if (replayBtn) {
            replayBtn.disabled = !lastAssistantReply;
        }
    }

    function updateSpeechToggle() {
        if (speechToggleBtn) {
            speechToggleBtn.textContent = speechEnabled ? '🔊' : '🔈';
            speechToggleBtn.classList.toggle('muted', !speechEnabled);
        }

        if (enableVoiceBtn) {
            enableVoiceBtn.textContent = speechEnabled ? '🔊 Озвучка: Вкл' : '🔈 Включить голос';
            enableVoiceBtn.classList.toggle('is-active', speechEnabled);
        }

        updateReplayButton();
    }

    async function playAssistantReply(text, options = {}) {
        try {
            const result = await chatbotTTS.speakText(text, detectReplyLang(text), options);
            updateReplayButton();

            if (!result.ok && result.blocked) {
                setStatus('Автоозвучка бұғатталды. Төмендегі батырманы басыңыз.');
            }

            return result;
        } catch (error) {
            console.error('Chatbot TTS failed:', error);
            setVoicePromptVisible(false);
            setStatus('TTS сервисі қолжетімсіз. /api/tts функциясын тексеріңіз.');
            const errorText = String(error?.message || '');
            const isWarmupIssue = /warming|Application failed to respond|tts_model_warming_up|status 502|status 503/i.test(errorText);
            if (isWarmupIssue) {
                setStatus('Озвучка прогревается. Попробуйте ещё раз через 2-3 секунды.');
            }
            return { ok: false, error };
        }
    }

    async function toggleSpeechEnabled() {
        speechEnabled = !speechEnabled;
        updateSpeechToggle();

        if (!speechEnabled) {
            stopAssistantSpeech();
            setVoicePromptVisible(false);
            setStatus('Озвучка өшірулі.');
            return;
        }

        await chatbotTTS.enablePlayback();
        setStatus('Озвучка қосулы. Жаңа жауаптар автоматты түрде ойнатылады.');
        if (chatbotTTS.hasReplay()) {
            await chatbotTTS.retryAutoplay();
        } else if (lastAssistantReply) {
            await playAssistantReply(lastAssistantReply, { showPromptOnBlock: true });
        }
    }

    function removeTyping() {
        if (activeTypingId) {
            removeElement(activeTypingId);
            activeTypingId = null;
        }
    }

    function stopRecognition() {
        if (recognition && isListening) {
            try {
                recognition.stop();
            } catch (error) {
                console.warn('Failed to stop chat recognition', error);
            }
        }

        isListening = false;
        if (micBtn) {
            micBtn.classList.remove('listening');
            micBtn.textContent = '🎤';
        }
    }

    function clearPendingReply() {
        if (activeRequestController) {
            activeRequestController.abort();
            activeRequestController = null;
        }
        removeTyping();
    }

    window.chatbotControls = {
        stopRecognition,
        clearPendingReply
    };

    function closeChatWindow() {
        chatWindow.classList.add('hidden');
        toggleBtn.style.transform = 'scale(1)';
        toggleBtn.style.opacity = '1';
        clearPendingReply();
        stopRecognition();
        stopAssistantSpeech();
        setVoicePromptVisible(false);
        setStatus('');
    }

    toggleBtn.addEventListener('click', () => {
        chatWindow.classList.toggle('hidden');
        if (!chatWindow.classList.contains('hidden')) {
            toggleBtn.style.transform = 'scale(0.8)';
            toggleBtn.style.opacity = '0';
            input.focus();
        } else {
            closeChatWindow();
        }
    });

    closeBtn.addEventListener('click', closeChatWindow);

    if (speechToggleBtn) {
        speechToggleBtn.addEventListener('click', toggleSpeechEnabled);
    }

    if (enableVoiceBtn) {
        enableVoiceBtn.addEventListener('click', toggleSpeechEnabled);
    }

    if (replayBtn) {
        replayBtn.addEventListener('click', async () => {
            if (!lastAssistantReply) {
                return;
            }
            if (chatbotTTS.hasReplay()) {
                await chatbotTTS.replayLast(true);
                return;
            }
            await playAssistantReply(lastAssistantReply, { showPromptOnBlock: true });
        });
    }

    if (unlockVoiceBtn) {
        unlockVoiceBtn.addEventListener('click', async () => {
            const result = await chatbotTTS.retryAutoplay();
            if (result.ok) {
                setStatus('Дыбыс қосылды.');
            } else {
                setStatus('Дыбысты қосу үшін батырманы қайта басыңыз.');
            }
        });
    }

    if (voiceRateInput) {
        chatbotTTS.setRate(voiceRateInput.value);
        voiceRateInput.addEventListener('input', () => {
            chatbotTTS.setRate(voiceRateInput.value);
        });
    }

    if (voiceVolumeInput) {
        chatbotTTS.setVolume(voiceVolumeInput.value);
        voiceVolumeInput.addEventListener('input', () => {
            chatbotTTS.setVolume(voiceVolumeInput.value);
        });
    }

    const sendMessage = async (providedText) => {
        const text = (typeof providedText === 'string' ? providedText : input.value).trim();
        if (!text) return;

        stopRecognition();
        appendMessage('user', text);
        input.value = '';
        input.style.height = 'auto';
        setStatus('');

        clearPendingReply();
        activeTypingId = 'typing-' + Date.now();
        appendTypingIndicator(activeTypingId);

        chatHistory.push({ role: 'user', content: text });

        try {
            activeRequestController = new AbortController();
            const response = await fetch('/api/ai-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: chatHistory }),
                signal: activeRequestController.signal
            });
            const data = await response.json();
            activeRequestController = null;

            if (data && data.reply) {
                lastAssistantReply = data.reply;
                chatHistory.push({ role: 'assistant', content: data.reply });
                if (speechEnabled) {
                    let replyShown = false;
                    const revealReply = async () => {
                        if (replyShown) {
                            return;
                        }
                        replyShown = true;
                        removeTyping();
                        appendMessage('assistant', data.reply);
                    };

                    setStatus('Готовим озвучку...');
                    const result = await playAssistantReply(data.reply, {
                        showPromptOnBlock: true,
                        onReady: revealReply
                    });

                    if (!replyShown) {
                        await revealReply();
                    }

                    if (result?.ok) {
                        setStatus('');
                    }
                }
                else {
                    removeTyping();
                    appendMessage('assistant', data.reply);
                }
            } else {
                throw new Error(data.error || 'Invalid AI response');
            }
        } catch (error) {
            activeRequestController = null;
            if (error.name === 'AbortError') {
                removeTyping();
                return;
            }

            console.error(error);
            removeTyping();
            appendMessage('assistant', 'Кешіріңіз, байланыс қатесі орын алды. Извините, произошла ошибка сети.');
            chatHistory.pop();
        }
    };

    sendBtn.addEventListener('click', () => sendMessage());
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    updateSpeechToggle();

    if (recognition && micBtn) {
        recognition.onstart = () => {
            isListening = true;
            micBtn.classList.add('listening');
            micBtn.textContent = '⏹';
            setStatus('Тыңдап тұрмын...');
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
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 120) + 'px';

            if (finalText.trim()) {
                stopRecognition();
                setStatus('');
                sendMessage(finalText.trim());
            } else if (interimText.trim()) {
                setStatus(`Тыңдап тұрмын: ${interimText.trim()}`);
            }
        };

        recognition.onerror = (event) => {
            stopRecognition();
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                setStatus('Микрофонға рұқсат беріңіз.');
            } else if (event.error === 'no-speech') {
                setStatus('Дауыс естілмеді.');
            } else {
                setStatus('Микрофон қатесі: ' + event.error);
            }
        };

        recognition.onend = () => {
            stopRecognition();
        };

        micBtn.addEventListener('click', () => {
            if (isListening) {
                stopRecognition();
                setStatus('');
                return;
            }

            input.value = '';
            input.style.height = 'auto';
            setStatus('Күтілуде...');
            try {
                recognition.start();
            } catch (error) {
                console.warn('Recognition start failed', error);
                setStatus('Микрофон бос емес.');
            }
        });
    } else if (micBtn) {
        micBtn.disabled = true;
        micBtn.title = 'STT бұл браузерде қолжетімсіз';
    }

    function appendMessage(role, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `ai-message ai-${role}`;

        const textDiv = document.createElement('div');
        textDiv.className = 'ai-message-text';
        textDiv.innerText = text;
        msgDiv.appendChild(textDiv);

        if (role === 'assistant') {
            const actionBtn = document.createElement('button');
            actionBtn.className = 'ai-message-audio-btn';
            actionBtn.type = 'button';
            actionBtn.textContent = '🔊';
            actionBtn.title = 'Қайта тыңдау';
            actionBtn.addEventListener('click', async () => {
                lastAssistantReply = text;
                updateReplayButton();
                await playAssistantReply(text, { showPromptOnBlock: true });
            });
            msgDiv.appendChild(actionBtn);
        }

        messagesContainer.appendChild(msgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        updateReplayButton();
    }

    function appendTypingIndicator(id) {
        const wrap = document.createElement('div');
        wrap.id = id;
        wrap.className = 'ai-message ai-assistant ai-typing';
        wrap.innerHTML = `<span class="dot"></span><span class="dot"></span><span class="dot"></span>`;
        messagesContainer.appendChild(wrap);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function removeElement(id) {
        const el = document.getElementById(id);
        if (el) {
            el.remove();
        }
    }
}

// Speech Assessment Logic
const practiceWords = [
    { word: "Раушан", hint: "'Р' дыбысы" },
    { word: "Шаш", hint: "'Ш' дыбысы" },
    { word: "Құлын", hint: "Қатаң 'Қ'" },
    { word: "Ғарыш", hint: "Ұяң 'Ғ'" },
    { word: "Өлең", hint: "Жіңішке 'Ө'" },
    { word: "Ракета", hint: "Звук 'Р'" },
    { word: "Шишка", hint: "Звук 'Ш'" }
];
let currentWordIndex = 0;

function initSpeechAssessment() {
    const toggleBtn = document.getElementById('aiSpeechToggle');
    const closeBtn = document.getElementById('aiSpeechClose');
    const windowEl = document.getElementById('aiSpeechWindow');
    const targetWordEl = document.getElementById('aiSpeechTargetWord');
    const hintEl = document.getElementById('aiSpeechHint');
    const micBtn = document.getElementById('aiSpeechMicBtn');
    const statusEl = document.getElementById('aiSpeechStatus');
    const resultEl = document.getElementById('aiSpeechResult');
    const scoreEl = document.getElementById('aiSpeechScore');
    const feedbackEl = document.getElementById('aiSpeechFeedback');
    const retryBtn = document.getElementById('aiSpeechRetryBtn');
    const nextBtn = document.getElementById('aiSpeechNextBtn');

    let recognition = null;
    let isListening = false;

    if (window.SpeechRecognition || window.webkitSpeechRecognition) {
        const SpeechRecognitionObj = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognitionObj();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'kk-KZ'; // Can toggle based on word later
    }

    const updateUI = () => {
        targetWordEl.innerText = practiceWords[currentWordIndex].word;
        hintEl.innerText = "💡 " + practiceWords[currentWordIndex].hint;
        resultEl.classList.add('hidden');
        statusEl.innerText = "Басып, сөйлеңіз / Нажмите и говорите";
        micBtn.classList.remove('listening');
    };

    toggleBtn.addEventListener('click', () => {
        windowEl.classList.toggle('hidden');
        if (!windowEl.classList.contains('hidden')) {
            toggleBtn.style.transform = "scale(0.8)";
            toggleBtn.style.opacity = "0";
            updateUI();
        } else {
            toggleBtn.style.transform = "scale(1)";
            toggleBtn.style.opacity = "1";
            if (isListening && recognition) recognition.stop();
        }
    });

    closeBtn.addEventListener('click', () => {
        windowEl.classList.add('hidden');
        toggleBtn.style.transform = "scale(1)";
        toggleBtn.style.opacity = "1";
        if (isListening && recognition) recognition.stop();
    });

    nextBtn.addEventListener('click', () => {
        currentWordIndex = (currentWordIndex + 1) % practiceWords.length;
        updateUI();
    });

    retryBtn.addEventListener('click', () => {
        updateUI();
    });

    if (recognition) {
        recognition.onstart = () => {
            isListening = true;
            micBtn.classList.add('listening');
            statusEl.innerText = "Тыңдап тұрмын... (Слушаю...)";
        };

        recognition.onresult = (event) => {
            const spoken = event.results[0][0].transcript;
            statusEl.innerText = `Сіз айттыңыз (Вы сказали): "${spoken}"`;
            isListening = false;
            micBtn.classList.remove('listening');
            evaluateSpeech(spoken, practiceWords[currentWordIndex].word);
        };

        recognition.onerror = (event) => {
            isListening = false;
            micBtn.classList.remove('listening');
            if (event.error === 'not-allowed') {
                statusEl.innerText = "Микрофонға рұқсат (разрешение) берілмеген!";
            } else if (event.error === 'no-speech') {
                statusEl.innerText = "Ешнәрсе естілмеді.";
            } else {
                statusEl.innerText = "Қате орын алды: " + event.error;
            }
        };

        recognition.onend = () => {
            isListening = false;
            micBtn.classList.remove('listening');
        };

        micBtn.addEventListener('click', () => {
            if (isListening) {
                recognition.stop();
            } else {
                // Adjust lang if russian word
                const word = practiceWords[currentWordIndex].word;
                if (/[а-яА-ЯёЁ]/.test(word) && !/[қғңұүіөәҚҒҢҰҮІӨӘ]/.test(word)) {
                   // Crude check if it's russian
                   recognition.lang = 'ru-RU';
                } else {
                   recognition.lang = 'kk-KZ';
                }
                
                resultEl.classList.add('hidden');
                try {
                    isListening = true;
                    micBtn.classList.add('listening');
                    statusEl.innerText = "Күтілуде... (Ожидание...)";
                    recognition.start();
                } catch (e) {
                    console.warn("Ignored InvalidStateError: ", e);
                }
            }
        });
    } else {
        micBtn.addEventListener('click', () => {
            alert("Браузер сөйлеуді тануды қолдамайды. (We API isn't supported)");
        });
    }

    async function evaluateSpeech(spoken, target) {
        statusEl.innerText = "ИИ талдауда... (ИИ анализирует...)";
        resultEl.classList.remove('hidden');
        scoreEl.innerText = "...";
        scoreEl.className = "ai-speech-score";
        feedbackEl.innerText = "Күте тұрыңыз... (Подождите...)";

        try {
            const result = await window.getAIEvaluation(target, spoken);
            
            scoreEl.innerText = result.score + "%";
            feedbackEl.innerText = result.feedback;
            
            if (result.score >= 90) {
                scoreEl.className = "ai-speech-score excellent";
                triggerConfetti();
            } else if (result.score >= 70) {
                scoreEl.className = "ai-speech-score good";
            } else {
                scoreEl.className = "ai-speech-score poor";
            }
            
            statusEl.innerText = `Сіз айттыңыз (Вы сказали): "${spoken}"`;
            
            // Speak Feedback
            const isRussian = /[а-яА-ЯёЁ]/.test(target) && !/[қғңұүіөәҚҒҢҰҮІӨӘӘҚҒҢҰҮІӨ]/.test(target);
            const lang = isRussian ? 'ru-RU' : 'kk-KZ';
            window.speakText(result.feedback, lang);

        } catch (err) {
            console.error(err);
            statusEl.innerText = "Қате орын алды (Ошибка ИИ). Жерорта бағаланады.";
            
            // Fallback evaluation
            const normSpoken = spoken.toLowerCase().replace(/[.,!?]/g, '').trim();
            const normTarget = target.toLowerCase().trim();
            
            let score = 0;
            if (normSpoken === normTarget) {
                score = 100;
            } else if (normSpoken.includes(normTarget) || normTarget.includes(normSpoken)) {
                score = 80;
            } else {
                let matches = 0;
                const targetChars = normTarget.split('');
                normSpoken.split('').forEach(c => {
                    if (targetChars.includes(c)) matches++;
                });
                score = Math.min(Math.round((matches / targetChars.length) * 100), 70);
            }

            scoreEl.innerText = score + "%";
            if (score >= 90) {
                scoreEl.className = "ai-speech-score excellent";
                feedbackEl.innerText = "Керемет! 🚀 (Отлично!)";
                triggerConfetti();
            } else if (score >= 70) {
                scoreEl.className = "ai-speech-score good";
                feedbackEl.innerText = "Жақсы, анығырақ! 👍 (Хорошо!)";
            } else {
                scoreEl.className = "ai-speech-score poor";
                feedbackEl.innerText = "Тағы бір рет көріңіз! 💪 (Еще раз!)";
            }
        }
    }
}

function triggerConfetti() {
    if (window.playSuccess) {
        window.playSuccess();
    }
}

// Global Helpers for AI Evaluation & TTS
window.getAIEvaluation = async function(target, spoken) {
    const response = await fetch('/api/ai-evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, spoken })
    });

    const data = await response.json();
    if (data && typeof data.score === 'number') {
        return data;
    } else {
        throw new Error(data.error || "Invalid AI evaluation response");
    }
};

window.speakText = function(text, lang = 'kk-KZ') {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        // make it slightly slower and higher pitch for kids
        utterance.rate = 0.9;
        utterance.pitch = 1.1;
        window.speechSynthesis.speak(utterance);
    }
};
