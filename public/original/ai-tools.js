/* ai-tools.js — All AI calls go through secure /api/ proxy */

let chatHistory = [
  { role: "system", content: "You are a friendly and professional AI Speech Therapist assistant for an inclusive app for kids with hearing and speech impairments. Speak in Kazakh or Russian depending on the language the user uses. Keep answers brief (max 3 sentences), encouraging, and helpful. Use simple words." }
];

const CHATBOT_TTS_SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAAA=";
const CHATBOT_TTS_REQUEST_TIMEOUT_MS = 2000;
const CHATBOT_TTS_FIRST_CHUNK_TIMEOUT_MS = 3500;
const CHATBOT_TTS_DEFAULT_WS_URL =
  typeof window !== 'undefined' && window.location?.protocol === 'https:'
    ? 'wss://localhost:3443/tts-stream'
    : 'ws://127.0.0.1:3001/tts-stream';

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
        <div class="ai-speech-target" id="aiSpeechTargetWord">Әке</div>
        <div class="ai-speech-hint" id="aiSpeechHint">💡 Ә дыбысы бар сөз</div>
        
        <button id="aiSpeechMicBtn" class="ai-speech-mic-btn">Начать запись</button>
        <p id="aiSpeechStatus" class="ai-speech-status">Нажмите и произнесите слово</p>
        
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

    async function playAssistantReply(text, options = {}) {
        try {
            const result = await chatbotTTS.speakText(text, detectReplyLang(text), options);
            updateReplayButton();

            if (!result.ok && result.reason === 'unsupported') {
                setVoicePromptVisible(false);
                setStatus('Бұл браузерде дыбысты ойнату қолжетімсіз.');
            } else if (!result.ok && result.reason === 'timeout') {
                setVoicePromptVisible(false);
                setStatus('Yandex SpeechKit дыбысты тым ұзақ дайындады. Мәтін дыбыссыз көрсетілді.');
            } else if (!result.ok && result.reason === 'empty_audio') {
                setVoicePromptVisible(false);
                setStatus('Yandex SpeechKit аудионы қайтара алмады.');
            } else if (!result.ok) {
                setVoicePromptVisible(false);
                setStatus('Yandex SpeechKit озвучкасын іске қосу мүмкін болмады.');
            }

            return result;
        } catch (error) {
            console.error('Chatbot TTS failed:', error);
            setVoicePromptVisible(false);
            if (String(error?.message || '').includes('HTTPS page cannot connect to insecure ws://')) {
                setStatus('HTTPS бетінде жергілікті ws:// bridge ашылмайды. Қауіпсіз wss:// bridge URL орнатыңыз.');
            } else if (String(error?.message || '').includes('Unable to connect to Yandex TTS bridge')) {
                setStatus('Yandex TTS bridge табылмады. Локалды серверді іске қосыңыз.');
            } else {
                setStatus('Yandex SpeechKit озвучкасын іске қосу мүмкін болмады.');
            }
            return { ok: false, error };
        }
    }

    async function toggleSpeechEnabled() {
        speechEnabled = !speechEnabled;
        updateSpeechToggle();

        const replayExistingAudio = async () => {
            if (!chatbotTTS.hasLoadedAudio()) {
                return false;
            }

            const replayResult = await chatbotTTS.retryAutoplay().catch((error) => ({ ok: false, error }));
            return Boolean(replayResult?.ok);
        };

        if (!speechEnabled) {
            stopAssistantSpeech();
            setVoicePromptVisible(false);
            setStatus('Озвучка өшірілді.');
            return;
        }

        const playbackReady = await chatbotTTS.enablePlayback();
        if (!playbackReady) {
            speechEnabled = false;
            updateSpeechToggle();
            setStatus('Бұл браузерде дыбысты ойнату қолжетімсіз.');
            return;
        }

        setStatus('Озвучка қосулы. Жауаптар Yandex SpeechKit арқылы ағынмен оқылады.');
        if (await replayExistingAudio()) {
            setStatus('');
            return;
        }

        if (lastAssistantReply) {
            setStatus('Озвучка қосулы. Келесі жауап автоматты түрде оқылады.');
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
                setStatus('Озвучка не успела подготовиться за 2 секунды. Текст показан без звука.');
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
        let audioCtx = null;
        let gainNode = null;
        let ws = null;
        let wsUrl = '';
        let lastText = '';
        let lastLang = 'kk-KZ';
        let rate = 1;
        let volume = 1;
        let queue = [];
        let playing = false;
        let nextStartTime = 0;
        let activeSources = new Set();
        let acceptAudio = false;
        let readyResolved = false;
        let readyResolver = null;
        let readyRejector = null;
        let doneResolver = null;
        let doneRejector = null;
        let revealReplyCallback = null;

        function getConfiguredWsUrl() {
            const runtimeUrl = typeof window.__AI_TTS_WS_URL === 'string'
                ? window.__AI_TTS_WS_URL.trim()
                : '';

            let storedUrl = '';
            try {
                storedUrl = (window.localStorage.getItem('aiChatTtsWsUrl') || '').trim();
            } catch (error) {
                storedUrl = '';
            }

            const resolvedUrl = runtimeUrl || storedUrl || CHATBOT_TTS_DEFAULT_WS_URL;
            if (window.location.protocol === 'https:' && resolvedUrl.startsWith('ws://')) {
                return 'wss://localhost:3443/tts-stream';
            }

            return resolvedUrl;
        }

        function ensureAudioContext() {
            if (!audioCtx) {
                const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
                if (!AudioContextCtor) {
                    return null;
                }

                audioCtx = new AudioContextCtor({ sampleRate: 22050 });
                gainNode = audioCtx.createGain();
                gainNode.gain.value = volume;
                gainNode.connect(audioCtx.destination);
            }

            return audioCtx;
        }

        function createDeferred() {
            const deferred = {};
            deferred.promise = new Promise((resolve, reject) => {
                deferred.resolve = resolve;
                deferred.reject = reject;
            });
            return deferred;
        }

        function resetDeferreds() {
            readyResolved = false;
            readyResolver = null;
            readyRejector = null;
            doneResolver = null;
            doneRejector = null;
        }

        function syncOutputSettings() {
            if (gainNode) {
                gainNode.gain.value = volume;
            }
        }

        function pcm16ToFloat32(arrayBuffer) {
            const view = new DataView(arrayBuffer);
            const out = new Float32Array(arrayBuffer.byteLength / 2);

            for (let i = 0; i < out.length; i += 1) {
                out[i] = view.getInt16(i * 2, true) / 32768;
            }

            return out;
        }

        function stopActiveSources() {
            activeSources.forEach((source) => {
                try {
                    source.stop();
                } catch (error) {
                    console.warn('Unable to stop TTS source:', error);
                }
            });
            activeSources.clear();
        }

        function resetQueue() {
            queue = [];
            playing = false;
            stopActiveSources();
            if (audioCtx) {
                nextStartTime = audioCtx.currentTime + 0.03;
            } else {
                nextStartTime = 0;
            }
        }

        function resolveReadyOnce(result) {
            if (readyResolved || !readyResolver) {
                return;
            }

            readyResolved = true;
            readyResolver(result);
            readyResolver = null;
            readyRejector = null;

            if (typeof revealReplyCallback === 'function') {
                Promise.resolve(revealReplyCallback()).catch((error) => {
                    console.warn('Unable to reveal chatbot reply on first audio chunk:', error);
                });
            }
            revealReplyCallback = null;
        }

        function rejectReadyOnce(error) {
            if (readyResolved || !readyRejector) {
                return;
            }

            readyResolved = true;
            readyRejector(error);
            readyResolver = null;
            readyRejector = null;
            revealReplyCallback = null;
        }

        function scheduleChunk(arrayBuffer) {
            if (!audioCtx || !gainNode) {
                return;
            }

            const float32 = pcm16ToFloat32(arrayBuffer);
            const buffer = audioCtx.createBuffer(1, float32.length, 22050);
            buffer.copyToChannel(float32, 0);

            const source = audioCtx.createBufferSource();
            source.buffer = buffer;
            source.playbackRate.value = rate;
            source.connect(gainNode);
            activeSources.add(source);
            source.onended = () => activeSources.delete(source);

            const startAt = Math.max(audioCtx.currentTime + 0.03, nextStartTime);
            source.start(startAt);
            nextStartTime = startAt + (buffer.duration / Math.max(rate, 0.01));
        }

        function playNext() {
            if (queue.length === 0) {
                playing = false;
                return;
            }

            playing = true;
            while (queue.length > 0) {
                scheduleChunk(queue.shift());
            }
            playing = false;
        }

        function enqueueAudioChunk(arrayBuffer) {
            if (!acceptAudio) {
                return;
            }

            queue.push(arrayBuffer);
            resolveReadyOnce({ ok: true });

            if (!playing) {
                playNext();
            }
        }

        async function connectSocket() {
            const configuredUrl = getConfiguredWsUrl();
            if (!configuredUrl) {
                throw new Error('TTS bridge URL is empty.');
            }

            if (window.location.protocol === 'https:' && configuredUrl.startsWith('ws://')) {
                throw new Error('HTTPS page cannot connect to insecure ws:// bridge. Set window.__AI_TTS_WS_URL to a secure wss:// bridge URL.');
            }

            if (ws && ws.readyState === WebSocket.OPEN && wsUrl === configuredUrl) {
                return ws;
            }

            if (ws) {
                try {
                    ws.close();
                } catch (error) {
                    console.warn('Unable to close previous TTS socket:', error);
                }
                ws = null;
            }

            wsUrl = configuredUrl;
            ws = new WebSocket(configuredUrl);
            ws.binaryType = 'arraybuffer';

            await new Promise((resolve, reject) => {
                ws.onopen = resolve;
                ws.onerror = () => reject(new Error(`Unable to connect to Yandex TTS bridge: ${configuredUrl}`));
            });

            ws.onmessage = (event) => {
                if (typeof event.data !== 'string') {
                    enqueueAudioChunk(event.data);
                    return;
                }

                try {
                    const msg = JSON.parse(event.data);

                    if (msg.type === 'done') {
                        acceptAudio = false;
                        if (!readyResolved) {
                            resolveReadyOnce({ ok: false, reason: 'empty_audio' });
                        }
                        if (doneResolver) {
                            doneResolver({ ok: true });
                            doneResolver = null;
                            doneRejector = null;
                        }
                        return;
                    }

                    if (msg.type === 'error') {
                        const error = new Error(msg.message || 'Yandex TTS bridge error');
                        error.stack = msg.stack || error.stack;
                        rejectReadyOnce(error);
                        if (doneRejector) {
                            doneRejector(error);
                            doneResolver = null;
                            doneRejector = null;
                        }
                    }
                } catch (error) {
                    console.warn('Unable to parse TTS bridge message:', error);
                }
            };

            ws.onerror = () => {
                if (acceptAudio && !readyResolved) {
                    rejectReadyOnce(new Error(`Yandex TTS bridge connection failed: ${configuredUrl}`));
                }
            };

            ws.onclose = () => {
                const closedBeforeAudio = acceptAudio && !readyResolved;
                acceptAudio = false;
                ws = null;
                if (closedBeforeAudio) {
                    const error = new Error(`Yandex TTS bridge connection closed before audio arrived: ${configuredUrl}`);
                    rejectReadyOnce(error);
                    if (doneRejector) {
                        doneRejector(error);
                        doneResolver = null;
                        doneRejector = null;
                    }
                }
            };

            return ws;
        }

        function splitIntoChunks(text, maxLen = 150) {
            const normalized = String(text || '').replace(/\s+/g, ' ').trim();
            if (!normalized) {
                return [];
            }

            const sentences = normalized.match(/[^.!?…]+[.!?…]?/g) || [normalized];
            const result = [];
            let current = '';

            for (const sentence of sentences) {
                const part = sentence.trim();
                if (!part) {
                    continue;
                }

                const candidate = current ? `${current} ${part}` : part;
                if (candidate.length <= maxLen) {
                    current = candidate;
                    continue;
                }

                if (current) {
                    result.push(current);
                    current = '';
                }

                if (part.length <= maxLen) {
                    current = part;
                    continue;
                }

                const chunks = part.match(new RegExp(`.{1,${maxLen}}`, 'g')) || [];
                for (let i = 0; i < chunks.length - 1; i += 1) {
                    result.push(chunks[i].trim());
                }
                current = chunks[chunks.length - 1].trim();
            }

            if (current) {
                result.push(current);
            }

            return result;
        }

        async function startSession(lang = 'kk-KZ', options = {}) {
            const ctx = ensureAudioContext();
            if (!ctx) {
                throw new Error('AudioContext is not supported in this browser.');
            }

            await connectSocket();
            resetQueue();
            syncOutputSettings();
            acceptAudio = true;
            revealReplyCallback = typeof options.onReady === 'function' ? options.onReady : null;

            const readyDeferred = createDeferred();
            const doneDeferred = createDeferred();
            resetDeferreds();
            readyResolver = readyDeferred.resolve;
            readyRejector = readyDeferred.reject;
            doneResolver = doneDeferred.resolve;
            doneRejector = doneDeferred.reject;

            ws.send(JSON.stringify({
                type: 'start',
                voice: 'zhanar',
                role: 'friendly',
                lang,
            }));

            return {
                readyPromise: readyDeferred.promise,
                donePromise: doneDeferred.promise,
            };
        }

        function sendTextChunk(text) {
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                throw new Error('TTS bridge socket is not connected.');
            }

            ws.send(JSON.stringify({
                type: 'text',
                text,
                flush: true,
            }));
        }

        function endSession() {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'end' }));
            }
        }

        function waitForFirstChunk(readyPromise, timeoutMs) {
            return Promise.race([
                readyPromise,
                new Promise((resolve) => {
                    window.setTimeout(() => resolve({ ok: false, reason: 'timeout' }), timeoutMs);
                }),
            ]);
        }

        async function primePlayback() {
            const ctx = ensureAudioContext();
            if (!ctx) {
                setVoicePromptVisible(false);
                return false;
            }

            try {
                await ctx.resume();
            } catch (error) {
                console.warn('Unable to resume chatbot audio context:', error);
            }

            return ctx.state !== 'suspended';
        }

        async function speakText(text, lang = 'kk-KZ', options = {}) {
            const { timeoutMs = CHATBOT_TTS_FIRST_CHUNK_TIMEOUT_MS, onReady = null } = options;
            if (!text) {
                return { ok: false, reason: 'empty' };
            }

            lastText = text;
            lastLang = lang;

            const playbackReady = await primePlayback();
            if (!playbackReady) {
                return { ok: false, reason: 'unsupported' };
            }

            const { readyPromise } = await startSession(lang, { onReady });
            const parts = splitIntoChunks(text, 150);
            if (parts.length === 0) {
                return { ok: false, reason: 'empty' };
            }
            parts.forEach((part) => sendTextChunk(part));
            endSession();

            return waitForFirstChunk(readyPromise, timeoutMs);
        }

        async function replayLast() {
            return speakText(lastText, lastLang, {
                timeoutMs: CHATBOT_TTS_FIRST_CHUNK_TIMEOUT_MS,
            });
        }

        async function retryAutoplay() {
            await primePlayback();
            return replayLast();
        }

        function stop() {
            acceptAudio = false;
            revealReplyCallback = null;
            resetQueue();

            if (ws && ws.readyState === WebSocket.OPEN) {
                try {
                    ws.send(JSON.stringify({ type: 'end' }));
                } catch (error) {
                    console.warn('Unable to stop Yandex TTS stream:', error);
                }
            }
        }

        function setRate(nextRate) {
            rate = Number(nextRate) || 1;
        }

        function setVolume(nextVolume) {
            volume = Number(nextVolume);
            syncOutputSettings();
        }

        function setBridgeUrl(nextUrl) {
            const trimmed = String(nextUrl || '').trim();
            try {
                if (trimmed) {
                    window.localStorage.setItem('aiChatTtsWsUrl', trimmed);
                } else {
                    window.localStorage.removeItem('aiChatTtsWsUrl');
                }
            } catch (error) {
                console.warn('Unable to store Yandex TTS bridge URL:', error);
            }

            wsUrl = '';
            if (ws) {
                try {
                    ws.close();
                } catch (error) {
                    console.warn('Unable to close Yandex TTS bridge socket:', error);
                }
                ws = null;
            }
        }

        function getBridgeUrl() {
            return getConfiguredWsUrl();
        }

        function hasReplay() {
            return Boolean(lastText);
        }

        function hasLoadedAudio() {
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
            setBridgeUrl,
            getBridgeUrl,
            hasReplay,
            hasLoadedAudio
        };
    })();

    window.chatbotTTS = chatbotTTS;
    window.setChatbotTtsBridgeUrl = (nextUrl) => chatbotTTS.setBridgeUrl(nextUrl);

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

            if (!result.ok && result.reason === 'unsupported') {
                setVoicePromptVisible(false);
                setStatus('Бұл браузерде тегін озвучка қолжетімсіз.');
            } else if (!result.ok) {
                setVoicePromptVisible(false);
                setStatus('Озвучканы іске қосу мүмкін болмады.');
            }

            return result;
        } catch (error) {
            console.error('Chatbot TTS failed:', error);
            setVoicePromptVisible(false);
            setStatus('Озвучканы іске қосу мүмкін болмады.');
            return { ok: false, error };
        }
    }

    async function toggleSpeechEnabled() {
        speechEnabled = !speechEnabled;
        updateSpeechToggle();
        const replayExistingAudio = async () => {
            if (!chatbotTTS.hasLoadedAudio()) {
                return false;
            }

            const replayResult = await chatbotTTS.retryAutoplay().catch((error) => ({ ok: false, error }));
            return Boolean(replayResult?.ok);
        };

        if (!speechEnabled) {
            stopAssistantSpeech();
            setVoicePromptVisible(false);
            setStatus('Озвучка өшірулі.');
            return;
        }

        const canUseBrowserVoice = await chatbotTTS.enablePlayback();
        if (!canUseBrowserVoice) {
            speechEnabled = false;
            updateSpeechToggle();
            setStatus('Бұл браузерде тегін озвучка қолжетімсіз.');
            return;
        }

        setStatus('Озвучка қосулы. Жауаптар тегін браузер дауысымен оқылады.');
        if (await replayExistingAudio()) {
            setStatus('');
            return;
        } else if (lastAssistantReply) {
            setStatus('Озвучка включена. Следующий ответ будет озвучен автоматически.');
            return;
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

    playAssistantReply = async function playAssistantReplyStreaming(text, options = {}) {
        try {
            const result = await chatbotTTS.speakText(text, detectReplyLang(text), options);
            updateReplayButton();

            if (!result.ok && result.reason === 'unsupported') {
                setVoicePromptVisible(false);
                setStatus('Бұл браузерде дыбысты ойнату қолжетімсіз.');
            } else if (!result.ok && result.reason === 'timeout') {
                setVoicePromptVisible(false);
                setStatus('Yandex SpeechKit дыбысты тым ұзақ дайындады. Мәтін дыбыссыз көрсетілді.');
            } else if (!result.ok && result.reason === 'empty_audio') {
                setVoicePromptVisible(false);
                setStatus('Yandex SpeechKit аудионы қайтара алмады.');
            } else if (!result.ok) {
                setVoicePromptVisible(false);
                setStatus('Yandex SpeechKit озвучкасын іске қосу мүмкін болмады.');
            }

            return result;
        } catch (error) {
            console.error('Chatbot TTS failed:', error);
            setVoicePromptVisible(false);
            if (String(error?.message || '').includes('HTTPS page cannot connect to insecure ws://')) {
                setStatus('HTTPS бетінде жергілікті ws:// bridge ашылмайды. Қауіпсіз wss:// bridge URL орнатыңыз.');
            } else if (String(error?.message || '').includes('Unable to connect to Yandex TTS bridge')) {
                setStatus('Yandex TTS bridge табылмады. Локалды серверді іске қосыңыз.');
            } else {
                setStatus('Yandex SpeechKit озвучкасын іске қосу мүмкін болмады.');
            }
            return { ok: false, error };
        }
    };

    toggleSpeechEnabled = async function toggleSpeechEnabledStreaming() {
        speechEnabled = !speechEnabled;
        updateSpeechToggle();

        const replayExistingAudio = async () => {
            if (!chatbotTTS.hasLoadedAudio()) {
                return false;
            }

            const replayResult = await chatbotTTS.retryAutoplay().catch((error) => ({ ok: false, error }));
            return Boolean(replayResult?.ok);
        };

        if (!speechEnabled) {
            stopAssistantSpeech();
            setVoicePromptVisible(false);
            setStatus('Озвучка өшірілді.');
            return;
        }

        const playbackReady = await chatbotTTS.enablePlayback();
        if (!playbackReady) {
            speechEnabled = false;
            updateSpeechToggle();
            setStatus('Бұл браузерде дыбысты ойнату қолжетімсіз.');
            return;
        }

        setStatus('Озвучка қосулы. Жауаптар Yandex SpeechKit арқылы ағынмен оқылады.');
        if (await replayExistingAudio()) {
            setStatus('');
            return;
        }

        if (lastAssistantReply) {
            setStatus('Озвучка қосулы. Келесі жауап автоматты түрде оқылады.');
        }
    };

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
                const replayResult = await chatbotTTS.replayLast(true).catch((error) => ({ ok: false, error }));
                if (!replayResult?.ok) {
                    setStatus('Озвучканы қайта іске қосу мүмкін болмады.');
                }
                return;
            }
            await playAssistantReply(lastAssistantReply, { showPromptOnBlock: true });
        });
    }

    if (unlockVoiceBtn) {
        unlockVoiceBtn.addEventListener('click', async () => {
            const result = await chatbotTTS.retryAutoplay().catch((error) => ({ ok: false, error }));
            if (result.ok) {
                setStatus('Дыбыс қосылды.');
            } else {
                setStatus('Бұл браузерде дыбысты қосу мүмкін болмады.');
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

            if (!response.ok) {
                const errorDetails = [data?.error, data?.details].filter(Boolean).join(' ');
                throw new Error(errorDetails || `AI request failed with status ${response.status}`);
            }

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
                throw new Error([data?.error, data?.details].filter(Boolean).join(' ') || 'Invalid AI response');
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

initSpeechAssessment = function initSpeechAssessmentV2() {
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
};

const speechAssessmentWords = [
    { word: "Әке", hint: "Ә дыбысы бар сөз" },
    { word: "Өрік", hint: "Ө дыбысы бар сөз" },
    { word: "Қала", hint: "Қ дыбысы бар сөз" },
    { word: "Ғарыш", hint: "Ғ дыбысы бар сөз" },
    { word: "Ұшақ", hint: "Ұ дыбысы бар сөз" },
    { word: "Үй", hint: "Ү дыбысы бар сөз" },
    { word: "Жаңа", hint: "Ң дыбысы бар сөз" }
];
let speechAssessmentWordIndex = 0;

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

    if (!toggleBtn || !closeBtn || !windowEl || !targetWordEl || !hintEl || !micBtn || !statusEl || !resultEl || !scoreEl || !feedbackEl || !retryBtn || !nextBtn) {
        return;
    }

    const MAX_RECORDING_MS = 5000;
    const TARGET_SAMPLE_RATE = 16000;
    const DEFAULT_LANG = 'kk-KZ';

    let mediaRecorder = null;
    let mediaStream = null;
    let recordChunks = [];
    let autoStopTimer = null;
    let isRecording = false;
    let isBusy = false;
    let activeRequestId = 0;

    function getCurrentWordEntry() {
        return speechAssessmentWords[speechAssessmentWordIndex];
    }

    function getSpeechBridgeBaseUrl() {
        const explicitApiUrl = typeof window.__AI_SPEECH_API_URL === 'string'
            ? window.__AI_SPEECH_API_URL.trim()
            : '';
        if (explicitApiUrl) {
            return explicitApiUrl.replace(/\/$/, '');
        }

        const wsUrl = typeof window.chatbotTTS?.getBridgeUrl === 'function'
            ? window.chatbotTTS.getBridgeUrl()
            : CHATBOT_TTS_DEFAULT_WS_URL;

        if (typeof wsUrl === 'string' && wsUrl.startsWith('wss://')) {
            return wsUrl.replace(/^wss:\/\//, 'https://').replace(/\/tts-stream$/, '');
        }

        if (typeof wsUrl === 'string' && wsUrl.startsWith('ws://')) {
            if (window.location.protocol === 'https:') {
                return 'https://localhost:3443';
            }
            return wsUrl.replace(/^ws:\/\//, 'http://').replace(/\/tts-stream$/, '');
        }

        return window.location.protocol === 'https:'
            ? 'https://localhost:3443'
            : 'http://127.0.0.1:3001';
    }

    window.setSpeechPracticeBridgeUrl = function setSpeechPracticeBridgeUrl(nextUrl) {
        window.__AI_SPEECH_API_URL = String(nextUrl || '').trim();
    };

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function normalizePracticeText(text) {
        return String(text || '')
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function levenshteinDistance(left, right) {
        if (!left.length) {
            return right.length;
        }
        if (!right.length) {
            return left.length;
        }

        const previous = new Array(right.length + 1);
        const current = new Array(right.length + 1);

        for (let column = 0; column <= right.length; column += 1) {
            previous[column] = column;
        }

        for (let row = 1; row <= left.length; row += 1) {
            current[0] = row;
            for (let column = 1; column <= right.length; column += 1) {
                const cost = left[row - 1] === right[column - 1] ? 0 : 1;
                current[column] = Math.min(
                    current[column - 1] + 1,
                    previous[column] + 1,
                    previous[column - 1] + cost
                );
            }

            for (let column = 0; column <= right.length; column += 1) {
                previous[column] = current[column];
            }
        }

        return previous[right.length];
    }

    function evaluateTextMatch(recognizedText, targetWord) {
        const normalizedRecognized = normalizePracticeText(recognizedText);
        const normalizedTarget = normalizePracticeText(targetWord);
        const maxLength = Math.max(normalizedRecognized.length, normalizedTarget.length, 1);
        const distance = levenshteinDistance(normalizedRecognized, normalizedTarget);
        const accuracy = Math.max(0, Math.round((1 - (distance / maxLength)) * 100));

        let label = 'неправильно';
        if (normalizedRecognized && normalizedRecognized === normalizedTarget) {
            label = 'правильно';
        } else if (
            normalizedRecognized &&
            (accuracy >= 70 ||
             normalizedRecognized.includes(normalizedTarget) ||
             normalizedTarget.includes(normalizedRecognized))
        ) {
            label = 'почти правильно';
        }

        return {
            normalizedRecognized,
            normalizedTarget,
            accuracy,
            label
        };
    }

    function buildFinalResult(textEvaluation, pronunciationData) {
        if (textEvaluation.label === 'правильно' && pronunciationData.pronunciationScore > 80) {
            return 'правильно';
        }
        if (textEvaluation.label !== 'неправильно' || pronunciationData.pronunciationScore >= 60) {
            return 'почти правильно';
        }
        return 'неправильно';
    }

    function setStatus(message) {
        statusEl.innerText = message;
    }

    function setMicIdle() {
        micBtn.disabled = false;
        micBtn.classList.remove('listening');
        micBtn.textContent = 'Начать запись';
    }

    function setMicRecording() {
        micBtn.disabled = false;
        micBtn.classList.add('listening');
        micBtn.textContent = 'Остановить';
    }

    function setMicBusy() {
        micBtn.disabled = true;
        micBtn.classList.remove('listening');
        micBtn.textContent = 'Проверяем...';
    }

    function resetResultCard() {
        resultEl.classList.add('hidden');
        scoreEl.innerText = '100%';
        scoreEl.className = 'ai-speech-score';
        feedbackEl.innerHTML = '';
    }

    function refreshPracticeCard() {
        const currentWord = getCurrentWordEntry();
        targetWordEl.innerText = currentWord.word;
        hintEl.innerText = `💡 ${currentWord.hint}`;
        resetResultCard();
        setStatus('Нажмите "Начать запись" и произнесите слово.');
        if (!isBusy && !isRecording) {
            setMicIdle();
        }
    }

    function releaseStream() {
        if (mediaStream) {
            mediaStream.getTracks().forEach((track) => track.stop());
            mediaStream = null;
        }
    }

    function resetRecorderState() {
        if (autoStopTimer) {
            clearTimeout(autoStopTimer);
            autoStopTimer = null;
        }
        releaseStream();
        mediaRecorder = null;
        recordChunks = [];
        isRecording = false;
    }

    function closeSpeechWindow() {
        activeRequestId += 1;
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            try {
                mediaRecorder.stop();
            } catch (error) {
                console.warn('Unable to stop recorder:', error);
            }
        }
        resetRecorderState();
        windowEl.classList.add('hidden');
        toggleBtn.style.transform = 'scale(1)';
        toggleBtn.style.opacity = '1';
        isBusy = false;
        setMicIdle();
    }

    function openSpeechWindow() {
        windowEl.classList.remove('hidden');
        toggleBtn.style.transform = 'scale(0.8)';
        toggleBtn.style.opacity = '0';
        refreshPracticeCard();
    }

    function decodeAudioDataCompat(audioContext, arrayBuffer) {
        return new Promise((resolve, reject) => {
            let settled = false;
            const audioData = arrayBuffer.slice(0);

            const onSuccess = (audioBuffer) => {
                if (!settled) {
                    settled = true;
                    resolve(audioBuffer);
                }
            };

            const onError = (error) => {
                if (!settled) {
                    settled = true;
                    reject(error);
                }
            };

            const result = audioContext.decodeAudioData(audioData, onSuccess, onError);
            if (result && typeof result.then === 'function') {
                result.then(onSuccess).catch(onError);
            }
        });
    }

    function downmixToMono(audioBuffer, maxDurationSec) {
        const maxFrames = Math.min(audioBuffer.length, Math.floor(audioBuffer.sampleRate * maxDurationSec));
        const output = new Float32Array(maxFrames);

        for (let channelIndex = 0; channelIndex < audioBuffer.numberOfChannels; channelIndex += 1) {
            const channelData = audioBuffer.getChannelData(channelIndex);
            for (let frameIndex = 0; frameIndex < maxFrames; frameIndex += 1) {
                output[frameIndex] += channelData[frameIndex] / audioBuffer.numberOfChannels;
            }
        }

        return output;
    }

    function resampleFloat32Linear(samples, inputRate, outputRate) {
        if (inputRate === outputRate) {
            return samples;
        }

        const outputLength = Math.max(1, Math.round(samples.length * outputRate / inputRate));
        const output = new Float32Array(outputLength);
        const ratio = inputRate / outputRate;

        for (let index = 0; index < outputLength; index += 1) {
            const position = index * ratio;
            const leftIndex = Math.floor(position);
            const rightIndex = Math.min(samples.length - 1, leftIndex + 1);
            const fraction = position - leftIndex;
            const left = samples[leftIndex] || 0;
            const right = samples[rightIndex] || 0;
            output[index] = left + (right - left) * fraction;
        }

        return output;
    }

    function encodeMonoWav(samples, sampleRate) {
        const buffer = new ArrayBuffer(44 + (samples.length * 2));
        const view = new DataView(buffer);

        const writeString = (offset, value) => {
            for (let index = 0; index < value.length; index += 1) {
                view.setUint8(offset + index, value.charCodeAt(index));
            }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, 36 + (samples.length * 2), true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, samples.length * 2, true);

        let offset = 44;
        for (let index = 0; index < samples.length; index += 1) {
            const sample = Math.max(-1, Math.min(1, samples[index]));
            view.setInt16(offset, sample < 0 ? sample * 32768 : sample * 32767, true);
            offset += 2;
        }

        return new Blob([buffer], { type: 'audio/wav' });
    }

    async function convertBlobToWav(blob) {
        const arrayBuffer = await blob.arrayBuffer();
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
            throw new Error('Браузер аудио декодтауды қолдамайды.');
        }

        const audioContext = new AudioContextClass();
        try {
            const audioBuffer = await decodeAudioDataCompat(audioContext, arrayBuffer);
            const monoSamples = downmixToMono(audioBuffer, MAX_RECORDING_MS / 1000);
            if (!monoSamples.length) {
                throw new Error('Аудио пустое. Повторите запись.');
            }

            const resampled = resampleFloat32Linear(monoSamples, audioBuffer.sampleRate, TARGET_SAMPLE_RATE);
            return encodeMonoWav(resampled, TARGET_SAMPLE_RATE);
        } finally {
            if (typeof audioContext.close === 'function') {
                audioContext.close().catch(() => {});
            }
        }
    }

    async function postSpeechAudio(route, wavBlob) {
        const apiBaseUrl = getSpeechBridgeBaseUrl();
        const response = await fetch(`${apiBaseUrl}${route}`, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'audio/wav'
            },
            body: wavBlob
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.error || `Speech bridge request failed with status ${response.status}`);
        }

        return data;
    }

    function renderSpeechResult(targetWord, sttResult, textEvaluation, pronunciationData) {
        const finalResult = buildFinalResult(textEvaluation, pronunciationData);

        resultEl.classList.remove('hidden');
        scoreEl.innerText = `Точность: ${textEvaluation.accuracy}%`;
        scoreEl.className = 'ai-speech-score';

        if (finalResult === 'правильно') {
            scoreEl.classList.add('excellent');
            triggerConfetti();
        } else if (finalResult === 'почти правильно') {
            scoreEl.classList.add('good');
        } else {
            scoreEl.classList.add('poor');
        }

        feedbackEl.innerHTML = [
            `Вы сказали: <strong>${escapeHtml(sttResult.text || sttResult.rawText || '')}</strong>`,
            `Эталон: <strong>${escapeHtml(targetWord)}</strong>`,
            `Совпадение: <strong>${escapeHtml(textEvaluation.label)}</strong>`,
            `Произношение: <strong>${escapeHtml(pronunciationData.pronunciation)}</strong> (${pronunciationData.pronunciationScore}%)`,
            `Результат: <strong>${escapeHtml(finalResult)}</strong>`
        ].join('<br>');
    }

    async function handleRecordedAudio(recordedBlob, requestId, wordEntry) {
        try {
            if (!recordedBlob || recordedBlob.size < 512) {
                throw new Error('Аудио пустое. Повторите.');
            }

            setStatus('Подготавливаем аудио...');
            const wavBlob = await convertBlobToWav(recordedBlob);
            if (requestId !== activeRequestId) {
                return;
            }

            if (!wavBlob || wavBlob.size < 512) {
                throw new Error('Аудио пустое. Повторите.');
            }

            setStatus('Распознаём речь...');
            const sttResult = await postSpeechAudio(`/stt?lang=${encodeURIComponent(DEFAULT_LANG)}`, wavBlob);
            if (requestId !== activeRequestId) {
                return;
            }

            if (!sttResult || !(sttResult.text || sttResult.normalizedText || sttResult.rawText)) {
                throw new Error('Не удалось распознать. Попробуйте ещё раз.');
            }

            const textEvaluation = evaluateTextMatch(
                sttResult.normalizedText || sttResult.text || sttResult.rawText,
                wordEntry.word
            );

            setStatus('Проверяем произношение...');
            const pronunciationData = await postSpeechAudio(
                `/pronunciation-check?word=${encodeURIComponent(wordEntry.word)}`,
                wavBlob
            );
            if (requestId !== activeRequestId) {
                return;
            }

            renderSpeechResult(wordEntry.word, sttResult, textEvaluation, pronunciationData);
            setStatus('Проверка завершена.');
        } catch (error) {
            console.error('Speech assessment failed:', error);
            resetResultCard();
            setStatus(error.message || 'Проверка не удалась.');
        } finally {
            if (requestId === activeRequestId) {
                isBusy = false;
                setMicIdle();
            }
        }
    }

    async function startRecording() {
        if (isRecording || isBusy) {
            return;
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
            setStatus('Браузер микрофон жазбасын қолдамайды.');
            return;
        }

        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (error) {
            console.error('Microphone access denied:', error);
            setStatus('Микрофонға рұқсат беріңіз.');
            return;
        }

        const preferredMimeType = typeof MediaRecorder.isTypeSupported === 'function'
            ? (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : ''))
            : '';

        try {
            mediaRecorder = preferredMimeType
                ? new MediaRecorder(mediaStream, { mimeType: preferredMimeType })
                : new MediaRecorder(mediaStream);
        } catch (error) {
            console.error('Unable to create MediaRecorder:', error);
            releaseStream();
            setStatus('Жазу құрылғысын іске қосу мүмкін болмады.');
            return;
        }

        recordChunks = [];
        activeRequestId += 1;
        const requestId = activeRequestId;
        const wordEntry = { ...getCurrentWordEntry() };

        mediaRecorder.addEventListener('dataavailable', (event) => {
            if (event.data && event.data.size > 0) {
                recordChunks.push(event.data);
            }
        });

        mediaRecorder.addEventListener('error', (event) => {
            console.error('MediaRecorder error:', event.error || event);
            isBusy = false;
            resetRecorderState();
            setMicIdle();
            setStatus('Жазу қатесі орын алды.');
        });

        mediaRecorder.addEventListener('stop', async () => {
            const recordedBlob = new Blob(recordChunks, {
                type: mediaRecorder?.mimeType || 'audio/webm'
            });
            resetRecorderState();
            isBusy = true;
            setMicBusy();
            await handleRecordedAudio(recordedBlob, requestId, wordEntry);
        });

        mediaRecorder.start();
        isRecording = true;
        setMicRecording();
        resetResultCard();
        setStatus('Жазып жатырмыз. Сөзді 5 секунд ішінде айтыңыз.');

        autoStopTimer = setTimeout(() => {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
            }
        }, MAX_RECORDING_MS);
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            try {
                mediaRecorder.stop();
            } catch (error) {
                console.warn('Unable to stop MediaRecorder:', error);
            }
        }
    }

    toggleBtn.addEventListener('click', () => {
        if (windowEl.classList.contains('hidden')) {
            openSpeechWindow();
        } else {
            closeSpeechWindow();
        }
    });

    closeBtn.addEventListener('click', closeSpeechWindow);

    nextBtn.addEventListener('click', () => {
        activeRequestId += 1;
        speechAssessmentWordIndex = (speechAssessmentWordIndex + 1) % speechAssessmentWords.length;
        refreshPracticeCard();
    });

    retryBtn.addEventListener('click', () => {
        activeRequestId += 1;
        refreshPracticeCard();
    });

    micBtn.addEventListener('click', () => {
        if (isRecording) {
            stopRecording();
            return;
        }

        if (!isBusy) {
            startRecording().catch((error) => {
                console.error('Speech recording failed:', error);
                isBusy = false;
                isRecording = false;
                resetRecorderState();
                setMicIdle();
                setStatus(error.message || 'Жазу қатесі орын алды.');
            });
        }
    });

    refreshPracticeCard();
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
