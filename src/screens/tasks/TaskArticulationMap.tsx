import { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import TaskLayout from '@/components/game/TaskLayout';
import { playLetterSound } from '@/lib/audioUtils';

interface ArticulationNode {
  char: string;
  ring: 'inner' | 'middle' | 'outer';
  status: 'mastered' | 'progress' | 'locked';
  angle: number;
}

const articulationData: ArticulationNode[] = [
  // INNER RING (Vowels & Basic)
  { char: 'А', ring: 'inner', status: 'mastered', angle: 0 },
  { char: 'О', ring: 'inner', status: 'mastered', angle: 60 },
  { char: 'У', ring: 'inner', status: 'mastered', angle: 120 },
  { char: 'Ы', ring: 'inner', status: 'progress', angle: 180 },
  { char: 'И', ring: 'inner', status: 'progress', angle: 240 },
  { char: 'Ү', ring: 'inner', status: 'locked', angle: 300 },

  // MIDDLE RING (Consonants)
  { char: 'М', ring: 'middle', status: 'mastered', angle: 15 },
  { char: 'Н', ring: 'middle', status: 'mastered', angle: 55 },
  { char: 'Б', ring: 'middle', status: 'progress', angle: 95 },
  { char: 'П', ring: 'middle', status: 'progress', angle: 135 },
  { char: 'Т', ring: 'middle', status: 'progress', angle: 175 },
  { char: 'Д', ring: 'middle', status: 'locked', angle: 215 },
  { char: 'К', ring: 'middle', status: 'locked', angle: 255 },
  { char: 'Г', ring: 'middle', status: 'locked', angle: 295 },
  { char: 'Л', ring: 'middle', status: 'locked', angle: 335 },

  // OUTER RING (Complex)
  { char: 'Р', ring: 'outer', status: 'locked', angle: 0 },
  { char: 'Ш', ring: 'outer', status: 'locked', angle: 30 },
  { char: 'Ж', ring: 'outer', status: 'locked', angle: 60 },
  { char: 'С', ring: 'outer', status: 'progress', angle: 90 },
  { char: 'З', ring: 'outer', status: 'locked', angle: 120 },
  { char: 'Ц', ring: 'outer', status: 'locked', angle: 150 },
  { char: 'Ч', ring: 'outer', status: 'locked', angle: 180 },
  { char: 'Щ', ring: 'outer', status: 'locked', angle: 210 },
  { char: 'Ф', ring: 'outer', status: 'locked', angle: 240 },
  { char: 'Х', ring: 'outer', status: 'locked', angle: 270 },
  { char: 'Ң', ring: 'outer', status: 'locked', angle: 300 },
  { char: 'Қ', ring: 'outer', status: 'locked', angle: 330 }
];

const TaskArticulationMap = () => {
  const { triggerReward } = useGame();
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [feedbackType, setFeedbackType] = useState<string>(''); // success, error
  const [simulation, setSimulation] = useState(false);

  const handleNodeClick = (item: ArticulationNode) => {
    if (item.status === 'locked') {
      // Shake animation could go here
      return;
    }
    setSelectedLetter(item.char);
    playLetterSound(item.char);
    setFeedback('');
    setFeedbackType('');
  };

  const startCheck = () => {
    setIsListening(true);
    setFeedback('Тыңдауда... 🎤');
    setFeedbackType('');
    setSimulation(true);

    // Simulate AI checking process
    setTimeout(() => {
      setSimulation(false);
      setIsListening(false);
      const success = Math.random() > 0.3;
      if (success) {
        setFeedback('Керемет! Дұрыс айтылды! ✅');
        setFeedbackType('success');
        triggerReward();
      } else {
        setFeedback('Тағы бір рет қайталап көрші... 🔄');
        setFeedbackType('error');
      }
    }, 2000);
  };

  return (
    <TaskLayout>
      <div className="relative w-full h-full flex flex-col items-center justify-center">
        <h2 className="text-3xl font-bold mb-4 absolute top-0">👄 Дыбыс картасы</h2>

        {/* Orbit System */}
        <div className="relative w-[700px] h-[700px] flex items-center justify-center">
          {/* Rings */}
          <div className="absolute rounded-full border-2 border-dashed border-white/30 w-[250px] h-[250px]" />
          <div className="absolute rounded-full border-2 border-dashed border-white/30 w-[450px] h-[450px]" />
          <div className="absolute rounded-full border-2 border-dashed border-white/30 w-[650px] h-[650px]" />

          {/* Nodes */}
          {articulationData.map((item, index) => {
            let radius = 0;
            if (item.ring === 'inner') radius = 125;
            if (item.ring === 'middle') radius = 225;
            if (item.ring === 'outer') radius = 325;

            const radians = (item.angle - 90) * (Math.PI / 180);
            const x = radius * Math.cos(radians);
            const y = radius * Math.sin(radians);

            let bgClass = 'bg-gray-400';
            if (item.status === 'mastered') bgClass = 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)]';
            if (item.status === 'progress') bgClass = 'bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.6)] animate-pulse';
            if (item.status === 'locked') bgClass = 'bg-gray-600 opacity-60';

            return (
              <button
                key={index}
                className={`absolute w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl transition-transform hover:scale-110 ${bgClass}`}
                style={{ transform: `translate(${x}px, ${y}px)` }}
                onClick={() => handleNodeClick(item)}
              >
                {item.status === 'locked' ? '🔒' : item.char}
              </button>
            );
          })}
        </div>

        {/* Modal Overlay */}
        {selectedLetter && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white/90 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border-4 border-[#73C0FC] relative">
              <button
                className="absolute top-4 right-4 text-3xl hover:scale-110 transition-transform"
                onClick={() => setSelectedLetter(null)}
              >
                ❌
              </button>

              <h3 className="text-2xl font-bold mb-4 text-[#183153]">Дыбысты жаттықтыру</h3>
              <div className="text-[120px] font-bold text-[#73C0FC] mb-4 drop-shadow-md">
                {selectedLetter}
              </div>

              <div className="h-16 flex items-center justify-center gap-1 mb-6 bg-gray-100 rounded-xl p-2">
                {/* Visualizer Bars */}
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-[#73C0FC] rounded-full transition-all duration-100"
                    style={{
                      height: simulation ? `${Math.random() * 40 + 5}px` : '5px',
                    }}
                  />
                ))}
              </div>

              <p className={`text-xl font-bold mb-6 h-8 ${feedbackType === 'success' ? 'text-green-600' : feedbackType === 'error' ? 'text-orange-500' : 'text-gray-600'}`}>
                {feedback}
              </p>

              <button
                className={`game-btn text-xl px-8 py-3 w-full ${isListening ? 'bg-gray-400 cursor-not-allowed' : 'game-btn-success'}`}
                onClick={startCheck}
                disabled={isListening}
              >
                {isListening ? 'Тыңдалуда...' : '🎤 Тексеру'}
              </button>
            </div>
          </div>
        )}
      </div>
    </TaskLayout>
  );
};

export default TaskArticulationMap;
