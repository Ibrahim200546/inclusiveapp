import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { TopControls } from './TopControls';
import { profileStore } from '../profile/profileRuntime';
import { usePracticeTheme } from '../hooks/usePracticeTheme';

afterEach(() => {
  cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers();
  localStorage.clear(); document.body.innerHTML = ''; document.body.className = '';
});

function SecondTheme() {
  const { dark, changeTheme } = usePracticeTheme();
  return <input type="checkbox" aria-label="Profile theme" checked={dark} onChange={event => changeTheme(event.target.checked)} />;
}

it('restores theme and synchronizes both React switches', () => {
  localStorage.setItem('theme', 'dark');
  render(<><TopControls locale="ru" /><SecondTheme /></>);
  const profileToggle = screen.getByRole('checkbox', { name: 'Profile theme' });
  const topToggle = screen.getByRole('checkbox', { name: 'Тёмная тема' });
  expect(topToggle).toBeChecked();
  expect(profileToggle).toBeChecked();
  expect(document.body).toHaveClass('theme-dark');
  fireEvent.click(topToggle);
  expect(profileToggle).not.toBeChecked();
  expect(localStorage.getItem('theme')).toBe('light');
  fireEvent.click(profileToggle);
  expect(topToggle).toBeChecked();
  expect(document.body).toHaveClass('theme-dark');
  expect(localStorage.getItem('theme')).toBe('dark');
});

it('renders profile snapshots, restarts reward feedback and cleans up timers', () => {
  vi.useFakeTimers();
  const initial = { ...profileStore.getSnapshot(), coins: 7, avatarUrl: '/avatar.png', rewardVersion: 0 };
  const snapshot = vi.spyOn(profileStore, 'getSnapshot').mockReturnValue(initial);
  let notify = () => {};
  const unsubscribe = vi.fn();
  vi.spyOn(profileStore, 'subscribe').mockImplementation(listener => { notify = listener; return unsubscribe; });
  const { container, unmount } = render(<TopControls locale="kk" />);
  const coins = container.querySelector('#coinCount')!;
  expect(coins).toHaveTextContent('7');
  expect(container.querySelector('#topProfileImg')).toHaveAttribute('src', '/avatar.png');
  function reward(amount: number) {
    act(() => {
      snapshot.mockReturnValue({ ...initial, coins: amount, avatarUrl: '/new.png', rewardVersion: amount });
      notify();
    });
  }
  reward(17);
  expect(coins).toHaveTextContent('17');
  expect(coins).toHaveStyle({ transform: 'scale(1.5)' });
  act(() => vi.advanceTimersByTime(200));
  reward(27);
  act(() => vi.advanceTimersByTime(100));
  expect(coins).toHaveStyle({ transform: 'scale(1.5)' });
  act(() => vi.advanceTimersByTime(200));
  expect(coins).toHaveStyle({ transform: 'scale(1)' });
  expect(container.querySelector('#topProfileImg')).toHaveAttribute('src', '/new.png');
  reward(37);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
  expect(unsubscribe).toHaveBeenCalledOnce();
});

it('delegates language and profile actions once and renders the selected language', () => {
  const language = vi.fn();
  const profile = vi.fn();
  vi.stubGlobal('setLangProfile', language);
  vi.stubGlobal('openProfileModal', profile);
  const { rerender } = render(<TopControls locale="kk" />);
  fireEvent.click(screen.getByRole('button', { name: 'РУС' }));
  expect(language).toHaveBeenCalledExactlyOnceWith('ru');
  rerender(<TopControls locale="ru" />);
  expect(screen.getByRole('button', { name: 'РУС' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'ҚАЗ' })).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(screen.getByRole('button', { name: 'Открыть профиль' }));
  expect(profile).toHaveBeenCalledOnce();
});
