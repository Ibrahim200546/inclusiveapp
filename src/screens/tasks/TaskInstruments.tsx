import { useState, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import TaskLayout from '@/components/game/TaskLayout';
import CircleOptions from '@/components/game/CircleOptions';

const INSTRUMENTS = [
  { value: 'piano', icon: '🎹', label: 'Пианино' },
  { value: 'drum', icon: '🥁', label: 'Барабан' },
  { value: 'guitar', icon: '🎸', label: 'Гитара' },
  { value: 'violin', icon: '🎻', label: 'Скрипка' },
];

const TaskInstruments = () => {
  const { triggerReward } = useGame();
  const [target, setTarget] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' | '' }>({ msg: '', type: '' });

  const playSound = useCallback(() => {
    const chosen = INSTRUMENTS[Math.floor(Math.random() * INSTRUMENTS.length)];
    setTarget(chosen.value);
    setFeedback({ msg: '🎵 Дыбыс ойнауда...', type: '' });
    // In a real app, play actual audio here
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const freqs: Record<string, number> = { piano: 523, drum: 150, guitar: 330, violin: 660 };
      osc.frequency.value = freqs[chosen.value] || 440;
      osc.type = chosen.value === 'drum' ? 'square' : 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start();
      setTimeout(() => { osc.stop(); ctx.close(); }, 600);
    } catch {}
  }, []);

  const checkAnswer = (value: string) => {
    if (!target) {
      setFeedback({ msg: 'Алдымен дыбысты тыңдаңыз! 🔊', type: '' });
      return;
    }
    if (value === target) {
      const name = INSTRUMENTS.find(i => i.value === value)?.label;
      setFeedback({ msg: `Дұрыс! ${name}! ✅`, type: 'success' });
      triggerReward();
      setTarget(null);
    } else {
      setFeedback({ msg: 'Қате! Қайтадан тыңдаңыз. ❌', type: 'error' });
    }
  };

  return (
    <TaskLayout>
      <h2 className="text-3xl font-bold mb-2">🎺 Музыкалық аспаптар</h2>
      <p className="text-lg text-muted-foreground mb-4">Дыбысты тыңдап, қай аспап ойнап тұрғанын табыңыз!</p>

      <CircleOptions
        centerIcon="🔊"
        onCenterClick={playSound}
        options={INSTRUMENTS.map(i => ({ icon: i.icon, label: i.label, value: i.value }))}
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

export default TaskInstruments;
