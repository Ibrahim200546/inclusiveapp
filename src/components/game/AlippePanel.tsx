import { useState } from 'react';

const KAZAKH_LETTERS = [
  'А','Ә','Б','В','Г','Ғ','Д','Е','Ё','Ж','З','И','Й',
  'К','Қ','Л','М','Н','Ң','О','Ө','П','Р','С','Т',
  'У','Ұ','Ү','Ф','Х','Һ','Ц','Ч','Ш','Щ','Ъ','Ы','І','Ь','Э','Ю','Я'
];

const VOWELS = ['А','Ә','Е','Ё','И','О','Ө','У','Ұ','Ү','Ы','І','Э','Ю','Я'];

const AlippePanel = () => {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="glass-panel rounded-2xl p-2 sm:p-3 flex flex-col h-full w-[260px] sm:w-[320px] min-w-[240px] shrink-0">
      <div className="text-center text-lg sm:text-xl font-bold py-2 mb-2 sm:mb-3 rounded-2xl"
        style={{
          background: 'rgba(40, 167, 69, 0.4)',
          border: '1px solid rgba(255,255,255,0.3)',
          textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
        }}>
        Әліппе
      </div>
      <div className="grid grid-cols-5 gap-1 sm:gap-1.5 overflow-y-auto flex-1 p-1 content-start"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.5) rgba(255,255,255,0.1)',
        }}>
        {KAZAKH_LETTERS.map(letter => {
          const isVowel = VOWELS.includes(letter);
          const isActive = selected === letter;
          return (
            <button
              key={letter}
              className="h-11 sm:h-14 rounded-xl flex items-center justify-center text-base sm:text-lg font-bold cursor-pointer transition-all duration-200"
              style={{
                background: isActive ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)',
                border: `1px solid ${isActive ? 'rgba(40,167,69,0.8)' : 'rgba(255,255,255,0.3)'}`,
                color: isVowel ? '#ff6b6b' : 'white',
                backdropFilter: 'blur(4px)',
                transform: isActive ? 'scale(1.1)' : 'scale(1)',
                boxShadow: isActive ? '0 0 15px rgba(40,167,69,0.6)' : 'none',
              }}
              onClick={() => setSelected(isActive ? null : letter)}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AlippePanel;
