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
import { CurriculumPractice } from './components/CurriculumPractice';
import type { CurriculumStore } from './curriculum/store';
import { GradeMenus } from './components/GradeMenus';
import type { GradeRuntime } from './legacy/grades';
import type { ReadingRuntime } from './legacy/reading';
import { ReadingPractice } from './components/ReadingPractice';
import { AlphabetPractice } from './components/AlphabetPanel';

export function PracticeApp({ headerRoot, mobileNavRoot, topControlsRoot, leaderboardRoot, profileRoot, learning, curriculum, grades, reading }: {
  headerRoot: HTMLElement; mobileNavRoot: HTMLElement; topControlsRoot: HTMLElement; leaderboardRoot: HTMLElement; profileRoot: HTMLElement;
  learning: { store: ListeningStore; sounds: SoundLibrary };
  curriculum: CurriculumStore;
  grades: GradeRuntime;
  reading: ReadingRuntime;
}) {
  const navigator = useNavigator();
  const locale = useSyncExternalStore(subscribeToPracticeLocale, getPracticeLocale);
  const active = useActiveScreen() === "levelsScreen";
  const leaderboardRequest = useSyncExternalStore(leaderboardDialog.subscribe, leaderboardDialog.getSnapshot);
  const profileOpen = useSyncExternalStore(profileDialog.subscribe, profileDialog.getSnapshot);

  return <>
    <MainGradeMenu locale={locale} active={active} onNavigate={navigator.navigate} />
    <GradeMenus runtime={grades} curriculum={curriculum} locale={locale} openSyllables={reading.openSyllables} />
    <ReadingPractice runtime={reading} grades={grades.store} />
    <AlphabetPractice locale={locale} audio={reading.alphabet} />
    <ListeningPractice store={learning.store} sounds={learning.sounds} />
    <CurriculumPractice store={curriculum} />
    {createPortal(<PracticeHeader locale={locale} active={active} />, headerRoot)}
    {createPortal(<MobileBottomNav locale={locale} />, mobileNavRoot)}
    {createPortal(<TopControls locale={locale} />, topControlsRoot)}
    {createPortal(<ProfileModal locale={locale} active={profileOpen} />, profileRoot)}
    {leaderboardRequest !== null && createPortal(<LeaderboardModal key={leaderboardRequest} locale={locale} onClose={closePracticeLeaderboard} />, leaderboardRoot)}
  </>;
}
