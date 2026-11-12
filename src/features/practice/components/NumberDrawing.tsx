import { useRef, type PointerEvent } from 'react';
import type { Locale } from '../learning/content';

export function NumberDrawing({ locale }: { locale: Locale }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const previous = useRef<{ x: number; y: number } | null>(null);
  const text = (kk: string, ru: string) => locale === 'ru' ? ru : kk;
  function point(event: PointerEvent<HTMLCanvasElement>) {
    const node = event.currentTarget, bounds = node.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * node.width / bounds.width, y: (event.clientY - bounds.top) * node.height / bounds.height };
  }
  function start(event: PointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0) return;
    const node = event.currentTarget, ctx = node.getContext('2d');
    if (!ctx) return;
    node.setPointerCapture(event.pointerId); previous.current = point(event);
    ctx.fillStyle = getComputedStyle(node).color;
    ctx.beginPath(); ctx.arc(previous.current.x, previous.current.y, 3, 0, Math.PI * 2); ctx.fill();
  }
  function move(event: PointerEvent<HTMLCanvasElement>) {
    const node = event.currentTarget;
    if (!previous.current || !node.hasPointerCapture(event.pointerId)) return;
    const next = point(event), ctx = node.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = getComputedStyle(node).color; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(previous.current.x, previous.current.y); ctx.lineTo(next.x, next.y); ctx.stroke(); previous.current = next;
  }
  const end = () => { previous.current = null; };
  return <details className="learning-drawing">
    <summary>{text('✍ Цифрды жазып көр', '✍ Попробуй написать цифру')}</summary>
    <p>{text('Саусақпен немесе тінтуірмен жазыңыз. Жауапты жоғарыдағы цифрдан таңдаңыз.', 'Рисуйте пальцем или мышью. Ответ выбирайте среди цифр выше.')}</p>
    <canvas ref={canvas} width={640} height={260} aria-label={text('Цифр жазуға арналған орын', 'Область для рисования цифр')}
      onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} />
    <button type="button" className="btn btn-secondary" onClick={() => { end(); const node = canvas.current; node?.getContext('2d')?.clearRect(0, 0, node.width, node.height); }}>
      {text('Тазалау', 'Очистить')}
    </button>
  </details>;
}
