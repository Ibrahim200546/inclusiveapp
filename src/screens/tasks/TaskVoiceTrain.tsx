import { useState, useRef, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import TaskLayout from '@/components/game/TaskLayout';

const TaskVoiceTrain = () => {
  const { triggerReward } = useGame();
  const [isListening, setIsListening] = useState(false);
  const [progress, setProgress] = useState(0);
  const [feedback, setFeedback] = useState('');
  const animFrameRef = useRef<number>(0);
  const contextRef = useRef<AudioContext | null>(null);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      contextRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const buffer = new Float32Array(analyser.fftSize);
      setIsListening(true);
      setProgress(0);
      setFeedback("Енді 'О-о-о' деп созып көріңіз...");

      let sustainTime = 0;
      let lastTime = Date.now();

      const analyze = () => {
        if (!contextRef.current) return;
        const now = Date.now();
        const dt = now - lastTime;
        lastTime = now;

        analyser.getFloatTimeDomainData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
        const rms = Math.sqrt(sum / buffer.length);

        if (rms > 0.02) {
          sustainTime += dt;
        } else {
          sustainTime = Math.max(0, sustainTime - dt * 0.5);
        }

        const prog = Math.min(100, (sustainTime / 2000) * 100);
        setProgress(prog);

        if (prog >= 100) {
          setFeedback("Керемет! Дыбыс анықталды! 🎉");
          triggerReward();
          stopListening();
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        animFrameRef.current = requestAnimationFrame(analyze);
      };

      animFrameRef.current = requestAnimationFrame(analyze);
    } catch {
      setFeedback("Микрофонға рұқсат беріңіз!");
    }
  }, [triggerReward]);

  const stopListening = useCallback(() => {
    setIsListening(false);
    cancelAnimationFrame(animFrameRef.current);
    if (contextRef.current) {
      contextRef.current.close();
      contextRef.current = null;
    }
  }, []);

  return (
    <TaskLayout>
      <div className="glass-panel rounded-3xl p-8 max-w-lg w-full text-center">
        <h2 className="text-3xl font-bold mb-4">🚂 Дауыс созу</h2>
        <p className="text-lg text-muted-foreground mb-6">
          "О-о-о" деп 2 секунд бойы созып айтыңыз!
        </p>

        <div className="text-7xl mb-6">🚂</div>

        {/* Progress bar */}
        <div className="w-full max-w-sm mx-auto h-12 rounded-full overflow-hidden mb-6"
          style={{ background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)' }}>
          <div
            className="h-full rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200"
            style={{
              width: `${progress}%`,
              background: 'var(--gradient-primary)',
              color: 'white',
            }}
          >
            {Math.floor(progress)}%
          </div>
        </div>

        {!isListening ? (
          <button className="game-btn game-btn-success" onClick={startListening}>
            🎤 Бастау
          </button>
        ) : (
          <button className="game-btn game-btn-secondary" onClick={stopListening}>
            ⏹️ Тоқтату
          </button>
        )}

        {feedback && (
          <p className="text-xl font-bold mt-4 text-muted-foreground">{feedback}</p>
        )}
      </div>
    </TaskLayout>
  );
};

export default TaskVoiceTrain;
