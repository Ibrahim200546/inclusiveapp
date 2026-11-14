import type { FrogMotion } from './store';
import type { FrogStep } from './content';

type Point = { x: number; y: number };
type Elements = { field: HTMLElement; board: HTMLElement; character: HTMLElement };
const transform = ({ x, y }: Point, scale = 1) => `translate(${x}px, ${y}px) scale(${scale})`;

/** Only this driver owns the character transform. React owns the cards and markers. */
export function createFrogAnimation(app = window) {
  let elements: Elements | null = null, point: Point = { x: 0, y: 0 }, anchor: number | null = null;
  let release: (() => void) | null = null, cancelMotion: (() => void) | null = null;
  const cancel = () => { cancelMotion?.(); };
  const reduced = () => app.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  function location(index: number | null): Point | null {
    if (!elements || !elements.field.getBoundingClientRect().width) return null;
    if (index === null) return { x: elements.field.clientWidth / 2 - 30, y: 8 };
    const target = elements.field.querySelector<HTMLElement>(`[data-frog-step="${index}"]`);
    if (!target) return null;
    const rect = target.getBoundingClientRect(), container = elements.field.getBoundingClientRect();
    return { x: rect.left - container.left + rect.width / 2 - 30, y: rect.top - container.top - 60 };
  }
  function place(index: number | null) {
    anchor = index;
    const next = location(index);
    if (elements && next && !cancelMotion) { point = next; elements.character.style.transform = transform(point); }
  }
  function animate(frames: Keyframe[], duration: number, destination: Point, signal: AbortSignal): Promise<boolean> {
    cancel();
    const character = elements?.character;
    if (!character || signal.aborted) return Promise.resolve(false);
    if (reduced() || typeof character.animate !== 'function') {
      point = destination; character.style.transform = transform(point); return Promise.resolve(true);
    }
    return new Promise((resolve, reject) => {
      let animation: Animation;
      try { animation = character.animate(frames, { duration, easing: 'ease-in-out', fill: 'forwards' }); }
      catch (error) { reject(error); return; }
      let settled = false;
      const finish = (done: boolean) => {
        if (settled) return;
        settled = true; clearTimeout(timeout); signal.removeEventListener('abort', abort);
        animation.onfinish = null; animation.oncancel = null; cancelMotion = null;
        if (done) point = destination;
        character.style.transform = transform(point);
        animation.cancel(); resolve(done);
      };
      const abort = () => finish(false);
      // A missing finish event must not leave the action permanently disabled.
      const timeout = setTimeout(() => finish(false), duration + 1000);
      cancelMotion = abort; animation.onfinish = () => finish(true); animation.oncancel = abort;
      signal.addEventListener('abort', abort, { once: true });
    });
  }
  const motion: FrogMotion = {
    cancel,
    async jump(step: FrogStep, signal: AbortSignal) {
      if (!elements || signal.aborted) return false;
      const destination = location(step.index);
      if (!destination) return false;
      const { board, field } = elements;
      const top = field.offsetTop + destination.y;
      if (top < board.scrollTop || top + 115 > board.scrollTop + board.clientHeight) board.scrollTop = Math.max(0, top - 16);
      const visibleTop = board.parentElement?.querySelector('.frog-controls')?.getBoundingClientRect().bottom ?? 0;
      const visibleBottom = app.innerHeight - (app.innerWidth <= 768 ? 80 : 16);
      const characterTop = field.getBoundingClientRect().top + destination.y;
      if (characterTop < visibleTop || characterTop + 115 > visibleBottom) board.scrollIntoView?.({ block: 'start', behavior: 'instant' });
      const long = step.syllableIndex === 0, distance = Math.hypot(destination.x - point.x, destination.y - point.y);
      const height = long ? Math.min(distance / 2, 200) : 60;
      return animate([
        { transform: transform(point) },
        { transform: transform({ x: (point.x + destination.x) / 2, y: (point.y + destination.y) / 2 - height }, 1.2), offset: .5 },
        { transform: transform(destination) },
      ], long ? Math.max(500, distance * 1.5) : 400, destination, signal);
    },
    celebrate(signal) {
      const up = transform({ x: point.x, y: point.y - 40 }, 1.1);
      return animate([{ transform: transform(point) }, { transform: up }, { transform: transform(point) }, { transform: up }, { transform: transform(point) }], 600, point, signal);
    },
  };
  return { ...motion, place,
    attach(next: Elements, interrupted: () => void) {
      release?.(); elements = next; anchor = null; place(null);
      let width = next.field.clientWidth, height = next.field.clientHeight;
      const resize = () => {
        if (width === next.field.clientWidth && height === next.field.clientHeight) return;
        width = next.field.clientWidth; height = next.field.clientHeight;
        interrupted(); place(anchor);
      };
      const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
      observer?.observe(next.field); app.addEventListener('resize', resize);
      const detach = () => {
        cancel(); observer?.disconnect(); app.removeEventListener('resize', resize);
        if (elements === next) { elements = null; release = null; }
      };
      release = detach; return detach;
    },
    dispose() { release?.(); cancel(); },
  };
}
