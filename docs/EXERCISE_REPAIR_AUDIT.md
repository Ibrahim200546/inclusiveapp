# Проверка упражнений — 2026-10-01

Рабочая копия: `C:\Users\user\Desktop\1\inclusiveapp`, ветка `fix/exercises-content-responsive`, база `051b65e`. Путь `Desktop\Folders\inclusiveapp`, указанный в текущем контексте, не использовался для правок: рабочие файлы предыдущих этапов находятся в `Desktop\1\inclusiveapp`.

## Изменения и статус

| Функция | Статус и доказательство |
| --- | --- |
| Радиальные меню и центр голосового упражнения | Исправлены перекрывающие CSS transform/grid, сохранены исходные круги и градиенты. Независимый Chrome: 60 скриншотов, 5 размеров, обе темы, без горизонтального переполнения или пересечения кругов; центр в 25 состояниях отклоняется менее чем на 0.001 px. |
| Голос: выбор, образец, запуск, повтор, Stop, Back | Исправлено, повторно проверено реальными кликами в Chrome. Отдельный модуль владеет микрофоном, освобождает поздние streams и AudioContext. |
| Голосовая активность | Локальные RMS и периодичность, измерение длительности по времени. Синтетический 220 Hz завершает 2 секунды один раз; тишина и широкополосный шум не завершают. Это не распознавание выбранной буквы и не оценка произношения. Музыка или гудение могут пройти. |
| Настоящий микрофон | Первый тест: peak RMS 0.0151, голос не найден. Повтор: RMS 0.2082, 34 голосовых кадра из 1342, 48 kHz. Дополнительный реальный тест самого упражнения: requesting → listening → complete, длительность 2000 ms, peak RMS 0.2565, награда 1, track ended, pageerrors отсутствуют. Прохождение настоящим голосом подтверждено. Аудио не записывалось и не отправлялось. |
| 20 новых слов | Добавлены по 5 слов на 1–4 слога; исходные 4 сохранены. Метаданные источников, число гласных, наличие файлов и декодирование проверены. Chrome воспроизводит все 24 записи; ошибочный ответ, повтор и однократная награда проверены. Семантическое прослушивание человеком всех новых записей ещё не завершено. |
| Домбыра | Добавлен настоящий лицензированный фрагмент, автор и CC BY 3.0 доступны в приложении, включая офлайн HTML. Воспроизведение, ошибка, повтор, ответ и остановка при переходе проверены. |
| Қобыз, сыбызғы / сазсырнай | Заблокировано: разрешённых записей не найдено, пользователь сообщил, что своих нет. Карточки без записи и подменённые звуки не добавлялись. Нужны записи с разрешением автора или открытой лицензией. |
| Клавиатура | Центры и варианты изменённых упражнений получили role, tabindex, Enter/Space; скрытые радиальные пункты исключены из Tab. Независимый тест раскрытия по Enter прошёл. |
| Кнопка повторного прослушивания | Добавлена; найденное перекрытие нижней панелью исправлено отступом для прокрутки. |
| Текст тёмной темы | Найден низкий контраст инструкции и атрибуции; исправлен только в изменённых упражнениях. |
| Награды / повторный ответ | В изменённых упражнениях проверена одна награда на ответ; ошибки аудио и autoplay не начисляют награду. |
| Вывод данных лидерборда | Устранена HTML-интерполяция имени и URL, используется textContent и img.src с проверкой протокола; 2 теста проверяют вредоносные строки без реальных данных учеников. |
| Публичные React-маршруты | Chrome проверил /, /about, /program, /materials, /methodology, /results, /contact, /download, /login и reload; /practice и /practice-new переходят к учебному интерфейсу, неизвестный маршрут показывает 404. |
| Консоль / сеть | В независимых проверенных сценариях pageerror отсутствуют; новые медиа и атрибуция доступны. Это не проверка всех внешних API. |
| Supabase авторизованные сценарии / RLS | Не проверены: использованы только гостевые сценарии, реальные данные не менялись. Схема и production-конфигурация не изменялись. |
| Остальные учебные задания, все модальные окна, полное сохранение состояния | Не прошли полный сценарный аудит. Инвентарь 59 экранов: гостевая навигация и наличие всех onclick-функций проверены, ошибок нет. Окно артикуляции открывается и закрывается; полное прохождение всех упражнений не проверено. Старые дубли голосовых функций остались в legacy-файлах; подключённый последним модуль управляет активным упражнением. |
| Android / Electron / iOS | Нативные файлы не изменены. APK/EXE/IPA, аппаратные разрешения и упакованные deep links не проверены. |

