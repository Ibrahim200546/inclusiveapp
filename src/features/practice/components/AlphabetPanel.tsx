import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { alphabet, mouthImage, type AlphabetEntry } from '../reading/alphabet';
import type { Locale } from '../learning/content';
import type { AlphabetAudio } from '../legacy/reading';
import { useActiveScreen } from '../navigation/navigationContext';

function trapTab(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== 'Tab') return;
  const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button'));
  const first = buttons[0], last = buttons[buttons.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
}

function WordPopup({ entry, locale, play, close, floating }: { entry: AlphabetEntry; locale: Locale; play(word: string): void; close(): void; floating: boolean }) {
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector('button')?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, []);
  return <div id="alippeWordDisplay" className={floating ? 'alippe-popup-floating' : undefined} ref={dialog} role="dialog" aria-modal="true" aria-labelledby="alippeWordLetter"
    data-react-owned="true" data-i18n-managed="true" data-reading-audio="true"
    onClick={event => { if (event.target === event.currentTarget) close(); }}
    onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close(); } else trapTab(event); }}>
    <img className="alippe-mouth" src={mouthImage(entry.letter)} alt={locale === 'ru' ? 'Положение рта' : 'Ауыз қалпы'} />
    <div className="alippe-popup-icon" aria-hidden="true">{entry.icon}</div>
    <h1 id="alippeWordLetter">{entry.letter}</h1>
    <div className="alippe-popup-words">{entry.words.map(word => <button type="button" key={word} className="alippe-popup-word" onClick={() => play(word)}>
      <span>{word}</span><span aria-hidden="true">🔊</span>
    </button>)}</div>
    <button type="button" className="btn btn-secondary alippe-popup-close" onClick={close}>{locale === 'ru' ? 'Закрыть ❌' : 'Жабу ❌'}</button>
  </div>;
}

export function AlphabetPanel({ locale, audio, wrapper }: { locale: Locale; audio: AlphabetAudio; wrapper: HTMLElement | null }) {
  const entries = alphabet[locale];
  const [index, setIndex] = useState(0), [focus, setFocus] = useState(false), [popup, setPopup] = useState(false), [failed, setFailed] = useState(false);
  const entry = entries[index] || entries[0];
  const sequence = useRef(0), header = useRef<HTMLButtonElement>(null), card = useRef<HTMLDivElement>(null);
  const title = locale === 'ru' ? 'Азбука' : 'Әліппе';
  const closePopup = () => { sequence.current++; audio.stop(); setPopup(false); setFailed(false); };
  const closeFocus = () => { sequence.current++; audio.stop(); setFocus(false); setFailed(false); };
  function play(letter: string, word?: string) {
    const token = ++sequence.current; setFailed(false);
    void (word ? audio.word(letter, word) : audio.letter(letter)).then(result => {
      if (token === sequence.current) setFailed(result === 'error');
    }).catch(() => { if (token === sequence.current) setFailed(true); });
  }
  useEffect(() => () => { sequence.current++; audio.stop(); }, [audio]);
  useEffect(() => {
    if (!focus) return;
    const button = header.current;
    document.body.classList.add('alippe-focus-active'); card.current?.querySelector('button')?.focus();
    return () => { document.body.classList.remove('alippe-focus-active'); if (button?.isConnected) button.focus(); };
  }, [focus]);
  function move(direction: number) {
    const next = (index + direction + entries.length) % entries.length;
    setIndex(next); play(entries[next].letter);
  }
  return <aside className={`alippe-panel${focus ? ' alippe-focus-mode' : ''}`} aria-label={title}
    data-react-owned="true" data-i18n-managed="true" data-reading-audio="true">
    <div className="alippe-header"><button type="button" ref={header} className="alippe-header-button" onClick={() => {
      setPopup(false); setFocus(true); play(entry.letter);
    }}>{title}</button></div>
    <div className="alippe-grid">{entries.map((item, position) => <button type="button" key={item.letter}
      className={`alippe-item${popup && position === index ? ' expanded' : ''}`} aria-label={`${item.letter} — ${item.word}`}
      onClick={() => { setIndex(position); setPopup(true); play(item.letter, locale === 'ru' ? item.word : undefined); }}>
      <span className="alippe-item-icon" aria-hidden="true">{item.icon}</span><span className="alippe-item-letter">{item.letter}</span><span className="alippe-word">{item.word}</span>
    </button>)}</div>
    {focus && <div className="alippe-focus-card" ref={card} onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); closeFocus(); } else trapTab(event);
    }}>
      <div className="alippe-focus-main"><div className="alippe-focus-icon" aria-hidden="true">{entry.icon}</div>
        <button type="button" className="alippe-focus-letter" data-alippe-action="replay" onClick={() => play(entry.letter)}>{entry.letter}</button>
        <div className="alippe-focus-word">{entry.word}</div>
      </div>
      <div className="alippe-focus-actions">
        <button type="button" className="btn btn-secondary" data-alippe-action="back" onClick={() => move(-1)}>{locale === 'ru' ? 'Назад' : 'Артқа'}</button>
        <button type="button" className="btn btn-primary" data-alippe-action="toggle" onClick={closeFocus}>{title}</button>
        <button type="button" className="btn btn-secondary" data-alippe-action="next" onClick={() => move(1)}>{locale === 'ru' ? 'Дальше' : 'Келесі'}</button>
      </div>
    </div>}
    {failed && <p role="status" className="alippe-audio-error">{locale === 'ru' ? 'Звук не загрузился. Попробуйте ещё раз.' : 'Дыбыс жүктелмеді. Қайталап көріңіз.'}</p>}
    {popup && !focus && wrapper && createPortal(<WordPopup entry={entry} locale={locale} close={closePopup} play={word => play(entry.letter, word)}
      floating={!wrapper.querySelector('.radial-menu-container')} />, wrapper)}
  </aside>;
}

export function AlphabetPractice({ locale, audio }: { locale: Locale; audio: AlphabetAudio }) {
  const active = useActiveScreen();
  const screen = document.getElementById(active);
  const host = screen?.querySelector<HTMLElement>('.practice-alphabet-root');
  if (!host) return null;
  return createPortal(<AlphabetPanel key={`${active}:${locale}`} locale={locale} audio={audio} wrapper={screen.querySelector('.task-content-wrapper')} />, host);
}
