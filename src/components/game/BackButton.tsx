import { useGame } from '@/contexts/GameContext';
import { useLocalePreference } from '@/hooks/use-locale-preference';

const BackButton = () => {
  const { goBack } = useGame();
  const locale = useLocalePreference();
  return (
    <button
      className="game-btn game-btn-secondary text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3"
      onClick={goBack}
    >
      {locale === 'ru' ? '⬅️ Назад' : '⬅️ Артқа'}
    </button>
  );
};

export default BackButton;
