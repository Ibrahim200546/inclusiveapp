import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { PracticeHeader } from "./components/PracticeHeader";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { TopControls } from "./components/TopControls";
import { LeaderboardModal } from "./components/LeaderboardModal";
import { leaderboardDialog } from "./profile/leaderboardDialog";
import { closePracticeLeaderboard } from "./legacy/leaderboard";
import { MainGradeMenu } from "./components/MainGradeMenu";
import { getPracticeLocale, subscribeToPracticeLocale } from "./legacy/bridge";
import { useActiveScreen, useNavigator } from "./navigation/navigationContext";

export function PracticeApp({ headerRoot, mobileNavRoot, topControlsRoot, leaderboardRoot }: {
  headerRoot: HTMLElement; mobileNavRoot: HTMLElement; topControlsRoot: HTMLElement; leaderboardRoot: HTMLElement;
}) {
  const navigator = useNavigator();
  const locale = useSyncExternalStore(subscribeToPracticeLocale, getPracticeLocale);
  const active = useActiveScreen() === "levelsScreen";
  const leaderboardRequest = useSyncExternalStore(leaderboardDialog.subscribe, leaderboardDialog.getSnapshot);

  return <>
    <MainGradeMenu locale={locale} active={active} onNavigate={navigator.navigate} />
    {createPortal(<PracticeHeader locale={locale} active={active} />, headerRoot)}
    {createPortal(<MobileBottomNav locale={locale} />, mobileNavRoot)}
    {createPortal(<TopControls locale={locale} />, topControlsRoot)}
    {leaderboardRequest !== null && createPortal(<LeaderboardModal key={leaderboardRequest} locale={locale} onClose={closePracticeLeaderboard} />, leaderboardRoot)}
  </>;
}