## Проверки кода

`npm install`, `npm run build`, `npm run lint`, `npx tsc -b --noEmit`, `npm run test`: прошли. 18 тестов, 5 файлов. Lint: 8 существующих предупреждений Fast Refresh, ошибок нет. npm сообщает 39 уязвимостей зависимостей; автоматическое обновление зависимостей не выполнялось. Browserslist сообщает устаревшую базу.

## Артефакты

`C:\Users\user\.codex\visualizations\2026\10\01\01a0f638-6a94-7e63-b95b-1420497f6e99\inclusiveapp-qa`:
- baseline.json и before-*.png — 50 исходных скриншотов;
- independent-ui.json и independent-ui-*.png — независимая матрица;
- independent-functions.json, independent-voice.json, independent-routes.json;
- real-microphone.json, real-microphone-repeat.json — только агрегированные метрики, не голосовые записи.

Источники и лицензии: `docs/LEARNING_AUDIO_SOURCES.md`, встроенная атрибуция `public/original/sounds/kazakh-instruments/ATTRIBUTION.html`.

## Приёмка

Полная приёмка не завершена. До финального коммита нужны разрешённые записи недостающих инструментов, смысловое прослушивание новых записей, завершение оставшихся сценариев аудита. Коммит, push и deploy не выполнялись. Чужие `.codex/`, `tools/`, `skills-lock.json` не включаются в изменения.

Настоящий browser zoom 200% подтверждён: chrome.settingsPrivate.setDefaultZoom(2), viewport1366×768, CSS683×384, devicePixelRatio2. 12 сценариев (6 экранов × 2 темы) без горизонтального переполнения, центрирование сохранено. Артефакты independent-zoom200.json/PNG. Финальный контраст перепроверен отдельно.
Дополнительный источник қобыза: https://archives.crem-cnrs.fr/archives/collections/CNRSMH_E_2004_012_013/ — Legal rights: Restreint (enregistrement édité), открытого разрешения на повторное использование нет. Не включён.

## Файлы изменений

