import { profileStore } from '../profile/profileRuntime';

/** Temporary entry points for classic scripts and locale state. */
type LegacyPracticeWindow = Window & {
  setLangProfile?: (locale: 'kk' | 'ru') => void;
  getProfileLang?: () => string;
  playClick?: () => void;
  openProfileModal?: () => void;
  closeProfileModal?: () => void;
  openLeaderboardModal?: () => void;
  getSupaAuth?: () => { access_token: string } | null;
  INCLUSIVE_SUPABASE_URL?: string;
  INCLUSIVE_SUPABASE_ANON_KEY?: string;
};

export function getPracticeProfile() {
  return profileStore.getSnapshot();
}
export function subscribeToPracticeProfile(onChange: () => void) {
  return profileStore.subscribe(onChange);
}
export function setPracticeLocale(locale: 'kk' | 'ru') {
  (window as LegacyPracticeWindow).setLangProfile?.(locale);
}

export function getPracticeLocale(): "kk" | "ru" {
  return (window as LegacyPracticeWindow).getProfileLang?.() === "ru" ? "ru" : "kk";
}

export function subscribeToPracticeLocale(onChange: () => void) {
  window.addEventListener("profile-language-change", onChange);
  return () => window.removeEventListener("profile-language-change", onChange);
}

// Globals keep classic callers compatible while the implementation migrates.
export function playPracticeClick() { (window as LegacyPracticeWindow).playClick?.(); }
export function openPracticeProfile() { (window as LegacyPracticeWindow).openProfileModal?.(); }
export function closePracticeProfile() { (window as LegacyPracticeWindow).closeProfileModal?.(); }
export function openPracticeLeaderboard() { (window as LegacyPracticeWindow).openLeaderboardModal?.(); }
export function openPracticeAssistant() { document.getElementById('aiChatToggle')?.click(); }

export function getLeaderboardConnection() {
  const app = window as LegacyPracticeWindow;
  if (!app.INCLUSIVE_SUPABASE_URL || !app.INCLUSIVE_SUPABASE_ANON_KEY) throw new Error('Practice API configuration is missing');
  return { url: app.INCLUSIVE_SUPABASE_URL, apiKey: app.INCLUSIVE_SUPABASE_ANON_KEY, accessToken: app.getSupaAuth?.()?.access_token };
}
