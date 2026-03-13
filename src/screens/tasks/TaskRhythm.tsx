import { useState, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import TaskLayout from '@/components/game/TaskLayout';
import CircleOptions from '@/components/game/CircleOptions';
import { playSound, playSuccess, playError } from '@/lib/audioUtils';

const TaskRhythm = () => {
  const { triggerReward } = useGame();
  const [feedback, setFeedback] = useState<{ msg: string; type: string }>({ msg: '', type: '' });
  const [target, setTarget] = useState<'fast' | 'slow' | null>(null);

  const playRandomRhythm = useCallback(() => {
    const type = Math.random() > 0.5 ? 'fast' : 'slow';
    setTarget(type);
    setFeedback({ msg: '🎶 Ырғақты тыңдаңыз...', type: '' });
    playSound(`/sounds/rhythm/${type}.mp3`);
  }, []);

  const checkAnswer = (value: string) => {
    if (!target) {
      setFeedback({ msg: 'Алдымен ырғақты тыңдаңыз! 🔊', type: '' });
      return;
    }

    if (value === target) {
      setFeedback({ msg: 'Дұрыс! Жарайсың! ✅', type: 'success' });
      playSuccess();
      triggerReward();
      setTarget(null);
    } else {
      setFeedback({ msg: 'Қателестің! ❌', type: 'error' });
      playError();
    }
  };

  return (
    <TaskLayout>
      <h2 className="text-3xl font-bold mb-2">🎵 Музыка ырғағы</h2>
      <p className="text-lg text-muted-foreground mb-4">Ырғақты тыңдап, түрін ажыратыңыз!</p>
      <CircleOptions
        centerIcon="🔊"
        onCenterClick={playRandomRhythm}
        options={[
          { icon: '🚀', label: 'Тез', value: 'fast' },
          { icon: '🐢', label: 'Баяу', value: 'slow' },
        ]}
        onSelect={checkAnswer}
      />
      {feedback.msg && (
        <p className={`text-2xl font-bold mt-4 ${feedback.type === 'success' ? 'text-success' : feedback.type === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
          {feedback.msg}
        </p>
      )}
    </TaskLayout>
  );
};

export default TaskRhythm;
