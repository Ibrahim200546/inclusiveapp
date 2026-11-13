import { useLayoutEffect, useRef, useState, type DragEvent } from 'react';
import { sentenceCard } from '../cards/content';
import type { SentenceSnapshot, SentenceStore } from '../cards/sentenceStore';
import { playPracticeClick } from '../legacy/bridge';
import { useNavigator } from '../navigation/navigationContext';

export function SentenceBuilder({ snapshot, store }: { snapshot: SentenceSnapshot; store: SentenceStore }) {
  const navigator = useNavigator(), root = useRef<HTMLDivElement>(null), focusCard = useRef<number | null>(null);
  const [dragged, setDragged] = useState<number | null>(null);
  const { locale, available, sentence, status } = snapshot;
  const text = (kk: string, ru: string) => locale === 'ru' ? ru : kk;
  useLayoutEffect(() => {
    if (focusCard.current === null) return;
    root.current?.querySelector<HTMLButtonElement>(`#sb-card-${focusCard.current}`)?.focus({ preventScroll: true });
    focusCard.current = null;
  }, [available, sentence]);
  function move(id: number, toSentence: boolean) {
    focusCard.current = id;
    if (store.move(id, toSentence)) playPracticeClick(); else focusCard.current = null;
    setDragged(null);
  }
  function drop(event: DragEvent, toSentence: boolean) {
    event.preventDefault();
    const match = /^sb-card-(\d+)$/.exec(event.dataTransfer.getData('text/plain'));
    if (match) move(Number(match[1]), toSentence);
    setDragged(null);
  }
  function card(id: number, inserted: boolean) {
    const item = sentenceCard(id)!;
    return <button key={id} type="button" id={`sb-card-${id}`} draggable
      className={`sb-card${inserted ? ' sb-card-inserted' : ''}${dragged === id ? ' card-dragging' : ''}`}
      aria-label={`${inserted ? text('Алып тастау', 'Убрать') : text('Қосу', 'Добавить')}: ${item[locale]}`}
      onClick={() => move(id, !inserted)}
      onDragStart={event => { event.dataTransfer.setData('text/plain', `sb-card-${id}`); event.dataTransfer.effectAllowed = 'move'; setDragged(id); }}
      onDragEnd={() => setDragged(null)}>
      <span className="sb-card-emoji" aria-hidden="true">{item.emoji}</span><span className="sb-card-text">{item[locale]}</span>
    </button>;
  }
  return <div ref={root} className="task-flex-container card-exercise sentence-builder" data-react-owned="true" data-i18n-managed="true" data-card-audio="true">
    <div className="task-content-wrapper">
      <div className="card-exercise-heading">
        <h2>{text('🧩 Сөйлем құрастыру', '🧩 Составление предложения')}</h2>
        <p>{text('Карталарды төменге сүйреп әкеліңіз немесе басыңыз!', 'Перетащите карточки вниз или нажмите на них!')}</p>
      </div>
      <div className="sb-available-panel">
        <h3 id="sbAvailableLabel">{text('Карталар:', 'Карточки:')}</h3>
        <div id="sbAvailableCards" role="group" aria-labelledby="sbAvailableLabel" onDrop={event => drop(event, false)} onDragOver={event => event.preventDefault()}>
          {available.map(id => card(id, false))}
        </div>
      </div>
      <div className="sb-sentence-panel">
        <h3 id="sbSentenceLabel">{text('Сөйлем алаңы:', 'Поле предложения:')}</h3>
        <div id="sbSentenceArea" role="group" aria-labelledby="sbSentenceLabel" onDrop={event => drop(event, true)} onDragOver={event => event.preventDefault()}>
          {sentence.map(id => card(id, true))}
        </div>
        <p id="sbPlaybackStatus" role="status">{status === 'playing' ? text('Тыңдаңыз…', 'Слушайте…') : status === 'audioError' ? text('Дыбыс жүктелмеді. Қайталап көріңіз.', 'Звук не загрузился. Попробуйте ещё раз.') : ''}</p>
        <div className="sb-actions">
          <button type="button" id="sbPlay" className="btn btn-success" disabled={!sentence.length}
            onClick={() => { if (status === 'playing') store.stop(); else void store.play(); }}>
            {status === 'playing' ? text('⏹ Тоқтату', '⏹ Остановить') : text('🔊 Оқу', '🔊 Читать')}
          </button>
          <button type="button" id="sbReset" className="btn btn-secondary" onClick={() => { store.reset(); setDragged(null); playPracticeClick(); }}>{text('🔄 Қайталау', '🔄 Повторить')}</button>
        </div>
      </div>
      <button type="button" className="btn btn-secondary card-exercise-back" onClick={() => { playPracticeClick(); navigator.navigate('sentenceModuleScreen'); }}>{text('⬅️ Артқа', '⬅️ Назад')}</button>
    </div>
  </div>;
}
