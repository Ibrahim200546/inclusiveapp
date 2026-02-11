import { useGame } from '@/contexts/GameContext';

const RewardModal = () => {
  const { showReward, closeReward } = useGame();

  if (!showReward) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)' }}
      onClick={closeReward}>
      <div className="glass-card rounded-3xl p-10 text-center animate-bounce-in max-w-sm mx-4"
        onClick={e => e.stopPropagation()}>
        <div className="text-7xl mb-4">🎉</div>
        <h2 className="text-3xl font-bold mb-2">Керемет!</h2>
        <p className="text-xl text-muted-foreground mb-2">+10 🪙</p>
        <p className="text-lg mb-6">Жарайсың! Тамаша нәтиже!</p>
        <button className="game-btn game-btn-success" onClick={closeReward}>
          ✨ Жалғастыру
        </button>
      </div>
    </div>
  );
};

export default RewardModal;
