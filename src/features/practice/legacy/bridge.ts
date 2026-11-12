/** Temporary boundary to legacy profile state that has not moved to React yet. */
type LegacyPracticeWindow = Window & {
  getProfileLang?: () => string;
  playClick?: () => void;
  openProfileModal?: () => void;
  openLeaderboardModal?: () => void;
};

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
