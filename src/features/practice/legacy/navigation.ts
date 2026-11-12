import { createScreenNavigator, type NavigationHook, type ScreenNavigator } from '../navigation/screenNavigator';

/** Classic scripts load before this module, so they enqueue hooks in an array
 * (`practiceNavigationHooks`). Installation drains it and replaces it with a
 * queue that registers later hooks directly.
 */
interface HookQueue {
  push(...hooks: NavigationHook[]): number;
}

type LegacyNavigationWindow = Window & {
  practiceNavigationHooks?: NavigationHook[] | HookQueue;
  showScreen?: (screenId: string) => void;
};

export function installLegacyNavigation(win: Window, root: Document): ScreenNavigator {
  const target = win as LegacyNavigationWindow;
  const navigator = createScreenNavigator(root);
  const pending = target.practiceNavigationHooks;
  target.practiceNavigationHooks = {
    push(...hooks) {
      hooks.forEach(hook => navigator.register(hook));
      return hooks.length;
    },
  };
  if (Array.isArray(pending)) pending.forEach(hook => navigator.register(hook));

  Object.defineProperty(target, 'showScreen', {
    configurable: true,
    enumerable: true,
    get: () => navigator.navigate,
    set() {
      throw new Error('showScreen is owned by practice navigation; register a hook in practiceNavigationHooks instead');
    },
  });
  return navigator;
}
