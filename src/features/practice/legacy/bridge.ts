/** Temporary boundary to legacy profile state that has not moved to React yet. */
type LegacyPracticeWindow = Window & {
  practiceProfileSummary?: PracticeProfileSummary;
  setLangProfile?: (locale: 'kk' | 'ru') => void;
  getProfileLang?: () => string;
  playClick?: () => void;
  openProfileModal?: () => void;
  openLeaderboardModal?: () => void;
};

export interface PracticeProfileSummary {
  coins: number;
  avatarUrl: string;
  rewardVersion: number;
}
const emptyProfile: PracticeProfileSummary = {
  coins: 0,
  avatarUrl: 'https://ui-avatars.com/api/?name=U&background=667eea&color=fff&rounded=true',
  rewardVersion: 0,
};

export function getPracticeProfile() {
  return (window as LegacyPracticeWindow).practiceProfileSummary ?? emptyProfile;
}
export function subscribeToPracticeProfile(onChange: () => void) {
  window.addEventListener('practice-profile-change', onChange);
  return () => window.removeEventListener('practice-profile-change', onChange);
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

// Modal contents and audio still belong to legacy modules.
export function playPracticeClick() { (window as LegacyPracticeWindow).playClick?.(); }
export function openPracticeProfile() { (window as LegacyPracticeWindow).openProfileModal?.(); }
export function openPracticeLeaderboard() { (window as LegacyPracticeWindow).openLeaderboardModal?.(); }
export function openPracticeAssistant() { document.getElementById('aiChatToggle')?.click(); }
