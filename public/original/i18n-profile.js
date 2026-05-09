(function () {
  const PROFILE_LANG_KEY = 'profileLang';
  const SHARED_LOCALE_KEY = 'locale';
  const VALID_LANGS = new Set(['kk', 'ru']);

  const kkAlippeData = [
    { letter: 'А', word: 'Алма', icon: '🍎', words: ['Алма', 'Ата', 'Ана'] },
    { letter: 'Ә', word: 'Әтеш', icon: '🐓', words: ['Әтеш', 'Әже', 'Ән'] },
    { letter: 'Б', word: 'Бақа', icon: '🐸', words: ['Бақа', 'Бал', 'Балық'] },
    { letter: 'В', word: 'Вагон', icon: '🚃', words: ['Вагон', 'Велосипед', 'Вертолёт'] },
    { letter: 'Г', word: 'Гүл', icon: '🌺', words: ['Гүл', 'Гитара', 'Галстук'] },
    { letter: 'Ғ', word: 'Ғарыш', icon: '🚀', words: ['Ғарыш', 'Ғалым', 'Ғаламтор'] },
    { letter: 'Д', word: 'Доп', icon: '⚽', words: ['Доп', 'Достық', 'Дала'] },
    { letter: 'Е', word: 'Есік', icon: '🚪', words: ['Есік', 'Етік', 'Ешкі'] },
    { letter: 'Ё', word: 'Шахтёр', icon: '👷', words: ['Шахтёр', 'Ёлка', 'Ёжик'] },
    { letter: 'Ж', word: 'Жүзім', icon: '🍇', words: ['Жүзім', 'Жол', 'Жалау'] },
    { letter: 'З', word: 'Зебра', icon: '🦓', words: ['Зебра', 'Зымыран', 'Заң'] },
    { letter: 'И', word: 'Ит', icon: '🐕', words: ['Ит', 'Ине', 'Игілік'] },
    { letter: 'Й', word: 'Ай', icon: '🌙', words: ['Ай', 'Тай', 'Май'] },
    { letter: 'К', word: 'Күн', icon: '☀️', words: ['Күн', 'Кітап', 'Кеме'] },
    { letter: 'Қ', word: 'Қоян', icon: '🐇', words: ['Қоян', 'Қалам', 'Қасық'] },
    { letter: 'Л', word: 'Лақ', icon: '🐐', words: ['Лақ', 'Лимон', 'Лента'] },
    { letter: 'М', word: 'Мысық', icon: '🐱', words: ['Мысық', 'Машина', 'Мектеп'] },
    { letter: 'Н', word: 'Нан', icon: '🍞', words: ['Нан', 'Найза', 'Наурыз'] },
    { letter: 'Ң', word: 'Қоңыз', icon: '🪲', words: ['Қоңыз', 'Таң', 'Шаң'] },
    { letter: 'О', word: 'Орындық', icon: '🪑', words: ['Орындық', 'Ойыншық', 'Оқушы'] },
    { letter: 'Ө', word: 'Өрік', icon: '🍑', words: ['Өрік', 'Өзен', 'Өрмекші'] },
    { letter: 'П', word: 'Піл', icon: '🐘', words: ['Піл', 'Парта', 'Поезд'] },
    { letter: 'Р', word: 'Робот', icon: '🤖', words: ['Робот', 'Раушан', 'Радио'] },
    { letter: 'С', word: 'Сәбіз', icon: '🥕', words: ['Сәбіз', 'Сабын', 'Сағат'] },
    { letter: 'Т', word: 'Тышқан', icon: '🐁', words: ['Тышқан', 'Терезе', 'Тау'] },
    { letter: 'У', word: 'Аққу', icon: '🦢', words: ['Аққу', 'Уық', 'Уақыт'] },
    { letter: 'Ұ', word: 'Ұшақ', icon: '✈️', words: ['Ұшақ', 'Ұлт', 'Ұстаз'] },
    { letter: 'Ү', word: 'Үкі', icon: '🦉', words: ['Үкі', 'Үй', 'Үтік'] },
    { letter: 'Ф', word: 'Фонтан', icon: '⛲', words: ['Фонтан', 'Футбол', 'Фишка'] },
    { letter: 'Х', word: 'Хабар', icon: '📣', words: ['Хабар', 'Хат', 'Хан'] },
    { letter: 'Һ', word: 'Айдаһар', icon: '🐉', words: ['Айдаһар', 'Гауһар', 'Жиһаз'] },
    { letter: 'Ц', word: 'Цирк', icon: '🎪', words: ['Цирк', 'Цемент', 'Центр'] },
    { letter: 'Ч', word: 'Чемодан', icon: '🧳', words: ['Чемодан', 'Чек', 'Чемпион'] },
    { letter: 'Ш', word: 'Шар', icon: '🎈', words: ['Шар', 'Шана', 'Шалбар'] },
    { letter: 'Щ', word: 'Щетка', icon: '🪥', words: ['Щетка', 'Щи', 'Ащы'] },
    { letter: 'Ъ', word: 'Объектив', icon: '📷', words: ['Объектив', 'Подъезд', 'Съезд'] },
    { letter: 'Ы', word: 'Ыдыс', icon: '🥣', words: ['Ыдыс', 'Ыстық', 'Ырыс'] },
    { letter: 'І', word: 'Ірімшік', icon: '🧀', words: ['Ірімшік', 'Ілу', 'Іні'] },
    { letter: 'Ь', word: 'Апельсин', icon: '🍊', words: ['Апельсин', 'Альбом', 'Мебель'] },
    { letter: 'Э', word: 'Экскаватор', icon: '🏗️', words: ['Экскаватор', 'Экран', 'Электр'] },
    { letter: 'Ю', word: 'Аю', icon: '🐻', words: ['Аю', 'Ою', 'Юла'] },
    { letter: 'Я', word: 'Қияр', icon: '🥒', words: ['Қияр', 'Тақия', 'Яхта'] }
  ];

  const ruAlippeData = [
    { letter: 'А', word: 'Арбуз', icon: '🍉', words: ['Арбуз', 'Аист', 'Апельсин'] },
    { letter: 'Б', word: 'Барабан', icon: '🥁', words: ['Барабан', 'Банан', 'Белка'] },
    { letter: 'В', word: 'Вагон', icon: '🚃', words: ['Вагон', 'Вертолёт', 'Велосипед'] },
    { letter: 'Г', word: 'Гитара', icon: '🎸', words: ['Гитара', 'Гриб', 'Город'] },
    { letter: 'Д', word: 'Дом', icon: '🏠', words: ['Дом', 'Дверь', 'Дерево'] },
    { letter: 'Е', word: 'Енот', icon: '🦝', words: ['Енот', 'Ель', 'Еда'] },
    { letter: 'Ё', word: 'Ёжик', icon: '🦔', words: ['Ёжик', 'Ёлка'] },
    { letter: 'Ж', word: 'Жук', icon: '🐞', words: ['Жук', 'Жираф', 'Журнал'] },
    { letter: 'З', word: 'Зебра', icon: '🦓', words: ['Зебра', 'Зонт', 'Звезда'] },
    { letter: 'И', word: 'Иголка', icon: '🪡', words: ['Иголка', 'Ирис', 'Игра'] },
    { letter: 'Й', word: 'Йогурт', icon: '🥛', words: ['Йогурт', 'Йод'] },
    { letter: 'К', word: 'Кот', icon: '🐱', words: ['Кот', 'Книга', 'Корабль'] },
    { letter: 'Л', word: 'Лиса', icon: '🦊', words: ['Лиса', 'Лимон', 'Лента'] },
    { letter: 'М', word: 'Мяч', icon: '⚽', words: ['Мяч', 'Машина', 'Молоко'] },
    { letter: 'Н', word: 'Нос', icon: '👃', words: ['Нос', 'Ножницы', 'Небо'] },
    { letter: 'О', word: 'Облако', icon: '☁️', words: ['Облако', 'Окно', 'Остров'] },
    { letter: 'П', word: 'Пианино', icon: '🎹', words: ['Пианино', 'Парта', 'Поезд'] },
    { letter: 'Р', word: 'Робот', icon: '🤖', words: ['Робот', 'Ракета', 'Радио'] },
    { letter: 'С', word: 'Солнце', icon: '☀️', words: ['Солнце', 'Самолёт', 'Сапог'] },
    { letter: 'Т', word: 'Телефон', icon: '📱', words: ['Телефон', 'Торт', 'Трактор'] },
    { letter: 'У', word: 'Утка', icon: '🦆', words: ['Утка', 'Улитка', 'Ухо'] },
    { letter: 'Ф', word: 'Фонтан', icon: '⛲', words: ['Фонтан', 'Футбол', 'Фонарь'] },
    { letter: 'Х', word: 'Хлеб', icon: '🍞', words: ['Хлеб', 'Хор', 'Халат'] },
    { letter: 'Ц', word: 'Цирк', icon: '🎪', words: ['Цирк', 'Цветок', 'Центр'] },
    { letter: 'Ч', word: 'Часы', icon: '🕒', words: ['Часы', 'Чай', 'Чемодан'] },
    { letter: 'Ш', word: 'Шар', icon: '🎈', words: ['Шар', 'Шапка', 'Школа'] },
    { letter: 'Щ', word: 'Щётка', icon: '🪥', words: ['Щётка', 'Щенок', 'Щи'] },
    { letter: 'Ъ', word: 'Подъезд', icon: '🏢', words: ['Подъезд', 'Съезд', 'Объект'] },
    { letter: 'Ы', word: 'Сыр', icon: '🧀', words: ['Сыр', 'Дым', 'Мыло'] },
    { letter: 'Ь', word: 'Конь', icon: '🐴', words: ['Конь', 'Тень', 'Пень'] },
    { letter: 'Э', word: 'Экран', icon: '🖥️', words: ['Экран', 'Эхо', 'Экскаватор'] },
    { letter: 'Ю', word: 'Юла', icon: '🧸', words: ['Юла', 'Юбка', 'Юг'] },
    { letter: 'Я', word: 'Яблоко', icon: '🍎', words: ['Яблоко', 'Яхта', 'Ящик'] }
  ];

  const ruText = {
    '🎧 Сиқырлы Дыбыстар Әлемі': '🎧 Волшебный мир звуков',
    'Сиқырлы Дыбыстар Әлемі': 'Волшебный мир звуков',
    'Есту қабілеті нашар балаларға арналған интерактивті платформа': 'Интерактивная платформа для детей с нарушением слуха',
    'Қош келдіңіз! 👋': 'Добро пожаловать! 👋',
    'Бұл платформада сіз дыбыстарды естіп, айтуды үйренесіз.': 'На этой платформе вы будете учиться слышать и произносить звуки.',
    'Ойындар мен тапсырмалар арқылы есту қабілетіңізді дамытасыз!': 'Игры и задания помогут развивать слуховое восприятие.',
    'Көмекшіңізді таңдаңыз:': 'Выберите помощника:',
    'Түлкі': 'Лиса',
    'Қоян': 'Заяц',
    'Робот': 'Робот',
    '▶️ Оқуды бастау': '▶️ Начать обучение',
    'Сыныпты': 'Выберите',
    'таңдаңыз': 'класс',
    'Дайындық': 'Подготовка',
    '0-1': '0-1',
    '1-деңгей': '1 уровень',
    '1-сынып': '1 класс',
    '2-сынып': '2 класс',
    '3-сынып': '3 класс',
    '4-сынып': '4 класс',
    'Дыбыстар': 'Звуки',
    'Дауыс': 'Голос',
    'Дауыспен жумыс': 'Работа с голосом',
    'Дауыс шақыру': 'Вызов голоса',
    'Тыныспен жумыс': 'Дыхательные упражнения',
    'Дыбыс картасы': 'Карта звуков',
    'Сөйлем': 'Предложение',
    'Кеңістікке бағдарлау': 'Ориентация в пространстве',
    '⬅️ Артқа': '⬅️ Назад',
    '← Артқа': '← Назад',
    'Әліппе': 'Азбука',
    'Тану': 'Распознавание',
    'Аспап': 'Инструменты',
    'Жануар': 'Животные',
    'Жануарлар': 'Животные',
    'Ырғақ': 'Ритм',
    'Табиғат': 'Природа',
    'Адам': 'Человек',
    'Көлік': 'Транспорт',
    'Үй': 'Дом',
    'Тұрмыстық': 'Бытовые',
    'дыбыстар': 'звуки',
    'Тұрмыстық дыбыстар': 'Бытовые звуки',
    'Жабайы': 'Дикие',
    'Буындар': 'Слоги',
    'Техника дыбыстар': 'Звуки техники',
    'Эмоция': 'Эмоции',
    'С-Ш': 'С-Ш',
    'Математика': 'Математика',
    'Сипаты': 'Свойства',
    'Ертегілер': 'Сказки',
    'Әңгіме': 'Рассказ',
    'Диалог': 'Диалог',
    'Мәтін': 'Текст',
    'Бағыт': 'Направление',
    'Бағыттар': 'Направления',
    'Оқу': 'Чтение',
    'Сөздер': 'Слова',
    'Әндер': 'Песни',
    'Интонация': 'Интонация',
    'Екпін': 'Ударение',
    'Техника': 'Техника',
    'Жиілігі': 'Частота',
    'Саны': 'Количество',
    'Әріптер': 'Буквы',
    'Би': 'Танец',
    'Тұрмыс': 'Быт',
    'Адам эмоциясы': 'Эмоции человека',
    'Техниканы тап!': 'Найдите технику!',
    'Эмоцияны немесе әрекетті тап!': 'Найдите эмоцию или действие!',
    'Жануарды дыбысынан тап!': 'Узнайте животное по звуку!',
    'Дыбысты тап!': 'Найдите звук!',
    'Дыбысты тану': 'Распознавание звука',
    'Дыбыс шыққанда "ИӘ" батырмасын басыңыз!': 'Если звук есть, нажмите «ДА»!',
    'Дыбыс шықпаса "ЖОҚ" батырмасын басыңыз!': 'Если звука нет, нажмите «НЕТ»!',
    '✅ ИӘ - Дыбыс бар': '✅ ДА - звук есть',
    '❌ ЖОҚ - Дыбыс жоқ': '❌ НЕТ - звука нет',
    'Дыбысты тыңдап, дұрыс суретті таңдаңыз!': 'Послушайте звук и выберите правильную картинку!',
    'Оқы және белгіле': 'Прочитай и отметь',
    '🚀 Начать': '🚀 Начать',
    'Музыкалық аспаптар': 'Музыкальные инструменты',
    'Дыбысты тыңдап, қай аспап ойнап тұрғанын табыңыз!': 'Послушайте звук и определите инструмент!',
    'Жануарлар дауысы': 'Голоса животных',
    'Қай жануардың дауысы естіліп тұр?': 'Голос какого животного звучит?',
    'Музыка ырғағы': 'Музыкальный ритм',
    'Музыканы тыңдаңыз және ырғақтың түрін ажыратыңыз!': 'Послушайте музыку и определите тип ритма!',
    'Музыканың қарқынын анықтаңыз: жылдам әлде баяу?': 'Определите темп музыки: быстрый или медленный?',
    'Табиғат дыбыстары': 'Звуки природы',
    'Дыбысты тыңдап, табиғат құбылысын табыңыз.': 'Послушайте звук и найдите явление природы.',
    'Адам дыбыстары': 'Звуки человека',
    'Дыбысты тыңдап, адамның көңіл-күйін немесе әрекетін табыңыз!': 'Послушайте звук и найдите эмоцию или действие человека!',
    'Көліктер дыбысы': 'Звуки транспорта',
    'Дыбысты тыңдап, қандай көлік екенін анықтаңыз!': 'Послушайте звук и определите транспорт!',
    'Қай көліктің дыбысы естіліп тұр?': 'Какой транспорт звучит?',
    'Тұрмыстық жұмыстар': 'Бытовые звуки',
    'Үй мен тұрмыстық техника дыбыстарын табыңыз!': 'Найдите домашние и бытовые звуки!',
    'Сөзді тыңдап, неше буыннан тұратынын табыңыз!': 'Послушайте слово и определите количество слогов!',
    'Сөзді тыңдап, қандай дыбыс естілетінін табыңыз!': 'Послушайте слово и определите звук!',
    'Математика тілі': 'Язык математики',
    'Математикалық терминді тыңдап, дұрыс таңбаны табыңыз!': 'Послушайте математический термин и выберите знак!',
    'Дыбыс сипаты': 'Свойства звука',
    'Дыбысты тыңдап, оның ұзақтығын немесе қаттылығын анықтаңыз!': 'Послушайте звук и определите длительность или громкость!',
    'Музыкалық ертегілер': 'Музыкальные сказки',
    'Музыкалық ертегіді тыңдап, қайсысы екенін табыңыз!': 'Послушайте музыкальную сказку и выберите правильную!',
    'Техникалық дыбыстар': 'Технические звуки',
    'Техникамен байланысты шуылды тыңдап, не екенін табыңыз!': 'Послушайте технический шум и определите его!',
    'Сөйлемнің интонациясын анықтаңыз!': 'Определите интонацию предложения!',
    'Сөзді тыңдап, қай буынға екпін түсетінін табыңыз!': 'Послушайте слово и найдите ударный слог!',
    'Тұрмыстық техника': 'Бытовая техника',
    'Дыбысты тыңдап, қай құрал екенін табыңыз!': 'Послушайте звук и найдите прибор!',
    'Сөздерді тану': 'Распознавание слов',
    'Естіген сөздің түрін анықтаңыз!': 'Определите тип услышанного слова!',
    'Ұлттық әндер': 'Национальные песни',
    'Әннің қай ұлтқа жататынын табыңыз!': 'Определите, к какой культуре относится песня!',
    'Әңгімелерді тыңдау': 'Прослушивание рассказов',
    'Әңгімені тыңдап, сұраққа жауап беріңіз!': 'Послушайте рассказ и ответьте на вопрос!',
    'Сұрақ:': 'Вопрос:',
    'Әңгімені тыңдаңыз...': 'Послушайте рассказ...',
    'Диалогты тыңдап, кімнің сөйлеп тұрғанын анықтаңыз!': 'Послушайте диалог и определите, кто говорит!',
    'Мәтін оқу': 'Чтение текста',
    'Мәтінді дауыстап оқып, жазып алыңыз!': 'Прочитайте текст вслух и запишите!',
    'Оқуды бастау': 'Начать чтение',
    'Күрделі ырғақ': 'Сложный ритм',
    'Ырғақты тыңдап, қанша соққы екенін санаңыз!': 'Послушайте ритм и посчитайте удары!',
    'Дыбыс бағыты': 'Направление звука',
    'Дыбыс қай жақтан шығып жатыр?': 'Откуда исходит звук?',
    'Жабайы жануарлар': 'Дикие животные',
    'Сөйлем құрастыру': 'Составление предложения',
    'Карталарды төменге сүйреп әкеліңіз немесе басыңыз!': 'Перетащите карточки вниз или нажмите на них!',
    'Карталар:': 'Карточки:',
    'Сөйлем алаңы:': 'Поле предложения:',
    'Жауап карточкалары:': 'Карточки ответов:',
    'Кеңістікке бағдарлау': 'Ориентация в пространстве',
    'Жануарларды дұрыс орынға орналастыр!': 'Разместите животных в правильные места!',
    'Буындап оқу': 'Чтение по слогам',
    'Сөзді буындарға бөліп оқыңыз!': 'Разделите слово на слоги и прочитайте!',
    '✂️ Буындарға бөл': '✂️ Разделить на слоги',
    'Буындар осында пайда болады…': 'Слоги появятся здесь…',
    '🔊 Барлығын тыңда': '🔊 Прослушать все',
    '👆 Буынды басу арқылы оны тыңдаңыз!': '👆 Нажмите на слог, чтобы прослушать!',
    'Буындап оқу 2.0': 'Чтение по слогам 2.0',
    '👁️ Көрсету': '👁️ Показать',
    '🎧 Тыңдау': '🎧 Слушать',
    '✨ Құрастыру': '✨ Составить',
    'Сөзді буынға бөліп, пирамиданы өсіреміз: әуелі бірінші буын, содан кейін буындар тізбегі толық сөзге дейін.': 'Делим слово на слоги и строим пирамиду: сначала первый слог, затем цепочка слогов до полного слова.',
    'Бірнеше сөз жазсаңыз, пирамида сол сөздермен өседі. Егер тек бір сөз жазсаңыз, ЖИ сол сөзден қарапайым сөйлемдер құрап, пирамиданы өзі жасайды.': 'Если ввести несколько слов, пирамида строится из них. Если ввести одно слово, ИИ сам составит простые предложения.',
    'Жақтарыңызды ашып, еріндеріңізді дөңгелетіңіз': 'Откройте рот и округлите губы',
    'Жарайсың! 🎉': 'Молодец! 🎉',
    'Сен тапсырманы сәтті орындадың!': 'Ты успешно выполнил задание!',
    'Жалғастыру': 'Продолжить',
    'Жабу ❌': 'Закрыть ❌',
    '(Жабу үшін басыңыз)': '(Нажмите, чтобы закрыть)',
    'Монеты': 'Монеты',
    'Ретинг / Рейтинг': 'Рейтинг',
    '🏆 Ретинг / Рейтинг': '🏆 Рейтинг',
    'Тақырып / Тема': 'Тема',
    'Тіл / Язык': 'Язык',
    '🚪 Шығу / Выйти': '🚪 Выйти',
    'Көшбасшылар / Лидеры': 'Лидеры',
    'LEVEL 1': 'УРОВЕНЬ 1',
    'Отыңызды енгізіңіз / Введите ваше имя:': 'Введите ваше имя:',
    'Фото өлшемі тым үлкен (2МБ көп емес) / Размер фото слишком большой (не более 2МБ)': 'Размер фото слишком большой (не более 2 МБ)',
    'Жүктелуде... / Ожидание...': 'Загрузка...',
    'Әлі рейтинг жоқ / Рейтинга пока нет.': 'Рейтинга пока нет.',
    'Құлыптаулы': 'Закрыто',
    'Таңдау': 'Выбрать',
    'Дұрыс!': 'Правильно!',
    'Дұрыс! Жарайсың!': 'Правильно! Молодец!',
    'Қателестің, қайтадан көр!': 'Ошибка, попробуй еще раз!',
    'Қате!': 'Ошибка!',
    'Жоқ, бұл басқа жануар.': 'Нет, это другое животное.',
    'Алдымен дыбысты тыңдаңыз!': 'Сначала послушайте звук!',
    '🎧 Алдымен музыканы тыңдаңыз!': '🎧 Сначала послушайте музыку!',
    '🎵 Тыңдаңыз... Марш па, әлде Вальс па?': '🎵 Слушайте... Марш или вальс?',
    '❌ Қате! Тағы бір тыңдаңыз.': '❌ Ошибка! Послушайте еще раз.',
    'Қате! Саны сәйкес келмейді.': 'Ошибка! Количество не совпадает.',
    'Жарайсың! Дұрыс! 🎉': 'Молодец! Правильно! 🎉',
    'Қате! Қайтадан тыңдап көр.': 'Ошибка! Послушайте еще раз.',
    'Ырғақты тыңдап, қайтала! 🥁': 'Послушай ритм и повтори! 🥁',
    'Қайта бастау 🔄': 'Начать заново 🔄',
    'Раунд': 'Раунд',
    'Тыңда! 👂': 'Слушай! 👂',
    'Енді сен! (Қайтала) 🥁': 'Теперь ты! (Повтори) 🥁',
    'Дұрыс! Келесі деңгей! 🌟': 'Правильно! Следующий уровень! 🌟',
    'Қате! 😔 Кеттік басынан...': 'Ошибка! 😔 Начинаем сначала...',
    'Микрофонға рұқсат керек! (Mic permission needed)': 'Нужен доступ к микрофону!',
    'Дыбыс естілмеді (No Sound)': 'Звук не услышан',
    'Қаттырақ айтшы (Louder)': 'Скажите громче',
    'Жақсы! (Good)': 'Хорошо!',
    'Дыбыс қабылданды (Generic)': 'Звук принят',
    'Керемет! Дұрыс! ✅': 'Отлично! Правильно! ✅',
    'Басқа дыбыс сияқты... 🔄': 'Похоже на другой звук... 🔄',
    'Дұрыс емес...': 'Неправильно...',
    'Тыңдауда... 🎤': 'Слушаю... 🎤',
    'Керемет! Дұрыс айтылды! ✅': 'Отлично! Произнесено правильно! ✅',
    'Тағы бір рет қайталап көрші... 🔄': 'Попробуй повторить еще раз... 🔄',
    'Микрофон қосылуда...': 'Подключение микрофона...',
    'Микрофонға рұқсат жоқ ❌': 'Нет доступа к микрофону ❌',
    '🎤 Айтып көр!': '🎤 Попробуй сказать!',
    '⏹️ Тоқтату': '⏹️ Остановить',
    'Ат': 'Лошадь',
    'Сиыр': 'Корова',
    'Қой': 'Овца',
    'Мысық': 'Кошка',
    'Ит': 'Собака',
    'Марш': 'Марш',
    'Вальс': 'Вальс',
    'Құстар': 'Птицы',
    'Су': 'Вода',
    'Жел': 'Ветер',
    'Күлу': 'Смех',
    'Күлкі': 'Смех',
    'Жылау': 'Плач',
    'Түшкіру': 'Чихание',
    'Жөтелу': 'Кашель',
    'Машина': 'Машина',
    'Ұшақ': 'Самолёт',
    'Пойыз': 'Поезд',
    'Поезд': 'Поезд',
    'Мотоцикл': 'Мотоцикл',
    'Телефон': 'Телефон',
    'Сағат': 'Часы',
    'Велосипед': 'Велосипед',
    'Есік': 'Дверь',
    'Мектеп': 'Школа',
    'Тоңазытқыш': 'Холодильник',
    'Шаңсорғыш': 'Пылесос',
    'Киім жуғыш': 'Стиральная машина',
    'Фен': 'Фен',
    'Қосу': 'Плюс',
    'Азайту': 'Минус',
    'Артық': 'Больше',
    'Кем': 'Меньше',
    'Ұзақ': 'Длинный',
    'Қысқа': 'Короткий',
    'Қатты': 'Громко',
    'Ақырын': 'Тихо',
    'Тыныш': 'Тихо',
    'Қызыл телпек': 'Красная Шапочка',
    'Үш аю': 'Три медведя',
    'Ақшақар': 'Белоснежка',
    'Мылтық': 'Ружьё',
    'Пулемет': 'Пулемёт',
    'Зеңбірек': 'Пушка',
    'Жылдам': 'Быстро',
    'Орташа': 'Средне',
    'Баяу': 'Медленно',
    'Сұрақ': 'Вопрос',
    'Хабарлау': 'Сообщение',
    'Леп': 'Восклицание',
    '1-ші буын': '1-й слог',
    '2-ші буын': '2-й слог',
    '3-ші буын': '3-й слог',
    'Таныс сөз': 'Знакомое слово',
    'Тапсырма': 'Задание',
    'Қазақ': 'Казахская',
    'Орыс': 'Русская',
    'Ағылшын': 'Английская',
    'Жауап 1': 'Ответ 1',
    'Жауап 2': 'Ответ 2',
    'Жауап 3': 'Ответ 3',
    'Бала': 'Ребёнок',
    'Ересек': 'Взрослый',
    'Екеуі де': 'Оба',
    'Трактор': 'Трактор',
    'Ара': 'Пила',
    'Тігін': 'Шитьё',
    'Тігін машинасы': 'Швейная машина',
    'Сол': 'Слева',
    'Оң': 'Справа',
    'Алдынан': 'Спереди',
    'Артынан': 'Сзади',
    'Арыстан': 'Лев',
    'Қасқыр': 'Волк',
    'Аю': 'Медведь',
    'Піл': 'Слон',
    'Дауыстап': 'Громко',
    'Жай': 'Обычно',
    'Сыбырлап': 'Шёпотом',
    'Жаттығу': 'Упражнение',
    '🔊 Тыңда': '🔊 Слушать',
    '🔊 Тыңдалуда...': '🔊 Идет прослушивание...',
    '🔊 Тыңдау (Жаңа)': '🔊 Слушать (новое)'
  };

  const kkText = Object.entries(ruText).reduce((acc, [kk, ru]) => {
    if (!acc[ru]) acc[ru] = kk;
    return acc;
  }, {});

  let isApplyingLanguage = false;
  let observer = null;

  function normalizeLang(lang) {
    return VALID_LANGS.has(lang) ? lang : 'kk';
  }

  function getProfileLang() {
    const saved = localStorage.getItem(PROFILE_LANG_KEY) || localStorage.getItem(SHARED_LOCALE_KEY);
    return normalizeLang(saved);
  }

  function getProfileSpeechLang() {
    return getProfileLang() === 'ru' ? 'ru-RU' : 'kk-KZ';
  }

  function encodeAudioSegment(value) {
    return encodeURIComponent(String(value || ''));
  }

  function addAudioExtensionFallbacks(path) {
    const paths = [path];
    if (/\.mp3$/i.test(path)) {
      paths.push(path.replace(/\.mp3$/i, '.wav'));
    }
    return paths;
  }

  function playFirstAvailableAudio(paths, fallback) {
    const candidates = paths.filter(Boolean);
    let index = 0;

    const playNext = () => {
      const path = candidates[index++];
      if (!path) {
        if (typeof fallback === 'function') fallback();
        return;
      }

      const audio = new Audio(path);
      audio.play().catch(playNext);
    };

    playNext();
  }

  function getRuLetterAudioCandidates(letter) {
    const letterLower = String(letter || '').toLowerCase();
    return [
      ...addAudioExtensionFallbacks(`sounds/ru/Alippe/Alippe_${letterLower}.mp3`),
      ...addAudioExtensionFallbacks(`sounds/ru/letters/letter_${letterLower}.mp3`),
      `sounds/Alippe/Alippe_${letterLower}.mp3`,
      `sounds/letters/letter_${letterLower}.mp3`
    ];
  }

  function getRuWordAudioCandidates(word) {
    const safeWord = encodeAudioSegment(word);
    return [
      ...addAudioExtensionFallbacks(`sounds/ru/Alippe/words/${safeWord}.mp3`),
      `sounds/Alippe/words/${safeWord}.mp3`,
      `sounds/Alippe/words/${word}.mp3`
    ];
  }

  function getDefaultWordAudioCandidates(word) {
    const safeWord = encodeAudioSegment(word);
    return [
      `sounds/Alippe/words/${safeWord}.mp3`,
      `sounds/Alippe/words/${word}.mp3`
    ];
  }

  function normalizeText(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

  function applyWhitespace(original, translated) {
    const leading = String(original).match(/^\s*/)?.[0] || '';
    const trailing = String(original).match(/\s*$/)?.[0] || '';
    return leading + translated + trailing;
  }

  function translateString(value, lang) {
    const normalized = normalizeText(value);
    if (!normalized) return value;
    const dict = lang === 'ru' ? ruText : kkText;
    const translated = dict[normalized];
    return translated ? applyWhitespace(value, translated) : value;
  }

  function shouldSkipNode(node) {
    const parent = node.parentElement;
    if (!parent) return true;
    return Boolean(parent.closest('script, style, svg, audio, video, canvas, code, pre'));
  }

  function translateDom(root, lang) {
    const container = root || document.body;
    if (!container) return;

    const textRoot = container.nodeType === Node.TEXT_NODE ? container.parentNode : container;
    const walker = document.createTreeWalker(textRoot, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (shouldSkipNode(node)) return NodeFilter.FILTER_REJECT;
        return normalizeText(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });

    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    textNodes.forEach(node => {
      const next = translateString(node.nodeValue, lang);
      if (next !== node.nodeValue) node.nodeValue = next;
    });

    const elementRoot = container.nodeType === Node.ELEMENT_NODE ? container : document.body;
    const elements = elementRoot.querySelectorAll
      ? elementRoot.querySelectorAll('[placeholder], [aria-label], [title], input[type="button"], input[type="submit"]')
      : [];

    elements.forEach(element => {
      ['placeholder', 'aria-label', 'title'].forEach(attr => {
        if (!element.hasAttribute(attr)) return;
        const current = element.getAttribute(attr);
        const next = translateString(current, lang);
        if (next !== current) element.setAttribute(attr, next);
      });

      if ((element.type === 'button' || element.type === 'submit') && element.value) {
        const next = translateString(element.value, lang);
        if (next !== element.value) element.value = next;
      }
    });
  }

  function syncProfileLangButtons(lang) {
    document.querySelectorAll('.profile-lang-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll(`.profile-lang-btn[data-lang="${lang}"]`).forEach(btn => {
      btn.classList.add('active');
    });
  }

  function renderAlippeGrid(grid, itemData) {
    const item = document.createElement('div');
    item.className = 'alippe-item';
    item.style.padding = '4px';
    item.style.gap = '2px';

    const iconDiv = document.createElement('div');
    iconDiv.textContent = itemData.icon;
    iconDiv.style.fontSize = '24px';
    iconDiv.style.lineHeight = '1.2';

    const letterDiv = document.createElement('div');
    letterDiv.textContent = itemData.letter;
    letterDiv.style.fontSize = '18px';
    letterDiv.style.fontWeight = 'bold';
    letterDiv.style.color = '#155724';

    const wordDiv = document.createElement('div');
    wordDiv.textContent = itemData.word;
    wordDiv.className = 'alippe-word';
    wordDiv.style.fontSize = '10px';
    wordDiv.style.color = '#333';
    wordDiv.style.marginTop = '0px';

    item.appendChild(iconDiv);
    item.appendChild(letterDiv);
    item.appendChild(wordDiv);

    let clickCount = 0;
    let clickTimer = null;
    let soundTimer = null;

    item.onclick = () => {
      clickCount++;

      item.style.transform = 'scale(0.95)';
      setTimeout(() => { item.style.transform = 'scale(1)'; }, 150);

      if (clickCount === 1) {
        soundTimer = setTimeout(() => {
          if (getProfileLang() === 'ru') {
            playFirstAvailableAudio(getRuWordAudioCandidates(itemData.word), () => {
              if (typeof window.playAlippeSoundLocal === 'function') {
                window.playAlippeSoundLocal(itemData.letter);
              }
            });
            return;
          }

          if (typeof window.playAlippeSoundLocal === 'function') {
            window.playAlippeSoundLocal(itemData.letter);
          }
        }, 250);

        clickTimer = setTimeout(() => {
          clickCount = 0;
        }, 400);
      } else if (clickCount === 2) {
        clearTimeout(clickTimer);
        clearTimeout(soundTimer);
        clickCount = 0;

        if (typeof window.showWordOnRightPanel === 'function') {
          window.showWordOnRightPanel(itemData);
        }

        document.querySelectorAll('.alippe-item').forEach(i => i.classList.remove('expanded'));
        item.classList.add('expanded');
      }
    };

    grid.appendChild(item);
  }

  window.initAlippeLocal = function initAlippeLocal() {
    const grids = document.querySelectorAll('.alippe-grid');
    if (grids.length === 0) return;

    const lang = getProfileLang();
    const data = lang === 'ru' ? ruAlippeData : kkAlippeData;
    document.querySelectorAll('.alippe-header').forEach(header => {
      header.textContent = lang === 'ru' ? 'Азбука' : 'Әліппе';
    });

    grids.forEach(grid => {
      grid.innerHTML = '';
      data.forEach(itemData => renderAlippeGrid(grid, itemData));
    });
  };

  window.playAlippeWordSound = function playAlippeWordSound(letter, word) {
    if (word) {
      const candidates = getProfileLang() === 'ru'
        ? getRuWordAudioCandidates(word)
        : getDefaultWordAudioCandidates(word);

      playFirstAvailableAudio(candidates, () => {
        if (typeof window.playAlippeSoundLocal === 'function') {
          window.playAlippeSoundLocal(letter);
        }
      });
      return;
    }

    if (typeof window.playAlippeSoundLocal === 'function') {
      window.playAlippeSoundLocal(letter);
    }
  };

  const originalPlayAlippeSoundLocal = window.playAlippeSoundLocal;
  window.playAlippeSoundLocal = function playAlippeSoundLocalWithProfileAudio(letter) {
    if (getProfileLang() !== 'ru') {
      if (typeof originalPlayAlippeSoundLocal === 'function') {
        originalPlayAlippeSoundLocal(letter);
      }
      return;
    }

    playFirstAvailableAudio(getRuLetterAudioCandidates(letter));
  };

  function applyProfileLanguage(lang, options = {}) {
    const nextLang = normalizeLang(lang || getProfileLang());

    localStorage.setItem(PROFILE_LANG_KEY, nextLang);
    localStorage.setItem(SHARED_LOCALE_KEY, nextLang);
    document.documentElement.lang = nextLang;
    document.title = nextLang === 'ru' ? '🎧 Волшебный мир звуков' : '🎧 Сиқырлы Дыбыстар Әлемі';
    syncProfileLangButtons(nextLang);

    if (options.refreshAlippe) {
      const popup = document.getElementById('alippeWordDisplay');
      if (popup) popup.remove();
      window.initAlippeLocal();
    }

    isApplyingLanguage = true;
    translateDom(document.body, nextLang);
    isApplyingLanguage = false;

    window.dispatchEvent(new CustomEvent('profile-language-change', { detail: { lang: nextLang } }));
  }

  window.applyProfileLanguage = applyProfileLanguage;
  window.getProfileLang = getProfileLang;
  window.getProfileSpeechLang = getProfileSpeechLang;

  window.setLangProfile = function setLangProfile(lang) {
    if (typeof window.playClick === 'function') window.playClick();
    applyProfileLanguage(lang, { refreshAlippe: true });
  };

  if (typeof window.openProfileModal === 'function') {
    const originalOpenProfileModal = window.openProfileModal;
    window.openProfileModal = function openProfileModalWithLanguage() {
      originalOpenProfileModal();
      applyProfileLanguage(getProfileLang());
    };
  }

  if (typeof window.showScreen === 'function') {
    const originalShowScreen = window.showScreen;
    window.showScreen = function showScreenWithLanguage(screenId) {
      originalShowScreen(screenId);
      setTimeout(() => applyProfileLanguage(getProfileLang()), 180);
    };
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyProfileLanguage(getProfileLang(), { refreshAlippe: true });

    observer = new MutationObserver(() => {
      if (isApplyingLanguage) return;
      window.requestAnimationFrame(() => applyProfileLanguage(getProfileLang()));
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  });
})();
