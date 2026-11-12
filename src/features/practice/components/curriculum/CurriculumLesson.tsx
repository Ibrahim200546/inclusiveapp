import { Fragment, useLayoutEffect, useRef } from 'react';
import type { CurriculumStore, Feedback, PracticeSnapshot } from '../../curriculum/store';
import type { Locale } from '../../learning/content';
import { PairTools } from './PairTools';
import { CurriculumResponses } from './CurriculumResponses';

const feedback: Record<Exclude<Feedback, 'prompt' | 'correct'>, [string, string]> = {
  listening: ['Тыңдаңыз…', 'Слушайте…'], choose: ['Енді тапсырманы орындаңыз.', 'Теперь выполните задание.'],
  wrong: ['Әзірше сәйкес емес. Қайта тыңдап көріңіз.', 'Пока не совпадает. Послушайте ещё раз.'],
  model: ['Үлгі көрсетілді. Енді қайталаңыз.', 'Образец показан. Теперь повторите.'],
  error: ['Дыбыс жүктелмеді. Қайта тыңдап көріңіз.', 'Не удалось воспроизвести звук. Повторите прослушивание.'],
  interrupted: ['Ойнату тоқтатылды. Қайта тыңдауға болады.', 'Воспроизведение остановлено. Можно послушать снова.'],
  stopped: ['Тоқтатылды. Қайта тыңдауға болады.', 'Остановлено. Можно прослушать снова.'],
};

function Display({ practice, store }: { practice: PracticeSnapshot; store: CurriculumStore }) {
  const { step, state, breathSyllable } = practice;
  return <div className="curriculum-display" lang="kk" hidden={!step?.display}>
    {step?.repetitions ? <>
      <div className="breath-presets">{['та', 'ма', 'па', 'ко'].map(syllable => <button key={syllable} type="button" className="btn btn-secondary"
        aria-pressed={syllable === breathSyllable} disabled={state.heard || state.solved} onClick={() => store.setSyllable(syllable)}>{syllable}</button>)}</div>
      <ol className="breath-pyramid">{[1, 2, 3].map(count => <li key={count} aria-current={count === step.repetitions ? 'step' : undefined}>{breathSyllable.repeat(count)}</li>)}</ol>
    </> : step?.stressedWordIndex !== undefined ? step.words?.map((word, index) => index === step.stressedWordIndex ? <mark key={index}>{word} </mark> : <span key={index}>{word} </span>)
      : step?.stressedSyllableIndex !== undefined ? step.syllables?.map((syllable, index) => <Fragment key={index}>{index > 0 && '–'}{index === step.stressedSyllableIndex ? <mark>{syllable}</mark> : <span>{syllable}</span>}</Fragment>)
      : step?.groups ? step.groups.join(' / ') : step?.display}
  </div>;
}

