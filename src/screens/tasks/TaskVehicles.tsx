import { useState, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import TaskLayout from '@/components/game/TaskLayout';
import CircleOptions from '@/components/game/CircleOptions';

const VEHICLES = [
  { value: 'car', icon: '🚗', label: 'Машина' },
  { value: 'motorcycle', icon: '🏍️', label: 'Мотоцикл' },
  { value: 'plane', icon: '✈️', label: 'Ұшақ' },
  { value: 'train', icon: '🚂', label: 'Пойыз' },
];

const TaskVehicles = () => {
  const { triggerReward } = useGame();
  const [target, setTarget] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' | '' }>({ msg: '', type: '' });

  const playSound = useCallback(() => {
    const chosen = VEHICLES[Math.floor(Math.random() * VEHICLES.length)];
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
      <h2 className="text-3xl font-bold mb-2">🚗 Көлік дыбыстары</h2>
      <p className="text-lg text-muted-foreground mb-4">Қай көліктің дыбысы естіліп тұр?</p>
      <CircleOptions
        centerIcon="🔊"
        onCenterClick={playSound}
        options={VEHICLES.map(v => ({ icon: v.icon, label: v.label, value: v.value }))}
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

export default TaskVehicles;
