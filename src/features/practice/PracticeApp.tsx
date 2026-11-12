import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { PracticeHeader } from "./components/PracticeHeader";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { TopControls } from "./components/TopControls";
import { LeaderboardModal } from "./components/LeaderboardModal";
import { ProfileModal } from './components/ProfileModal';
import { profileDialog } from './profile/profileRuntime';
import { leaderboardDialog } from "./profile/leaderboardDialog";
import { closePracticeLeaderboard } from "./legacy/leaderboard";
import { MainGradeMenu } from "./components/MainGradeMenu";
import { getPracticeLocale, subscribeToPracticeLocale } from "./legacy/bridge";
import { useActiveScreen, useNavigator } from "./navigation/navigationContext";
import { ListeningPractice } from './components/ListeningPractice';
import type { ListeningStore, SoundLibrary } from './learning/listeningStore';

export function PracticeApp({ headerRoot, mobileNavRoot, topControlsRoot, leaderboardRoot, profileRoot, learning }: {
  headerRoot: HTMLElement; mobileNavRoot: HTMLElement; topControlsRoot: HTMLElement; leaderboardRoot: HTMLElement; profileRoot: HTMLElement;
  learning: { store: ListeningStore; sounds: SoundLibrary };
}) {
  const navigator = useNavigator();
  const locale = useSyncExternalStore(subscribeToPracticeLocale, getPracticeLocale);
  const active = useActiveScreen() === "levelsScreen";
  const leaderboardRequest = useSyncExternalStore(leaderboardDialog.subscribe, leaderboardDialog.getSnapshot);
  const profileOpen = useSyncExternalStore(profileDialog.subscribe, profileDialog.getSnapshot);

  return <>
    <MainGradeMenu locale={locale} active={active} onNavigate={navigator.navigate} />
    <ListeningPractice store={learning.store} sounds={learning.sounds} />
    {createPortal(<PracticeHeader locale={locale} active={active} />, headerRoot)}
    {createPortal(<MobileBottomNav locale={locale} />, mobileNavRoot)}
    {createPortal(<TopControls locale={locale} />, topControlsRoot)}
    {createPortal(<ProfileModal locale={locale} active={profileOpen} />, profileRoot)}
    {leaderboardRequest !== null && createPortal(<LeaderboardModal key={leaderboardRequest} locale={locale} onClose={closePracticeLeaderboard} />, leaderboardRoot)}
  </>;
}
