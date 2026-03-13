import { useGame } from '@/contexts/GameContext';

const BackButton = () => {
  const { goBack } = useGame();
  return (
    <button
      className="game-btn game-btn-secondary text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3"
      onClick={goBack}
    >
      ⬅️ Артқа
    </button>
  );
};

export default BackButton;
