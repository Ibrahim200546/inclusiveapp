import type { AudioWindow } from './types';

const selectors = '.center-circle, .chatbot-message-voice, .ai-message-audio-btn';
export function createSoundTriggers(app: AudioWindow) {
  let pending: Element | null = null;
  let pendingTimer: number | undefined;
  const locks = new Map<Element, { audio: HTMLAudioElement; timer: number; disabled: boolean }>();
  const owners = new Map<HTMLAudioElement, Element>();
  function clearPending() { app.clearTimeout(pendingTimer); pendingTimer = undefined; pending = null; }
  function unlock(trigger: Element, audio?: HTMLAudioElement) {
    const lock = locks.get(trigger);
    if (!lock || (audio && lock.audio !== audio)) return;
    app.clearTimeout(lock.timer); locks.delete(trigger); owners.delete(lock.audio);
    trigger.classList.remove('sound-trigger-locked');
    if (trigger instanceof app.HTMLButtonElement) trigger.disabled = lock.disabled;
  }
  return {
    click(event: MouseEvent) {
      const trigger = event.target instanceof app.Element ? event.target.closest(selectors) : null;
      // React exercises manage their own disabled state.
      if (!trigger || trigger.closest('[data-react-owned]')) return;
      if (locks.has(trigger)) { event.preventDefault(); event.stopImmediatePropagation(); return; }
      clearPending(); pending = trigger;
      pendingTimer = app.setTimeout(clearPending, 1800);
    },
    attach(audio: HTMLAudioElement) {
      if (!pending) return;
      const trigger = pending; clearPending(); unlock(trigger);
      locks.set(trigger, { audio, timer: app.setTimeout(() => unlock(trigger, audio), 15000), disabled: trigger instanceof app.HTMLButtonElement && trigger.disabled });
      owners.set(audio, trigger); trigger.classList.add('sound-trigger-locked');
      if (trigger instanceof app.HTMLButtonElement) trigger.disabled = true;
    },
    release(audio: HTMLAudioElement) { const trigger = owners.get(audio); if (trigger) unlock(trigger, audio); },
    clear() { clearPending(); [...locks.keys()].forEach(trigger => unlock(trigger)); },
  };
}
