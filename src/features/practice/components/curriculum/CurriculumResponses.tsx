import { useLayoutEffect, useRef, useState } from 'react';
import type { CurriculumStore, PracticeSnapshot } from '../../curriculum/store';
import type { Scene } from '../../curriculum/types';
import type { Locale } from '../../learning/content';
import { answerIcon } from '../../curriculum/presentation';
import { CurriculumOrbit, type OrbitItem } from './CurriculumOrbit';

function Picture({ scene }: { scene: Scene }) {
  const symbols = { winter: ['🌲', '🐦', '❄️'], build: ['👨', '👧', '🛠️'], seed: ['👧', '🌾', '🏠'], birds: ['🐦', '🏠', '🐦'] }[scene];
  return <svg viewBox="0 0 160 100" aria-hidden="true" className="curriculum-scene">
    <rect width="160" height="100" rx="14" fill="#dff2fd" /><path d="M0 78 Q80 65 160 78 V100 H0Z" fill="#f6fbff" />
    {symbols.map((symbol, index) => <text key={index} x={8 + index * 50} y={index === 1 ? 70 : 52} fontSize="36">{symbol}</text>)}
  </svg>;
}

export function CurriculumResponses({ practice, store, locale }: { practice: PracticeSnapshot; store: CurriculumStore; locale: Locale }) {
  const { step, state, choices, playing, lesson } = practice;
  const [selected, setSelected] = useState(state.order[0]);
  const row = useRef<HTMLDivElement>(null), restoreFocus = useRef(false);
  useLayoutEffect(() => {
    if (!restoreFocus.current) return;
    restoreFocus.current = false; row.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true });
  }, [state.order]);
  const text = (kk: string, ru: string) => locale === 'ru' ? ru : kk;
  const disabled = playing || !state.heard || state.solved;
  let items: OrbitItem[] = [];
  const longChoices = choices.some(choice => choice.label.length > 32);
  if (step?.kind === 'choice') items = choices.map((choice, index) => ({ key: choice.value, label: choice.label,
    caption: longChoices ? String(index + 1) : choice.label, icon: answerIcon(choice.label), lang: 'kk',
    attributes: { 'data-choice': choice.value }, disabled, pressed: state.solved && choice.value === step.answer, onClick: () => store.answer(choice.value) }));
  if (step?.kind === 'teacher') items = [
    { key: 'model', label: text('Педагог: үлгі көрсетілді', 'Педагог: образец показан'), icon: '🧑‍🏫', caption: text('Үлгі', 'Образец'),
      hidden: !step.teacherModel, disabled: playing || state.heard, onClick: store.model },
    { key: 'confirm', label: text('Педагог: қайталады', 'Педагог: повторил'), icon: '🗣️', caption: text('Қайталау', 'Повторение'), disabled, onClick: () => store.answer('teacher-confirmed') },
  ];
  if (step?.kind === 'order') items = state.order.map((value, index) => {
    const item = step.orderItems!.find(entry => entry.value === value)!;
    return { key: value, label: `${index + 1}. ${item.label}`, caption: `${index + 1}. ${item.label.length > 34 ? item.label.slice(0, 32) + '…' : item.label}`,
      icon: item.scene ? <Picture scene={item.scene} /> : '🧩', className: 'curriculum-order-pick', attributes: { 'data-order-pick': value },
      disabled, pressed: selected === value, onClick: () => setSelected(value) };
  });
  const orderItem = step?.kind === 'order' ? step.orderItems!.find(item => item.value === selected) : null;
  const index = state.order.indexOf(selected);
  return <>
    <div className={step?.kind === 'order' ? 'curriculum-options' : undefined}>
      <CurriculumOrbit title={lesson.title} items={items} active={practice.active} className={step?.kind === 'order' ? '' : 'curriculum-options'} />
      {orderItem && <>
        <div className="curriculum-order"><div ref={row} data-order-value={selected}>
          {orderItem.scene && <Picture scene={orderItem.scene} />}
          <span className="curriculum-order-text">{index + 1}. {orderItem.label}</span>
          <div className="curriculum-order-controls">{[-1, 1].map(direction => <button key={direction} type="button"
            disabled={disabled || index + direction < 0 || index + direction >= state.order.length}
            aria-label={text('Жоғары / төмен жылжыту: ', 'Переместить вверх / вниз: ') + orderItem.label + ' ' + (direction === -1 ? '↑' : '↓')}
            onClick={() => { restoreFocus.current = true; store.move(index, index + direction); }}>{direction === -1 ? '↑' : '↓'}</button>)}</div>
        </div></div>
        <button type="button" className="btn btn-secondary" disabled={disabled} onClick={() => store.answer('check-order')}>{text('Тексеру', 'Проверить')}</button>
      </>}
    </div>
    <div className="curriculum-legend" lang="kk">{longChoices && choices.map((choice, index) => <p key={choice.value}>{index + 1}. {choice.label}</p>)}</div>
  </>;
}
