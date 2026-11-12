import { useSyncExternalStore, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { labels } from '../learning/content';
import type { Feedback, ListeningSnapshot, ListeningStore, SoundLibrary } from '../learning/listeningStore';
import { useRadialMenu } from '../hooks/useRadialMenu';
import { useNavigator } from '../navigation/navigationContext';
import { NumberDrawing } from './NumberDrawing';

// The same vector strokes as the remaining classic exercises.
const digits = [
  'M17 7 C3 8 1 41 12 42 C25 43 31 5 17 7Z', 'M7 17 L19 7 L14 42 M5 42 L25 42',
  'M5 16 C11 0 34 7 22 21 L3 41 L26 41', 'M6 9 C29 0 33 18 15 23 C34 18 29 46 5 40',
  'M20 6 L3 29 L29 29 M24 7 L18 43', 'M29 7 L11 7 L6 24 C32 13 33 46 4 40',
  'M28 7 C8 10 0 37 12 42 C32 46 34 21 13 25', 'M4 8 L31 8 C20 18 15 29 10 43',
  'M17 23 C-2 16 13 0 25 8 C36 20 2 27 5 38 C10 53 39 32 17 23Z', 'M25 25 C-2 34 4 4 22 7 C38 12 19 39 7 43',
];
function HandwrittenNumber({ value }: { value: string }) {
  return <svg viewBox={`0 0 ${value.length * 36 + 8} 52`} aria-hidden="true" className="handwritten-number">
    {[...value].map((char, index) => <path key={index} d={digits[Number(char)]} transform={`translate(${index * 36 + 8} 2) skewX(-9)`} />)}
  </svg>;
}
const messages: Record<Feedback, [string, string]> = {
  prompt: ['Тыңда да, таңда.', 'Послушайте и выберите.'], listening: ['Тыңдаңыз…', 'Слушайте…'],
  choose: ['Жауапты таңдаңыз.', 'Выберите ответ.'], correct: ['✓ Дұрыс!', '✓ Правильно!'],
  wrong: ['↻ Қайта көр. Сол дыбысты қайта тыңдауға болады.', '↻ Попробуйте ещё раз. Можно повторить тот же звук.'],
  error: ['Дыбыс жүктелмеді. «Қайта тыңдау» батырмасын басыңыз.', 'Звук не загрузился. Нажмите «Слушать ещё раз».'],
  sample: ['Үлгіні тыңдаңыз…', 'Послушайте образец…'],
  compare: ['Естіген ырғаққа сәйкес жауапты таңдаңыз.', 'Выберите ответ, совпадающий с целевым ритмом.'],
  sampleError: ['Үлгі ойнатылмады. Қайталап көріңіз.', 'Не удалось проиграть образец. Повторите.'],
};
const stageLabels: Record<string, [string, string]> = {
  start: ['Бастапқы · 4', 'Начальный · 4'], extended: ['Кеңейтілген · 6', 'Расширенный · 6'],
  standard: ['Дыбыстар', 'Звуки'], vehicles: ['Көлік техникасы', 'Транспортная техника'],
};

function AnswerOrbit({ snapshot, store, title }: { snapshot: ListeningSnapshot; store: ListeningStore; title: string }) {
  const menu = useRadialMenu(true, true);
  const { request, choices, ready, playing, state, locale, target } = snapshot;
  const numbers = request.mode === 'numbers';
  const disabled = !ready || playing || state.answered;
  return <div ref={menu.menuRef} data-long-title={String(title.length > 30)}
    className={`${numbers ? 'learning-number-grid exercise-orbit-numbers' : 'learning-sound-options exercise-picture-orbit'} radial-menu-container exercise-orbit${menu.geometryOpen ? ' active' : ''}${menu.morphing ? ' radial-droplet-morph' : ''}`}>
    {choices.map(choice => <button key={choice.value} type="button" className="radial-item" data-answer={choice.value}
      data-number={numbers ? choice.value : undefined} aria-label={choice[locale]} aria-pressed={state.answered && choice.value === target}
      disabled={disabled} tabIndex={menu.interactive && !disabled ? 0 : -1} aria-hidden={!menu.interactive}
      style={{ '--angle': `${choice.angle}deg`, '--orbit': `${choice.orbit}cqw`, '--ink-tilt': `${choice.tilt}deg` } as CSSProperties}
      onClick={() => { if (menu.interactive) store.answer(choice.value); }}>
      {numbers ? <><HandwrittenNumber value={String(choice.value)} /><span className="exercise-sr-only">{choice[locale]}</span></>
        : <><div className="exercise-orbit-icon" aria-hidden="true">{choice.icon}</div><p className="exercise-orbit-caption">{choice[locale]}</p></>}
    </button>)}
    <button type="button" className="radial-center-btn" aria-expanded={menu.expanded} onClick={menu.toggle}>{title}</button>
  </div>;
}

export function ListeningPractice({ store, sounds }: { store: ListeningStore; sounds: SoundLibrary }) {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const navigator = useNavigator();
  if (!snapshot) return null;
  const { request, profile, state, locale, playing, ready, persisted } = snapshot;
  const host = document.getElementById(request.host);
  if (!host) return null;
  const language = locale === 'ru' ? 1 : 0;
  const text = (kk: string, ru: string) => locale === 'ru' ? ru : kk;
  const title = profile ? sounds.categories[profile.category].labels[language] : labels[request.mode as keyof typeof labels][language];
  const stages = profile ? sounds.stages(request.grade, profile.category) : [];
  return createPortal(<div className="learning-wrap" data-react-owned="true" data-i18n-managed="true">
    <h2>{title}</h2>
    <div className="learning-stages" hidden={stages.length < 2}>
      {stages.map(stage => <button key={stage} type="button" className="btn btn-secondary" aria-pressed={stage === profile?.stage} onClick={() => store.setStage(stage)}>{stageLabels[stage]?.[language] || stage}</button>)}
    </div>
    <p>{profile || request.mode === 'dance' ? text(`${request.grade}-сынып · `, `Класс ${request.grade} · `) : ''}{state.complete ? state.total : state.index + 1} / {state.total}</p>
    {!state.complete && <AnswerOrbit key={snapshot.round} snapshot={snapshot} store={store} title={title} />}
    <div className="learning-rhythm-samples" hidden={request.mode !== 'rhythm' || state.complete}>
      {request.mode === 'rhythm' && !state.complete && snapshot.choices.map(choice => <button key={choice.value} type="button" className="btn btn-secondary"
        disabled={!ready || playing || state.answered} aria-label={text('Үлгіні тыңдау: ', 'Послушать образец: ') + choice[locale]} onClick={() => void store.compare(choice.value)}>🔊 {choice[locale]}</button>)}
    </div>
    <p className="learning-feedback" role="status" aria-live="polite">{state.complete ? '' : messages[snapshot.feedback][language]}</p>
    <div className="learning-summary" hidden={!state.complete}>
      {state.complete && <>{text(`Орындалды: ${state.total}. Әрекет саны: ${state.attempts}.`, `Выполнено: ${state.total}. Попыток: ${state.attempts}.`)}
        {!persisted && text(' Нәтиже осы экранда ғана көрсетіледі.', 'Результат доступен только на этом экране.')}</>}
    </div>
    <div className="learning-actions">
      <button type="button" className="btn btn-secondary" hidden={state.complete} disabled={playing} onClick={() => void store.listen()}>{text('🔊 Қайта тыңдау', '🔊 Слушать ещё раз')}</button>
      <button type="button" className="btn btn-secondary" hidden={state.complete} disabled={!state.answered} onClick={store.next}>{text('Келесі', 'Далее')}</button>
      <button type="button" className="btn btn-secondary" onClick={store.restart}>{text('Қайта бастау', 'Начать заново')}</button>
      <button type="button" className="btn btn-secondary" onClick={() => navigator.navigate(profile || request.mode === 'dance' ? 'grade0SoundsMenu' : 'learningHubScreen')}>{text('⬅ Артқа', '⬅ Назад')}</button>
    </div>
    {request.mode === 'numbers' && <NumberDrawing locale={locale} />}
  </div>, host);
}
