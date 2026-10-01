/* Local sustained-voice practice. No audio is recorded, stored, or sent anywhere. */
(function (root) {
  'use strict';

  class VoicePracticeSession {
    constructor(options = {}) {
      this.mediaDevices = options.mediaDevices || root.navigator.mediaDevices;
      this.Context = options.AudioContext || root.AudioContext || root.webkitAudioContext;
      this.secureContext = options.secureContext ?? root.isSecureContext;
      this.requestFrame = options.requestFrame || root.requestAnimationFrame.bind(root);
      this.cancelFrame = options.cancelFrame || root.cancelAnimationFrame.bind(root);
      this.now = options.now || (() => root.performance.now());
      this.analyze = options.analyze || ((buffer, rate, threshold) => root.AudioDSP.analyzeVoicedFrame(buffer, rate, threshold));
      this.isActive = options.isActive || (() => true);
      this.onUpdate = options.onUpdate || (() => {});
      this.onState = options.onState || (() => {});
      this.requiredMs = options.requiredMs || 3000;
      this.calibrationMs = options.calibrationMs ?? 700;
      this.maximumMs = options.maximumMs || 45000;
      this.token = 0;
      this.state = 'idle';
      this.progressMs = 0;
      this.trackListeners = [];
    }

    setState(state, reason) {
      this.state = state;
      this.onState(state, reason);
    }

    release() {
      if (this.frameId != null) this.cancelFrame(this.frameId);
      this.frameId = null;
      this.trackListeners.forEach(([track, handler]) => track.removeEventListener('ended', handler));
      this.trackListeners = [];
      if (this.stream) this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
      if (this.source) { try { this.source.disconnect(); } catch (_) { /* already disconnected */ } }
      if (this.analyser) { try { this.analyser.disconnect(); } catch (_) { /* already disconnected */ } }
      this.source = null;
      this.analyser = null;
      if (this.context && this.context.state !== 'closed') {
        try { Promise.resolve(this.context.close()).catch(() => {}); } catch (_) { /* already closed */ }
      }
      this.context = null;
    }

    stop(reason = 'stopped') {
      this.token++;
      this.release();
      this.setState(reason === 'complete' ? 'complete' : 'stopped', reason);
    }

    fail(reason) {
      this.token++;
      this.release();
      this.setState('error', reason);
    }

    async start() {
      if (['requesting', 'calibrating', 'listening'].includes(this.state) || !this.isActive()) return false;
      this.release();
      const token = ++this.token;
      this.progressMs = 0;
      if (this.secureContext === false) { this.fail('INSECURE'); return false; }
      if (!this.mediaDevices || typeof this.mediaDevices.getUserMedia !== 'function' || !this.Context) {
        this.fail('UNSUPPORTED'); return false;
      }
      this.setState('requesting');
      try {
        // Resume inside the button gesture, including browsers that require activation.
        const context = new this.Context();
        this.context = context;
        const resumed = Promise.resolve(context.resume()).then(() => null, error => error);
        const stream = await this.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
          video: false
        });
        if (token !== this.token || !this.isActive()) {
          stream.getTracks().forEach(track => track.stop());
          if (token === this.token) this.stop('navigation');
          return false;
        }
        this.stream = stream;
        const resumeError = await resumed;
        if (token !== this.token || !this.isActive()) {
          if (token === this.token) this.stop('navigation');
          return false;
        }
        if (resumeError) throw resumeError;
        if (context.state !== 'running') { this.fail('AUDIO_PAUSED'); return false; }
        const tracks = stream.getAudioTracks();
        if (!tracks.length || tracks.every(track => track.readyState === 'ended')) {
          this.fail('NotFoundError'); return false;
        }
        tracks.forEach(track => {
          const ended = () => { if (token === this.token) this.fail('DEVICE_LOST'); };
          track.addEventListener('ended', ended);
          this.trackListeners.push([track, ended]);
        });
        this.source = context.createMediaStreamSource(stream);
        this.analyser = context.createAnalyser();
        this.analyser.fftSize = 4096;
        this.analyser.smoothingTimeConstant = 0;
        this.source.connect(this.analyser);
        // No connection to destination: avoid monitoring/feedback from the speakers.
        this.buffer = new Float32Array(this.analyser.fftSize);
        this.startedAt = this.lastAt = this.now();
        this.noiseLevels = [];
        this.threshold = 0.012;
        this.voicedRunMs = 0;
        this.setState('calibrating');
        this.frameId = this.requestFrame(() => this.tick(token));
        return true;
      } catch (error) {
        if (token === this.token) this.fail(error.name || 'MICROPHONE_ERROR');
        return false;
      }
    }

    tick(token) {
      this.frameId = null;
      if (token !== this.token) return;
      if (!this.isActive()) { this.stop('navigation'); return; }
      if (!this.context || this.context.state !== 'running') { this.fail('AUDIO_PAUSED'); return; }
      const now = this.now();
      const elapsed = now - this.startedAt;
      // Do not award unobserved sound across a stalled/background frame.
      const delta = Math.min(125, Math.max(0, now - this.lastAt));
      this.lastAt = now;
      if (elapsed >= this.maximumMs) { this.stop('timeout'); return; }
      let signal;
      try {
        this.analyser.getFloatTimeDomainData(this.buffer);
        signal = this.analyze(this.buffer, this.context.sampleRate, this.threshold);
      } catch (_) {
        this.fail('MICROPHONE_ERROR'); return;
      }
      if (this.state === 'calibrating') {
        this.noiseLevels.push(signal.rms);
        if (elapsed >= this.calibrationMs) {
          this.noiseLevels.sort((a, b) => a - b);
          const ambient = this.noiseLevels[Math.floor((this.noiseLevels.length - 1) * 0.25)] || 0;
          this.threshold = Math.max(0.008, Math.min(0.08, ambient * 2.8));
          this.setState('listening');
        }
        this.onUpdate({ ...signal, voiced: false, progressMs: 0, requiredMs: this.requiredMs, calibrating: true });
      } else {
        this.voicedRunMs = signal.voiced ? this.voicedRunMs + delta : 0;
        // Reject isolated clicks/bursts; pauses preserve the already earned time.
        if (signal.voiced && this.voicedRunMs >= 150) this.progressMs = Math.min(this.requiredMs, this.progressMs + delta);
        this.onUpdate({ ...signal, progressMs: this.progressMs, requiredMs: this.requiredMs, calibrating: false });
        if (this.progressMs >= this.requiredMs) { this.stop('complete'); return; }
      }
      if (token === this.token) this.frameId = this.requestFrame(() => this.tick(token));
    }
  }

  root.VoicePracticeSession = VoicePracticeSession;

  const words = {
    kk: {
      choose: 'Дауысты дыбысты таңдаңыз', start: 'Микрофонды қосу', stop: 'Тоқтату', change: 'Басқа дыбыс', retry: 'Қайта көру',
      note: 'Бұл жаттығу дауыстың ұзақтығын ғана көрсетеді, дыбыстың дұрыс айтылуын бағаламайды. Музыка не басқа адамның дауысы да әсер етуі мүмкін. Аудио жазылмайды және жіберілмейді.',
      instruction: letter => `«${letter}» дыбысын жайлы дауыспен созыңыз. Барлығы 3 секунд жинаңыз. Үзіліс жасауға болады, айқайламаңыз.`,
      requesting: 'Браузерден микрофонға рұқсат беріңіз. Қаласаңыз, «Тоқтату» батырмасын басыңыз.',
      calibrating: 'Бір сәт тыныш отырыңыз: бөлмедегі дыбыс деңгейін өлшеп жатырмыз.',
      heard: 'Дауысқа ұқсас созылыңқы дыбыс естіліп тұр. Осылай жалғастырыңыз.',
      quiet: 'Жайлы дауыспен созып айтыңыз. Пойыз дыбыс естілгенде жүреді. Үзіліс жасауға болады.',
      complete: 'Жарайсың! 3 секунд созылыңқы дыбыс жиналды. Микрофон өшірілді.',
      stopped: 'Микрофон өшірілді. Дайын болсаңыз, қайта көріңіз.',
      timeout: 'Жаттығу тоқтатылды, микрофон өшірілді. Демалып алып, тыныш жерде қайта көріңіз.',
      level: 'Микрофон дыбысының деңгейі', timer: 'секунд', progress: 'Жиналған дауыс уақыты',
      errors: {
        INSECURE: 'Микрофон үшін сайтты HTTPS арқылы немесе localhost-та ашыңыз.',
        UNSUPPORTED: 'Бұл браузер микрофонды қолдамайды. Қолдауы бар жаңартылған браузерде HTTPS нұсқасын ашыңыз.',
        NotAllowedError: 'Микрофонға рұқсат берілмеді. Браузер мен құрылғы параметрлерінен осы сайтқа рұқсат беріп, қайта көріңіз.',
        SecurityError: 'Микрофонды қауіпсіздік параметрлері бұғаттады. Сайтқа берілген рұқсатты тексеріп, қайта көріңіз.',
        NotFoundError: 'Микрофон табылмады. Оны қосып, құрылғы параметрлерін тексеріңіз де, қайта көріңіз.',
        NotReadableError: 'Микрофон ашылмады. Оны пайдаланып тұрған басқа қолданбаны жауып, қайта көріңіз.',
        DEVICE_LOST: 'Микрофон ажыратылды. Қайта қосып, «Қайта көру» батырмасын басыңыз.',
        AUDIO_PAUSED: 'Браузер дыбысты тоқтатты. «Қайта көру» батырмасын басыңыз.',
        MICROPHONE_ERROR: 'Микрофон іске қосылмады. Қосылым мен рұқсатты тексеріп, қайта көріңіз.'
      }
    },
    ru: {
      choose: 'Выберите гласный звук', start: 'Включить микрофон', stop: 'Остановить', change: 'Другой звук', retry: 'Попробовать снова',
      note: 'Упражнение показывает длительность голоса, но не оценивает произношение. Музыка и чужой голос тоже могут запустить поезд. Аудио не записывается и никуда не отправляется.',
      instruction: letter => `Тяните «${letter}» комфортным голосом. Наберите в сумме 3 секунды. Можно делать паузы, не кричите.`,
      requesting: 'Разрешите микрофон в запросе браузера. Можно отменить кнопкой «Остановить».',
      calibrating: 'Секунду побудьте в тишине: измеряем фон в комнате.',
      heard: 'Слышен протяжный звук, похожий на голос. Продолжайте в удобном темпе.',
      quiet: 'Тяните звук комфортным голосом. Поезд движется, когда слышит звук. Можно сделать паузу.',
      complete: 'Готово! Набрано 3 секунды протяжного звука. Микрофон выключен.',
      stopped: 'Микрофон выключен. Когда будете готовы, попробуйте снова.',
      timeout: 'Упражнение остановлено, микрофон выключен. Отдохните и попробуйте снова в тихом месте.',
      level: 'Уровень звука микрофона', timer: 'секунд', progress: 'Набранное время голоса',
      errors: {
        INSECURE: 'Для микрофона откройте сайт через HTTPS или localhost.',
        UNSUPPORTED: 'Этот браузер не поддерживает микрофон. Откройте HTTPS-версию в современном браузере с поддержкой микрофона.',
        NotAllowedError: 'Доступ к микрофону не разрешён. Разрешите его этому сайту в настройках браузера и устройства и повторите попытку.',
        SecurityError: 'Доступ к микрофону заблокирован настройками безопасности. Проверьте разрешение для сайта и попробуйте снова.',
        NotFoundError: 'Микрофон не найден. Подключите его, проверьте настройки устройства и попробуйте снова.',
        NotReadableError: 'Не удалось открыть микрофон. Закройте другие приложения, использующие его, и попробуйте снова.',
        DEVICE_LOST: 'Микрофон отключён. Подключите его и нажмите «Попробовать снова».',
        AUDIO_PAUSED: 'Браузер приостановил звук. Нажмите «Попробовать снова».',
        MICROPHONE_ERROR: 'Не удалось запустить микрофон. Проверьте подключение и разрешения и попробуйте снова.'
      }
    }
  };

  root.getVoicePracticeLabels = () => words[typeof root.getProfileLang === 'function' && root.getProfileLang() === 'ru' ? 'ru' : 'kk'];

  function mountVoiceGame() {
    const screen = root.document.getElementById('g0Task2');
    const container = root.document.getElementById('voiceGameContainer');
    const center = root.document.getElementById('voiceCenterBtn');
    const feedback = root.document.getElementById('voiceFeedback');
    const trainContainer = root.document.getElementById('voiceTrainContainer');
    if (!screen || !container || !center || !feedback || !trainContainer || screen.dataset.voiceMounted) return;
    screen.dataset.voiceMounted = 'true';
    const lang = () => typeof root.getProfileLang === 'function' && root.getProfileLang() === 'ru' ? 'ru' : 'kk';
    const labels = () => words[lang()];
    let selected = '';
    let session;
    let lastStatus = '';
    let statusChangedAt = -Infinity;
    let sampleAudio = null;
    const progress = root.document.getElementById('voiceProgressBar');
    const train = root.document.getElementById('trainIcon');
    const timer = root.document.getElementById('trainTimer');
    const note = root.document.createElement('p');
    note.id = 'voicePracticeNote';
    feedback.after(note);
    feedback.setAttribute('role', 'status');
    feedback.setAttribute('aria-live', 'polite');
    const status = root.document.createElement('p');
    status.id = 'voiceSessionStatus';
    status.setAttribute('aria-live', 'polite');
    trainContainer.appendChild(status);
    const levelLabel = root.document.createElement('label');
    levelLabel.htmlFor = 'voiceLevelMeter';
    const meter = root.document.createElement('meter');
    meter.id = 'voiceLevelMeter';
    meter.min = 0; meter.max = 1; meter.value = 0;
    trainContainer.append(levelLabel, meter);
    const controls = root.document.createElement('div');
    controls.id = 'voicePracticeControls';
    const start = root.document.createElement('button');
    const stop = root.document.createElement('button');
    const choose = root.document.createElement('button');
    [start, stop, choose].forEach(button => {
      button.type = 'button';
      button.className = 'btn btn-secondary';
      controls.appendChild(button);
    });
    start.id = 'voiceStartBtn'; stop.id = 'voiceStopBtn'; choose.id = 'voiceChooseBtn';
    trainContainer.after(controls);
    // Support an older embedded page until its markup is updated to a real button.
    if (center.tagName !== 'BUTTON') {
      center.setAttribute('role', 'button');
      center.tabIndex = 0;
      center.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); center.click(); }
      });
    }
    center.removeAttribute('onclick');
    center.setAttribute('aria-describedby', note.id);
    if (progress) {
      progress.setAttribute('role', 'progressbar');
      progress.setAttribute('aria-valuemin', '0');
      progress.setAttribute('aria-valuemax', '100');
    }
    if (train) train.setAttribute('aria-hidden', 'true');

    function stopSample() {
      if (sampleAudio) { sampleAudio.pause(); sampleAudio = null; }
    }
    function showFeedback(text, error = false) {
      feedback.textContent = text;
      feedback.className = error ? 'feedback error' : 'feedback';
    }
    function updateProgress(milliseconds = 0, required = 3000) {
      const percentage = Math.min(100, milliseconds / required * 100);
      if (progress) {
        progress.style.width = `${percentage}%`;
        progress.textContent = `${Math.floor(percentage)}%`;
        progress.setAttribute('aria-valuenow', String(Math.floor(percentage)));
        progress.setAttribute('aria-valuetext', `${(milliseconds / 1000).toFixed(1)} / ${required / 1000} ${labels().timer}`);
        progress.setAttribute('aria-label', labels().progress);
      }
      if (timer) timer.textContent = `${(milliseconds / 1000).toFixed(1)} / ${required / 1000} ${labels().timer}`;
      if (train) {
        // Both ends stay within the track, including narrow/mobile screens.
        const trackWidth = train.parentElement.clientWidth;
        const width = train.offsetWidth || 60;
        train.style.left = `${Math.max(0, trackWidth - width) * percentage / 100}px`;
        train.style.transform = 'scaleX(-1)';
      }
    }
    function renderControls(state) {
      const active = ['requesting', 'calibrating', 'listening'].includes(state);
      start.hidden = !selected || active;
      start.disabled = active;
      stop.hidden = !active;
      choose.hidden = !selected;
      start.textContent = ['error', 'stopped', 'complete'].includes(state) ? labels().retry : labels().start;
      stop.textContent = labels().stop;
      choose.textContent = labels().change;
      controls.hidden = !selected;
      screen.setAttribute('aria-busy', state === 'requesting' ? 'true' : 'false');
    }
    session = new VoicePracticeSession({
      isActive: () => screen.isConnected && screen.classList.contains('active') && !root.document.hidden,
      onState(state, reason) {
        const stopWasFocused = root.document.activeElement === stop;
        renderControls(state);
        if (stopWasFocused && !start.hidden && !['navigation', 'reset'].includes(reason)) start.focus();
        const text = labels();
        if (state === 'requesting') showFeedback(text.requesting);
        if (state === 'calibrating') showFeedback(text.calibrating);
        if (state === 'listening') showFeedback(text.instruction(selected));
        if (state === 'error') showFeedback(text.errors[reason] || text.errors.MICROPHONE_ERROR, true);
        if (state === 'complete') {
          showFeedback(text.complete);
          feedback.classList.add('success');
          // This rewards completing practice, never a claim that the vowel was correct.
          if (typeof root.showReward === 'function') root.showReward();
        }
        if (state === 'stopped' && !['navigation', 'reset'].includes(reason)) {
          showFeedback(reason === 'timeout' ? text.timeout : text.stopped);
        }
        if (!['requesting', 'calibrating', 'listening'].includes(state)) {
          meter.value = 0;
          status.textContent = '';
          lastStatus = '';
        }
      },
      onUpdate(data) {
        meter.value = Math.min(1, data.rms * 5);
        updateProgress(data.progressMs, data.requiredMs);
        const nextStatus = data.calibrating ? '' : (data.voiced ? labels().heard : labels().quiet);
        if (nextStatus !== lastStatus && root.performance.now() - statusChangedAt >= 500) {
          status.textContent = nextStatus;
          lastStatus = nextStatus;
          statusChangedAt = root.performance.now();
        }
      }
    });

    function positionChoices() {
      const bubbles = container.querySelectorAll('.small-bubble');
      const bubbleSize = bubbles[0]?.offsetWidth || 70;
      const radius = Math.max(0, (Math.min(container.clientWidth, container.clientHeight) - bubbleSize) / 2 - 12);
      bubbles.forEach((bubble, index) => {
        const angle = (-90 + index * 360 / bubbles.length) * Math.PI / 180;
        bubble.style.left = `calc(50% + ${Math.cos(angle) * radius}px)`;
        bubble.style.top = `calc(50% + ${Math.sin(angle) * radius}px)`;
        bubble.style.transform = 'translate(-50%, -50%)';
      });
    }
    function generateChoices() {
      container.querySelectorAll('.small-bubble').forEach(bubble => bubble.remove());
      const vowels = lang() === 'ru' ? ['А', 'О', 'У', 'И', 'Э', 'Ы'] : ['А', 'Ә', 'О', 'Ө', 'Ұ', 'Ү', 'Ы', 'І'];
      vowels.forEach(letter => {
        const button = root.document.createElement('button');
        button.type = 'button';
        button.className = 'small-bubble';
        button.textContent = letter;
        button.setAttribute('aria-pressed', 'false');
        button.addEventListener('click', () => selectLetter(letter));
        container.appendChild(button);
      });
      container.classList.add('expanded');
      center.setAttribute('aria-expanded', 'true');
      positionChoices();
    }
    function selectLetter(letter) {
      if (!Array.from(container.querySelectorAll('.small-bubble')).some(button => button.textContent === letter)) return;
      selected = letter;
      container.querySelectorAll('.small-bubble').forEach(button => button.setAttribute('aria-pressed', String(button.textContent === letter)));
      center.textContent = `${letter} · ${labels().start}`;
      showFeedback(labels().instruction(letter));
      renderControls('ready');
      stopSample();
      // Only preview a local recording; errors do not interfere with microphone use.
      const paths = typeof root.getLetterAudioPaths === 'function' ? root.getLetterAudioPaths(letter) : [`sounds/letters/letter_${letter.toLowerCase()}.mp3`];
      const path = Array.isArray(paths) ? paths[0] : null;
      if (path) {
        sampleAudio = new root.Audio(path);
        sampleAudio.play().catch(() => {});
      }
    }
    function reset() {
      session.stop('reset');
      stopSample();
      selected = '';
      container.hidden = false;
      container.style.display = '';
      container.classList.remove('hidden', 'expanded');
      container.querySelectorAll('.small-bubble').forEach(bubble => bubble.remove());
      center.style.display = '';
      center.textContent = labels().choose;
      center.setAttribute('aria-expanded', 'false');
      trainContainer.style.display = 'none';
      note.textContent = labels().note;
      levelLabel.textContent = `${labels().level} `;
      meter.setAttribute('aria-label', labels().level);
      updateProgress();
      showFeedback(labels().choose);
      renderControls('idle');
    }
    function begin() {
      if (!selected || ['requesting', 'calibrating', 'listening'].includes(session.state)) return;
      stopSample();
      if (typeof root.stopAllAppAudio === 'function') root.stopAllAppAudio();
      else if (typeof root.stopAllAudio === 'function') root.stopAllAudio();
      if (typeof root.stopArticulationPractice === 'function') root.stopArticulationPractice();
      container.hidden = true;
      container.style.display = 'none';
      trainContainer.style.display = 'block';
      updateProgress();
      void session.start();
      if (!stop.hidden) stop.focus();
    }
    function handleCenter() {
      if (selected) begin();
      else {
        generateChoices();
        container.querySelector('.small-bubble')?.focus();
      }
    }
    center.addEventListener('click', handleCenter);
    start.addEventListener('click', begin);
    stop.addEventListener('click', () => { session.stop(); start.focus(); });
    choose.addEventListener('click', () => { reset(); generateChoices(); container.querySelector('.small-bubble')?.focus(); });
    root.initVoiceGame = reset;
    root.handleVoiceCenterClick = handleCenter;
    root.selectVoiceLetter = selectLetter;
    root.startVoicePractice = begin;
    root.stopVoicePractice = root.stopVoiceGame = () => { stopSample(); session.stop(); };
    root.positionBubblesExpanded = positionChoices;
    root.addEventListener('resize', () => { positionChoices(); updateProgress(session.progressMs); });
    root.addEventListener('pagehide', () => { stopSample(); session.stop('navigation'); });
    root.document.addEventListener('visibilitychange', () => {
      if (root.document.hidden) { stopSample(); session.stop('background'); }
    });
    root.addEventListener('profile-language-change', reset);
    let wasActive = screen.classList.contains('active');
    const observer = new root.MutationObserver(() => {
      const active = screen.classList.contains('active');
      if (!active) { stopSample(); session.stop('navigation'); }
      else if (!wasActive) reset();
      wasActive = active;
    });
    observer.observe(screen, { attributes: true, attributeFilter: ['class'] });
    reset();
  }

  root.mountVoiceGame = mountVoiceGame;
  if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', mountVoiceGame, { once: true });
  else mountVoiceGame();
})(window);
