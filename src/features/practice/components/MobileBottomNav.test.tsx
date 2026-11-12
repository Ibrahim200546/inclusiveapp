import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MobileBottomNav } from './MobileBottomNav';
import { NavigationContext } from '../navigation/navigationContext';
import { createScreenNavigator } from '../navigation/screenNavigator';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

it('opens each legacy action once and releases its navigation subscription on unmount', () => {
  document.body.innerHTML = '<div class="screen active" id="levelsScreen"></div><div class="screen" id="grade0Menu"></div><button id="aiChatToggle"></button>';
  const navigator = createScreenNavigator(document, { scrollToTop: vi.fn() });
  const unsubscribe = vi.fn();
  const subscribe = navigator.subscribe;
  navigator.subscribe = listener => {
    const release = subscribe(listener);
    return () => { unsubscribe(); release(); };
  };
  const profile = vi.fn();
  const leaderboard = vi.fn();
  const click = vi.fn();
  const assistant = vi.fn();
  vi.stubGlobal('openProfileModal', profile);
  vi.stubGlobal('openLeaderboardModal', leaderboard);
  vi.stubGlobal('playClick', click);
  document.getElementById('aiChatToggle')!.addEventListener('click', assistant);
  const { unmount, rerender } = render(<NavigationContext.Provider value={navigator}><MobileBottomNav locale="ru" /></NavigationContext.Provider>);
  fireEvent.click(screen.getByRole('button', { name: 'ИИ' }));
  expect(assistant).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: 'Отчёты' }));
  fireEvent.click(screen.getByRole('button', { name: 'Прогресс' }));
  expect(leaderboard).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole('button', { name: 'Профиль' }));
  expect(profile).toHaveBeenCalledOnce();
  rerender(<NavigationContext.Provider value={navigator}><MobileBottomNav locale="kk" /></NavigationContext.Provider>);
  expect(screen.getByRole('button', { name: 'Профиль' })).toHaveAttribute('aria-current', 'true');
  act(() => navigator.navigate('levelsScreen'));
  expect(screen.getByRole('button', { name: 'Басты' })).toHaveAttribute('aria-current', 'true');
  act(() => navigator.navigate('grade0Menu'));
  expect(screen.getByRole('button', { name: 'Прогресс' })).toHaveAttribute('aria-current', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Басты' }));
  expect(navigator.getActiveScreen()).toBe('levelsScreen');
  expect(click).toHaveBeenCalledOnce();
  unmount();
  expect(unsubscribe).toHaveBeenCalledOnce();
});
