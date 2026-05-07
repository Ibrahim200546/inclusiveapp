import { useEffect, useState } from 'react';
import type { Locale } from '@/lib/translations';

const PROFILE_LANG_KEY = 'profileLang';
const SHARED_LOCALE_KEY = 'locale';

function normalizeLocale(value: string | null): Locale {
  return value === 'ru' || value === 'kk' ? value : 'kk';
}

export function readLocalePreference(): Locale {
  if (typeof window === 'undefined') return 'kk';
  return normalizeLocale(
    window.localStorage.getItem(PROFILE_LANG_KEY) || window.localStorage.getItem(SHARED_LOCALE_KEY)
  );
}

export function useLocalePreference(): Locale {
  const [locale, setLocale] = useState<Locale>(() => readLocalePreference());

  useEffect(() => {
    const syncLocale = () => setLocale(readLocalePreference());
    window.addEventListener('storage', syncLocale);
    window.addEventListener('profile-language-change', syncLocale as EventListener);
    return () => {
      window.removeEventListener('storage', syncLocale);
      window.removeEventListener('profile-language-change', syncLocale as EventListener);
    };
  }, []);

  return locale;
}
