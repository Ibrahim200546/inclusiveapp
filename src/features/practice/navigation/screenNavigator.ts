export interface NavigationTransition {
  from: string | null;
  to: string;
}

/**
 * A screen-specific reaction to navigation. Phases run in registration order:
 * `leave` stops playback and sessions, `prepare` moves content before the
 * destination becomes visible, `enter` initializes the visible destination.
 */
export interface NavigationHook {
  name: string;
  leave?(transition: NavigationTransition): void;
  prepare?(transition: NavigationTransition): void;
  enter?(transition: NavigationTransition): void;
}

export interface ScreenNavigator {
  navigate(screenId: string): void;
  getActiveScreen(): string | null;
  subscribe(listener: () => void): () => void;
  register(hook: NavigationHook): () => void;
}

interface NavigatorOptions {
  /** Called for a hook failure; navigation itself still completes. */
  reportError?: (error: unknown) => void;
  scrollToTop?: () => void;
}

function rethrowLater(error: unknown) {
  queueMicrotask(() => { throw error; });
}

export function createScreenNavigator(root: Document, options: NavigatorOptions = {}): ScreenNavigator {
  const report = options.reportError ?? rethrowLater;
  const scrollToTop = options.scrollToTop ?? (() => root.defaultView?.scrollTo(0, 0));
  const hooks: NavigationHook[] = [];
  const listeners = new Set<() => void>();
  let active = root.querySelector<HTMLElement>('.screen.active')?.id || null;
  let generation = 0;

  function screens() {
    return Array.from(root.querySelectorAll<HTMLElement>('.screen'));
  }

  function run(phase: 'leave' | 'prepare' | 'enter', transition: NavigationTransition, token: number) {
    for (const hook of [...hooks]) {
      // A hook that navigates again supersedes the rest of this transition.
      if (token !== generation) return false;
      const handler = hook[phase];
      if (!handler) continue;
      try {
        handler.call(hook, transition);
      } catch (error) {
        report(error);
      }
    }
    return token === generation;
  }

  return {
    navigate(screenId) {
      const destination = root.getElementById(screenId);
      if (!destination?.classList.contains('screen')) throw new Error(`Unknown practice screen: ${screenId}`);
      const token = ++generation;
      const transition = { from: active, to: screenId };
      if (!run('leave', transition, token) || !run('prepare', transition, token)) return;

      for (const screen of screens()) screen.classList.toggle('active', screen === destination);
      active = screenId;
      scrollToTop();
      listeners.forEach(listener => listener());
      run('enter', transition, token);
    },
    getActiveScreen: () => active,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    register(hook) {
      if (hooks.some(existing => existing.name === hook.name)) throw new Error(`Duplicate navigation hook: ${hook.name}`);
      hooks.push(hook);
      return () => {
        const index = hooks.indexOf(hook);
        if (index >= 0) hooks.splice(index, 1);
      };
    },
  };
}
