import type { CSSProperties, ReactNode } from 'react';
import { useRadialMenu } from '../../hooks/useRadialMenu';

export interface OrbitItem {
  key: string; label: string; icon: ReactNode; caption: ReactNode; onClick(): void;
  className?: string; disabled?: boolean; hidden?: boolean; pressed?: boolean; lang?: string;
  attributes?: Record<string, string>;
}
export function CurriculumOrbit({ title, items, active, className = '', id, labelledBy }: {
  title: string; items: OrbitItem[]; active: boolean; className?: string; id?: string; labelledBy?: string;
}) {
  const menu = useRadialMenu(active, true);
  return <div ref={menu.menuRef} id={id} role={labelledBy ? 'tabpanel' : undefined} aria-labelledby={labelledBy}
    data-long-title={String(title.length > 30)}
    className={`${className} radial-menu-container exercise-orbit exercise-picture-orbit${menu.geometryOpen ? ' active' : ''}${menu.morphing ? ' radial-droplet-morph' : ''}`}>
    {items.map((item, index) => <button key={item.key} type="button" {...item.attributes} lang={item.lang}
      className={`radial-item ${item.className || ''}`} aria-label={item.label} aria-pressed={item.pressed}
      hidden={item.hidden} disabled={item.disabled} aria-hidden={item.hidden || !menu.interactive}
      tabIndex={menu.interactive && !item.disabled && !item.hidden ? 0 : -1}
      style={{ '--angle': `${-90 + index * 360 / items.length}deg`, '--orbit': '34cqw' } as CSSProperties}
      onClick={() => { if (menu.interactive) item.onClick(); }}>
      <div className="exercise-orbit-icon curriculum-orbit-icon" aria-hidden="true">{item.icon}</div>
      <p className="exercise-orbit-caption curriculum-orbit-caption">{item.caption}</p>
    </button>)}
    <button type="button" className="radial-center-btn" aria-expanded={menu.expanded} tabIndex={active ? 0 : -1} onClick={menu.toggle}>{title}</button>
  </div>;
}
