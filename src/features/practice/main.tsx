import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { PracticeApp } from "./PracticeApp";
import { installLegacyNavigation } from "./legacy/navigation";
import { NavigationContext } from "./navigation/navigationContext";
import { installLegacyLeaderboard } from './legacy/leaderboard';
import { leaderboardDialog } from './profile/leaderboardDialog';
import { installLegacyProfile } from './legacy/profile';
import { profileDialog, profileStore } from './profile/profileRuntime';
import { installPracticeAudio } from './audio/runtime';
import type { AudioWindow } from './audio/types';
import { installArticulationNavigation, stopLegacyInputStreams } from './legacy/audio';
import { installLegacyLearning } from './legacy/learning';

// The module entry runs after classic scripts and before DOMContentLoaded.
// Install navigation first: DOMContentLoaded initializers register hooks on it.
const navigator = installLegacyNavigation(window, document);
const audio = installPracticeAudio(window as AudioWindow, document, navigator, () => stopLegacyInputStreams(window as AudioWindow));
const releaseArticulationNavigation = installArticulationNavigation(navigator);
const learning = installLegacyLearning(navigator);
const releaseProfile = installLegacyProfile();
const releaseLeaderboard = installLegacyLeaderboard();
const releaseLeaderboardNavigation = navigator.register({ name: 'react-leaderboard', leave: () => leaderboardDialog.close() });
const releaseProfileNavigation = navigator.register({ name: 'react-profile', leave: () => profileDialog.close() });

// Mount synchronously so the remaining legacy initializers see a complete
// page, including React islands.
const container = document.querySelector<HTMLElement>("[data-practice-root]");
if (!container) throw new Error("Practice root is missing");
const headerRoot = document.getElementById('practiceHeaderRoot');
const mobileNavRoot = document.getElementById('practiceMobileNavRoot');
const topControlsRoot = document.getElementById('practiceTopControlsRoot');
const leaderboardRoot = document.getElementById('practiceLeaderboardRoot');
const profileRoot = document.getElementById('practiceProfileRoot');
if (!headerRoot || !mobileNavRoot || !topControlsRoot || !leaderboardRoot || !profileRoot) throw new Error('Practice shell roots are missing');
const root = createRoot(container);
flushSync(() => root.render(
  <NavigationContext.Provider value={navigator}>
    <PracticeApp headerRoot={headerRoot} mobileNavRoot={mobileNavRoot} topControlsRoot={topControlsRoot} leaderboardRoot={leaderboardRoot} profileRoot={profileRoot} learning={learning} />
  </NavigationContext.Provider>,
));
void profileStore.refresh();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    root.unmount();
    releaseLeaderboardNavigation();
    releaseProfileNavigation();
    releaseLeaderboard();
    releaseProfile();
    releaseArticulationNavigation();
    learning.dispose();
    audio.dispose();
  });
}
