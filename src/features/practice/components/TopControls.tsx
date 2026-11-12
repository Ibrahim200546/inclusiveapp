import { ThemeSwitch } from './ThemeSwitch';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { getPracticeProfile, openPracticeProfile, setPracticeLocale, subscribeToPracticeProfile } from '../legacy/bridge';
import { usePracticeTheme } from '../hooks/usePracticeTheme';

export function TopControls({ locale }: { locale: 'kk' | 'ru' }) {
  const profile = useSyncExternalStore(subscribeToPracticeProfile, getPracticeProfile);
  const { dark, changeTheme } = usePracticeTheme();
  const [reward, setReward] = useState(false);
  useEffect(() => {
    if (!profile.rewardVersion) return;
    setReward(true);
    const timeout = window.setTimeout(() => setReward(false), 300);
    return () => window.clearTimeout(timeout);
  }, [profile.rewardVersion]);

  return (
    <div className="top-right-controls" data-react-owned="true" data-i18n-managed="true">
      <div className="top-control-row">
        <ThemeSwitch id="theme_toggle_input" dark={dark} onChange={changeTheme} locale={locale} />
        <div className="profile-lang-switch top-lang-switch" aria-label="Тіл / Язык">
          {(['kk', 'ru'] as const).map(lang => (
            <button key={lang} type="button" id={`top-lang-btn-${lang}`} data-lang={lang}
              className={`profile-lang-btn top-lang-btn${locale === lang ? ' active' : ''}`}
              aria-pressed={locale === lang} onClick={() => setPracticeLocale(lang)}>
              {lang === 'kk' ? 'ҚАЗ' : 'РУС'}
            </button>
          ))}
        </div>
      </div>
      <button type="button" className="profile-btn" onClick={openPracticeProfile}
        aria-label={locale === 'ru' ? 'Открыть профиль' : 'Профильді ашу'}>
        <img src={profile.avatarUrl} id="topProfileImg" alt="" />
      </button>
      <div className="coins-display">
        🪙 <span id="coinCount" style={{ transform: reward ? 'scale(1.5)' : 'scale(1)' }}>{profile.coins}</span>
      </div>
    </div>
  );
}
