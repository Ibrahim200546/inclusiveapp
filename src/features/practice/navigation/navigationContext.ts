import { createContext, useContext, useSyncExternalStore } from 'react';
import type { ScreenNavigator } from './screenNavigator';

export const NavigationContext = createContext<ScreenNavigator | null>(null);

export function useNavigator() {
  const navigator = useContext(NavigationContext);
  if (!navigator) throw new Error('Practice navigation is not provided');
  return navigator;
}

export function useActiveScreen() {
  const navigator = useNavigator();
  return useSyncExternalStore(navigator.subscribe, navigator.getActiveScreen);
}
