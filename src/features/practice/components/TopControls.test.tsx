import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { TopControls } from './TopControls';

afterEach(() => {
  cleanup(); vi.unstubAllGlobals(); vi.useRealTimers();
  localStorage.clear(); document.body.innerHTML = ''; document.body.className = '';
});

it('restores theme and synchronizes the legacy profile switch in both directions', () => {
  localStorage.setItem('theme', 'dark');
  document.body.innerHTML = '<input type="checkbox" id="profile_theme_toggle_input">';
  const profileToggle = document.getElementById('profile_theme_toggle_input') as HTMLInputElement;
  const { unmount } = render(<TopControls locale="ru" />);
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
  unmount();
  fireEvent.click(profileToggle);
  expect(localStorage.getItem('theme')).toBe('dark');
});

it('renders profile snapshots, restarts reward feedback and cleans up timers', () => {
  vi.useFakeTimers();
  const initial = { coins: 7, avatarUrl: '/avatar.png', rewardVersion: 0 };
  vi.stubGlobal('practiceProfileSummary', initial);
  const { container, unmount } = render(<TopControls locale="kk" />);
  const coins = container.querySelector('#coinCount')!;
  expect(coins).toHaveTextContent('7');
  expect(container.querySelector('#topProfileImg')).toHaveAttribute('src', '/avatar.png');
  function reward(amount: number) {
    act(() => {
      vi.stubGlobal('practiceProfileSummary', { coins: amount, avatarUrl: '/new.png', rewardVersion: amount });
      window.dispatchEvent(new Event('practice-profile-change'));
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
