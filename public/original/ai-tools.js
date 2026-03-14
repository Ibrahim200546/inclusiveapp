/* ai-tools.js — All AI calls go through secure /api/ proxy */

let chatHistory = [
  { role: "system", content: "You are a friendly and professional AI Speech Therapist assistant for an inclusive app for kids with hearing and speech impairments. Speak in Kazakh or Russian depending on the language the user uses. Keep answers brief (max 3 sentences), encouraging, and helpful. Use simple words." }
];

document.addEventListener('DOMContentLoaded', () => {
  injectAIToolsHTML();
  initAIAssistant();
  initSpeechAssessment();
});

function injectAIToolsHTML() {
  const container = document.createElement('div');
  container.innerHTML = `
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
}

// AI Assistant Logic
function initAIAssistant() {
    const toggleBtn = document.getElementById('aiChatToggle');
    const closeBtn = document.getElementById('aiChatClose');
    const chatWindow = document.getElementById('aiChatWindow');
    const sendBtn = document.getElementById('aiChatSend');
    const input = document.getElementById('aiChatInput');
    const messagesContainer = document.getElementById('aiChatMessages');

    toggleBtn.addEventListener('click', () => {
        chatWindow.classList.toggle('hidden');
        if (!chatWindow.classList.contains('hidden')) {
            toggleBtn.style.transform = "scale(0.8)";
            toggleBtn.style.opacity = "0";
            input.focus();
        } else {
            toggleBtn.style.transform = "scale(1)";
            toggleBtn.style.opacity = "1";
        }
    });

    closeBtn.addEventListener('click', () => {
        chatWindow.classList.add('hidden');
        toggleBtn.style.transform = "scale(1)";
        toggleBtn.style.opacity = "1";
    });

    const sendMessage = async () => {
        const text = input.value.trim();
        if (!text) return;

        // Add user message to UI
        appendMessage('user', text);
        input.value = '';
        
        // Add loading indicator
        const typingId = 'typing-' + Date.now();
        appendTypingIndicator(typingId);

        chatHistory.push({ role: "user", content: text });

        try {
            const response = await fetch('/api/ai-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: chatHistory })
            });
            const data = await response.json();
            
            if (data && data.reply) {
              chatHistory.push({ role: "assistant", content: data.reply });
              removeElement(typingId);
              appendMessage('assistant', data.reply);
            } else {
              throw new Error(data.error || "Invalid AI response");
            }
        } catch (error) {
            console.error(error);
            removeElement(typingId);
            appendMessage('assistant', "Кешіріңіз, байланыс қатесі орын алды. Извините, произошла ошибка сети.");
            chatHistory.pop(); // remove user msg from history on fail
        }
    };

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    function appendMessage(role, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `ai-message ai-${role}`;
        msgDiv.innerText = text;
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
            if (event.error !== 'no-speech') {
                statusEl.innerText = "Қате орын алды.";
            } else {
                statusEl.innerText = "Ешнәрсе естілмеді.";
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
                recognition.start();
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
