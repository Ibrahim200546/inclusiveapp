import { useState, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import TaskLayout from '@/components/game/TaskLayout';
import CircleOptions from '@/components/game/CircleOptions';
import { useLocalePreference } from '@/hooks/use-locale-preference';

const STRESS_OPTIONS = [
  { value: '1', icon: '1️⃣', label: '1-ші буын' },
  { value: '2', icon: '2️⃣', label: '2-ші буын' },
  { value: '3', icon: '3️⃣', label: '3-ші буын' },
];

const TaskStress = () => {
  const { triggerReward } = useGame();
  const locale = useLocalePreference();
  const [target, setTarget] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' | '' }>({ msg: '', type: '' });
  const t = locale === 'ru'
    ? {
        title: '📝 Ударение',
        instruction: 'Послушайте слово и найдите ударный слог!',
        listening: '🔊 Слушайте...',
        notFound: 'Звук не найден',
        listenFirst: 'Сначала послушайте слово! 🔊',
        success: 'Правильно! ✅',
        wrong: 'Нет, ударение в другом слоге. ❌',
        labels: ['1-й слог', '2-й слог', '3-й слог']
      }
    : {
        title: '📝 Екпін',
        instruction: 'Сөзді тыңдап, қай буынға екпін түсетінін табыңыз!',
        listening: '🔊 Тыңдаңыз...',
        notFound: 'Дыбыс табылмады',
        listenFirst: 'Алдымен сөзді тыңдаңыз! 🔊',
        success: 'Дұрыс! ✅',
        wrong: 'Жоқ, екпін басқа буында. ❌',
        labels: ['1-ші буын', '2-ші буын', '3-ші буын']
      };

  const stressOptions = STRESS_OPTIONS.map((option, index) => ({
    ...option,
    label: t.labels[index] || option.label
  }));

  const playSound = useCallback(() => {
    const chosen = STRESS_OPTIONS[Math.floor(Math.random() * STRESS_OPTIONS.length)];
    setTarget(chosen.value);
    setFeedback({ msg: t.listening, type: '' });

    // word1.mp3, word2.mp3, word3.mp3
    const audio = new Audio(`/sounds/stress/word${chosen.value}.mp3`);
    audio.play().catch(e => {
      console.error("Audio play failed", e);
      setFeedback({ msg: t.notFound, type: 'error' });
    });
  }, [t.listening, t.notFound]);

  const checkAnswer = (value: string) => {
    if (!target) { setFeedback({ msg: t.listenFirst, type: '' }); return; }
    if (value === target) {
      setFeedback({ msg: t.success, type: 'success' });
      triggerReward();
      setTarget(null);
    } else {
      setFeedback({ msg: t.wrong, type: 'error' });
    }
  };

  return (
    <TaskLayout>
      <h2 className="text-3xl font-bold mb-2">{t.title}</h2>
      <p className="text-lg text-muted-foreground mb-4">{t.instruction}</p>
      <CircleOptions
        centerIcon="🔊"
        onCenterClick={playSound}
        options={stressOptions.map(o => ({ icon: o.icon, label: o.label, value: o.value }))}
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

export default TaskStress;
