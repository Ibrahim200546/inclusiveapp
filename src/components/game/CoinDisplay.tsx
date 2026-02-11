import { useGame } from '@/contexts/GameContext';

const CoinDisplay = () => {
  const { coins } = useGame();

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-full px-5 py-2.5 font-bold text-lg shadow-lg"
      style={{ background: 'var(--coin-gradient)' }}>
      <span>🪙</span>
      <span className="text-foreground" style={{ color: 'hsl(30, 80%, 15%)' }}>{coins}</span>
    </div>
  );
};

export default CoinDisplay;
