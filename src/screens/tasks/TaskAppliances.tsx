import { useState, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import TaskLayout from '@/components/game/TaskLayout';
import CircleOptions from '@/components/game/CircleOptions';

const APPLIANCES = [
  { value: 'fridge', icon: '❄️', label: 'Тоңазытқыш' },
  { value: 'vacuum', icon: '🧹', label: 'Шаңсорғыш' },
  { value: 'washing_machine', icon: '🧺', label: 'Киім жуғыш' },
  { value: 'hair_dryer', icon: '💨', label: 'Фен' },
];

const TaskAppliances = () => {
  const { triggerReward } = useGame();
  const [target, setTarget] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' | '' }>({ msg: '', type: '' });

  const playSound = useCallback(() => {
    const chosen = APPLIANCES[Math.floor(Math.random() * APPLIANCES.length)];
    setTarget(chosen.value);
    setFeedback({ msg: '🔊 Тыңдаңыз...', type: '' });

    const audio = new Audio(`/sounds/appliances/${chosen.value}.mp3`);
    audio.play().catch(e => {
      console.error("Audio play failed", e);
      setFeedback({ msg: 'Дыбыс табылмады', type: 'error' });
    });
  }, []);

  const checkAnswer = (value: string) => {
    if (!target) { setFeedback({ msg: 'Алдымен дыбысты тыңдаңыз! 🔊', type: '' }); return; }
    if (value === target) {
      setFeedback({ msg: 'Дұрыс! ✅', type: 'success' });
      triggerReward();
      setTarget(null);
    } else {
      setFeedback({ msg: 'Жоқ, бұл басқа құрал. ❌', type: 'error' });
    }
  };

  return (
    <TaskLayout>
      <h2 className="text-3xl font-bold mb-2">🔌 Тұрмыстық техника</h2>
      <p className="text-lg text-muted-foreground mb-4">Дыбысты тыңдап, қай құрал екенін табыңыз!</p>
      <CircleOptions
        centerIcon="🔊"
        onCenterClick={playSound}
        options={APPLIANCES.map(o => ({ icon: o.icon, label: o.label, value: o.value }))}
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

export default TaskAppliances;
