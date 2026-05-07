import { playAlippeSound } from '@/lib/audioUtils';
import { useLocalePreference } from '@/hooks/use-locale-preference';

const kazakhAlippeData = [
  { letter: "А", word: "Алма", icon: "🍎" },
  { letter: "Ә", word: "Әтеш", icon: "🐓" },
  { letter: "Б", word: "Бақа", icon: "🐸" },
  { letter: "В", word: "Вагон", icon: "🚃" },
  { letter: "Г", word: "Гүл", icon: "🌺" },
  { letter: "Ғ", word: "Ғарыш", icon: "🚀" },
  { letter: "Д", word: "Доп", icon: "⚽" },
  { letter: "Е", word: "Есік", icon: "🚪" },
  { letter: "Ё", word: "Шахтёр", icon: "👷" },
  { letter: "Ж", word: "Жүзім", icon: "🍇" },
  { letter: "З", word: "Зебра", icon: "🦓" },
  { letter: "И", word: "Ит", icon: "🐕" },
  { letter: "Й", word: "Ай", icon: "🌙" },
  { letter: "К", word: "Күн", icon: "☀️" },
  { letter: "Қ", word: "Қоян", icon: "🐇" },
  { letter: "Л", word: "Лақ", icon: "🐐" },
  { letter: "М", word: "Мысық", icon: "🐱" },
  { letter: "Н", word: "Нан", icon: "🍞" },
  { letter: "Ң", word: "Қоңыз", icon: "🪲" },
  { letter: "О", word: "Орындық", icon: "🪑" },
  { letter: "Ө", word: "Өрік", icon: "🍑" },
  { letter: "П", word: "Піл", icon: "🐘" },
  { letter: "Р", word: "Робот", icon: "🤖" },
  { letter: "С", word: "Сәбіз", icon: "🥕" },
  { letter: "Т", word: "Тышқан", icon: "🐁" },
  { letter: "У", word: "Аққу", icon: "🦢" },
  { letter: "Ұ", word: "Ұшақ", icon: "✈️" },
  { letter: "Ү", word: "Үкі", icon: "🦉" },
  { letter: "Ф", word: "Фонтан", icon: "⛲" },
  { letter: "Х", word: "Алхоры", icon: "🫐" },
  { letter: "Һ", word: "Айдаһар", icon: "🐉" },
  { letter: "Ц", word: "Цирк", icon: "🎪" },
  { letter: "Ч", word: "Чемодан", icon: "🧳" },
  { letter: "Ш", word: "Шар", icon: "🎈" },
  { letter: "Щ", word: "Щетка", icon: "🪥" },
  { letter: "Ъ", word: "Объектив", icon: "📷" },
  { letter: "Ы", word: "Ыдыс", icon: "🥣" },
  { letter: "І", word: "Ірімшік", icon: "🧀" },
  { letter: "Ь", word: "Апельсин", icon: "🍊" },
  { letter: "Э", word: "Экскаватор", icon: "🏗️" },
  { letter: "Ю", word: "Аю", icon: "🐻" },
  { letter: "Я", word: "Яхта", icon: "⛵" } // Added Я based on common alphabet
];

const russianAlippeData = [
  { letter: "А", word: "Арбуз", icon: "🍉" },
  { letter: "Б", word: "Барабан", icon: "🥁" },
  { letter: "В", word: "Вагон", icon: "🚃" },
  { letter: "Г", word: "Гитара", icon: "🎸" },
  { letter: "Д", word: "Дом", icon: "🏠" },
  { letter: "Е", word: "Енот", icon: "🦝" },
  { letter: "Ё", word: "Ёжик", icon: "🦔" },
  { letter: "Ж", word: "Жук", icon: "🐞" },
  { letter: "З", word: "Зебра", icon: "🦓" },
  { letter: "И", word: "Иголка", icon: "🪡" },
  { letter: "Й", word: "Йогурт", icon: "🥛" },
  { letter: "К", word: "Кот", icon: "🐱" },
  { letter: "Л", word: "Лиса", icon: "🦊" },
  { letter: "М", word: "Мяч", icon: "⚽" },
  { letter: "Н", word: "Нос", icon: "👃" },
  { letter: "О", word: "Облако", icon: "☁️" },
  { letter: "П", word: "Пианино", icon: "🎹" },
  { letter: "Р", word: "Робот", icon: "🤖" },
  { letter: "С", word: "Солнце", icon: "☀️" },
  { letter: "Т", word: "Телефон", icon: "📱" },
  { letter: "У", word: "Утка", icon: "🦆" },
  { letter: "Ф", word: "Фонтан", icon: "⛲" },
  { letter: "Х", word: "Хлеб", icon: "🍞" },
  { letter: "Ц", word: "Цирк", icon: "🎪" },
  { letter: "Ч", word: "Часы", icon: "🕒" },
  { letter: "Ш", word: "Шар", icon: "🎈" },
  { letter: "Щ", word: "Щётка", icon: "🪥" },
  { letter: "Ъ", word: "Подъезд", icon: "🏢" },
  { letter: "Ы", word: "Сыр", icon: "🧀" },
  { letter: "Ь", word: "Конь", icon: "🐴" },
  { letter: "Э", word: "Экран", icon: "🖥️" },
  { letter: "Ю", word: "Юла", icon: "🧸" },
  { letter: "Я", word: "Яблоко", icon: "🍎" }
];

export default function AlippePanel() {
  const locale = useLocalePreference();
  const alippeData = locale === 'ru' ? russianAlippeData : kazakhAlippeData;

  const playSound = (letter: string) => {
    playAlippeSound(letter);
  };

  return (
    <div className="alippe-panel hidden md:flex flex-col w-[300px] lg:w-[400px] h-[calc(100vh-40px)] bg-white/15 backdrop-blur-md rounded-[15px] border-2 border-white/30 shadow-lg ml-4 my-5 p-2.5 z-10">
      <div className="alippe-header text-center text-2xl font-bold text-white shadow-sm bg-green-600/40 rounded-[20px] py-1.5 px-2.5 mb-2.5 border border-white/30 shrink-0">
        {locale === 'ru' ? 'Азбука' : 'Әліппе'}
      </div>
      <div className="alippe-grid grid grid-cols-[repeat(auto-fill,minmax(60px,1fr))] gap-2 overflow-y-auto pb-10 content-start pr-1"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.5) rgba(255,255,255,0.1)' }}>
        {alippeData.map((item, index) => (
          <div
            key={index}
            className="alippe-item h-[70px] border border-white/40 rounded-[10px] flex flex-col items-center justify-center cursor-pointer transition-all duration-200 bg-white/25 backdrop-blur-sm hover:scale-105 hover:shadow-[0_0_15px_rgba(40,167,69,0.6)] hover:bg-white/60 hover:text-gray-800 hover:z-10 group"
            onClick={() => playSound(item.letter)}
          >
            <div className="text-xl md:text-2xl font-bold mb-0.5" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              {item.letter}
            </div>
            <div className="text-[10px] md:text-xs text-white/90 group-hover:text-gray-800">{item.word}</div>
            <div className="text-sm md:text-base mt-0.5">{item.icon}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
