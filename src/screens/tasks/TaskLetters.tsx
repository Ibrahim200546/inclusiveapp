import { useState, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import TaskLayout from '@/components/game/TaskLayout';
import CircleOptions from '@/components/game/CircleOptions';
import { playLetterSound, playSuccess, playError } from '@/lib/audioUtils';
import { useLocalePreference } from '@/hooks/use-locale-preference';

const KAZAKH_LETTERS = ['А', 'Ә', 'Б', 'В', 'Г', 'Ғ', 'Д', 'Е', 'Ж', 'З', 'И', 'К', 'Қ', 'Л', 'М', 'Н', 'Ң', 'О', 'Ө', 'П', 'Р', 'С', 'Т', 'У', 'Ұ', 'Ү', 'Ф', 'Х', 'Ш', 'Ы', 'І'];
const RUSSIAN_LETTERS = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ё', 'Ж', 'З', 'И', 'Й', 'К', 'Л', 'М', 'Н', 'О', 'П', 'Р', 'С', 'Т', 'У', 'Ф', 'Х', 'Ц', 'Ч', 'Ш', 'Щ', 'Ъ', 'Ы', 'Ь', 'Э', 'Ю', 'Я'];

const TaskLetters = () => {
  const { triggerReward } = useGame();
  const locale = useLocalePreference();
  const letters = locale === 'ru' ? RUSSIAN_LETTERS : KAZAKH_LETTERS;
  const [correct, setCorrect] = useState('');
  const [options, setOptions] = useState<string[]>([]);
  const [phase, setPhase] = useState<'idle' | 'listened'>('idle');
  const [feedback, setFeedback] = useState<{ msg: string; type: string }>({ msg: '', type: '' });

  const startRound = useCallback(() => {
    const answer = letters[Math.floor(Math.random() * letters.length)];
    const opts = [answer];
    while (opts.length < 6) {
      const r = letters[Math.floor(Math.random() * letters.length)];
      if (!opts.includes(r)) opts.push(r);
    }
    opts.sort(() => 0.5 - Math.random());
    setCorrect(answer);
    setOptions(opts);
    setPhase('listened');
    setFeedback({
      msg: locale === 'ru' ? 'Послушайте звук и найдите букву!' : 'Дыбысты тыңдап, әріпті табыңыз!',
      type: ''
    });
    playLetterSound(answer);
  }, [letters, locale]);

  const checkAnswer = (value: string) => {
    if (value === correct) {
      setFeedback({ msg: locale === 'ru' ? '✅ Отлично! Правильно!' : '✅ Керемет! Дұрыс!', type: 'success' });
      playSuccess();
      triggerReward();
      setTimeout(startRound, 2000);
    } else {
      setFeedback({
        msg: locale === 'ru' ? `❌ Ошибка! Это не "${correct}".` : `❌ Қате! Бұл "${correct}" емес.`,
        type: 'error'
      });
      playError();
      playLetterSound(value); // Play what they clicked to reinforce learning
    }
  };

  return (
    <TaskLayout>
      <h2 className="text-3xl font-bold mb-2">{locale === 'ru' ? '🔤 Распознавание букв' : '🔤 Әріптерді тану'}</h2>
      <p className="text-lg text-muted-foreground mb-4">
        {locale === 'ru' ? 'Послушайте звук и выберите правильную букву!' : 'Дыбысты тыңдап, дұрыс әріпті табыңыз!'}
      </p>

      {phase === 'idle' ? (
        <button className="game-btn game-btn-success text-xl" onClick={startRound}>
          {locale === 'ru' ? '🎮 Начать игру' : '🎮 Ойынды бастау'}
        </button>
      ) : (
        <CircleOptions
          centerIcon="🔊"
          onCenterClick={() => {
            setFeedback({ msg: locale === 'ru' ? 'Послушайте звук!' : 'Дыбысты тыңдаңыз!', type: '' });
            playLetterSound(correct);
          }}
          options={options.map(o => ({ icon: <span className="text-3xl font-bold">{o}</span>, label: o, value: o }))}
          onSelect={checkAnswer}
          dist={200}
          size={500}
        />
      )}

      {feedback.msg && (
        <p className={`text-2xl font-bold mt-4 ${feedback.type === 'success' ? 'text-success' : feedback.type === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
          {feedback.msg}
        </p>
      )}
    </TaskLayout>
  );
};

export default TaskLetters;
