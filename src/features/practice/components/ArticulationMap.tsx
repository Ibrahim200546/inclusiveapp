import { useLayoutEffect, useRef, useSyncExternalStore, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { firstToSecond, firstToThird, mouthPosition, point, radii, rings, secondToThird, visibleLetters, type Ring } from '../articulation/content';
import type { ArticulationSnapshot, ArticulationStore } from '../articulation/store';
import { useNavigator } from '../navigation/navigationContext';
import { playPracticeClick } from '../legacy/bridge';
import '../articulation/map.css';

const ringNumbers: Ring[] = [1, 2, 3];
function activate(event: KeyboardEvent<SVGGElement>, action: () => void) {
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); action(); }
}
function LessonModal({ store, state }: { store: ArticulationStore; state: ArticulationSnapshot }) {
  const dialog = useRef<HTMLDivElement>(null), close = useRef<HTMLButtonElement>(null);
  const t = (kk: string, ru: string) => state.locale === 'ru' ? ru : kk;
  const mouth = mouthPosition(state.lesson!);
  useLayoutEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const siblings = Array.from(document.body.children).filter(node => node !== dialog.current && node instanceof HTMLElement) as HTMLElement[];
    const original = siblings.map(node => node.inert); siblings.forEach(node => { node.inert = true; });
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; close.current?.focus();
    return () => {
      siblings.forEach((node, index) => { node.inert = original[index]; }); document.body.style.overflow = overflow;
      if (previous?.isConnected && previous.getAttribute('aria-hidden') !== 'true' && previous.closest('.screen.active')) previous.focus({ preventScroll: true });
    };
  }, []);
  const message = {
    idle: t('Үлгіні тыңдап, дыбысты қайталаңыз.', 'Послушайте образец и повторите звук.'),
    playing: t('Үлгі ойнатылып жатыр…', 'Звучит образец…'),
    starting: t('Микрофон қосылуда…', 'Подключаем микрофон…'),
    recording: t(`«${state.lesson}» дыбысын айтыңыз.`, `Произнесите «${state.lesson}».`),
    audioError: t('Дыбыс жүктелмеді. Қайта тыңдап көріңіз.', 'Не удалось загрузить звук. Попробуйте ещё раз.'),
    denied: t('Микрофонға рұқсат беріп, қайта көріңіз.', 'Разрешите доступ к микрофону и попробуйте ещё раз.'),
    unavailable: t('Микрофон қолжетімсіз. Қосылымды тексеріп, қайта көріңіз.', 'Микрофон недоступен. Проверьте подключение и повторите.'),
    unsupported: t('Бұл браузерде микрофон қолжетімсіз.', 'Микрофон недоступен в этом браузере.'),
    interrupted: t('Жаттығу тоқтатылды. Қайта бастауға болады.', 'Тренировка остановлена. Можно начать снова.'),
    done: state.result ? {
      silent: t('Дыбыс естілмеді. Тағы қайталаңыз.', 'Звук не слышен. Попробуйте ещё раз.'),
      quiet: t('Сәл қаттырақ айтып көріңіз.', 'Попробуйте произнести немного громче.'),
      heard: t('Дыбыс естілді! Педагогпен бірге тексеріңіз.', 'Звук слышен! Проверьте произношение вместе с педагогом.'),
      matched: t('Дыбыс үлгіге ұқсайды. Педагогпен бірге тексеріңіз.', 'Звук похож на образец. Проверьте вместе с педагогом.'),
      retry: t('Үлгіні қайта тыңдап, қайталаңыз.', 'Послушайте образец ещё раз и повторите.'),
    }[state.result.kind] : '',
  }[state.phase];
  return <div ref={dialog} id="articulationModal" className="active" role="dialog" aria-modal="true" aria-labelledby="articLessonTitle"
    data-react-owned="true" data-i18n-managed="true" data-card-audio="true"
    onClick={event => { if (event.target === event.currentTarget) store.closeLesson(); }}
    onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); store.closeLesson(); }
      if (event.key !== 'Tab') return;
      const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
    <div className="lesson-card">
      <button ref={close} type="button" className="artic-lesson-close" aria-label={t('Жабу', 'Закрыть')} onClick={store.closeLesson}>×</button>
      <h2 id="articLessonTitle">{t('Дыбысты қайталаймыз', 'Повторяем звук')}</h2>
      <div className="lesson-preview">
        <div id="lessonMouth" role="img" aria-label={t('Ауыздың қалпы', 'Положение рта')} data-mouth-index={mouth.index} style={{ backgroundPosition: mouth.position }} />
        <div className="lesson-preview-main"><div id="lessonLetter">{state.lesson}</div><p id="lessonDesc">{t('Тыңдаңыз, бірге қайталаңыз.', 'Послушайте, повторите вместе.')}</p></div>
      </div>
      <button type="button" id="articListen" className="btn btn-secondary" onClick={() => { if (state.phase === 'playing') store.cancelWork(); else void store.play(); }}>
        {state.phase === 'playing' ? t('⏹ Тоқтату', '⏹ Остановить') : t('🔊 Үлгіні тыңдау', '🔊 Послушать образец')}
      </button>
      <div id="aiVisualizer" className="sound-visualizer" aria-hidden="true">{Array.from({ length: 20 }, (_, index) => <span key={index} className="artic-level" style={{ transform: `scaleY(${Math.max(.05, state.levels[index] ?? .05)})` }} />)}</div>
      <button type="button" id="articRecord" className={`btn btn-primary${state.phase === 'recording' ? ' btn-danger' : ''}`} onClick={() => { void store.record(); }}>
        {state.phase === 'recording' ? t('⏹ Аяқтау', '⏹ Завершить') : state.phase === 'starting' ? t('Бас тарту', 'Отмена') : t('🎤 Айтып көр!', '🎤 Попробуй произнести!')}
      </button>
      <p id="aiFeedback" role="status" className={state.result?.success ? 'artic-feedback-success' : ''}>{message}{state.result?.success && <strong className="artic-earned">+10 🪙</strong>}</p>
    </div>
  </div>;
}
function MapScreen({ store, state }: { store: ArticulationStore; state: ArticulationSnapshot }) {
  const navigator = useNavigator(), t = (kk: string, ru: string) => state.locale === 'ru' ? ru : kk;
  const visible = visibleLetters(state.open, state.first, state.second), selected = { 1: state.first, 2: state.second, 3: state.third };
  const connections: [Ring, string, Ring, string][] = [];
  if (state.open && state.first) {
    (firstToSecond[state.first] ?? []).forEach(letter => connections.push([1, state.first!, 2, letter]));
    (firstToThird[state.first] ?? []).forEach(letter => connections.push([1, state.first!, 3, letter]));
    if (state.second) (secondToThird[state.second] ?? []).forEach(letter => connections.push([2, state.second!, 3, letter]));
  }
  const choose = (ring: Ring, letter: string) => store.select(ring, letter);
  const title = t('Дыбыс картасы', 'Карта звуков');
  return <div className="artic-map-exercise" data-react-owned="true" data-i18n-managed="true" data-card-audio="true">
    <header className="artic-map-heading"><h2>🗣️ {title}</h2><p>{t('Бірінші басқанда — тыңдаймыз, екінші басқанда — жаттығамыз.', 'Первое нажатие — слушаем, второе — тренируемся.')}</p>
      <button type="button" id="articResetBtn" className="artic-reset-btn" hidden={!state.open} onClick={store.collapse}>{t('↺ Жабу', '↺ Свернуть')}</button>
    </header>
    <div className="articulation-circle-wrap">
      <svg id="articulationCircle" viewBox="0 0 920 920" aria-label={title}>
        {ringNumbers.filter(ring => visible[ring].length > 0).map(ring => <circle key={ring} cx="460" cy="470" r={radii[ring]} className="artic-map-ring" />)}
        {connections.map(([fromRing, from, toRing, to]) => <line key={`${fromRing}:${from}:${toRing}:${to}`} x1={point(fromRing, from).x} y1={point(fromRing, from).y} x2={point(toRing, to).x} y2={point(toRing, to).y} className="artic-map-connection" />)}
        {ringNumbers.flatMap(ring => rings[ring].map(letter => {
          const p = point(ring, letter), shown = visible[ring].includes(letter);
          return <g key={`${ring}:${letter}`} data-artic-ring={ring} data-artic-letter={letter} role="button" aria-label={letter} tabIndex={shown ? 0 : -1}
            aria-hidden={!shown} aria-pressed={selected[ring] === letter}
            className={`artic-map-node ring-${ring}${shown ? ' is-visible' : ''}${selected[ring] === letter ? ' is-active' : ''}`}
            onClick={() => choose(ring, letter)} onKeyDown={event => activate(event, () => choose(ring, letter))}>
            <circle cx={p.x} cy={p.y} r="26" fill="transparent" />
            <circle cx={p.x} cy={p.y} r={24 - ring * 2} className="artic-map-node-circle" />
            <text x={p.x} y={p.y + .5} className="artic-map-node-text">{letter}</text>
          </g>;
        }))}
        <g className="artic-center-group" role="button" aria-label={title} aria-expanded={state.open} tabIndex={0} onClick={store.center} onKeyDown={event => activate(event, store.center)}>
          <circle cx="460" cy="470" r="118" className="artic-center-circle" />
          <text x="460" y="462" className="artic-center-title"><tspan x="460">{t('Дыбыс', 'Карта')}</tspan><tspan x="460" dy="28">{t('картасы', 'звуков')}</tspan></text>
          <text x="460" y="522" className="artic-center-subtitle">{t('ТАҢДАУ', 'ВЫБРАТЬ')}</text>
        </g>
      </svg>
    </div>
    <div className="artic-mobile-map">
      <button type="button" className="artic-mobile-center" aria-expanded={state.open} onClick={store.center}>{title}</button>
      {ringNumbers.filter(ring => visible[ring].length).map(ring => <section key={ring} className="artic-mobile-ring" aria-label={t(`${ring}-шеңбер`, `${ring}-й круг`)}>
        <h3>{t(`${ring}-шеңбер`, `${ring}-й круг`)}</h3><div>{visible[ring].map(letter => <button type="button" key={letter} data-artic-ring={ring} data-artic-letter={letter}
          aria-pressed={selected[ring] === letter} className={selected[ring] === letter ? 'is-active' : ''} onClick={() => choose(ring, letter)}>{letter}</button>)}</div>
      </section>)}
    </div>
    <p id="articPlaybackStatus" role="status">{state.lesson ? '' : state.phase === 'playing' ? t(`Тыңдаймыз: ${state.sample}`, `Слушаем: ${state.sample}`) : state.phase === 'audioError' ? t('Дыбыс жүктелмеді. Қайта көріңіз.', 'Звук не загрузился. Попробуйте ещё раз.') : ''}</p>
    <button type="button" className="btn btn-secondary artic-back" onClick={() => { playPracticeClick(); navigator.navigate(state.returnTo); }}>{t('⬅️ Артқа', '⬅️ Назад')}</button>
  </div>;
}
export function ArticulationMap({ store }: { store: ArticulationStore }) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const host = document.getElementById('g0ArticulationMap');
  if (!state.active || !host) return null;
  return <>{createPortal(<MapScreen store={store} state={state} />, host)}
    {state.lesson && createPortal(<LessonModal key={state.lesson} store={store} state={state} />, document.body)}</>;
}
