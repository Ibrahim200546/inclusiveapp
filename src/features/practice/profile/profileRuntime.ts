import { clearPracticeAuth, profileApi, readPracticeAuth } from './profileApi';
import { createProfileStore } from './profileStore';

function readAiPrefs() {
  try { const prefs = JSON.parse(localStorage.getItem('adminAiWidgetVisibility') || '{}'); return { chat: prefs?.chat !== false, speech: prefs?.speech !== false }; }
  catch { return { chat: true, speech: true }; }
}
export const profileStore = createProfileStore({
  api: profileApi, getAuth: readPracticeAuth, clearAuth: clearPracticeAuth, initialAiPrefs: readAiPrefs(),
  saveAiPrefs: prefs => localStorage.setItem('adminAiWidgetVisibility', JSON.stringify(prefs)),
});

let open = false;
const listeners = new Set<() => void>();
export const profileDialog = {
  getSnapshot: () => open,
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  open() { open = true; listeners.forEach(listener => listener()); void profileStore.refresh(); },
  close() { open = false; listeners.forEach(listener => listener()); },
};
