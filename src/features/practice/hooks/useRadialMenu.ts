import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

const motionOptions: KeyframeAnimationOptions = {
  duration: 650,
  easing: 'cubic-bezier(.22,.8,.3,1)',
  fill: 'both',
};
const temporaryProperties = ['transition', 'display', 'opacity', 'transform', 'pointer-events'] as const;

function mergedPosition(item: HTMLElement, origin: DOMRect, scale: number) {
  const value = item.style.getPropertyValue('scale');
  const priority = item.style.getPropertyPriority('scale');
  item.style.setProperty('scale', String(scale), 'important');
  const box = item.getBoundingClientRect();
  if (value) item.style.setProperty('scale', value, priority);
  else item.style.removeProperty('scale');
  return {
    translate: `${origin.x + origin.width / 2 - box.x - box.width / 2}px ${origin.y + origin.height / 2 - box.y - box.height / 2}px`,
    scale,
  };
}

/** Keeps animation mutations inside a React lifecycle; no global menu handlers. */
export function useRadialMenu(active: boolean, initiallyExpanded = false) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ expanded: initiallyExpanded, geometryOpen: initiallyExpanded, animating: false, morphing: false });
  const desired = useRef(initiallyExpanded);
  const running = useRef(false);
  const mounted = useRef(false);
  const visible = useRef(active);
  visible.current = active;
  const generation = useRef(0);
  const animations = useRef<Animation[]>([]);
  const restore = useRef<(() => void) | null>(null);
  const morphTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = useCallback(() => {
    generation.current++;
    animations.current.forEach(animation => animation.cancel());
    animations.current = [];
    restore.current?.();
    restore.current = null;
    running.current = false;
    if (morphTimer.current) clearTimeout(morphTimer.current);
    morphTimer.current = null;
  }, []);

  const morph = useCallback(() => {
    if (morphTimer.current) clearTimeout(morphTimer.current);
    morphTimer.current = setTimeout(() => {
      if (mounted.current) setView(current => ({ ...current, morphing: false }));
    }, 1100);
  }, []);

  const runTransition = useCallback(async function transition(open: boolean) {
    const menu = menuRef.current;
    if (!menu || !mounted.current || !visible.current) return;
    const token = ++generation.current;
    animations.current.forEach(animation => animation.cancel());
    animations.current = [];
    const center = menu.querySelector<HTMLElement>(':scope > .radial-center-btn');
    const items = Array.from(menu.querySelectorAll<HTMLElement>(':scope > .radial-item:not([hidden])'));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !center || !items.length || typeof items[0].animate !== 'function') {
      setView({ expanded: open, geometryOpen: open, animating: false, morphing: false });
      return;
    }

    running.current = true;
    const saved = items.map(item => ({
      item,
      properties: temporaryProperties.map(name => ({ name, value: item.style.getPropertyValue(name), priority: item.style.getPropertyPriority(name) })),
    }));
    restore.current = () => {
      for (const entry of saved) for (const property of entry.properties) {
        if (property.name === 'transition') continue;
        if (property.value) entry.item.style.setProperty(property.name, property.value, property.priority);
        else entry.item.style.removeProperty(property.name);
      }
      void menu.offsetWidth;
      for (const entry of saved) {
        const property = entry.properties[0];
        if (property.value) entry.item.style.setProperty(property.name, property.value, property.priority);
        else entry.item.style.removeProperty(property.name);
      }
    };
    // Both opening and closing animate from the expanded orbit geometry.
    for (const item of items) {
      item.style.setProperty('transition', 'none', 'important');
      item.style.setProperty('display', 'flex', 'important');
      item.style.setProperty('opacity', '1', 'important');
      item.style.setProperty('pointer-events', 'none', 'important');
    }
    flushSync(() => setView({ expanded: open, geometryOpen: true, animating: true, morphing: true }));
    const origin = center.getBoundingClientRect();
    morph();
    try {
      for (const [index, item] of items.entries()) {
        item.style.setProperty('transform', getComputedStyle(item).transform, 'important');
        const merged = mergedPosition(item, origin, 0.08);
        const expanded = { translate: '0px 0px', scale: 1 };
        animations.current.push(item.animate(open ? [merged, expanded] : [expanded, merged], {
          ...motionOptions,
          delay: open ? Math.min(index * 18, 150) : 0,
        }));
      }
      await Promise.allSettled(animations.current.map(animation => animation.finished));
    } catch {
      // A browser without a usable animation implementation still completes navigation.
    } finally {
      if (token === generation.current && mounted.current) {
        flushSync(() => setView(current => ({ ...current, expanded: open, geometryOpen: open, animating: false })));
        animations.current.forEach(animation => animation.cancel());
        animations.current = [];
        restore.current?.();
        restore.current = null;
        running.current = false;
        if (desired.current !== open && visible.current) void transition(desired.current);
      }
    }
  }, [morph]);

  const toggle = useCallback(() => {
    if (!visible.current) return;
    desired.current = !desired.current;
    // Repeated activation changes the queued destination, without overlapping animations.
    if (!running.current) void runTransition(desired.current);
  }, [runTransition]);

  useLayoutEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; cancel(); };
  }, [cancel]);

  useLayoutEffect(() => {
    if (!active) {
      cancel();
      setView({ expanded: desired.current, geometryOpen: desired.current, animating: false, morphing: false });
      return;
    }
    // Re-entering the screen preserves the chosen open state and the original entrance motion.
    const menu = menuRef.current;
    if (!desired.current || !menu || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const frame = requestAnimationFrame(() => {
      const center = menu.querySelector<HTMLElement>(':scope > .radial-center-btn');
      if (!center || !visible.current) return;
      const origin = center.getBoundingClientRect();
      const items = Array.from(menu.querySelectorAll<HTMLElement>(':scope > .radial-item:not([hidden])'));
      animations.current = items.filter(item => typeof item.animate === 'function').map((item, index) => item.animate([
        mergedPosition(item, origin, 0.12), { translate: '0px 0px', scale: 1 },
      ], { ...motionOptions, delay: Math.min(index * 20, 180), fill: 'backwards' }));
      setView(current => ({ ...current, morphing: true }));
      morph();
    });
    return () => cancelAnimationFrame(frame);
  }, [active, cancel, morph]);

  return { menuRef, toggle, ...view, interactive: active && view.expanded && !view.animating };
}
