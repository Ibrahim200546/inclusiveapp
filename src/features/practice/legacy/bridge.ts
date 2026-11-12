/** Temporary boundary to legacy profile state that has not moved to React yet. */
type LegacyPracticeWindow = Window & {
  getProfileLang?: () => string;
};

export function getPracticeLocale(): "kk" | "ru" {
  return (window as LegacyPracticeWindow).getProfileLang?.() === "ru" ? "ru" : "kk";
}

export function subscribeToPracticeLocale(onChange: () => void) {
  window.addEventListener("profile-language-change", onChange);
  return () => window.removeEventListener("profile-language-change", onChange);
}
