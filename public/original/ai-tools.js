/* ai-tools.js — All AI calls go through secure /api/ proxy */

let chatHistory = [
  { role: "system", content: "You are a friendly and professional AI Speech Therapist assistant for an inclusive app for kids with hearing and speech impairments. Speak in Kazakh or Russian depending on the language the user uses. Keep answers brief (max 3 sentences), encouraging, and helpful. Use simple words." }
];

const CHATBOT_TTS_SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAAA=";
const CHATBOT_TTS_REQUEST_TIMEOUT_MS = 2000;
const CHATBOT_TTS_FIRST_CHUNK_TIMEOUT_MS = 3500;
const AI_BRIDGE_HTTP_PORT = 3001;
const AI_BRIDGE_HTTPS_PORT = 3443;
const AI_CONTACT_SUPABASE_URL = typeof SUPA_URL !== 'undefined' ? SUPA_URL : 'https://mmugalgqdapidqqxekqt.supabase.co';
const AI_CONTACT_SUPABASE_KEY = typeof SUPA_KEY !== 'undefined' ? SUPA_KEY : 'eyJhbGciOiJIUzI1NiIsInR5cCI6Im1tdWdhbGdxZGFwaWRxcXhla3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDQzMTMsImV4cCI6MjA4NjQ4MDMxM30.b96o0Z-24rs2pczsPSDG8jP1UwbCuCCxxQEiZ_6wil8';
const AI_CONTACT_FUNCTION_URL = `${AI_CONTACT_SUPABASE_URL}/functions/v1/send-telegram-message`;
const AI_CONTACT_TEXT = {
  title: '\u041a\u043e\u043d\u0442\u0430\u043a\u0442',
  subtitle: '\u0411\u0456\u0437\u0433\u0435 \u0445\u0430\u0431\u0430\u0440 \u0436\u0456\u0431\u0435\u0440\u0456\u04a3\u0456\u0437',
  formTitle: '\u041a\u0435\u0440\u0456 \u0431\u0430\u0439\u043b\u0430\u043d\u044b\u0441 \u0444\u043e\u0440\u043c\u0430\u0441\u044b',
  formDesc: '\u0424\u043e\u0440\u043c\u0430\u043d\u044b \u0442\u043e\u043b\u0442\u044b\u0440\u044b\u04a3\u044b\u0437, \u0431\u0456\u0437 \u0441\u0456\u0437\u0431\u0435\u043d \u0436\u0430\u049b\u044b\u043d \u0430\u0440\u0430\u0434\u0430 \u0431\u0430\u0439\u043b\u0430\u043d\u044b\u0441\u0430\u043c\u044b\u0437',
  nameLabel: '\u0422\u043e\u043b\u044b\u049b \u0430\u0442\u044b-\u0436\u04e9\u043d\u0456',
  namePlaceholder: '\u0410\u0442\u044b\u04a3\u044b\u0437\u0434\u044b \u0435\u043d\u0433\u0456\u0437\u0456\u04a3\u0456\u0437',
  emailLabel: '\u042d\u043b\u0435\u043a\u0442\u0440\u043e\u043d\u0434\u044b\u049b \u043f\u043e\u0448\u0442\u0430',
  emailPlaceholder: 'email@example.com',
  roleLabel: '\u0421\u0456\u0437 \u043a\u0456\u043c\u0441\u0456\u0437?',
  rolePlaceholder: '\u041c\u04b1\u0493\u0430\u043b\u0456\u043c, \u0430\u0442\u0430-\u0430\u043d\u0430 \u043d\u0435\u043c\u0435\u0441\u0435 \u0431\u0430\u0441\u049b\u0430',
  messageLabel: '\u0425\u0430\u0431\u0430\u0440\u043b\u0430\u043c\u0430',
  messagePlaceholder: '\u0421\u04b1\u0440\u0430\u0493\u044b\u04a3\u044b\u0437\u0434\u044b \u043d\u0435\u043c\u0435\u0441\u0435 \u04b1\u0441\u044b\u043d\u044b\u0441\u044b\u04a3\u044b\u0437\u0434\u044b \u0436\u0430\u0437\u044b\u04a3\u044b\u0437...',
  submitButton: '\u0425\u0430\u0431\u0430\u0440\u043b\u0430\u043c\u0430 \u0436\u0456\u0431\u0435\u0440\u0443',
  sending: '\u0425\u0430\u0431\u0430\u0440\u043b\u0430\u043c\u0430 \u0436\u0456\u0431\u0435\u0440\u0456\u043b\u0456\u043f \u0436\u0430\u0442\u044b\u0440...',
  successTitle: '\u0425\u0430\u0431\u0430\u0440\u043b\u0430\u043c\u0430 \u0436\u0456\u0431\u0435\u0440\u0456\u043b\u0434\u0456!',
  successMessage: '\u0420\u0430\u049b\u043c\u0435\u0442! \u0411\u0456\u0437 \u0441\u0456\u0437\u0431\u0435\u043d \u0436\u0430\u049b\u044b\u043d \u0430\u0440\u0430\u0434\u0430 \u0431\u0430\u0439\u043b\u0430\u043d\u044b\u0441\u0430\u043c\u044b\u0437.',
  errorMessage: '\u049a\u0430\u0442\u0435 \u043e\u0440\u044b\u043d \u0430\u043b\u0434\u044b. \u041a\u0435\u0439\u0456\u043d\u0456\u0440\u0435\u043a \u049b\u0430\u0439\u0442\u0430 \u043a\u04e9\u0440\u0456\u04a3\u0456\u0437.',
  threadTitle: '\u0425\u0430\u0442 \u0430\u043b\u043c\u0430\u0441\u0443',
  threadDesc: '\u0421\u0456\u0437\u0434\u0456\u04a3 \u0445\u0430\u0431\u0430\u0440\u043b\u0430\u043c\u0430\u04a3\u044b\u0437 \u0436\u0456\u0431\u0435\u0440\u0456\u043b\u0434\u0456. Telegram-\u043d\u0430\u043d \u0436\u0430\u0443\u0430\u043f \u0431\u043e\u043b\u0441\u0430, \u043e\u043b \u043e\u0441\u044b \u0436\u0435\u0440\u0434\u0435 \u043a\u04e9\u0440\u0456\u043d\u0435\u0434\u0456.',
  waitingReply: '\u0416\u0430\u0443\u0430\u043f \u043a\u04af\u0442\u0456\u043b\u0456\u043f \u0436\u0430\u0442\u044b\u0440...',
  fetchReplyError: '\u0416\u0430\u0443\u0430\u043f\u0442\u0430\u0440\u0434\u044b \u0436\u04af\u043a\u0442\u0435\u0443 \u0441\u04d9\u0442\u0441\u0456\u0437 \u0431\u043e\u043b\u0434\u044b.',
  userLabel: '\u0421\u0456\u0437',
  adminLabel: '\u0416\u0418-\u043b\u043e\u0433\u043e\u043f\u0435\u0434'
};

