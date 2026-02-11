import { useGame } from '@/contexts/GameContext';

const BackButton = () => {
  const { goBack } = useGame();
  return (
    <button
      className="game-btn game-btn-secondary text-base px-6 py-3"
      onClick={goBack}
    >
      ⬅️ Артқа
    </button>
  );
};

export default BackButton;