export function CurriculumLesson({ practice, store, locale }: { practice: PracticeSnapshot; store: CurriculumStore; locale: Locale }) {
  const { lesson, state, step, playing, paused } = practice;
  const title = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => { title.current?.focus({ preventScroll: true }); window.scrollTo(0, 0); }, [practice.round]);
  const text = (kk: string, ru: string) => locale === 'ru' ? ru : kk;
  const status = practice.feedback === 'correct'
    ? (step?.kind === 'teacher' ? text('✓ Педагог орындауды белгіледі.', '✓ Выполнение отмечено педагогом.') : text('✓ Дұрыс!', '✓ Правильно!')) + (step?.reveal ? ' ' + step.reveal : '')
    : practice.feedback === 'prompt' ? step?.teacherModel
      ? text('Педагог үлгіні көрсетеді. Тыңдап, қайталаңыз.', 'Педагог показывает образец. Послушайте и повторите.')
      : text('Алдымен үлгіні толық тыңдаңыз.', 'Сначала полностью прослушайте образец.')
    : text(...feedback[practice.feedback]);
  const automated = state.records.filter(record => record.assessment === 'choice').length;
  const manual = state.records.filter(record => record.assessment === 'teacher').length;
  const attempts = state.records.reduce((sum, record) => sum + record.attempts, 0);
  const support = state.records.filter(record => record.supportUsed).length;
  return <div className="curriculum-panel" data-react-owned="true" data-i18n-managed="true">
    <div className="curriculum-toolbar">
      <button type="button" className="btn btn-secondary" onClick={store.back}>{text('⬅ Тапсырмалар', '⬅ К заданиям')}</button>
      <button type="button" className="btn btn-secondary" onClick={store.restart}>{text('Қайта бастау', 'Начать заново')}</button>
    </div>
    <h2 ref={title} tabIndex={-1} lang="kk">{lesson.title}</h2>
    {practice.pairBase && <PairTools key={practice.pairKey} practice={practice} store={store} locale={locale} />}
    <p>{state.complete ? state.total : state.index + 1} / {state.total}</p>
    {step && <div key={practice.round}>
      <p lang="kk">{step.level || step.speaker || ''}</p>
      <p className="curriculum-step-title" lang="kk">{step.prompt}</p>
      <Display practice={practice} store={store} />
      <div className="curriculum-mode" hidden={step.kind !== 'teacher'}>
        <button type="button" aria-pressed={practice.participation === 'together'} onClick={() => store.setParticipation('together')}>{text('Бірге', 'Вместе')}</button>
        <button type="button" aria-pressed={practice.participation === 'independent'} onClick={() => store.setParticipation('independent')}>{text('Өздігінен', 'Самостоятельно')}</button>
      </div>
      <div className="curriculum-actions">
        <button type="button" className="btn btn-secondary curriculum-listen" hidden={!step.audio} disabled={playing} onClick={() => void store.listen()}>{text('🔊 Қайта тыңдау', '🔊 Слушать ещё раз')}</button>
        <button type="button" className="btn btn-secondary curriculum-question" hidden={!step.questionAudio} disabled={playing} onClick={() => void store.question()}>{text('🔊 Сұрақты тыңдау', '🔊 Послушать вопрос')}</button>
        <button type="button" className="btn btn-secondary" hidden={!step.audio && !step.questionAudio} disabled={!playing} aria-pressed={paused} onClick={store.togglePause}>
          {paused ? text('▶ Жалғастыру', '▶ Продолжить') : text('⏸ Кідірту', '⏸ Пауза')}</button>
        <button type="button" className="btn btn-secondary" hidden={!step.audio && !step.questionAudio} disabled={!playing} onClick={store.stop}>{text('⏹ Тоқтату', '⏹ Остановить')}</button>
      </div>
      <CurriculumResponses practice={practice} store={store} locale={locale} />
      <details className="curriculum-support" hidden={!step.supportText} onToggle={event => { if (event.currentTarget.open) store.support(); }}>
        <summary>{text('Мәтінді көмек ретінде көрсету', 'Показать текст для помощи')}</summary><p lang="kk">{step.supportText}</p>
      </details>
      <p className="curriculum-feedback" role="status" aria-live="polite">{status}</p>
      <button type="button" className="btn btn-secondary" disabled={!state.solved || playing} onClick={store.next}>{text('Келесі', 'Далее')}</button>
    </div>}
    <p className="curriculum-summary" role="status" hidden={!state.complete}>
      {state.complete && text(`Орындалды: ${state.total}. Таңдау: ${automated}. Педагог белгісі: ${manual}. Әрекет: ${attempts}. Көмек қолданылды: ${support}.`,
        `Выполнено: ${state.total}. Выбор: ${automated}. Отметка педагога: ${manual}. Попыток: ${attempts}. С помощью: ${support}.`)}
      {state.complete && !practice.persisted && text(' Нәтиже осы экранда көрсетіледі.', ' Результат доступен на этом экране.')}
    </p>
  </div>;
}
