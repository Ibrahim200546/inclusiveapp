import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Star, X, Check, RefreshCw, Volume2 } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { speakTtsText, stopTtsPlayback } from '@/lib/ttsClient';

// Polyfill for speech recognition
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const practiceWords = {
  ru: [
    { word: "Ракета", hint: "Звук 'Р' - рычи!" },
    { word: "Шишка", hint: "Звук 'Ш' - как змейка" },
    { word: "Молоко", hint: "Гласные О" },
    { word: "Щука", hint: "Мягкий 'Щ'" },
    { word: "Цветок", hint: "Четкий 'Ц'" }
  ],
  kk: [
    { word: "Раушан", hint: "'Р' дыбысы" },
    { word: "Шаш", hint: "'Ш' дыбысы" },
    { word: "Құлын", hint: "Қатаң 'Қ'" },
    { word: "Ғарыш", hint: "Ұяң 'Ғ'" },
    { word: "Өлең", hint: "Жіңішке 'Ө'" }
  ]
};

export function SpeechAssessment({ locale = 'ru' }: { locale?: 'ru' | 'kk' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  const words = practiceWords[locale] || practiceWords.ru;
  const currentWord = words[currentWordIndex];

  const t = {
    ru: {
      title: "ИИ Оценка речи",
      subtitle: "Произносите слова четко",
      pressToSpeak: "Нажмите и говорите",
      listening: "Слушаю вас...",
      tryAgain: "Попробовать еще",
      nextWord: "Следующее слово",
      notSupported: "Распознавание речи не поддерживается в вашем браузере",
      perfect: "Отлично! 🚀",
      good: "Хорошо, чуть четче! 👍",
      needsWork: "Попробуйте еще раз! 💪"
    },
    kk: {
      title: "ЖИ Сөйлеуді бағалау",
      subtitle: "Сөздерді анық айтыңыз",
      pressToSpeak: "Басып, сөйлеңіз",
      listening: "Тыңдап тұрмын...",
      tryAgain: "Қайталау",
      nextWord: "Келесі сөз",
      notSupported: "Браузер сөйлеуді тануды қолдамайды",
      perfect: "Керемет! 🚀",
      good: "Жақсы, анығырақ! 👍",
      needsWork: "Тағы бір рет көріңіз! 💪"
    }
  }[locale];

  useEffect(() => {
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      // Set language based on locale
      recognition.lang = locale === 'ru' ? 'ru-RU' : 'kk-KZ';

      recognition.onstart = () => setIsListening(true);
      
      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const result = event.results[current][0].transcript;
        setTranscript(result);
        assessSpeech(result, currentWord.word);
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        if (event.error !== 'no-speech') {
          toast({
            title: "Ошибка распознавания",
            description: "Проверьте микрофон или попробуйте позже.",
            variant: "destructive"
          });
        }
      };

      recognition.onend = () => setIsListening(false);
      
      recognitionRef.current = recognition;
    }

    return () => {
      stopTtsPlayback();
    };
  }, [locale, currentWord.word]);

  const toggleListen = () => {
    if (!SpeechRecognition) {
      toast({
        title: "Ошибка",
        description: t.notSupported,
        variant: "destructive"
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setTranscript('');
      setScore(null);
      setShowConfetti(false);
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const assessSpeech = (spoken: string, target: string) => {
    // A very basic matching algorithm (Levenshtein distance would be better in prod)
    const normalizedSpoken = spoken.toLowerCase().replace(/[.,!?]/g, '').trim();
    const normalizedTarget = target.toLowerCase().trim();
    
    if (normalizedSpoken === normalizedTarget) {
      setScore(100);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } else if (normalizedSpoken.includes(normalizedTarget) || normalizedTarget.includes(normalizedSpoken)) {
      setScore(80); // Partial match
    } else {
      // Logic to check character overlap
      let matches = 0;
      const targetChars = normalizedTarget.split('');
      normalizedSpoken.split('').forEach(char => {
        if (targetChars.includes(char)) matches++;
      });
      const percent = Math.round((matches / targetChars.length) * 100);
      setScore(Math.min(percent, 70)); // Cap imperfect matches at 70%
    }
  };

  const nextWord = () => {
    setCurrentWordIndex((prev) => (prev + 1) % words.length);
    setTranscript('');
    setScore(null);
    setShowConfetti(false);
  };

  const speakTargetWord = async () => {
    const result = await speakTtsText(currentWord.word, {
      lang: locale === 'ru' ? 'ru-RU' : 'kk-KZ',
      provider: 'yandex',
      speed: 0.8,
    });

    if (!result.ok) {
      toast({
        title: "TTS қатесі",
        description: result.details || "Сөзді дыбыстау мүмкін болмады.",
        variant: "destructive"
      });
    }
  };

  const getFeedbackStr = (s: number) => {
    if (s >= 90) return t.perfect;
    if (s >= 70) return t.good;
    return t.needsWork;
  };

  const getScoreColor = (s: number) => {
    if (s >= 90) return 'text-green-500 bg-green-50 border-green-200';
    if (s >= 70) return 'text-yellow-500 bg-yellow-50 border-yellow-200';
    return 'text-red-500 bg-red-50 border-red-200';
  };

  return (
    <>
      {/* Floating Button right above the chat bot */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-24 right-6 w-14 h-14 z-40 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-105 ${
          isOpen 
            ? 'bg-slate-800 text-white scale-90' 
            : 'bg-gradient-to-tr from-emerald-400 to-teal-500 text-white'
        }`}
        style={{
          boxShadow: isOpen ? '0 4px 12px rgba(0,0,0,0.1)' : '0 8px 24px rgba(16, 185, 129, 0.4)'
        }}
      >
        {isOpen ? <X size={24} /> : <Mic size={24} />}
      </button>

      {/* Main UI Modal */}
      {isOpen && (
        <div className="fixed bottom-[160px] right-6 z-50 w-[350px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-teal-100 dark:border-slate-800 overflow-hidden font-sans transform origin-bottom-right transition-all">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-400 to-teal-500 p-4 flex justify-between items-center text-white relative overflow-hidden">
            <div className="relative z-10 flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Mic size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">{t.title}</h3>
                <p className="text-xs text-emerald-50">{t.subtitle}</p>
              </div>
            </div>
            
            {showConfetti && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-50">
                <Star className="text-yellow-300 animate-ping absolute" size={100} />
              </div>
            )}
            
            <button 
              onClick={() => setIsOpen(false)}
              className="relative z-10 p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-6 flex flex-col items-center">
            
            {/* Target Word Display */}
            <div className="text-center mb-6 w-full relative">
               <span className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
                 {t.subtitle}
               </span>
               <div className="flex items-center justify-center gap-2">
                 <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white">
                   {currentWord.word}
                 </h2>
                 <button 
                   onClick={speakTargetWord} 
                   className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-teal-500 hover:bg-teal-50 transition-colors"
                 >
                   <Volume2 size={16} />
                 </button>
               </div>
               <p className="text-sm text-teal-600 dark:text-teal-400 mt-2 bg-teal-50 dark:bg-teal-900/30 inline-block px-3 py-1 rounded-full">
                 💡 {currentWord.hint}
               </p>
            </div>

            {/* Microphone Button */}
            <div className="relative mb-6">
              {isListening && (
                <div className="absolute -inset-4 bg-teal-100 dark:bg-teal-900/50 rounded-full animate-ping opacity-75"></div>
              )}
              <button
                onClick={toggleListen}
                className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all border-4 ${
                  isListening 
                    ? 'bg-red-500 hover:bg-red-600 border-red-200 text-white scale-110' 
                    : 'bg-gradient-to-br from-emerald-400 to-teal-500 hover:scale-105 border-white dark:border-slate-800 text-white'
                }`}
              >
                {isListening ? <MicOff size={32} /> : <Mic size={32} />}
              </button>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 h-5 font-medium">
              {isListening ? (
                <span className="animate-pulse">{t.listening}</span>
              ) : transcript ? (
                `Вы сказали: "${transcript}"`
              ) : (
                t.pressToSpeak
              )}
            </p>

            {/* Score Result */}
            {score !== null && (
              <div className={`w-full p-4 rounded-2xl border flex flex-col items-center mb-4 transition-all animate-in fade-in slide-in-from-bottom-2 ${getScoreColor(score)}`}>
                <div className="text-3xl font-black mb-1">{score}%</div>
                <div className="text-sm font-semibold">{getFeedbackStr(score)}</div>
              </div>
            )}

            {/* Actions */}
            <div className="w-full flex gap-2">
               <button 
                 onClick={() => { setTranscript(''); setScore(null); }}
                 className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
               >
                 <RefreshCw size={14} />
                 {t.tryAgain}
               </button>
               <button 
                 onClick={nextWord}
                 className="flex-1 py-2.5 rounded-xl bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 font-medium text-sm hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
               >
                 {t.nextWord}
                 <Check size={14} />
               </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
