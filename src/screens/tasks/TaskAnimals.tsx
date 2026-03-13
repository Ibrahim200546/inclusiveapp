import { useState, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import TaskLayout from '@/components/game/TaskLayout';
import CircleOptions from '@/components/game/CircleOptions';
import { playSound, playSuccess, playError } from '@/lib/audioUtils';

const ANIMALS = [
  { value: 'horse', icon: '🐴', label: 'Ат' },
  { value: 'cow', icon: '🐮', label: 'Сиыр' },
  { value: 'sheep', icon: '🐑', label: 'Қой' },
  { value: 'cat', icon: '🐱', label: 'Мысық' },
  { value: 'dog', icon: '🐶', label: 'Ит' },
];

const TaskAnimals = () => {
  const { triggerReward } = useGame();
  const [target, setTarget] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' | '' }>({ msg: '', type: '' });

  const playSoundEffect = useCallback(() => {
    const chosen = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    setTarget(chosen.value);
    setFeedback({ msg: '🔊 Тыңдаңыз...', type: '' });
    playSound(`/sounds/animals/${chosen.value}.mp3`);
  }, []);

  const checkAnswer = (value: string) => {
    if (!target) { setFeedback({ msg: 'Алдымен дыбысты тыңдаңыз! 🔊', type: '' }); return; }
    if (value === target) {
      setFeedback({ msg: 'Дұрыс! ✅', type: 'success' });
      playSuccess();
      triggerReward();
      setTarget(null);
    } else {
      setFeedback({ msg: 'Жоқ, бұл басқа жануар. ❌', type: 'error' });
      playError();
    }
  };

  return (
    <TaskLayout>
      <h2 className="text-3xl font-bold mb-2">🐴 Жануарлар дауысы</h2>
      <p className="text-lg text-muted-foreground mb-4">Қай жануардың дауысы естіліп тұр?</p>
      <CircleOptions
        centerIcon="🔊"
        onCenterClick={playSoundEffect}
        options={ANIMALS.map(a => ({ icon: a.icon, label: a.label, value: a.value }))}
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

export default TaskAnimals;
