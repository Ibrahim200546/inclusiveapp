import type { CSSProperties, KeyboardEvent } from 'react';
import { useRadialMenu } from '../hooks/useRadialMenu';

export type GradeDestination = 'grade0Menu' | 'grade2Menu' | 'grade3Menu' | 'grade4Menu';

interface MainGradeMenuProps {
  locale: 'kk' | 'ru';
  active: boolean;
  onNavigate: (destination: GradeDestination) => void;
}

const grades: { destination: GradeDestination; icon: string; number: string; angle: number; kk: string; ru: string }[] = [
  { destination: 'grade0Menu', icon: '🐣', number: '0-1', angle: 270, kk: 'Дайындық', ru: 'Подготовка' },
  { destination: 'grade2Menu', icon: '🚗', number: '2', angle: 0, kk: '2-сынып', ru: '2 класс' },
  { destination: 'grade3Menu', icon: '🎵', number: '3', angle: 90, kk: '3-сынып', ru: '3 класс' },
  { destination: 'grade4Menu', icon: '🎤', number: '4', angle: 180, kk: '4-сынып', ru: '4 класс' },
];

function activateWithKeyboard(event: KeyboardEvent<HTMLDivElement>, action: () => void) {
  if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) {
    event.preventDefault();
    action();
  }
}

export function MainGradeMenu({ locale, active, onNavigate }: MainGradeMenuProps) {
  const menu = useRadialMenu(active);
  return (
    <div
      ref={menu.menuRef}
      id="mainRadialMenu"
      className={`radial-menu-container${menu.geometryOpen ? ' active' : ''}${menu.morphing ? ' radial-droplet-morph' : ''}`}
      data-react-owned="true"
      data-i18n-managed="true"
    >
      <div
        className="radial-center-btn"
        role="button"
        tabIndex={active ? 0 : -1}
        aria-expanded={menu.expanded}
        onClick={menu.toggle}
        onKeyDown={event => activateWithKeyboard(event, menu.toggle)}
      >
        {locale === 'ru' ? 'Выберите' : 'Сыныпты'}<br />{locale === 'ru' ? 'класс' : 'таңдаңыз'}
      </div>
      {grades.map(grade => {
        const navigate = () => { if (menu.interactive) onNavigate(grade.destination); };
        return (
          <div
            key={grade.destination}
            className="radial-item"
            data-destination={grade.destination}
            style={{ '--angle': `${grade.angle}deg`, '--dist': '220px' } as CSSProperties}
            role="button"
            tabIndex={menu.interactive ? 0 : -1}
            aria-hidden={!menu.interactive}
            onClick={navigate}
            onKeyDown={event => activateWithKeyboard(event, navigate)}
          >
            <div style={{ fontSize: 40 }}>{grade.icon}</div>
            <h3>{grade.number}</h3>
            <p>{grade[locale]}</p>
          </div>
        );
      })}
    </div>
  );
}
