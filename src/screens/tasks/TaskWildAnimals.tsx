import { useState, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import TaskLayout from '@/components/game/TaskLayout';
import CircleOptions from '@/components/game/CircleOptions';

const WILD_ANIMALS = [
  { value: 'lion', icon: '🦁', label: 'Арыстан' },
  { value: 'wolf', icon: '🐺', label: 'Қасқыр' },
  { value: 'bear', icon: '🐻', label: 'Аю' },
  { value: 'elephant', icon: '🐘', label: 'Піл' },
];

const TaskWildAnimals = () => {
  const { triggerReward } = useGame();
  const [target, setTarget] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' | '' }>({ msg: '', type: '' });

  const playSound = useCallback(() => {
    const chosen = WILD_ANIMALS[Math.floor(Math.random() * WILD_ANIMALS.length)];
    setTarget(chosen.value);
    setFeedback({ msg: '🔊 Тыңдаңыз...', type: '' });

    const audio = new Audio(`/sounds/wild_animals/${chosen.value}.mp3`);
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
      setFeedback({ msg: 'Жоқ, бұл басқа жануар. ❌', type: 'error' });
    }
  };

  return (
    <TaskLayout>
      <h2 className="text-3xl font-bold mb-2">🦁 Жабайы жануарлар</h2>
      <p className="text-lg text-muted-foreground mb-4">Қай жануардың дауысы естіліп тұр?</p>
      <CircleOptions
        centerIcon="🔊"
        onCenterClick={playSound}
        options={WILD_ANIMALS.map(a => ({ icon: a.icon, label: a.label, value: a.value }))}
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

export default TaskWildAnimals;
