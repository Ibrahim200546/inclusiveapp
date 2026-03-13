import { useState, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import TaskLayout from '@/components/game/TaskLayout';
import CircleOptions from '@/components/game/CircleOptions';

const TALES = [
  { value: 'red_riding_hood', icon: '🧒🏻', label: 'Қызыл телпек' },
  { value: 'pinocchio', icon: '🤥', label: 'Буратино' },
  // { value: 'threebears', icon: '🐻', label: 'Үш аю' }, // Missing audio
  // { value: 'snowwhite', icon: '👸🏻', label: 'Ақшақар' }, // Missing audio
];

const TaskMusicalTales = () => {
  const { triggerReward } = useGame();
  const [target, setTarget] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' | '' }>({ msg: '', type: '' });

  const playSound = useCallback(() => {
    const chosen = TALES[Math.floor(Math.random() * TALES.length)];
    setTarget(chosen.value);
    setFeedback({ msg: '🔊 Тыңдаңыз...', type: '' });

    const audio = new Audio(`/sounds/musical_tales/${chosen.value}.mp3`);
    audio.play().catch(e => {
      console.error("Audio play failed", e);
      setFeedback({ msg: 'Дыбыс табылмады', type: 'error' });
    });
  }, []);

  const checkAnswer = (value: string) => {
    if (!target) { setFeedback({ msg: 'Алдымен ертегіні тыңдаңыз! 🔊', type: '' }); return; }
    if (value === target) {
      setFeedback({ msg: 'Дұрыс! ✅', type: 'success' });
      triggerReward();
      setTarget(null);
    } else {
      setFeedback({ msg: 'Жоқ, бұл басқа ертегі. ❌', type: 'error' });
    }
  };

  return (
    <TaskLayout>
      <h2 className="text-3xl font-bold mb-2">🎭 Музыкалық ертегілер</h2>
      <p className="text-lg text-muted-foreground mb-4">Музыкалық ертегіні тыңдап, қайсысы екенін табыңыз!</p>
      <CircleOptions
        centerIcon="🔊"
        onCenterClick={playSound}
        options={TALES.map(o => ({ icon: o.icon, label: o.label, value: o.value }))}
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

export default TaskMusicalTales;
