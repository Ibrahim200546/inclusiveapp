import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { findVerbCard, pagePictograms, rounds, sheets, verbCards, type Pictogram, type VerbCard } from '../verbs/content';
import type { VerbSnapshot, VerbStore } from '../verbs/store';
import { useNavigator } from '../navigation/navigationContext';
import { playPracticeClick } from '../legacy/bridge';
import '../verbs/verbs.css';

function VerbArt({ item, className }: { item: Pictogram | VerbCard; className: string }) {
  if ('src' in item) return <div className={className}><img className="verb-direct-image" src={item.src} alt="" draggable={false} /></div>;
  const sheet = sheets[item.sheet];
  return <div className={className}><div className="verb-sheet-crop" style={{ aspectRatio: `${item.w} / ${item.h}` }}>
    <img src={sheet.src} alt="" draggable={false} style={{ width: `${sheet.width / item.w * 100}%`, height: `${sheet.height / item.h * 100}%`, left: `${-item.x / item.w * 100}%`, top: `${-item.y / item.h * 100}%` }} />
  </div></div>;
}

function VerbScreen({ store, snapshot }: { store: VerbStore; snapshot: VerbSnapshot }) {
  const navigator = useNavigator(), root = useRef<HTMLDivElement>(null), tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const focusSlot = useRef<number | null>(null);
  const [dragging, setDragging] = useState<string | null>(null), [hovered, setHovered] = useState<number | null>(null);
  const { locale, page, pane, playing, activeCard, roundStatus, roundIndex, slots, selected } = snapshot;
  const text = (kk: string, ru: string) => locale === 'ru' ? ru : kk;
  const locked = roundStatus !== 'ready';
  const items = pagePictograms(page), activeLabel = items.find(item => item.id === activeCard)?.label[locale] ?? '';
  const prompt = roundIndex === null ? '' : rounds[roundIndex].prompt[locale];
  const buttonStatus = {
    hint: text('Пиктограмманы басып, оның атауын тыңдаңыз.', 'Нажмите на пиктограмму и послушайте её название.'),
    card: `${activeLabel} — ${text('тыңдалып жатыр.', 'идёт прослушивание.')}`,
    page: text('Беттегі пиктограммалар кезекпен оқылып жатыр.', 'Пиктограммы на странице читаются по очереди.'),
    pageChanged: text(`${page + 1}-бет ашылды. Пиктограмманы таңдаңыз.`, `Открыта ${page + 1}-я страница. Выберите пиктограмму.`),
    finished: text('Пиктограмманы басып, оның атауын тыңдаңыз.', 'Нажмите на пиктограмму и послушайте её название.'),
    audioError: text('Дыбыс жүктелмеді. Қайталап көріңіз.', 'Звук не загрузился. Попробуйте ещё раз.'),
    interrupted: text('Тыңдау тоқтатылды. Қайта тыңдауға болады.', 'Прослушивание остановлено. Можно повторить.'),
  }[snapshot.buttonsStatus];
  const roundMessage = {
    idle: text('Алдымен Ойнау батырмасын басып, дыбысты тыңдаңыз.', 'Сначала нажмите кнопку «Играть» и послушайте звук.'),
    listening: `${text('Тыңдаңыз:', 'Слушайте:')} ${prompt}`,
    ready: text('Енді карточкаларды дұрыс ретпен қойыңыз.', 'Теперь поставьте карточки в правильном порядке.'),
    wrong: text('Қате. Қайта тыңдау үшін Ойнау батырмасын басыңыз.', 'Ошибка. Чтобы послушать снова, нажмите кнопку «Играть».'),
    correct: text('Дұрыс! Керемет орналастырдыңыз.', 'Правильно! Отлично расположили.'),
    audioError: text('Дыбыс жүктелмеді. Ойнау батырмасын қайта басыңыз.', 'Звук не загрузился. Нажмите «Играть» ещё раз.'),
    interrupted: text('Үлгіні соңына дейін тыңдаңыз. Ойнау батырмасын басыңыз.', 'Дослушайте образец до конца. Нажмите «Играть».'),
  }[roundStatus];
  useEffect(() => { setDragging(null); setHovered(null); }, [locale, pane, roundStatus, snapshot.grade, snapshot.learner]);
  useEffect(() => {
    const clear = () => { setDragging(null); setHovered(null); };
    const hidden = () => { if (document.hidden) clear(); };
    window.addEventListener('pagehide', clear); document.addEventListener('visibilitychange', hidden);
    return () => { window.removeEventListener('pagehide', clear); document.removeEventListener('visibilitychange', hidden); };
  }, []);
  useLayoutEffect(() => {
    if (focusSlot.current === null) return;
    if (roundStatus === 'ready') root.current?.querySelector<HTMLButtonElement>(`[data-slot-index="${focusSlot.current}"]`)?.focus({ preventScroll: true });
    if (roundStatus === 'wrong') root.current?.querySelector<HTMLButtonElement>('#g2VerbStartDragBtn')?.focus({ preventScroll: true });
    focusSlot.current = null;
  }, [slots, roundStatus]);
  function place(id: string, index: number) {
    focusSlot.current = index;
    if (store.place(id, index)) playPracticeClick(); else focusSlot.current = null;
    setDragging(null); setHovered(null);
  }
  function changeTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = ['ArrowRight', 'ArrowLeft'].includes(event.key) ? 1 - index : event.key === 'Home' ? 0 : event.key === 'End' ? 1 : null;
    if (next === null) return;
    event.preventDefault(); store.switchPane(next ? 'drag' : 'buttons'); tabs.current[next]?.focus();
  }
  return <div ref={root} className="task-flex-container verb-exercise" data-react-owned="true" data-i18n-managed="true" data-card-audio="true">
    <div className="task-content-wrapper">
      <div className="verb-module-shell">
        <div className="verb-module-header">
          <div>
            <div className="verb-badge">{text('1-деңгей', '1 уровень')}</div>
            <h2>{text('Етістік', 'Глагол')}</h2>
            <p>{text('Суретке басып тыңдаймыз және карточкаларды дұрыс ретке қоямыз.', 'Нажимаем на картинку, слушаем и ставим карточки в правильном порядке.')}</p>
          </div>
          <div className="verb-task-switcher" role="tablist" aria-label={text('Тапсырмалар', 'Задания')}>
            {(['buttons', 'drag'] as const).map((value, index) => <button key={value} type="button" role="tab"
              id={index ? 'g2VerbTabDrag' : 'g2VerbTabButtons'} ref={button => { tabs.current[index] = button; }}
              className={`verb-tab-btn${pane === value ? ' active' : ''}`} aria-selected={pane === value} tabIndex={pane === value ? 0 : -1}
              aria-controls={index ? 'g2VerbPaneDrag' : 'g2VerbPaneButtons'} onKeyDown={event => changeTab(event, index)}
              onClick={() => { playPracticeClick(); store.switchPane(value); }}>{text(`${index + 1}-тапсырма`, `${index + 1}-задание`)}</button>)}
          </div>
        </div>
        <div id="g2VerbPaneButtons" className="verb-pane" role="tabpanel" aria-labelledby="g2VerbTabButtons" hidden={pane !== 'buttons'}>
          <div className="verb-toolbar">
            <div id="g2VerbButtonsStatus" role="status" className={`verb-status${snapshot.buttonsStatus === 'audioError' ? ' error' : snapshot.buttonsStatus === 'finished' ? ' success' : ''}`}>{buttonStatus}</div>
            <div className="verb-action-group">
              <span id="g2VerbPageBadge" className="verb-round-badge">{page + 1} / 2</span>
              <button id="g2VerbPlayPageBtn" className="btn btn-primary" type="button" onClick={() => { playPracticeClick(); if (playing) store.stop(); else void store.playCards(); }}>
                {playing ? text('⏹ Тоқтату', '⏹ Остановить') : text('Ойнау', 'Играть')}
              </button>
              <button id="g2VerbNextPageBtn" className="btn btn-secondary" type="button" onClick={() => { playPracticeClick(); store.nextPage(); }}>{text('Келесі', 'Далее')}</button>
            </div>
          </div>
          <div id="g2VerbButtonGrid" className="verb-card-grid">{items.map(item => <button key={item.id} type="button" data-verb-card-id={item.id}
            className={`verb-picto-card${activeCard === item.id ? ' speaking' : ''}`} aria-label={item.label[locale]}
            onClick={() => { playPracticeClick(); void store.playCards(item.id); }}>
            <VerbArt item={item} className="verb-picto-frame" />
            <div className="verb-card-meta"><div className="verb-card-title">{item.label[locale]}</div><div className="verb-card-badge">{text('Тыңдау', 'Слушать')}</div></div>
          </button>)}</div>
        </div>
        <div id="g2VerbPaneDrag" className="verb-pane" role="tabpanel" aria-labelledby="g2VerbTabDrag" hidden={pane !== 'drag'}>
          <div className="verb-toolbar">
            <div id="g2VerbDragStatus" role="status" className={`verb-status${['wrong', 'audioError'].includes(roundStatus) ? ' error' : roundStatus === 'correct' ? ' success' : ''}`}>{roundMessage}</div>
            <div className="verb-action-group">
              <span id="g2VerbRoundBadge" className="verb-round-badge">{(roundIndex ?? 0) + 1} / {rounds.length}</span>
              <button id="g2VerbStartDragBtn" className="btn btn-primary" type="button" onClick={() => { playPracticeClick(); if (playing) store.stop(); else void store.startRound(); }}>
                {playing ? text('⏹ Тоқтату', '⏹ Остановить') : roundStatus === 'correct' ? text('Келесі', 'Далее') : text('Ойнау', 'Играть')}
              </button>
            </div>
          </div>
          <div id="g2VerbDropGrid" className={`verb-drop-grid${roundStatus === 'wrong' ? ' verb-shake' : ''}`}>{slots.map((id, index) => {
            const item = id ? findVerbCard(id)! : null;
            const label = text(`${index + 1}-сөз`, `${index + 1}-е слово`);
            return <button type="button" key={index} data-slot-index={index} disabled={locked}
              className={`verb-drop-slot${hovered === index && !locked ? ' hovered' : ''}`}
              aria-label={item ? `${label}: ${item.label[locale]}. ${locked ? text('Дайын', 'Готово') : text('Алып тастау', 'Убрать')}` : label}
              onClick={() => {
                if (item) { if (store.remove(index)) playPracticeClick(); }
                else if (selected) place(selected, index);
              }}
              onDragOver={event => { if (!locked) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setHovered(index); } }}
              onDragLeave={() => setHovered(null)} onDrop={event => {
                event.preventDefault(); const value = event.dataTransfer.getData('text/plain');
                if (value.startsWith('verb:')) place(value.slice(5), index); else { setDragging(null); setHovered(null); }
              }}>
              <span className="verb-drop-slot-label">{index + 1}</span>
              {item ? <div className="verb-drop-card" data-verb-placed-id={item.id}>
                <VerbArt item={item} className="verb-drop-frame" />
                <div className="verb-card-meta"><div className="verb-card-title">{item.label[locale]}</div><div className="verb-card-badge">{locked ? text('Дайын', 'Готово') : text('Алып тастау', 'Убрать')}</div></div>
              </div> : <span className="verb-slot-placeholder">{label}</span>}
            </button>;
          })}</div>
          <div id="g2VerbBankGrid" className="verb-bank-grid">{verbCards.filter(item => !slots.includes(item.id)).map(item => <button key={item.id} type="button"
            data-verb-bank-id={item.id} aria-label={item.label[locale]} aria-pressed={selected === item.id} disabled={locked} draggable={!locked}
            className={`verb-bank-card${locked ? ' locked' : ''}${selected === item.id ? ' selected' : ''}${dragging === item.id ? ' dragging' : ''}`}
            onClick={() => { playPracticeClick(); store.select(item.id); }}
            onDragStart={event => { event.dataTransfer.setData('text/plain', `verb:${item.id}`); event.dataTransfer.effectAllowed = 'move'; setDragging(item.id); }}
            onDragEnd={() => { setDragging(null); setHovered(null); }}>
            <VerbArt item={item} className="verb-bank-frame" />
            <div className="verb-card-meta"><div className="verb-card-title">{item.label[locale]}</div><div className="verb-card-badge">{locked ? text('Құлыптаулы', 'Закрыто') : text('Таңдау', 'Выбрать')}</div></div>
            {locked && <span className="verb-bank-lock" aria-hidden="true">🔒</span>}
          </button>)}</div>
        </div>
      </div>
      <button className="btn btn-secondary verb-back" type="button" onClick={() => { playPracticeClick(); navigator.navigate('sentenceModuleScreen'); }}>{text('⬅️ Артқа', '⬅️ Назад')}</button>
    </div>
  </div>;
}

export function VerbPractice({ store }: { store: VerbStore }) {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const host = document.getElementById('g2VerbModule');
  return snapshot.active && host ? createPortal(<VerbScreen store={store} snapshot={snapshot} />, host) : null;
}
