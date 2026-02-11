import { useState, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import TaskLayout from '@/components/game/TaskLayout';

const TaskSoundDetect = () => {
  const { triggerReward } = useGame();
  const [phase, setPhase] = useState<'idle' | 'listening' | 'asking'>('idle');
  const [hasSound, setHasSound] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' | '' }>({ msg: '', type: '' });

  const startGame = useCallback(() => {
    setFeedback({ msg: '', type: '' });
    setPhase('listening');
    const soundPresent = Math.random() < 0.7;
    setHasSound(soundPresent);

    setTimeout(() => {
      if (soundPresent) {
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          osc.connect(ctx.destination);
          osc.frequency.value = 440;
          osc.start();
          setTimeout(() => { osc.stop(); ctx.close(); }, 500);
        } catch {}
      }
      setPhase('asking');
    }, 1500);
  }, []);

  const checkAnswer = (answer: boolean) => {
    if (answer === hasSound) {
      setFeedback({ msg: 'Дұрыс! Жарайсың! ✅', type: 'success' });
      triggerReward();
    } else {
      setFeedback({ msg: 'Қателестің, қайтадан көр! ❌', type: 'error' });
    }
    setPhase('idle');
  };

  return (
    <TaskLayout>
      <div className="glass-panel rounded-3xl p-8 max-w-lg w-full text-center">
        <h2 className="text-3xl font-bold mb-4">🔊 Дыбысты тану</h2>
        <p className="text-lg text-muted-foreground mb-6">
          Дыбыс шыққанда "ИӘ" батырмасын басыңыз!<br />
          Дыбыс шықпаса "ЖОҚ" батырмасын басыңыз!
        </p>

        <div className="text-8xl my-8">
          {phase === 'idle' && '🔇'}
          {phase === 'listening' && '👂'}
          {phase === 'asking' && '❓'}
        </div>

        {phase === 'idle' && (
          <button className="game-btn game-btn-success" onClick={startGame}>
            🎮 Ойынды бастау
          </button>
        )}

        {phase === 'asking' && (
          <div className="flex justify-center gap-4">
            <button className="game-btn game-btn-success" onClick={() => checkAnswer(true)}>
              ✅ ИӘ - Дыбыс бар
            </button>
            <button className="game-btn game-btn-secondary" onClick={() => checkAnswer(false)}>
              ❌ ЖОҚ - Дыбыс жоқ
            </button>
          </div>
        )}

        {feedback.msg && (
          <p className={`text-2xl font-bold mt-6 ${feedback.type === 'success' ? 'text-success' : 'text-destructive'}`}>
            {feedback.msg}
          </p>
        )}
      </div>
    </TaskLayout>
  );
};

export default TaskSoundDetect;
