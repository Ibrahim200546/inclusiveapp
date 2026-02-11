import { useState, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import TaskLayout from '@/components/game/TaskLayout';
import CircleOptions from '@/components/game/CircleOptions';

const HOME_SOUNDS = [
  { value: 'phone', icon: '📱', label: 'Телефон' },
  { value: 'clock', icon: '⏰', label: 'Сағат' },
  { value: 'doorbell', icon: '🔔', label: 'Есік' },
  { value: 'schoolbell', icon: '🏫', label: 'Мектеп' },
];

const TaskHomeSounds = () => {
  const { triggerReward } = useGame();
  const [target, setTarget] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' | '' }>({ msg: '', type: '' });

  const playSound = useCallback(() => {
    const chosen = HOME_SOUNDS[Math.floor(Math.random() * HOME_SOUNDS.length)];
    setTarget(chosen.value);
    setFeedback({ msg: '🔊 Тыңдаңыз...', type: '' });
  }, []);

  const checkAnswer = (value: string) => {
    if (!target) { setFeedback({ msg: 'Алдымен дыбысты тыңдаңыз! 🔊', type: '' }); return; }
    if (value === target) {
      setFeedback({ msg: 'Дұрыс! ✅', type: 'success' });
      triggerReward();
      setTarget(null);
    } else {
      setFeedback({ msg: 'Қате! ❌', type: 'error' });
    }
  };

  return (
    <TaskLayout>
      <h2 className="text-3xl font-bold mb-2">🏠 Тұрмыстық дыбыстар</h2>
      <p className="text-lg text-muted-foreground mb-4">Бұл ненің дыбысы?</p>
      <CircleOptions
        centerIcon="🔊"
        onCenterClick={playSound}
        options={HOME_SOUNDS.map(s => ({ icon: s.icon, label: s.label, value: s.value }))}
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

export default TaskHomeSounds;