- public/original/index2.html — подключения модулей и scoped CSS.
- public/original/exercise-responsive.css — центры, радиальные меню, адаптивность, контраст и место для навигации.
- public/original/js/train-voice-session.js — владение микрофоном, анализ активности и длительности, очистка.
- public/original/js/train-voice-ui.js — выбор, образец, поезд, остановка и ошибки.
- public/original/js/exercise-accessibility.js — клавиатура и состояния радиальных пунктов.
- public/original/js/app-audio.js — устранена блокировка центра голосового упражнения при воспроизведении образца.
- public/original/js/extra-learning-content.js — 20 слов и домбыра с метаданными.
- public/original/js/extra-learning-ui.js — настоящее упражнение, повтор, ошибки и однократная награда.
- public/original/script.js — безопасный вывод лидерборда.
- public/original/sounds/syllables/extra/* — 9 новых внешних файлов; 11 существующих записей используются по прежним путям.
- public/original/sounds/kazakh-instruments/dombra.mp3 и ATTRIBUTION.html.
- src/test/trainVoiceSession.test.ts, extraLearningContent.test.ts, leaderboardSafety.test.ts.
- docs/LEARNING_AUDIO_SOURCES.md, EXERCISE_REPAIR_AUDIT.md.

## Уточнение: распознавание выбранной буквы (новое требование)

2026-10-01: пользователь требует учитывать именно выбранный звук, включая повторный /п/, и разрешил загрузку локальной модели без отправки голоса. Коммит и push разрешены условно — после подтверждения корректной работы.

Текущий поезд не соответствует этому требованию: TrainVoiceSession измеряет голосовую активность и 2000 ms, не идентичность фонемы. Выбор содержит только 8 гласных, П отсутствует. Старый PhonemeValidator не используется активным заданием; его спектрограмма также затеняет window локальным Float32Array, поэтому подключать его без проверки нельзя.

Изолированно, вне приложения и репозитория, загружены:
- facebook/wav2vec2-xlsr-53-espeak-cv-ft, Apache-2.0, revision 2c733782da5604684829819a5eb744c193fe9398 (FP32, 1.26 GB);
- qnighy/wav2vec2-xlsr-53-espeak-cv-ft-ONNX, Apache-2.0, revision d2987af7ae07d53eafee15dc7190479062faa1e8 (q4, 241430967 bytes).

Локальная Python-проверка: P в первом фрагменте даёт p; T даёт t; тишина, шум и синус220Hz не дают фонем. Но казахские гласные распознаются неоднозначно: Ұ → o, Ү → ɛ, Ы → ɑ, І → ɛ. Эти результаты нельзя превращать в произвольную таблицу разрешённых совпадений: она может принять другую букву. Исходные Alippe-файлы включают название буквы и слово, поэтому не являются полноценной матрицей изолированных фонем.

Данные проверки: QA/phoneme-model-probe.json. Веса и runtime находятся в LocalAppData/Temp, не добавлены в package.json или public. Перед интеграцией обязательны браузерная проверка и реальные положительные/отрицательные произнесения. /п/ — смычный звук: проверяются короткие повторения, а не непрерывная двухсекундная гласная. Модель с неподтверждённой точностью не считается выполнением требования.

### Проверка выбранной фонемы — результаты живого микрофона

- Пользователь пояснил: «П» произносил как «пы-пы», то есть согласная с гласной. Для такого режима должна проверяться П в сочетании, без принятия Б/Т/К; это отдельный сценарий от протяжной гласной.
- Автоматическое окно П: RMS 0.02733, свободное распознавание h ɑ h ɑ, выбранная П не подтверждена.
- Окно Б: RMS 0.000429, фонем нет. Пользователь подтвердил произнесение; из-за слабого сигнала нельзя считать это валидным отрицательным тестом распознавания буквы.
- Длинное окно У: RMS 0.04237, распознаны другие фонемы, выбранная У не подтверждена. Длительность обрабатываемого фрагмента 29.4 s, обработка 101.3 s. Такой размер фрагмента не подходит для интерактивного упражнения.
- Проверено устройство: default Microphone Array (AMD Audio Device), вход48kHzmono; браузерное преобразование в16kHz для модели. Идентификаторы устройств не сохранялись.
- Пользователь сам запустил интерактивный тест У с индикатором: maxRMS0.15654, peak0.41076, 16kHz, модель не выдала фонем; обработка15.63s. Это важный отрицательный результат при заметном уровне сигнала.

Изолированная диагностическая страница: http://127.0.0.1:8133/, файл QA/voice-validation.html. Она не начисляет награды и не меняет production-интерфейс; PCM остаётся в памяти и обнуляется. Сохраняются только агрегированные показатели и результат декодера. Запросы моделей/runtime идут исключительно на localhost. Артефакты real-phoneme-probe.json, real-phoneme-long-probe.json, interactive-phoneme-results.jsonl.

Второй эксперимент — CUPE-2i (GPL-3.0, только QA, не добавлен в приложение): q8 ONNX несовместим с CPU ConvInteger, FP32 быстро работает, но пока не проходит положительные образцы. Проверяется соответствие исходному PyTorch-чекпойнту. Декодирование без ограничений выбранной буквой; исключать шум и насильно выбирать следующую фонему для начисления успеха недопустимо.

Условие для коммита и push не выполнено. Старое VAD-упражнение остаётся измерителем голосовой активности, не валидатором выбранной фонемы. Модели, не прошедшие проверку, не подключаются к нему.

## Selected phoneme integration (2026-10-01)

Voice exercise now uses `TrainPhonemeSession` and a local worker. Unconstrained phonemes are compared with the selected letter; incorrect/empty results receive no reward. Modes: short event, long vowel with 2 seconds of measured voiced activity, long stop consonant with 3 recognized bursts. Carrier vowels are allowed for consonants, but competing consonants and mixed words are rejected. Details and pinned model provenance: `LOCAL_PHONEME_RECOGNITION.md`.

Browser integration checks: correct A through file-backed test microphone gives exactly one reward; ordinary fake microphone noise gives zero rewards. Both close microphone tracks; 390px layout has no horizontal overflow; no page errors. Direct model check: A accepted, T rejected for selected P. Aggregate reports live outside repository in the inclusiveapp-qa folder; fixture audio derives from existing Alippe media, not user microphone audio. Real-user validation inside this updated exercise is pending. Model accuracy remains experimental, particularly for Kazakh vowels, and CPU inference is delayed. No commit/push performed.

## Repair after user reported repeated mismatch (2026-10-01)

Differences from the interactive QA page were corrected: listening prompt waits for the first actual audio block; capture allows the same 8-second window; only speech with 300ms margins and at most 5 seconds is sent to the local model, using the same RMS 0.006 bounds. Empty/weak input is rejected before inference. Normalized phoneme length marks (a vs a-long, etc.) no longer count as another selected letter; long-mode duration is still required. Central carrier vowel variants in py are accepted while B/T/K remain rejected for P. Mismatch feedback now reports the recognized letters. Local metadata-only lastTrainPhonemeResult supports debugging; audio is not retained.

Updated browser UI checks: A accepted with exactly one reward; fake microphone tone rejected with zero rewards; both release tracks, no page errors or mobile horizontal overflow. The QA page itself displays free phoneme output rather than grading the exercise, so it should not be treated as a success checker. Actual user microphone confirmation remains pending. No commit or push.

## Train arrival and eight-letter droplet menu (2026-10-01)

After selected-phoneme validation the train animates from 0 to 100 over 2.4 seconds; reward fires once, only after the displayed percentage reaches 100. Success does not return to the letter screen. Error also keeps the train with explicit Repeat/Other letter actions. Movement remains gated by phoneme verification, not microphone volume. Navigation cancels the animation and prevents a late reward.

The letter dropdown was removed. Eight unique circles are drawn from all 13 supported letters. On reopening, letters missing from the previous eight are prioritized and the remaining slots/order are shuffled. The helper is `train-voice-menu.js`; unit tests exercise uniqueness and unseen-letter coverage. Opening/closing uses 600ms radial transitions and a temporary SVG goo effect; reduced-motion preferences are respected. Back button now stays below train actions rather than covering Repeat.

Browser UI checks: intermediate progress 23% gives no reward; at 100%, exactly one reward, train still visible; eight circles and changed sets; no dropdown, no mobile horizontal overflow; intermediate opening/closing radii prove animation rather than immediate relocation. Full local-model validation is additionally exercised with the existing A fixture. No commit or push.

## Confidence scoring, signal progress and global radial motion (2026-10-01)

Worker annotates unconstrained CTC events with peak softmax confidence. Selected-letter comparison uses reliable evidence dominance and average target confidence, tolerates weak hallucinated events/carrier vowels, and rejects strong competing consonants. Duration/repetition gates remain. This is heuristic model scoring, not calibrated pronunciation accuracy. Signal activity advances up to 20% before recognition; incorrect recognition can show partial progress without reward. Completion is still exactly 100% with one reward.

Checks: 36 tests; confidence-weighted T with weak M/unknown passes, confident other consonants fail. Full browser/model A fixture included two spurious P events at ~0.38/0.40 and passed with one reward at 100%; fake-device sound at selected P stays at 20% and no reward. All 41 standard radial menus (radial-menu-container and letter-circle-container) animate on screen entry, with no page errors or mobile horizontal overflow. Existing voice droplet menu remains supported. New general helper: radial-droplet-animation.js, preserving legacy final positions using independent translate/scale animation and reduced-motion support. User microphone validation remains pending; no commit/push.

## Repeat central-button motion and 70 percent signal cap (2026-10-01)

Signal-only movement now caps at 70 percent; selected-letter confirmation and duration/repetitions still gate completion and reward. Shared central-button handlers animate every opening/closing, keep items visible until merged, restore legacy inline styles after motion, and queue rapid toggles. Cache versions updated.

Verification: all 11 standard central-toggle menus passed three close/open cycles each (33/33), with measured intermediate circle positions and no browser errors. Custom eight-circle voice menu also passed open/close and exactly-one reward at 100 percent. Real local model with fake microphone sound reached 70 percent, returned no confirmed letter, gave zero rewards and stopped microphone tracks. 37 unit tests passed; npm install, build, TypeScript and lint completed. Lint has 8 existing warnings; install audit reports 39 existing vulnerabilities. Native packaging not changed or tested. No commit or push; user local approval pending.

Center alignment correction: merged circle geometry is measured after scaling, compensating legacy transform translations. All 11 toggle menus converge within 0.001px in the browser check. User authorized commit and push on 2026-10-01.
