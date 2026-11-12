import { useEffect, useLayoutEffect, useState } from 'react';

export function usePracticeTheme() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useLayoutEffect(() => {
    document.body.classList.toggle('theme-dark', dark);
    document.body.style.setProperty('--app-bg-image', dark ? "url('assets/night.jpg')" : "url('assets/background.jpg')");
    const profileToggle = document.getElementById('profile_theme_toggle_input') as HTMLInputElement | null;
    if (profileToggle) profileToggle.checked = dark;
  }, [dark]);

  function changeTheme(next: boolean) {
    localStorage.setItem('theme', next ? 'dark' : 'light');
    setDark(next);
  }

  useEffect(() => {
    // Temporary adapter for the profile modal, whose markup is still legacy.
    const profileToggle = document.getElementById('profile_theme_toggle_input') as HTMLInputElement | null;
    const onChange = () => {
      if (!profileToggle) return;
      localStorage.setItem('theme', profileToggle.checked ? 'dark' : 'light');
      setDark(profileToggle.checked);
    };
    profileToggle?.addEventListener('change', onChange);
    return () => profileToggle?.removeEventListener('change', onChange);
  }, []);

  return { dark, changeTheme };
}
