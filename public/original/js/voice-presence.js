(function () {
  'use strict';
  const copy = {
    back: ['← Дыбыспен жұмыс', '← Работа со звуком'],
    title: ['Дауыс бар ма?', 'Есть ли голос?'],
    choose: ['Педагогтің бейнесін таңдаңыз', 'Выберите видео педагога'],
    guide: [
      'Педагог қысқа сөйлем айтатын бейнені таңдаңыз. Ерні анық көрініп, дауысы естілуі керек. Бейне осы құрылғыда ойнатылады.',
      'Выберите короткое видео, в котором педагог произносит фразу. Должны быть видны губы и слышен голос. Видео воспроизводится на этом устройстве.'
    ],
    video: ['Педагогтің ауыз қимылы', 'Артикуляция педагога'],
    yes: ['Дауыспен', 'С голосом'], no: ['Дауыссыз', 'Без голоса'],
    loading: ['Бейне ашылып жатыр…', 'Открываем видео…'],
    unsupported: ['Бейне ашылмады. Басқа бейнефайл таңдаңыз.', 'Не удалось открыть видео. Выберите другой видеофайл.'],
    noVideo: ['Кескіні бар бейне таңдаңыз. Бұл файлда бейнежол табылмады.', 'Выберите файл с изображением педагога. В этом файле не найдена видеодорожка.'],
    noVoice: ['Дыбыс анықталмады. Дауысы анық естілетін басқа бейне таңдаңыз.', 'Звуковой сигнал не обнаружен. Выберите видео, в котором хорошо слышен голос.'],
    failed: ['Бейне ойнатылмады. Қайтадан ашып көріңіз.', 'Не удалось воспроизвести видео. Попробуйте ещё раз.'],
    preview: ['Педагогке. Бейнежазбаны қарап, дауысы мен ерін қимылын тексеріңіз.', 'Педагогу. Посмотрите запись и проверьте, что речь слышна и губы видны.'],
    previewPlay: ['Бейнені тексеру', 'Проверить видео'],
    confirm: ['Дауысы естіледі, ерні көрінеді. Бастау', 'Речь слышна, губы видны. Начать'],
    exampleVoice: ['1 / 2 · Үлгі. Педагог дауыспен сөйлейді. Ерін қимылына қара.', '1 / 2 · Образец. Педагог говорит с голосом. Посмотри на движение губ.'],
    exampleSilent: ['2 / 2 · Үлгі. Сол ерін қимылы, бірақ дауысы естілмейді.', '2 / 2 · Образец. Губы движутся так же, голос не звучит.'],
    watch: ['▶ Бейнені көру', '▶ Посмотреть видео'],
    replay: ['↻ Қайта көру', '↻ Посмотреть ещё раз'],
    nextExample: ['Келесі үлгі', 'Следующий образец'],
    begin: ['Тапсырманы бастау', 'Начать задание'],
    question: ['Бейнені көр. Дауыспен бе, дауыссыз ба? Белгіні таңда.', 'Посмотри видео. С голосом или без голоса? Выбери знак.'],
    wrong: ['↻ Қайта көріп, екінші рет таңда.', '↻ Посмотри ещё раз и попробуй снова.'],
    right: ['✓ Дұрыс!', '✓ Верно!'], next: ['Келесі тапсырма', 'Следующее задание'],
    complete: ['✓ 2 / 2 · Екі белгіні де дұрыс таңдадың!', '✓ 2 / 2 · Ты верно выбрал оба знака!'],
    restart: ['Қайта жаттығу', 'Потренироваться ещё раз'],
    record: ['Камерадан қысқа бейне жазу', 'Записать короткое видео с камеры'],
    finishRecording: ['Жазуды аяқтау', 'Завершить запись'], cancelRecording: ['Бас тарту', 'Отменить'],
    permission: ['Камера мен микрофонды пайдалануға рұқсат беріңіз.', 'Разрешите доступ к камере и микрофону.'],
    recording: ['Ерніңізді көрсетіп, қысқа сөйлем айтыңыз. Жазу 15 секундтан кейін аяқталады.', 'Посмотрите в камеру и произнесите короткую фразу. Запись завершится через 15 секунд.'],
    cameraFailed: ['Камера немесе микрофон ашылмады. Рұқсаттарды тексеріңіз немесе дайын бейне таңдаңыз.', 'Не удалось использовать камеру или микрофон. Проверьте разрешения или выберите готовый файл.']
  };

  document.addEventListener('DOMContentLoaded', () => {
    const screen = document.getElementById('voicePresenceScreen');
    const part = name => screen.querySelector('[data-part="' + name + '"]');
    const act = name => screen.querySelector('[data-act="' + name + '"]');
    const file = screen.querySelector('input[type="file"]');
    const tr = key => copy[key][window.getProfileLang?.() === 'ru' ? 1 : 0];
    const buttons = { play: act('play'), next: act('continue'), yes: act('yes'), no: act('no') };
    let video = part('video'), objectUrl = '', context, analyser, gain, samples, frame = 0, playback = 0;
    let phase = 'setup', index = 0, questions = [], attempts = [], message = '';
    let ready = false, playing = false, watched = false, answered = false, signal = false;
    let take = null;

    function render() {
      screen.querySelectorAll('[data-copy]').forEach(node => { node.textContent = tr(node.dataset.copy); });
      video.setAttribute('aria-label', tr('video'));
      part('setup').hidden = phase !== 'setup' && phase !== 'preview';
      file.disabled = !!take;
      act('record').hidden = !!take || !navigator.mediaDevices?.getUserMedia || !window.MediaRecorder;
      act('finishRecording').hidden = take?.recorder?.state !== 'recording';
      act('cancelRecording').hidden = !take;
      part('camera').hidden = !take?.stream;
      video.hidden = !ready;
      const step = phase === 'preview' ? tr('preview')
        : phase === 'example' ? tr(index === 0 ? 'exampleVoice' : 'exampleSilent')
        : phase === 'question' ? (index + 1) + ' / 2 · ' + tr('question')
        : phase === 'complete' ? tr('complete') : '';
      part('step').textContent = step;
      part('feedback').textContent = message ? tr(message) : '';
      buttons.play.hidden = !ready || answered || phase === 'complete';
      buttons.play.disabled = playing;
      buttons.play.textContent = tr(watched || message === 'wrong' ? 'replay' : phase === 'preview' ? 'previewPlay' : 'watch');
      buttons.next.hidden = !(phase === 'complete' || (watched && (phase !== 'question' || answered)));
      buttons.next.textContent = tr(phase === 'complete' ? 'restart' : phase === 'preview' ? 'confirm'
        : phase === 'example' ? (index === 0 ? 'nextExample' : 'begin') : 'next');
      part('choices').hidden = phase !== 'question';
      buttons.yes.disabled = buttons.no.disabled = !watched || answered || playing;
    }
    function stopPlayback() {
      playback++;
      cancelAnimationFrame(frame);
      video.pause();
      playing = false;
    }
    function clearSource() {
      stopPlayback();
      const previous = video;
      video = document.createElement('video');
      video.dataset.part = 'video'; video.preload = 'metadata'; video.playsInline = true;
      video.disablePictureInPicture = true; video.hidden = true;
      previous.replaceWith(video);
      previous.removeAttribute('src'); previous.load();
      if (context) void context.close().catch(() => {});
      context = analyser = gain = samples = null;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = ''; ready = watched = answered = signal = false; phase = 'setup'; message = '';
    }
    function loadSource(selected) {
      clearSource();
      if (!selected) { render(); return; }
      const candidate = video;
      candidate.addEventListener('loadedmetadata', () => {
        if (candidate !== video) return;
        ready = candidate.videoWidth > 0 && candidate.videoHeight > 0;
        phase = ready ? 'preview' : 'setup';
        message = ready ? '' : 'noVideo'; render();
      });
      candidate.addEventListener('error', () => {
        if (candidate !== video) return;
        stopPlayback(); ready = watched = answered = false; phase = 'setup'; message = 'unsupported'; render();
      });
      candidate.addEventListener('ended', () => {
        if (candidate !== video || !playing) return;
        stopPlayback();
        if (phase === 'preview' && !signal) {
          watched = false; message = 'noVoice';
        } else { watched = true; message = ''; }
        render();
      });
      objectUrl = URL.createObjectURL(selected); message = 'loading'; render();
      candidate.src = objectUrl;
    }
    file.addEventListener('change', () => loadSource(file.files[0]));

    function cancelRecording() {
      const previous = take;
      take = null;
      if (!previous) return;
      clearTimeout(previous.timer);
      if (previous.recorder?.state === 'recording') previous.recorder.stop();
      previous.stream?.getTracks().forEach(track => track.stop());
      part('camera').srcObject = null;
    }
    act('record').addEventListener('click', async () => {
      if (take) return;
      clearSource(); file.value = '';
      const current = take = {};
      message = 'permission'; render();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { facingMode: 'user' } });
        if (take !== current) { stream.getTracks().forEach(track => track.stop()); return; }
        current.stream = stream;
        if (!stream.getAudioTracks().length || !stream.getVideoTracks().length) throw new Error('Missing media track');
        part('camera').srcObject = stream;
        const recorder = current.recorder = new MediaRecorder(stream);
        const chunks = [];
        recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
        recorder.onerror = () => {
          if (take !== current) return;
          cancelRecording(); message = 'cameraFailed'; render();
        };
        recorder.onstop = () => {
          if (take !== current) return;
          const recording = new Blob(chunks, { type: recorder.mimeType });
          cancelRecording();
          if (recording.size) loadSource(recording);
          else { message = 'cameraFailed'; render(); }
        };
        recorder.start(); current.timer = setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, 15000);
        message = 'recording'; render();
      } catch {
        if (take !== current) return;
        cancelRecording(); message = 'cameraFailed'; render();
      }
    });
    act('finishRecording').addEventListener('click', () => {
      if (take?.recorder?.state === 'recording') take.recorder.stop();
      render();
    });
    act('cancelRecording').addEventListener('click', () => {
      cancelRecording(); message = ''; render();
    });

    async function play() {
      if (!ready || playing || answered) return;
      const version = ++playback;
      playing = true; watched = false; message = ''; render();
      try {
        // The same frames play both times. The gain also mutes the Web Audio output.
        const voiced = phase === 'preview' || (phase === 'example' ? index === 0 : questions[index]);
        video.muted = !voiced;
        if (!context) {
          context = new (window.AudioContext || window.webkitAudioContext)();
          const source = context.createMediaElementSource(video);
          analyser = context.createAnalyser(); analyser.fftSize = 2048;
          samples = new Uint8Array(analyser.fftSize);
          gain = context.createGain(); source.connect(analyser); analyser.connect(gain); gain.connect(context.destination);
        }
        gain.gain.value = voiced ? 1 : 0;
        if (context.state !== 'running') await context.resume();
        if (version !== playback) return;
        video.currentTime = 0;
        if (phase === 'preview') {
          signal = false;
          function measure() {
            if (version !== playback || signal) return;
            analyser.getByteTimeDomainData(samples);
            signal = samples.some(value => Math.abs(value - 128) > 1);
            if (!signal) frame = requestAnimationFrame(measure);
          }
          measure();
        }
        await video.play();
      } catch {
        if (version !== playback) return;
        stopPlayback(); message = 'failed'; render();
      }
    }
    function advance(to, at = 0) {
      stopPlayback(); phase = to; index = at; watched = answered = false; message = '';
      if (ready) video.currentTime = 0;
      render();
    }
    function beginQuestions() {
      const first = Math.random() < 0.5;
      questions = [first, !first]; attempts = [0, 0]; advance('question');
    }
    function answer(choice) {
      if (phase !== 'question' || !watched || playing || answered) return;
      attempts[index]++;
      if (choice !== questions[index]) { watched = false; message = 'wrong'; render(); return; }
      answered = true;
      if (index === 0) { message = 'right'; render(); return; }
      const results = questions.map((voiced, i) => ({ id: voiced ? 'voiced' : 'silent', attempts: attempts[i] }));
      window.CorexGrades?.recordListening?.('voice-presence', { completed: 2, attempts: attempts[0] + attempts[1], results });
      advance('complete');
    }
    buttons.play.addEventListener('click', play);
    buttons.next.addEventListener('click', () => {
      if (phase === 'complete') { beginQuestions(); return; }
      if (!watched) return;
      if (phase === 'preview') advance('example');
      else if (phase === 'example' && index === 0) advance('example', 1);
      else if (phase === 'example') beginQuestions();
      else if (phase === 'question' && answered) advance('question', 1);
    });
    buttons.yes.addEventListener('click', () => answer(true));
    buttons.no.addEventListener('click', () => answer(false));
    act('back').addEventListener('click', () => window.showScreen('grade0SoundsMenu'));
    function leave() { cancelRecording(); clearSource(); file.value = ''; render(); }
    new MutationObserver(() => {
      if ((objectUrl || take) && !screen.classList.contains('active')) leave();
    }).observe(screen, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && take) { cancelRecording(); message = ''; render(); }
      if (document.hidden && playing) { stopPlayback(); watched = false; render(); }
    });
    window.addEventListener('pagehide', leave);
    window.addEventListener('profile-language-change', render);
    render();
  });
})();
