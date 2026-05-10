import { useState, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import TaskLayout from '@/components/game/TaskLayout';
import { playBeep, playSuccess, playError } from '@/lib/audioUtils';
import { useLocalePreference } from '@/hooks/use-locale-preference';

const TaskSoundDetect = () => {
  const { triggerReward } = useGame();
  const locale = useLocalePreference();
  const [phase, setPhase] = useState<'idle' | 'listening' | 'asking'>('idle');
  const [hasSound, setHasSound] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' | '' }>({ msg: '', type: '' });

  const t = locale === 'ru'
    ? {
        title: '🔊 Распознавание звука',
        instruction: <>Если звук есть, нажмите «ДА»!<br />Если звука нет, нажмите «НЕТ»!</>,
        start: '🎮 Начать игру',
        yes: '✅ ДА - звук есть',
        no: '❌ НЕТ - звука нет',
        success: 'Правильно! Молодец! ✅',
        error: 'Ошибка, попробуй ещё раз! ❌'
      }
    : {
        title: '🔊 Дыбысты тану',
        instruction: <>Дыбыс шыққанда "ИӘ" батырмасын басыңыз!<br />Дыбыс шықпаса "ЖОҚ" батырмасын басыңыз!</>,
        start: '🎮 Ойынды бастау',
        yes: '✅ ИӘ - Дыбыс бар',
        no: '❌ ЖОҚ - Дыбыс жоқ',
        success: 'Дұрыс! Жарайсың! ✅',
        error: 'Қателестің, қайтадан көр! ❌'
      };

  const startGame = useCallback(() => {
    setFeedback({ msg: '', type: '' });
    setPhase('listening');
    const soundPresent = Math.random() < 0.7;
    setHasSound(soundPresent);

    setTimeout(() => {
      if (soundPresent) {
        playBeep(440, 500);
      } else {
        // Just delay
      }
      setTimeout(() => setPhase('asking'), 1000);
    }, 1000);
  }, []);

  const checkAnswer = (answer: boolean) => {
    if (answer === hasSound) {
      setFeedback({ msg: t.success, type: 'success' });
      playSuccess();
      triggerReward();
    } else {
      setFeedback({ msg: t.error, type: 'error' });
      playError();
    }
    setPhase('idle');
  };

  return (
    <TaskLayout>
      <div className="glass-panel rounded-3xl p-5 sm:p-8 max-w-lg w-full text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">{t.title}</h2>
        <p className="text-base sm:text-lg text-muted-foreground mb-4 sm:mb-6">
          {t.instruction}
        </p>

        <div className="text-6xl sm:text-8xl my-6 sm:my-8">
          {phase === 'idle' && '🔇'}
          {phase === 'listening' && '👂'}
          {phase === 'asking' && '❓'}
        </div>

        {phase === 'idle' && (
          <button className="game-btn game-btn-success text-base sm:text-lg" onClick={startGame}>
            {t.start}
          </button>
        )}

        {phase === 'asking' && (
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <button className="game-btn game-btn-success text-sm sm:text-base" onClick={() => checkAnswer(true)}>
              {t.yes}
            </button>
            <button className="game-btn game-btn-secondary text-sm sm:text-base" onClick={() => checkAnswer(false)}>
              {t.no}
            </button>
          </div>
        )}

        {feedback.msg && (
          <p className={`text-xl sm:text-2xl font-bold mt-4 sm:mt-6 ${feedback.type === 'success' ? 'text-success' : 'text-destructive'}`}>
            {feedback.msg}
          </p>
        )}
      </div>
    </TaskLayout>
  );
};

export default TaskSoundDetect;
