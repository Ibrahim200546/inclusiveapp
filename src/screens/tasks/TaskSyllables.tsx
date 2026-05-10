import { useState, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import TaskLayout from '@/components/game/TaskLayout';
import CircleOptions from '@/components/game/CircleOptions';
import { useLocalePreference } from '@/hooks/use-locale-preference';

const TaskSyllables = () => {
  const { triggerReward } = useGame();
  const locale = useLocalePreference();
  const [target, setTarget] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' | '' }>({ msg: '', type: '' });
  const t = locale === 'ru'
    ? {
        title: '👏 Слоги',
        instruction: 'Послушайте слово и определите количество слогов!',
        listening: '🔊 Слушайте...',
        notFound: 'Звук не найден',
        listenFirst: 'Сначала послушайте звук! 🔊',
        success: 'Правильно! ✅',
        wrong: 'Нет, это другое количество слогов. ❌',
        labels: ['1 слог', '2 слога', '3 слога', '4 слога']
      }
    : {
        title: '👏 Буындар',
        instruction: 'Сөзді тыңдап, неше буыннан тұратынын табыңыз!',
        listening: '🔊 Тыңдаңыз...',
        notFound: 'Дыбыс табылмады',
        listenFirst: 'Алдымен дыбысты тыңдаңыз! 🔊',
        success: 'Дұрыс! ✅',
        wrong: 'Жоқ, бұл басқа буын саны. ❌',
        labels: ['1 буын', '2 буын', '3 буын', '4 буын']
      };

  const syllableOptions = t.labels.map((label, index) => ({
    value: index + 1,
    label,
    icon: `${index + 1}️⃣`
  }));

  const playSound = useCallback(() => {
    const syllableCount = Math.floor(Math.random() * 4) + 1; // 1 to 4
    setTarget(syllableCount);
    setFeedback({ msg: t.listening, type: '' });

    // Assuming file structure: word_1.mp3, word_2.mp3, etc.
    const audio = new Audio(`/sounds/syllables/word_${syllableCount}.mp3`);
    audio.play().catch(e => {
      console.error("Audio play failed", e);
      setFeedback({ msg: t.notFound, type: 'error' });
    });
  }, [t.listening, t.notFound]);

  const checkAnswer = (valStr: string) => {
    const value = parseInt(valStr, 10);
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
        options={syllableOptions.map(o => ({ icon: o.icon, label: o.label, value: String(o.value) }))}
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

export default TaskSyllables;
