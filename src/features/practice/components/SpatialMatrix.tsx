import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { coordinates, spatialCard, spatialCaption, spatialLabels, spatialMedia, type SpatialAudioKey, type SpatialKey } from '../cards/content';
import type { SpatialSnapshot, SpatialStore } from '../cards/spatialStore';
import { playPracticeClick } from '../legacy/bridge';
import { useNavigator } from '../navigation/navigationContext';

interface TouchDrag { key: SpatialKey; pointer: number; startX: number; startY: number; x: number; y: number; width: number; height: number; moved: boolean }

export function SpatialMatrix({ snapshot, store }: { snapshot: SpatialSnapshot; store: SpatialStore }) {
  const navigator = useNavigator(), root = useRef<HTMLDivElement>(null);
  const { locale, order, placed, selected, status, playing } = snapshot;
  const labels = spatialLabels[locale], text = (kk: string, ru: string) => locale === 'ru' ? ru : kk;
  const [dragged, setDragged] = useState<SpatialKey | null>(null), [hovered, setHovered] = useState<SpatialKey | null>(null);
  const [ghost, setGhost] = useState<TouchDrag | null>(null), touch = useRef<TouchDrag | null>(null);
  const suppressClick = useRef<SpatialKey | null>(null), focusCard = useRef<SpatialKey | null>(null);
  useLayoutEffect(() => {
    if (snapshot.round > 1) root.current?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
  }, [snapshot.round]);
  useLayoutEffect(() => {
    if (!focusCard.current) return;
    root.current?.querySelector<HTMLButtonElement>(`#spcard_${focusCard.current}`)?.focus({ preventScroll: true });
    focusCard.current = null;
  }, [placed]);
  const clearDrag = useCallback(() => { touch.current = null; setGhost(null); setDragged(null); setHovered(null); }, []);
  useEffect(() => { clearDrag(); }, [locale, clearDrag]);
  useEffect(() => {
    const hidden = () => { if (document.hidden) clearDrag(); };
    window.addEventListener('pagehide', clearDrag); document.addEventListener('visibilitychange', hidden);
    return () => { window.removeEventListener('pagehide', clearDrag); document.removeEventListener('visibilitychange', hidden); };
  }, [clearDrag]);
  function place(key: string, row: number, col: number) {
    const item = spatialCard(key);
    focusCard.current = item?.key ?? null;
    if (!store.place(key, row, col)) focusCard.current = null;
    clearDrag();
  }
  const targetAt = (x: number, y: number) => {
    const cell = document.elementFromPoint(x, y)?.closest<HTMLElement>('.spatial-cell');
    return cell && root.current?.contains(cell) ? spatialCard(`${cell.dataset.row}_${cell.dataset.col}`) : undefined;
  };
  function pointerDown(event: PointerEvent<HTMLButtonElement>, key: SpatialKey) {
    suppressClick.current = null;
    if (event.pointerType === 'mouse' || !event.isPrimary || placed.includes(key)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    touch.current = { key, pointer: event.pointerId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, width: rect.width, height: rect.height, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    const drag = touch.current;
    if (!drag || drag.pointer !== event.pointerId) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 8) return;
    event.preventDefault();
    touch.current = { ...drag, moved: true, x: event.clientX, y: event.clientY };
    setGhost(touch.current); setDragged(drag.key); setHovered(targetAt(event.clientX, event.clientY)?.key ?? null);
  }
  function pointerUp(event: PointerEvent<HTMLButtonElement>) {
    const drag = touch.current;
    if (!drag || drag.pointer !== event.pointerId) return;
    if (drag.moved) {
      event.preventDefault(); suppressClick.current = drag.key;
      const target = targetAt(event.clientX, event.clientY);
      if (target) place(drag.key, target.row, target.col);
    }
    clearDrag();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function picture(key: SpatialKey) {
    const item = spatialCard(key)!;
    return <><img src={item.image} alt="" draggable={false} /><span className="spatial-caption">{spatialCaption(item.row, item.col, locale)}</span></>;
  }
  function card(key: SpatialKey) {
    const item = spatialCard(key)!, inserted = placed.includes(key), label = spatialCaption(item.row, item.col, locale);
    return <button type="button" key={key} id={`spcard_${key}`} draggable={!inserted}
      className={`spatial-card spatial-audio-trigger${inserted ? ' spatial-card-placed' : ''}${playing === key ? ' spatial-audio-playing' : ''}${dragged === key ? ' card-dragging' : ''}`}
      data-orig-row={item.row} data-orig-col={item.col} data-spatial-row={item.row} data-spatial-col={item.col} data-spatial-audio-key={key}
      aria-label={label} title={label} aria-pressed={inserted ? undefined : selected === key}
      onClick={event => {
        event.stopPropagation();
        if (event.detail > 0 && suppressClick.current === key) { suppressClick.current = null; return; }
        store.select(key); void store.listen(key);
      }}
      onDragStart={event => { event.dataTransfer.setData('text/plain', `spcard_${key}`); event.dataTransfer.effectAllowed = 'move'; setDragged(key); playPracticeClick(); }}
      onDragEnd={clearDrag} onPointerDown={event => pointerDown(event, key)} onPointerMove={pointerMove} onPointerUp={pointerUp}
      onPointerCancel={clearDrag} onLostPointerCapture={clearDrag}>
      {picture(key)}
    </button>;
  }
  function header(key: SpatialAudioKey, label: string, caption: string, id?: string) {
    return <button type="button" id={id} className={`spatial-header spatial-audio-trigger${playing === key ? ' spatial-audio-playing' : ''}`}
      data-spatial-audio-key={key} aria-label={label} title={label} onClick={() => void store.listen(key)}>
      <img src={spatialMedia(key)!.image} alt="" draggable={false} /><span className="spatial-caption">{caption}</span>
    </button>;
  }
  const selectedCard = selected ? spatialCard(selected) : undefined;
  const feedback = status === 'selected' && selectedCard ? `${labels.selected} · ${spatialCaption(selectedCard.row, selectedCard.col, locale)}`
    : status && status !== 'selected' ? labels[status] : '';
  return <div ref={root} className="task-flex-container card-exercise spatial-matrix" data-react-owned="true" data-i18n-managed="true" data-card-audio="true">
    <div className="task-content-wrapper">
      <div className="card-exercise-heading"><h2 tabIndex={-1}>{labels.title}</h2><p id="spatialInstructions">{labels.hint}</p></div>
      <p id="spatialResult" role="status">{feedback}</p>
      <div className="spatial-scroll" tabIndex={0} role="region" aria-label={text('Жануарлар кестесі', 'Таблица животных')}>
        <table className="spatial-table" aria-describedby="spatialInstructions">
          <thead><tr>
            <th scope="col">{header('corner_icon', labels.corner, labels.corner, 'spatialCornerCell')}</th>
            {coordinates.map(col => <th key={col} scope="col">{header(`header_col_${col}`, labels.headers[col], labels.positions[col], `spatialHeaderCol${col}`)}</th>)}
          </tr></thead>
          <tbody id="spatialTableBody">{coordinates.map(row => <tr key={row}>
            <th scope="row">{header(`header_row_${row}`, labels.animals[row], labels.animals[row])}</th>
            {coordinates.map(col => {
              const key: SpatialKey = `${row}_${col}`, filled = placed.includes(key);
              return <td key={col} id={`spatial_${key}`} data-row={row} data-col={col} data-spatial-row={row} data-spatial-col={col}
                className={`spatial-cell${hovered === key && !filled ? ' drag-over' : ''}`} role={filled ? undefined : 'button'} tabIndex={filled ? undefined : 0}
                aria-label={spatialCaption(row, col, locale)} title={spatialCaption(row, col, locale)}
                onClick={() => { if (selected) place(selected, row, col); }}
                onKeyDown={event => { if (event.target === event.currentTarget && ['Enter', ' '].includes(event.key)) { event.preventDefault(); if (selected) place(selected, row, col); } }}
                onDragOver={event => { event.preventDefault(); setHovered(key); }} onDragLeave={() => setHovered(null)}
                onDrop={event => {
                  event.preventDefault(); const match = /^spcard_([0-3]_[0-3])$/.exec(event.dataTransfer.getData('text/plain'));
                  if (match) place(match[1], row, col); else clearDrag();
                }}>
                {filled && card(key)}
              </td>;
            })}
          </tr>)}</tbody>
        </table>
      </div>
      <div className="spatial-pool">
        <h3 id="spatialCardsLabel">{labels.cards}</h3>
        <div id="spatialCardsArea" role="group" aria-labelledby="spatialCardsLabel" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); clearDrag(); }}>
          {order.filter(key => !placed.includes(key)).map(card)}
        </div>
        {status === 'complete' && <button type="button" className="btn btn-success spatial-restart" onClick={() => { store.reset(); playPracticeClick(); }}>{text('🔄 Қайталау', '🔄 Повторить')}</button>}
      </div>
      <p className="spatial-audio-status" role="status">{snapshot.audioError && text('Дыбыс жүктелмеді. Қайталап көріңіз.', 'Звук не загрузился. Попробуйте ещё раз.')}</p>
      <button type="button" className="btn btn-secondary card-exercise-back" onClick={() => { playPracticeClick(); navigator.navigate('grade0Menu'); }}>{text('⬅️ Артқа', '⬅️ Назад')}</button>
    </div>
    {ghost && createPortal(<div className="spatial-card spatial-drag-ghost" data-react-owned="true" data-i18n-managed="true" aria-hidden="true"
      style={{ left: ghost.x - ghost.width / 2, top: ghost.y - ghost.height / 2, width: ghost.width, height: ghost.height }}>{picture(ghost.key)}</div>, document.body)}
  </div>;
}