function getBridgeHostOverride() {
  if (typeof window === 'undefined') {
    return '';
  }

  const runtimeHost = typeof window.__AI_BRIDGE_HOST === 'string'
    ? window.__AI_BRIDGE_HOST.trim()
    : '';
  if (runtimeHost) {
    return runtimeHost;
  }

  try {
    const queryHost = new URLSearchParams(window.location.search).get('bridgeHost');
    if (queryHost && queryHost.trim()) {
      return queryHost.trim();
    }
  } catch (error) {
    console.warn('Unable to read bridgeHost from URL:', error);
  }

  try {
    const storedHost = (window.localStorage.getItem('aiBridgeHost') || '').trim();
    if (storedHost) {
      return storedHost;
    }
  } catch (error) {
    console.warn('Unable to read aiBridgeHost from storage:', error);
  }

  return '';
}

function syncBridgeHostOverrideFromUrl() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const queryHost = new URLSearchParams(window.location.search).get('bridgeHost');
    if (!queryHost || !queryHost.trim()) {
      return;
    }

    const trimmedHost = queryHost.trim();
    window.__AI_BRIDGE_HOST = trimmedHost;
    try {
      window.localStorage.setItem('aiBridgeHost', trimmedHost);
    } catch (error) {
      console.warn('Unable to persist aiBridgeHost from URL:', error);
    }
  } catch (error) {
    console.warn('Unable to sync bridgeHost from URL:', error);
  }
}

function getDefaultBridgeHost() {
  const override = getBridgeHostOverride();
  if (override) {
    return override;
  }

  if (typeof window === 'undefined') {
    return '127.0.0.1';
  }

  return window.location?.protocol === 'https:' ? 'localhost' : '127.0.0.1';
}

function buildDefaultBridgeWsUrl() {
  const host = getDefaultBridgeHost();
  if (typeof window !== 'undefined' && window.location?.protocol === 'https:') {
    return `wss://${host}:${AI_BRIDGE_HTTPS_PORT}/tts-stream`;
  }
  return `ws://${host}:${AI_BRIDGE_HTTP_PORT}/tts-stream`;
}

function buildDefaultBridgeApiUrl() {
  const host = getDefaultBridgeHost();
  if (typeof window !== 'undefined' && window.location?.protocol === 'https:') {
    return `https://${host}:${AI_BRIDGE_HTTPS_PORT}`;
  }
  return `http://${host}:${AI_BRIDGE_HTTP_PORT}`;
}

syncBridgeHostOverrideFromUrl();

