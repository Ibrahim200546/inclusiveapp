import { useState, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import TaskLayout from '@/components/game/TaskLayout';
import CircleOptions from '@/components/game/CircleOptions';

const WORDS = [
  { value: 'hello', icon: '🤝', label: 'Сәлеметсіз бе' },
  { value: 'goodbye', icon: '👋', label: 'Сау болыңыз' },
  { value: 'thankyou', icon: '🙏', label: 'Рахмет' },
  { value: 'good_morning', icon: '🌅', label: 'Қайырлы таң' },
];

const TaskFamiliarWords = () => {
  const { triggerReward } = useGame();
  const [target, setTarget] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' | '' }>({ msg: '', type: '' });

  const playSound = useCallback(() => {
    const chosen = WORDS[Math.floor(Math.random() * WORDS.length)];
    setTarget(chosen.value);
    setFeedback({ msg: '🔊 Тыңдаңыз...', type: '' });

    const audio = new Audio(`/sounds/familiar_words/${chosen.value}.mp3`);
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
      setFeedback({ msg: 'Жоқ, басқа сөз. ❌', type: 'error' });
    }
  };

  return (
    <TaskLayout>
      <h2 className="text-3xl font-bold mb-2">💬 Таныс сөздер</h2>
      <p className="text-lg text-muted-foreground mb-4">Дыбысты тыңдап, не естілетінін табыңыз!</p>
      <CircleOptions
        centerIcon="🔊"
        onCenterClick={playSound}
        options={WORDS.map(o => ({ icon: o.icon, label: o.label, value: o.value }))}
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

export default TaskFamiliarWords;
