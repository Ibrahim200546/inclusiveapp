import type { KeyboardEvent } from 'react';
import type { CurriculumSnapshot, CurriculumStore } from '../../curriculum/store';
import { categories, lessonIcon } from '../../curriculum/presentation';
import { identity } from '../../curriculum/session';
import type { Category } from '../../curriculum/types';
import { useNavigator } from '../../navigation/navigationContext';
import { CurriculumOrbit } from './CurriculumOrbit';

export function CurriculumCatalog({ store, snapshot, active }: { store: CurriculumStore; snapshot: CurriculumSnapshot; active: boolean }) {
  const navigator = useNavigator();
  const { grade, category, page, parent } = snapshot.catalog;
  const text = (kk: string, ru: string) => snapshot.locale === 'ru' ? ru : kk;
  const available = store.lessons.filter(lesson => lesson.grade === grade);
  const tabs = (Object.keys(categories) as Category[]).filter(key => available.some(lesson => lesson.category === key));
  const lessons = available.filter(lesson => lesson.category === category), pages = Math.ceil(lessons.length / 4);
  function keydown(event: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const buttons = [...event.currentTarget.querySelectorAll('button')], index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) return;
    event.preventDefault();
    const target = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    store.selectCategory(tabs[target]); buttons[target].focus({ preventScroll: true });
  }
  return <div className="curriculum-panel" data-react-owned="true" data-i18n-managed="true">
    <div className="curriculum-toolbar">
      <button type="button" className="btn btn-secondary" onClick={() => navigator.navigate(parent)}>{text('⬅ Артқа', '⬅ Назад')}</button>
      <label><span>{text('Сынып: ', 'Класс: ')}</span><select aria-label={text('Сынып', 'Класс')} value={grade} onChange={event => store.selectGrade(Number(event.target.value))}>
        {[0, 1, 2, 3, 4].map(value => <option key={value} value={value}>{value}</option>)}
      </select></label>
    </div>
    <h2>{text('Оқу тапсырмалары', 'Учебные задания')}</h2>
    <div className="curriculum-tabs" role="tablist" aria-label={text('Бөлімдер', 'Разделы')} onKeyDown={keydown}>
      {tabs.map(key => <button key={key} type="button" role="tab" id={'curriculum-tab-' + key} aria-controls="curriculum-lessons"
        aria-selected={category === key} tabIndex={category === key ? 0 : -1} onClick={() => store.selectCategory(key)}>{text(...categories[key])}</button>)}
    </div>
    <CurriculumOrbit key={`${grade}:${category}:${page}`} title={text('Оқу тапсырмалары', 'Учебные задания')} active={active}
      className="curriculum-cards" id="curriculum-lessons" labelledBy={'curriculum-tab-' + category}
      items={lessons.slice(page * 4, (page + 1) * 4).map(lesson => ({
        key: identity(lesson), label: lesson.title, icon: lessonIcon(lesson), className: 'curriculum-card', lang: 'kk',
        attributes: { 'data-lesson': lesson.id }, onClick: () => store.openLesson(lesson),
        caption: <>{lesson.title}{(snapshot.progress[identity(lesson)]?.completed || snapshot.progress[identity(lesson)]?.everCompleted) &&
          <span className="curriculum-completed">{text(' ✓ Орындалды', ' ✓ Выполнено')}</span>}</>,
      }))} />
    <nav className="curriculum-pager" aria-label={text('Мәзір беттері', 'Страницы меню')}>
      {pages > 1 && <>
        <button type="button" className="btn btn-secondary" disabled={page === 0} onClick={() => { store.selectPage(page - 1); window.scrollTo(0, 0); }}>{text('← Алдыңғы', '← Предыдущие')}</button>
        <span aria-live="polite">{page + 1} / {pages}</span>
        <button type="button" className="btn btn-secondary" disabled={page === pages - 1} onClick={() => { store.selectPage(page + 1); window.scrollTo(0, 0); }}>{text('Келесі →', 'Следующие →')}</button>
      </>}
    </nav>
  </div>;
}
