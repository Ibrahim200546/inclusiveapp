import { authStorageKey, readPracticeAuth } from '../profile/profileApi';
import { profileDialog, profileStore } from '../profile/profileRuntime';
import { leaderboardDialog } from '../profile/leaderboardDialog';
import { getPracticeLocale, playPracticeClick } from './bridge';

// Only the existing AI widget DOM is managed here. Profile DOM belongs to React.
function applyAiWidgetVisibility() {
  const state = profileStore.getSnapshot();
  document.body.classList.toggle('profile-guest-mode', !state.userId);
  for (const kind of ['chat', 'speech'] as const) {
    const visible = state.aiWidgets[kind];
    document.body.classList.toggle(`ai-${kind}-hidden-by-admin`, !visible);
    if (visible) continue;
    const name = kind === 'chat' ? 'Chat' : 'Speech';
    document.getElementById(`ai${name}Window`)?.classList.add('hidden');
    if (kind === 'chat') document.getElementById('aiContactWindow')?.classList.add('hidden');
    const toggle = document.getElementById(`ai${name}Toggle`);
    if (toggle) { toggle.style.transform = 'scale(1)'; toggle.style.opacity = '1'; }
  }
}

export function installLegacyProfile() {
  const descriptors = new Map<string, PropertyDescriptor | undefined>();
  function install(name: string, descriptor: PropertyDescriptor) {
    descriptors.set(name, Object.getOwnPropertyDescriptor(window, name));
    Object.defineProperty(window, name, { configurable: true, ...descriptor });
  }
  install('currentUserId', { get: () => profileStore.getSnapshot().userId });
  install('profileFullName', { get: () => profileStore.getSnapshot().userId ? profileStore.getSnapshot().name : getPracticeLocale() === 'ru' ? 'Гость' : 'Қонақ' });
  install('getSupaAuth', { value: readPracticeAuth, writable: true });
  install('addCoins', { value: profileStore.addCoins, writable: true });
  install('openProfileModal', { value: () => { playPracticeClick(); leaderboardDialog.close(); profileDialog.open(); }, writable: true });
  install('closeProfileModal', { value: () => { playPracticeClick(); profileDialog.close(); }, writable: true });
  install('applyAiWidgetVisibility', { value: applyAiWidgetVisibility, writable: true });
  const release = profileStore.subscribe(applyAiWidgetVisibility);
  const onStorage = (event: StorageEvent) => { if (event.key === authStorageKey() || event.key === null) void profileStore.refresh(); };
  window.addEventListener('storage', onStorage);
  applyAiWidgetVisibility();
  return () => {
    release(); window.removeEventListener('storage', onStorage); profileStore.dispose(); profileDialog.close();
    descriptors.forEach((descriptor, name) => {
      if (descriptor) Object.defineProperty(window, name, descriptor);
      else Reflect.deleteProperty(window, name);
    });
  };
}
