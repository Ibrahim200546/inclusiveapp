import { useState, useSyncExternalStore, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useActiveScreen, useNavigator } from '../navigation/navigationContext';
import { useRadialMenu } from '../hooks/useRadialMenu';
import { gradeParent, type GradeStore } from '../menus/gradeStore';
import type { GradeMenuDefinition, MenuAction } from '../menus/definitions';
import type { GradeRuntime } from '../legacy/grades';
import { playPracticeClick } from '../legacy/bridge';
import type { CurriculumStore } from '../curriculum/store';
import type { Locale } from '../learning/content';

function GradePicker({ store, locale, active, className }: { store: GradeStore; locale: Locale; active: boolean; className?: string }) {
  const { junior } = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return <label className={className} data-react-owned="true" data-i18n-managed="true">
    {locale === 'ru' ? 'Класс: ' : 'Сынып: '}
    <select aria-label={locale === 'ru' ? 'Класс' : 'Сынып'} value={junior} tabIndex={active ? 0 : -1}
      onChange={event => store.selectJunior(Number(event.target.value) as 0 | 1)}>
      <option value="0">0</option><option value="1">1</option>
    </select>
  </label>;
}

function GradeMenu({ definition, store, locale, active, open, initiallyExpanded }: {
  definition: GradeMenuDefinition; store: GradeStore; locale: Locale; active: boolean;
  open(action: MenuAction, from: string): void; initiallyExpanded: boolean;
}) {
  const navigator = useNavigator();
  const { current } = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const grade = definition.grade ?? current;
  const [pages, setPages] = useState<Record<number, number>>({});
  const entries = definition.entries.filter(entry => (!entry.junior || grade < 2) && (entry.grade === undefined || entry.grade === grade));
  const pageCount = definition.paged ? Math.max(1, Math.ceil(entries.length / 5)) : 1;
  const page = Math.min(pages[grade] ?? 0, pageCount - 1);
  const shown = definition.paged ? entries.slice(page * 5, page * 5 + 5) : entries;
  const radial = useRadialMenu(active, initiallyExpanded, `${grade}:${page}`);
  const language = locale === 'ru' ? 1 : 0;
  const back = definition.id === 'grade0SoundsMenu' ? gradeParent(current) : definition.back;
  const hub = definition.id === 'learningHubScreen';
  const backButton = <button type="button" className="btn btn-secondary" data-destination={back}
    data-react-owned="true" data-i18n-managed="true" tabIndex={active ? 0 : -1}
    style={!definition.paged ? { position: 'absolute', bottom: 20, left: 20, zIndex: 100 } : undefined}
    onClick={() => { if (active) { playPracticeClick(); navigator.navigate(back); } }}>
    {hub ? (locale === 'ru' ? '⬅ Назад' : '⬅ Артқа') : (locale === 'ru' ? '⬅️ Назад' : '⬅️ Артқа')}
  </button>;
  return <>
    {definition.id === 'grade0Menu' && <GradePicker store={store} locale={locale} active={active} className="junior-grade-picker" />}
    {hub && <div className="learning-hub-nav" data-react-owned="true" data-i18n-managed="true">
      {backButton}<GradePicker store={store} locale={locale} active={active} />
    </div>}
    <div ref={radial.menuRef} data-react-owned="true" data-i18n-managed="true"
      className={`radial-menu-container${definition.paged ? ' paged-grade-menu' : ''}${radial.geometryOpen ? ' active' : ''}${radial.morphing ? ' radial-droplet-morph' : ''}`}
      style={hub ? undefined : { width: definition.size, height: definition.size }}>
      <button type="button" className="radial-center-btn" aria-expanded={radial.expanded} tabIndex={active ? 0 : -1}
        style={hub ? undefined : { cursor: 'pointer', width: definition.centerSize, height: definition.centerSize, fontSize: definition.fontSize,
          background: `linear-gradient(135deg, ${definition.colors[0]} 0%, ${definition.colors[1]} 100%)` }} onClick={radial.toggle}>
        {definition.labels[language]}
      </button>
      {definition.entries.map(entry => {
        const position = shown.indexOf(entry), visible = position !== -1;
        const interactive = radial.interactive && visible;
        const lesson = entry.action.kind === 'lesson' ? entry.action.lesson : null;
        const voiceBubble = definition.id === 'grade0VoiceMenu' && ['g0Task2', 'g0TaskFrog'].includes(entry.id);
        return <button key={entry.id} type="button" className="radial-item" hidden={!visible} tabIndex={interactive ? 0 : -1}
          aria-hidden={!interactive} aria-label={entry.labels[language]} lang={lesson ? 'kk' : undefined}
          data-grade={entry.grade} data-curriculum-id={lesson?.id} data-sound-category={entry.soundCategory}
          data-junior={entry.junior || undefined}
          data-destination={entry.action.kind === 'screen' || entry.action.kind === 'embedded' ? entry.action.screen : undefined}
          style={{ '--angle': `${position * 360 / shown.length - 90}deg`, '--dist': '220px', ...(definition.paged && { '--orbit': '34cqw' }) } as CSSProperties}
          onClick={() => { if (interactive) open(entry.action, definition.id); }}>
          <div aria-hidden="true" className={voiceBubble ? 'voice-center-bubble' : undefined}
            style={voiceBubble ? { width: 100, height: 100, fontSize: 50 } : undefined}>{entry.icon}</div><p>{entry.labels[language]}</p>
        </button>;
      })}
    </div>
    {definition.paged && <nav className="grade-menu-pages" hidden={pageCount === 1}
      data-react-owned="true" data-i18n-managed="true" aria-label={locale === 'ru' ? 'Страницы меню' : 'Мәзір беттері'}>
      <button type="button" aria-label={locale === 'ru' ? 'Предыдущая страница' : 'Алдыңғы бет'} disabled={page === 0 || radial.animating}
        tabIndex={active ? 0 : -1} onClick={() => setPages(value => ({ ...value, [grade]: page - 1 }))}>←</button>
      <span aria-live="polite">{page + 1} / {pageCount}</span>
      <button type="button" aria-label={locale === 'ru' ? 'Следующая страница' : 'Келесі бет'} disabled={page === pageCount - 1 || radial.animating}
        tabIndex={active ? 0 : -1} onClick={() => setPages(value => ({ ...value, [grade]: page + 1 }))}>→</button>
    </nav>}
    {!hub && backButton}
  </>;
}

export function GradeMenus({ runtime, curriculum, locale }: { runtime: GradeRuntime; curriculum: CurriculumStore; locale: Locale }) {
  const activeScreen = useActiveScreen();
  const { voiceEntry } = useSyncExternalStore(runtime.store.subscribe, runtime.store.getSnapshot);
  const [hosts] = useState(() => runtime.menus.map(definition => {
    const host = document.querySelector<HTMLElement>(`#${definition.id} [data-grade-menu-root]`);
    if (!host) throw new Error(`Missing grade menu host: ${definition.id}`);
    return { definition, host };
  }));
  const open = (action: MenuAction, from: string) => {
    if (action.kind === 'lesson') curriculum.openLesson(action.lesson, from);
    else runtime.openExercise(action, from);
  };
  return <>{hosts.map(({ definition, host }) => {
    const reset = definition.id === 'grade0DauyspenmMenu' ? voiceEntry : 0;
    return createPortal(<GradeMenu key={`${definition.id}:${reset}`} definition={definition} store={runtime.store}
      locale={locale} active={activeScreen === definition.id} open={open} initiallyExpanded={reset === 0} />, host, definition.id);
  })}</>;
}
