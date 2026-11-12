import { useEffect, useState } from 'react';
import { openPracticeAssistant, openPracticeLeaderboard, openPracticeProfile, playPracticeClick } from '../legacy/bridge';
import { useNavigator } from '../navigation/navigationContext';

const items = [
  { key: 'home', icon: '🏠', kk: 'Басты', ru: 'Главная' },
  { key: 'ai', icon: '🧠', kk: 'ЖИ', ru: 'ИИ' },
  { key: 'reports', icon: '📄', kk: 'Есеп', ru: 'Отчёты' },
  { key: 'progress', icon: '📊', kk: 'Прогресс', ru: 'Прогресс' },
  { key: 'profile', icon: '👤', kk: 'Профиль', ru: 'Профиль' },
] as const;
type NavKey = typeof items[number]['key'];

export function MobileBottomNav({ locale }: { locale: 'kk' | 'ru' }) {
  const navigator = useNavigator();
  const screenSelection = (): NavKey => navigator.getActiveScreen() === 'levelsScreen' ? 'home' : 'progress';
  const [selected, setSelected] = useState<NavKey>(screenSelection);

  // Subscribe to transitions, including navigating to the same screen, so a
  // legacy back action also clears a previously selected modal shortcut.
  useEffect(() => navigator.subscribe(() => {
    setSelected(navigator.getActiveScreen() === 'levelsScreen' ? 'home' : 'progress');
  }), [navigator]);

  function activate(key: NavKey) {
    setSelected(key);
    switch (key) {
      case 'home': playPracticeClick(); navigator.navigate('levelsScreen'); break;
      case 'ai': openPracticeAssistant(); break;
      case 'reports':
      case 'progress': openPracticeLeaderboard(); break;
      case 'profile': openPracticeProfile(); break;
    }
  }

  return (
    <nav className="mobile-bottom-nav" data-react-owned="true" data-i18n-managed="true"
      aria-label={locale === 'ru' ? 'Мобильная навигация' : 'Мобильді навигация'}>
      {items.map(item => (
        <button key={item.key} type="button" data-mobile-nav={item.key}
          className={selected === item.key ? 'active' : undefined}
          aria-current={selected === item.key ? 'true' : undefined}
          onClick={() => activate(item.key)}>
          <span aria-hidden="true">{item.icon}</span>
          <span data-mobile-nav-label={item.key}>{item[locale]}</span>
        </button>
      ))}
    </nav>
  );
}
