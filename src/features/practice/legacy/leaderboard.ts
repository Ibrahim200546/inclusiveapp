import { leaderboardDialog } from '../profile/leaderboardDialog';
import { closePracticeProfile, openPracticeProfile, playPracticeClick } from './bridge';

export function closePracticeLeaderboard() {
  playPracticeClick();
  leaderboardDialog.close();
  openPracticeProfile();
}

export function installLegacyLeaderboard() {
  const app = window as Window & { openLeaderboardModal?: () => void; closeLeaderboardModal?: () => void };
  const previousOpen = app.openLeaderboardModal;
  const previousClose = app.closeLeaderboardModal;
  app.openLeaderboardModal = () => {
    playPracticeClick();
    closePracticeProfile();
    leaderboardDialog.open();
  };
  app.closeLeaderboardModal = closePracticeLeaderboard;
  return () => {
    app.openLeaderboardModal = previousOpen;
    app.closeLeaderboardModal = previousClose;
    leaderboardDialog.close();
  };
}
