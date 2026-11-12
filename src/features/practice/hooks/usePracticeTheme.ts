import { useLayoutEffect, useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();
const getTheme = () => localStorage.getItem('theme') === 'dark';
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
function changeTheme(dark: boolean) {
  localStorage.setItem('theme', dark ? 'dark' : 'light');
  listeners.forEach(listener => listener());
}

export function usePracticeTheme() {
  const dark = useSyncExternalStore(subscribe, getTheme);

  useLayoutEffect(() => {
    document.body.classList.toggle('theme-dark', dark);
    document.body.style.setProperty('--app-bg-image', dark ? "url('assets/night.jpg')" : "url('assets/background.jpg')");
  }, [dark]);

  return { dark, changeTheme };
}