const CHATBOT_TTS_DEFAULT_WS_URL = buildDefaultBridgeWsUrl();

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

    <div id="aiContactWindow" class="ai-contact-window hidden">
      <div class="ai-chat-header ai-contact-header">
        <div class="ai-chat-header-info">
          <h3>&#1050;&#1086;&#1085;&#1090;&#1072;&#1082;&#1090;</h3>
          <p>&#1041;&#1110;&#1079;&#1075;&#1077; &#1093;&#1072;&#1073;&#1072;&#1088; &#1078;&#1110;&#1073;&#1077;&#1088;&#1110;&#1187;&#1110;&#1079;</p>
        </div>
        <div class="ai-chat-header-actions">
          <button id="aiContactBack" class="ai-chat-icon-btn" type="button">&#8592;</button>
          <button id="aiContactClose" class="ai-close-btn" type="button">&#10006;</button>
        </div>
      </div>
      <div class="ai-contact-body">
        <div class="ai-contact-card">
          <h4 class="ai-contact-title">&#1050;&#1077;&#1088;&#1110; &#1073;&#1072;&#1081;&#1083;&#1072;&#1085;&#1099;&#1089; &#1092;&#1086;&#1088;&#1084;&#1072;&#1089;&#1099;</h4>
          <p class="ai-contact-desc">&#1060;&#1086;&#1088;&#1084;&#1072;&#1085;&#1099; &#1090;&#1086;&#1083;&#1090;&#1099;&#1088;&#1099;&#1187;&#1099;&#1079;, &#1073;&#1110;&#1079; &#1089;&#1110;&#1079;&#1073;&#1077;&#1085; &#1078;&#1072;&#1179;&#1099;&#1085; &#1072;&#1088;&#1072;&#1076;&#1072; &#1073;&#1072;&#1081;&#1083;&#1072;&#1085;&#1099;&#1089;&#1072;&#1084;&#1099;&#1079;</p>
        </div>
        <div id="aiContactSuccess" class="ai-contact-success hidden">
          <div class="ai-contact-success-icon">&#10003;</div>
          <h4>&#1061;&#1072;&#1073;&#1072;&#1088;&#1083;&#1072;&#1084;&#1072; &#1078;&#1110;&#1073;&#1077;&#1088;&#1110;&#1083;&#1076;&#1110;!</h4>
          <p>&#1056;&#1072;&#1179;&#1084;&#1077;&#1090;! &#1041;&#1110;&#1079; &#1089;&#1110;&#1079;&#1073;&#1077;&#1085; &#1078;&#1072;&#1179;&#1099;&#1085; &#1072;&#1088;&#1072;&#1076;&#1072; &#1073;&#1072;&#1081;&#1083;&#1072;&#1085;&#1099;&#1089;&#1072;&#1084;&#1099;&#1079;.</p>
        </div>
        <form id="aiContactForm" class="ai-contact-form">
          <label class="ai-contact-label" for="aiContactName">&#1058;&#1086;&#1083;&#1099;&#1179; &#1072;&#1090;&#1099;-&#1078;&#1257;&#1085;&#1110;</label>
          <input id="aiContactName" class="ai-contact-input" name="name" type="text" placeholder="&#1040;&#1090;&#1099;&#1187;&#1099;&#1079;&#1076;&#1099; &#1077;&#1085;&#1075;&#1110;&#1079;&#1110;&#1187;&#1110;&#1079;" required>
          <label class="ai-contact-label" for="aiContactEmail">&#1069;&#1083;&#1077;&#1082;&#1090;&#1088;&#1086;&#1085;&#1076;&#1099;&#1179; &#1087;&#1086;&#1096;&#1090;&#1072;</label>
          <input id="aiContactEmail" class="ai-contact-input" name="email" type="email" placeholder="email@example.com" required>
          <label class="ai-contact-label" for="aiContactRole">&#1057;&#1110;&#1079; &#1082;&#1110;&#1084;&#1089;&#1110;&#1079;?</label>
          <input id="aiContactRole" class="ai-contact-input" name="role" type="text" placeholder="&#1052;&#1201;&#1171;&#1072;&#1083;&#1110;&#1084;, &#1072;&#1090;&#1072;-&#1072;&#1085;&#1072; &#1085;&#1077;&#1084;&#1077;&#1089;&#1077; &#1073;&#1072;&#1089;&#1179;&#1072;">
          <label class="ai-contact-label" for="aiContactMessage">&#1061;&#1072;&#1073;&#1072;&#1088;&#1083;&#1072;&#1084;&#1072;</label>
          <textarea id="aiContactMessage" class="ai-contact-textarea" name="message" rows="5" placeholder="&#1057;&#1201;&#1088;&#1072;&#1171;&#1099;&#1187;&#1099;&#1079;&#1076;&#1099; &#1085;&#1077;&#1084;&#1077;&#1089;&#1077; &#1201;&#1089;&#1099;&#1085;&#1099;&#1089;&#1099;&#1187;&#1099;&#1079;&#1076;&#1099; &#1078;&#1072;&#1079;&#1099;&#1187;&#1099;&#1079;..." required></textarea>
          <button id="aiContactSubmit" class="ai-contact-submit" type="submit">&#1061;&#1072;&#1073;&#1072;&#1088;&#1083;&#1072;&#1084;&#1072; &#1078;&#1110;&#1073;&#1077;&#1088;&#1091;</button>
          <div id="aiContactStatus" class="ai-contact-status" aria-live="polite"></div>
        </form>
        <div id="aiContactConversation" class="ai-contact-conversation hidden">
          <div class="ai-contact-conversation-head">
            <h4 id="aiContactConversationTitle" class="ai-contact-title">&#1061;&#1072;&#1090; &#1072;&#1083;&#1084;&#1072;&#1089;&#1091;</h4>
            <p id="aiContactConversationDesc" class="ai-contact-desc">&#1058;&#1077;&#1083;&#1077;&#1075;&#1088;&#1072;&#1084;&#1076;&#1072;&#1085; &#1078;&#1072;&#1091;&#1072;&#1087; &#1086;&#1089;&#1099; &#1078;&#1077;&#1088;&#1076;&#1077; &#1087;&#1072;&#1081;&#1076;&#1072; &#1073;&#1086;&#1083;&#1072;&#1076;&#1099;.</p>
          </div>
          <div id="aiContactThreadMessages" class="ai-contact-thread-messages"></div>
          <div id="aiContactThreadStatus" class="ai-contact-thread-status" aria-live="polite"></div>
        </div>
        <div class="ai-contact-info">
          <div class="ai-contact-info-row">
            <span class="ai-contact-info-label">Email</span>
            <span>info@course-example.kz</span>
          </div>
          <div class="ai-contact-info-row">
            <span class="ai-contact-info-label">&#1058;&#1077;&#1083;&#1077;&#1092;&#1086;&#1085;</span>
            <span>+7 (XXX) XXX-XX-XX</span>
          </div>
          <div class="ai-contact-info-row">
            <span class="ai-contact-info-label">&#1052;&#1077;&#1082;&#1077;&#1085;&#1078;&#1072;&#1081;</span>
            <span>&#1178;&#1072;&#1079;&#1072;&#1179;&#1089;&#1090;&#1072;&#1085; &#1056;&#1077;&#1089;&#1087;&#1091;&#1073;&#1083;&#1080;&#1082;&#1072;&#1089;&#1099;</span>
          </div>
        </div>
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

    const contactToggle = document.createElement('button');
    contactToggle.id = 'aiChatContactToggle';
    contactToggle.className = 'ai-chat-text-btn';
    contactToggle.type = 'button';
    contactToggle.title = AI_CONTACT_TEXT.title;
    contactToggle.textContent = AI_CONTACT_TEXT.title;

    const speechToggle = document.createElement('button');
    speechToggle.id = 'aiChatSpeechToggle';
    speechToggle.className = 'ai-chat-icon-btn';
    speechToggle.type = 'button';
    speechToggle.title = 'Озвучка';
    speechToggle.textContent = '🔊';

    closeBtn.replaceWith(actions);
    actions.appendChild(contactToggle);
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
        window.appTts?.stop?.();
        window.chatbotTTS?.stop?.();
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
                setStatus('Yandex TTS bridge табылмады. Телефонда inclusiveapp-ті ?bridgeHost=<компьютер-IP> параметрімен ашыңыз.');
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
    const contactWindow = document.getElementById('aiContactWindow');
    const contactToggleBtn = document.getElementById('aiChatContactToggle');
    const contactBackBtn = document.getElementById('aiContactBack');
    const contactCloseBtn = document.getElementById('aiContactClose');
    const contactForm = document.getElementById('aiContactForm');
    const contactStatusEl = document.getElementById('aiContactStatus');
    const contactSuccessEl = document.getElementById('aiContactSuccess');
    const contactSubmitBtn = document.getElementById('aiContactSubmit');
    const contactConversationEl = document.getElementById('aiContactConversation');
    const contactConversationTitleEl = document.getElementById('aiContactConversationTitle');
    const contactConversationDescEl = document.getElementById('aiContactConversationDesc');
    const contactThreadMessagesEl = document.getElementById('aiContactThreadMessages');
    const contactThreadStatusEl = document.getElementById('aiContactThreadStatus');
    const contactIntroCardEl = document.querySelector('#aiContactWindow .ai-contact-card');
    const contactInfoEl = document.querySelector('#aiContactWindow .ai-contact-info');
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
    let contactResetTimer = null;
    let currentContactThreadKey = null;
    let currentContactThreadPoller = null;
    let currentContactThreadMessages = [];

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

    function setToggleVisibility(isOpen) {
        if (!toggleBtn) {
            return;
        }

        toggleBtn.style.transform = isOpen ? 'scale(0.8)' : 'scale(1)';
        toggleBtn.style.opacity = isOpen ? '0' : '1';
    }

    function setContactStatus(text, type) {
        if (!contactStatusEl) {
            return;
        }

        contactStatusEl.textContent = text || '';
        contactStatusEl.classList.remove('is-error', 'is-success', 'is-loading');
        if (type) {
            contactStatusEl.classList.add(type);
        }
    }

    function getStoredContactAuth() {
        try {
            const tokenRaw = window.localStorage.getItem('sb-mmugalgqdapidqqxekqt-auth-token');
            if (!tokenRaw) {
                return null;
            }

            const auth = JSON.parse(tokenRaw);
            if (!auth?.access_token || !auth?.user?.id) {
                return null;
            }

            return auth;
        } catch (error) {
            return null;
        }
    }

    function getContactAuth() {
        if (typeof getSupaAuth === 'function') {
            try {
                return getSupaAuth() || getStoredContactAuth();
            } catch (error) {
                return getStoredContactAuth();
            }
        }

        return getStoredContactAuth();
    }

    function getContactAccessToken() {
        return getContactAuth()?.access_token || '';
    }

    function getContactUserId() {
        return getContactAuth()?.user?.id || '';
    }

    function setContactThreadStatus(text, type) {
        if (!contactThreadStatusEl) {
            return;
        }

        contactThreadStatusEl.textContent = text || '';
        contactThreadStatusEl.classList.remove('is-error', 'is-success', 'is-loading');
        if (type) {
            contactThreadStatusEl.classList.add(type);
        }
    }

    function stopContactThreadPolling() {
        if (currentContactThreadPoller) {
            window.clearInterval(currentContactThreadPoller);
            currentContactThreadPoller = null;
        }
    }

    function formatContactThreadTime(value) {
        if (!value) {
            return '';
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return '';
        }

        return date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function renderContactThreadMessages() {
        if (!contactThreadMessagesEl) {
            return;
        }

        contactThreadMessagesEl.innerHTML = '';

        currentContactThreadMessages.forEach((entry) => {
            const item = document.createElement('div');
            item.className = `ai-contact-thread-item is-${entry.sender}`;

            const meta = document.createElement('div');
            meta.className = 'ai-contact-thread-meta';
            meta.textContent = `${entry.sender === 'user' ? AI_CONTACT_TEXT.userLabel : AI_CONTACT_TEXT.adminLabel}${entry.createdAt ? ` - ${formatContactThreadTime(entry.createdAt)}` : ''}`;

            const bubble = document.createElement('div');
            bubble.className = 'ai-contact-thread-bubble';
            bubble.textContent = entry.text;

            item.appendChild(meta);
            item.appendChild(bubble);
            contactThreadMessagesEl.appendChild(item);
        });

        contactThreadMessagesEl.scrollTop = contactThreadMessagesEl.scrollHeight;
    }

    function resetContactThreadState() {
        stopContactThreadPolling();
        currentContactThreadKey = null;
        currentContactThreadMessages = [];

        if (contactConversationEl) {
            contactConversationEl.classList.add('hidden');
        }
        if (contactIntroCardEl) {
            contactIntroCardEl.classList.remove('hidden');
        }
        if (contactInfoEl) {
            contactInfoEl.classList.remove('hidden');
        }
        if (contactThreadMessagesEl) {
            contactThreadMessagesEl.innerHTML = '';
        }
        setContactThreadStatus('');
    }

    async function restoreContactThreadFromServer() {
        const accessToken = getContactAccessToken();
        if (!accessToken) {
            resetContactThreadState();
            return;
        }

        try {
            const response = await fetch(`${AI_CONTACT_FUNCTION_URL}/thread`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (response.status === 404) {
                resetContactThreadState();
                return;
            }

            if (!response.ok) {
                const details = await response.text();
                throw new Error(details || `HTTP ${response.status}`);
            }

            const data = await response.json();
            const thread = data?.thread;
            if (!thread?.thread_key || !thread?.message) {
                resetContactThreadState();
                return;
            }

            currentContactThreadKey = thread.thread_key;
            currentContactThreadMessages = [
                {
                    id: `user-${thread.thread_key}`,
                    sender: 'user',
                    text: thread.message,
                    createdAt: thread.created_at || new Date().toISOString()
                }
            ];

            const replies = Array.isArray(thread.replies) ? thread.replies : [];
            replies.forEach((reply) => {
                currentContactThreadMessages.push({
                    id: reply.id,
                    sender: 'admin',
                    text: reply.reply_text,
                    createdAt: reply.created_at
                });
            });

            if (contactConversationTitleEl) {
                contactConversationTitleEl.textContent = AI_CONTACT_TEXT.threadTitle;
            }
            if (contactConversationDescEl) {
                contactConversationDescEl.textContent = AI_CONTACT_TEXT.threadDesc;
            }
            if (contactSuccessEl) {
                contactSuccessEl.classList.add('hidden');
            }
            if (contactConversationEl) {
                contactConversationEl.classList.remove('hidden');
            }
            if (contactIntroCardEl) {
                contactIntroCardEl.classList.add('hidden');
            }
            if (contactForm) {
                contactForm.classList.add('hidden');
            }
            if (contactInfoEl) {
                contactInfoEl.classList.add('hidden');
            }

            renderContactThreadMessages();
            setContactThreadStatus(replies.length ? '' : AI_CONTACT_TEXT.waitingReply, replies.length ? '' : 'is-loading');
            stopContactThreadPolling();
            currentContactThreadPoller = window.setInterval(loadContactReplies, 5000);
        } catch (error) {
            console.error('Unable to restore contact thread:', error);
            setContactThreadStatus(AI_CONTACT_TEXT.fetchReplyError, 'is-error');
        }
    }

    async function loadContactReplies() {
        if (!currentContactThreadKey) {
            return;
        }

        try {
            const accessToken = getContactAccessToken();
            if (!accessToken) {
                setContactThreadStatus(AI_CONTACT_TEXT.waitingReply, 'is-loading');
                return;
            }

            const response = await fetch(`${AI_CONTACT_FUNCTION_URL}/replies?thread_key=${encodeURIComponent(currentContactThreadKey)}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (!response.ok) {
                const details = await response.text();
                throw new Error(details || `HTTP ${response.status}`);
            }

            const data = await response.json();
            const replies = Array.isArray(data?.replies) ? data.replies : [];
            const nextMessages = currentContactThreadMessages.filter((entry) => entry.sender === 'user');

            replies.forEach((reply) => {
                nextMessages.push({
                    id: reply.id,
                    sender: 'admin',
                    text: reply.reply_text,
                    createdAt: reply.created_at
                });
            });

            currentContactThreadMessages = nextMessages;
            renderContactThreadMessages();
            setContactThreadStatus(replies.length ? '' : AI_CONTACT_TEXT.waitingReply, replies.length ? '' : 'is-loading');
        } catch (error) {
            console.error('Unable to load contact replies:', error);
            setContactThreadStatus(AI_CONTACT_TEXT.fetchReplyError, 'is-error');
        }
    }

    function startContactThread(threadKey, initialMessage, createdAt) {
        currentContactThreadKey = threadKey;
        currentContactThreadMessages = [
            {
                id: `user-${threadKey}`,
                sender: 'user',
                text: initialMessage,
                createdAt: createdAt || new Date().toISOString()
            }
        ];

        if (contactConversationTitleEl) {
            contactConversationTitleEl.textContent = AI_CONTACT_TEXT.threadTitle;
        }
        if (contactConversationDescEl) {
            contactConversationDescEl.textContent = AI_CONTACT_TEXT.threadDesc;
        }
        if (contactSuccessEl) {
            contactSuccessEl.classList.remove('hidden');
        }
        if (contactConversationEl) {
            contactConversationEl.classList.remove('hidden');
        }
        if (contactIntroCardEl) {
            contactIntroCardEl.classList.add('hidden');
        }
        if (contactForm) {
            contactForm.classList.add('hidden');
        }
        if (contactInfoEl) {
            contactInfoEl.classList.add('hidden');
        }

        renderContactThreadMessages();
        setContactThreadStatus(AI_CONTACT_TEXT.waitingReply, 'is-loading');
        stopContactThreadPolling();
        loadContactReplies();
        currentContactThreadPoller = window.setInterval(loadContactReplies, 5000);
    }

    function resetContactFormState(clearFields) {
        if (contactResetTimer) {
            window.clearTimeout(contactResetTimer);
            contactResetTimer = null;
        }

        resetContactThreadState();
        if (contactSuccessEl) {
            contactSuccessEl.classList.add('hidden');
        }
        if (contactForm) {
            contactForm.classList.remove('hidden');
            if (clearFields) {
                contactForm.reset();
            }
        }
        if (contactSubmitBtn) {
            contactSubmitBtn.disabled = false;
        }
        setContactStatus('');
    }

    function openContactWindow() {
        if (!contactWindow) {
            return;
        }

        clearPendingReply();
        stopRecognition();
        stopAssistantSpeech();
        setVoicePromptVisible(false);
        setStatus('');
        chatWindow.classList.add('hidden');
        contactWindow.classList.remove('hidden');
        setToggleVisibility(true);
        if (!currentContactThreadKey) {
            restoreContactThreadFromServer();
        } else {
            renderContactThreadMessages();
        }
    }

    function closeContactWindow(restoreChat) {
        if (!contactWindow) {
            return;
        }

        contactWindow.classList.add('hidden');
        resetContactFormState(true);

        if (restoreChat) {
            chatWindow.classList.remove('hidden');
            setToggleVisibility(true);
            if (input) {
                input.focus();
            }
            return;
        }

        setToggleVisibility(false);
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

            const resolvedUrl = runtimeUrl || storedUrl || buildDefaultBridgeWsUrl();
            if (window.location.protocol === 'https:' && resolvedUrl.startsWith('ws://')) {
                return buildDefaultBridgeWsUrl();
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
                throw new Error('HTTPS page cannot connect to insecure ws:// bridge. Use ?bridgeHost=<LAN-IP>, window.setAIBridgeHost(...), or set window.__AI_TTS_WS_URL to a secure wss:// bridge URL.');
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

    async function readHttpTtsError(response) {
        try {
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                const payload = await response.json();
                return [payload?.error, payload?.message, payload?.details].filter(Boolean).join(' ');
            }
            return await response.text();
        } catch {
            return '';
        }
    }

    function isProviderNotConfigured(details) {
        return String(details || '').includes('Requested TTS provider is not configured');
    }

    function upgradeChatbotTtsToHttpApi(ttsController) {
        let rate = 1;
        let volume = 1;
        let lastText = '';
        let lastLang = 'kk-KZ';
        let lastBlob = null;
        let audioUrl = '';
        let audioEl = null;
        let activeController = null;

        function ensureAudioEl() {
            if (!audioEl) {
                audioEl = new Audio();
                audioEl.preload = 'auto';
            }
            audioEl.playbackRate = rate;
            audioEl.volume = volume;
            return audioEl;
        }

        function revokeAudioUrl() {
            if (!audioUrl) return;
            try {
                URL.revokeObjectURL(audioUrl);
            } catch (error) {
                console.warn('Unable to revoke chatbot audio URL:', error);
            }
            audioUrl = '';
        }

        function stop() {
            if (activeController) {
                try {
                    activeController.abort();
                } catch (error) {
                    console.warn('Unable to abort chatbot TTS request:', error);
                }
                activeController = null;
            }

            const el = ensureAudioEl();
            try {
                el.pause();
                el.currentTime = 0;
            } catch (error) {
                console.warn('Unable to stop chatbot audio:', error);
            }
        }

        async function enablePlayback() {
            ensureAudioEl();
            return true;
        }

        async function fetchAudioBlob(text, lang, timeoutMs) {
            if (activeController) {
                try {
                    activeController.abort();
                } catch (error) {
                    console.warn('Unable to abort previous chatbot TTS request:', error);
                }
            }

            const controller = new AbortController();
            activeController = controller;
            const timerId = window.setTimeout(() => controller.abort(), timeoutMs);

            try {
                const makeRequest = (preferYandex = true) => fetch('/api/tts', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(preferYandex
                        ? {
                            text,
                            lang,
                            provider: 'yandex',
                        }
                        : {
                            text,
                            lang,
                        }),
                    signal: controller.signal,
                });

                let response = await makeRequest(true);
                if (!response.ok) {
                    const details = await readHttpTtsError(response);
                    if (isProviderNotConfigured(details)) {
                        response = await makeRequest(false);
                    } else {
                        return {
                            ok: false,
                            reason: 'request_failed',
                            status: response.status,
                            details: details || `Status ${response.status}`,
                        };
                    }
                }

                if (!response.ok) {
                    const details = await readHttpTtsError(response);
                    return {
                        ok: false,
                        reason: 'request_failed',
                        status: response.status,
                        details: details || `Status ${response.status}`,
                    };
                }

                const blob = await response.blob();
                if (!blob.size) {
                    return {
                        ok: false,
                        reason: 'empty_audio',
                    };
                }

                lastBlob = blob;
                return { ok: true, blob };
            } catch (error) {
                if (controller.signal.aborted) {
                    return {
                        ok: false,
                        reason: 'timeout',
                        details: error?.message || 'Request timed out.',
                    };
                }

                return {
                    ok: false,
                    reason: 'request_failed',
                    details: error?.message || 'Request failed.',
                };
            } finally {
                window.clearTimeout(timerId);
                if (activeController === controller) {
                    activeController = null;
                }
            }
        }

        async function playBlob(blob, onReady = null) {
            const el = ensureAudioEl();
            revokeAudioUrl();
            audioUrl = URL.createObjectURL(blob);
            el.src = audioUrl;
            el.playbackRate = rate;
            el.volume = volume;

            if (typeof onReady === 'function') {
                onReady();
            }

            await el.play();
            return { ok: true };
        }

        async function speakText(text, lang = 'kk-KZ', options = {}) {
            const { timeoutMs = CHATBOT_TTS_FIRST_CHUNK_TIMEOUT_MS, onReady = null } = options;
            if (!text) {
                return { ok: false, reason: 'empty' };
            }

            lastText = text;
            lastLang = lang;

            const fetchResult = await fetchAudioBlob(text, lang, timeoutMs);
            if (!fetchResult.ok) {
                return fetchResult;
            }

            try {
                return await playBlob(fetchResult.blob, onReady);
            } catch (error) {
                return {
                    ok: false,
                    reason: 'autoplay',
                    details: error?.message || 'Audio playback was blocked.',
                };
            }
        }

        async function replayLast() {
            if (lastBlob) {
                try {
                    return await playBlob(lastBlob);
                } catch (error) {
                    return {
                        ok: false,
                        reason: 'autoplay',
                        details: error?.message || 'Audio playback was blocked.',
                    };
                }
            }

            if (!lastText) {
                return { ok: false, reason: 'empty' };
            }

            return speakText(lastText, lastLang, {
                timeoutMs: CHATBOT_TTS_REQUEST_TIMEOUT_MS,
            });
        }

        async function retryAutoplay() {
            return replayLast(true);
        }

        function setRate(nextRate) {
            rate = Number(nextRate) || 1;
            ensureAudioEl().playbackRate = rate;
        }

        function setVolume(nextVolume) {
            const parsed = Number(nextVolume);
            volume = Number.isFinite(parsed) ? parsed : 1;
            ensureAudioEl().volume = volume;
        }

        function setBridgeUrl() {
            // Bridge is no longer required for chatbot TTS.
        }

        function getBridgeUrl() {
            return '';
        }

        function hasReplay() {
            return Boolean(lastText);
        }

        function hasLoadedAudio() {
            return Boolean(lastBlob);
        }

        Object.assign(ttsController, {
            enablePlayback,
            speakText,
            replayLast,
            retryAutoplay,
            stop,
            setRate,
            setVolume,
            setBridgeUrl,
            getBridgeUrl,
            hasReplay,
            hasLoadedAudio,
        });
    }

    upgradeChatbotTtsToHttpApi(chatbotTTS);

    window.setAIBridgeHost = (nextHost) => {
        const trimmedHost = String(nextHost || '').trim();
        try {
            if (trimmedHost) {
                window.localStorage.setItem('aiBridgeHost', trimmedHost);
            } else {
                window.localStorage.removeItem('aiBridgeHost');
            }
        } catch (error) {
            console.warn('Unable to store aiBridgeHost:', error);
        }

        window.__AI_BRIDGE_HOST = trimmedHost;
        window.__AI_TTS_WS_URL = trimmedHost
            ? (window.location.protocol === 'https:'
                ? `wss://${trimmedHost}:${AI_BRIDGE_HTTPS_PORT}/tts-stream`
                : `ws://${trimmedHost}:${AI_BRIDGE_HTTP_PORT}/tts-stream`)
            : '';
        window.__AI_SPEECH_API_URL = trimmedHost
            ? (window.location.protocol === 'https:'
                ? `https://${trimmedHost}:${AI_BRIDGE_HTTPS_PORT}`
                : `http://${trimmedHost}:${AI_BRIDGE_HTTP_PORT}`)
            : '';

        chatbotTTS.setBridgeUrl(window.__AI_TTS_WS_URL);
    };

    function stopAssistantSpeech() {
        chatbotTTS.stop();
        window.appTts?.stop?.();
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
            } else if (!result.ok && result.reason === 'timeout') {
                setVoicePromptVisible(false);
                setStatus('Yandex SpeechKit жауапты тым ұзақ дайындады.');
            } else if (!result.ok && result.reason === 'empty_audio') {
                setVoicePromptVisible(false);
                setStatus('Yandex SpeechKit аудионы қайтара алмады.');
            } else if (!result.ok && result.reason === 'request_failed') {
                console.error('Chatbot HTTP TTS request failed:', result);
                setVoicePromptVisible(false);
                setStatus('Yandex SpeechKit озвучкасы уақытша қолжетімсіз.');
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

        setStatus('Озвучка қосулы. Жауаптар Yandex SpeechKit арқылы оқылады.');
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
        if (contactWindow) {
            contactWindow.classList.add('hidden');
        }
        resetContactFormState(true);
        setToggleVisibility(false);
        clearPendingReply();
        stopRecognition();
        stopAssistantSpeech();
        setVoicePromptVisible(false);
        setStatus('');
    }

    toggleBtn.addEventListener('click', () => {
        if (contactWindow && !contactWindow.classList.contains('hidden')) {
            closeContactWindow(false);
            return;
        }

        chatWindow.classList.toggle('hidden');
        if (!chatWindow.classList.contains('hidden')) {
            setToggleVisibility(true);
            input.focus();
        } else {
            closeChatWindow();
        }
    });

    closeBtn.addEventListener('click', closeChatWindow);

    if (contactToggleBtn) {
        contactToggleBtn.addEventListener('click', () => {
            openContactWindow();
        });
    }

    if (contactBackBtn) {
        contactBackBtn.addEventListener('click', () => {
            closeContactWindow(true);
        });
    }

    if (contactCloseBtn) {
        contactCloseBtn.addEventListener('click', () => {
            closeContactWindow(false);
        });
    }

    if (contactForm) {
        contactForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const formData = new FormData(contactForm);
            const threadKey = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                ? crypto.randomUUID()
                : `thread-${Date.now()}`;
            const payload = {
                thread_key: threadKey,
                user_id: getContactUserId() || null,
                name: String(formData.get('name') || '').trim(),
                email: String(formData.get('email') || '').trim(),
                role: String(formData.get('role') || '').trim() || null,
                message: String(formData.get('message') || '').trim()
            };

            if (!payload.name || !payload.email || !payload.message) {
                setContactStatus(AI_CONTACT_TEXT.errorMessage, 'is-error');
                return;
            }

            if (!AI_CONTACT_SUPABASE_URL || !AI_CONTACT_SUPABASE_KEY) {
                setContactStatus(AI_CONTACT_TEXT.errorMessage, 'is-error');
                return;
            }

            if (contactSubmitBtn) {
                contactSubmitBtn.disabled = true;
            }
            setContactStatus(AI_CONTACT_TEXT.sending, 'is-loading');

            try {
                const accessToken = getContactAccessToken();
                const response = await fetch(`${AI_CONTACT_SUPABASE_URL}/rest/v1/contact_messages`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': AI_CONTACT_SUPABASE_KEY,
                        'Authorization': `Bearer ${accessToken || AI_CONTACT_SUPABASE_KEY}`,
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const details = await response.text();
                    throw new Error(details || `HTTP ${response.status}`);
                }

                const rows = await response.json();
                const insertedRow = Array.isArray(rows) ? rows[0] : rows;
                setContactStatus('');
                startContactThread(insertedRow?.thread_key || threadKey, payload.message, insertedRow?.created_at);
            } catch (error) {
                console.error('Contact form submit failed:', error);
                setContactStatus(AI_CONTACT_TEXT.errorMessage, 'is-error');
                if (contactSubmitBtn) {
                    contactSubmitBtn.disabled = false;
                }
            }
        });
    }

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
            } else if (!result.ok && result.reason === 'request_failed') {
                console.error('Chatbot HTTP TTS request failed:', result);
                setVoicePromptVisible(false);
                setStatus('Yandex SpeechKit озвучкасы уақытша қолжетімсіз.');
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
                setStatus('Yandex TTS bridge табылмады. Телефонда inclusiveapp-ті ?bridgeHost=<компьютер-IP> параметрімен ашыңыз.');
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

        setStatus('Озвучка қосулы. Жауаптар Yandex SpeechKit арқылы оқылады.');
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
            : buildDefaultBridgeWsUrl();

        if (typeof wsUrl === 'string' && wsUrl.startsWith('wss://')) {
            return wsUrl.replace(/^wss:\/\//, 'https://').replace(/\/tts-stream$/, '');
        }

        if (typeof wsUrl === 'string' && wsUrl.startsWith('ws://')) {
            if (window.location.protocol === 'https:') {
                return buildDefaultBridgeApiUrl();
            }
            return wsUrl.replace(/^ws:\/\//, 'http://').replace(/\/tts-stream$/, '');
        }

        return buildDefaultBridgeApiUrl();
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
    if (!text) return;

    if (window.appTts?.stop) {
        window.appTts.stop();
    }

    if (window.chatbotTTS?.stop) {
        window.chatbotTTS.stop();
    }

    const ttsClient = window.appTts?.speakText
        ? window.appTts
        : (window.chatbotTTS?.speakText ? window.chatbotTTS : null);

    if (ttsClient?.speakText) {
        ttsClient.speakText(text, lang, {
            provider: 'yandex',
            speed: 0.9
        }).then((result) => {
            if (result?.ok) {
                return;
            }

            console.warn('window.speakText HTTP TTS failed:', result);
        }).catch((error) => {
            console.error('window.speakText HTTP TTS failed:', error);
        });
        return;
    }

    console.warn('window.speakText skipped because no HTTP TTS client is available.');
};
