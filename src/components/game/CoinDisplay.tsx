import { useGame } from '@/contexts/GameContext';

const CoinDisplay = () => {
  const { coins } = useGame();

  return (
    <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-50 flex items-center gap-1.5 sm:gap-2 rounded-full px-3 sm:px-5 py-1.5 sm:py-2.5 font-bold text-sm sm:text-lg shadow-lg"
      style={{ background: 'var(--coin-gradient)' }}>
      <span>🪙</span>
      <span style={{ color: 'hsl(30, 80%, 15%)' }}>{coins}</span>
    </div>
  );
};

export default CoinDisplay;
