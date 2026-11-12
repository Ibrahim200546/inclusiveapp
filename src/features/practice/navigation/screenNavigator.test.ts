import { afterEach, describe, expect, it, vi } from 'vitest';
import { installLegacyNavigation } from '../legacy/navigation';
import { createScreenNavigator, type NavigationHook } from './screenNavigator';

function screens(...ids: string[]) {
  document.body.innerHTML = ids.map((id, index) => `<div id="${id}" class="screen${index === 0 ? ' active' : ''}"></div>`).join('') + '<div id="notAScreen"></div>';
}

const activeIds = () => Array.from(document.querySelectorAll('.screen.active')).map(screen => screen.id);

afterEach(() => {
  document.body.innerHTML = '';
  delete (window as { showScreen?: unknown }).showScreen;
  delete (window as { practiceNavigationHooks?: unknown }).practiceNavigationHooks;
});

describe('screen navigator', () => {
  it('runs leave and prepare before activation, then enter, and notifies subscribers', () => {
    screens('levelsScreen', 'grade0Menu');
    const navigator = createScreenNavigator(document, { scrollToTop: vi.fn() });
    const calls: string[] = [];
    const observe = (name: string): NavigationHook => ({
      name,
      leave: ({ from, to }) => calls.push(`${name}:leave:${from}->${to}:${activeIds()}`),
      prepare: () => calls.push(`${name}:prepare:${activeIds()}`),
      enter: () => calls.push(`${name}:enter:${activeIds()}`),
    });
    navigator.register(observe('a'));
    navigator.register(observe('b'));
    const listener = vi.fn(() => calls.push(`listener:${navigator.getActiveScreen()}`));
    navigator.subscribe(listener);

    navigator.navigate('grade0Menu');

    expect(calls).toEqual([
      'a:leave:levelsScreen->grade0Menu:levelsScreen',
      'b:leave:levelsScreen->grade0Menu:levelsScreen',
      'a:prepare:levelsScreen',
      'b:prepare:levelsScreen',
      'listener:grade0Menu',
      'a:enter:grade0Menu',
      'b:enter:grade0Menu',
    ]);
    expect(activeIds()).toEqual(['grade0Menu']);
  });

  it('rejects unknown targets without changing the visible screen', () => {
    screens('levelsScreen', 'grade0Menu');
    const leave = vi.fn();
    const navigator = createScreenNavigator(document, { scrollToTop: vi.fn() });
    navigator.register({ name: 'audio', leave });
    expect(() => navigator.navigate('missing')).toThrow('Unknown practice screen: missing');
    expect(() => navigator.navigate('notAScreen')).toThrow('Unknown practice screen: notAScreen');
    expect(leave).not.toHaveBeenCalled();
    expect(activeIds()).toEqual(['levelsScreen']);
  });

  it('completes navigation when a hook fails and reports the failure', () => {
    screens('levelsScreen', 'grade0Menu');
    const reportError = vi.fn();
    const enter = vi.fn();
    const navigator = createScreenNavigator(document, { reportError, scrollToTop: vi.fn() });
    navigator.register({ name: 'broken', leave: () => { throw new Error('stop failed'); } });
    navigator.register({ name: 'next', enter });
    navigator.navigate('grade0Menu');
    expect(reportError).toHaveBeenCalledWith(new Error('stop failed'));
    expect(enter).toHaveBeenCalledOnce();
    expect(activeIds()).toEqual(['grade0Menu']);
  });

  it('lets a redirect from a hook supersede the rest of the transition', () => {
    screens('levelsScreen', 'grade0Menu', 'grade2Menu');
    const navigator = createScreenNavigator(document, { scrollToTop: vi.fn() });
    const late = vi.fn();
    navigator.register({ name: 'redirect', enter: ({ to }) => { if (to === 'grade0Menu') navigator.navigate('grade2Menu'); } });
    navigator.register({ name: 'late', enter: late });
    navigator.navigate('grade0Menu');
    expect(late.mock.calls.map(([transition]) => transition)).toEqual([{ from: 'grade0Menu', to: 'grade2Menu' }]);
    expect(navigator.getActiveScreen()).toBe('grade2Menu');
    expect(activeIds()).toEqual(['grade2Menu']);
  });

  it('rejects duplicate hook names and supports unregistering', () => {
    screens('levelsScreen', 'grade0Menu');
    const navigator = createScreenNavigator(document, { scrollToTop: vi.fn() });
    const enter = vi.fn();
    const unregister = navigator.register({ name: 'once', enter });
    expect(() => navigator.register({ name: 'once' })).toThrow('Duplicate navigation hook: once');
    unregister();
    navigator.navigate('grade0Menu');
    expect(enter).not.toHaveBeenCalled();
  });
});

describe('legacy navigation installation', () => {
  it('drains hooks queued by classic scripts, registers later hooks and owns showScreen', () => {
    screens('levelsScreen', 'grade0Menu');
    const early = vi.fn();
    const late = vi.fn();
    const legacy = window as unknown as { practiceNavigationHooks: { push(hook: NavigationHook): number }; showScreen: (id: string) => void };
    legacy.practiceNavigationHooks = [{ name: 'early', enter: early }] as unknown as typeof legacy.practiceNavigationHooks;
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    const navigator = installLegacyNavigation(window, document);
    legacy.practiceNavigationHooks.push({ name: 'late', enter: late });
    legacy.showScreen('grade0Menu');

    expect(early).toHaveBeenCalledWith({ from: 'levelsScreen', to: 'grade0Menu' });
    expect(late).toHaveBeenCalledOnce();
    expect(navigator.getActiveScreen()).toBe('grade0Menu');
    expect(() => { legacy.showScreen = () => undefined; }).toThrow(/owned by practice navigation/);
  });
});
