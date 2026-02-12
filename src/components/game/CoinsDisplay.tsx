import { useGame } from '@/contexts/GameContext';

const CoinsDisplay = () => {
  const { coins } = useGame();
  return (
    <div className="fixed top-4 right-4 z-50 flex items-center justify-center bg-white/30 backdrop-blur-md rounded-full px-4 py-2 shadow-lg border border-white/40">
      <span className="text-2xl mr-2">🪙</span>
      <span className="text-xl font-bold text-white drop-shadow-md">{coins}</span>
    </div>
  );
};

export default CoinsDisplay;
