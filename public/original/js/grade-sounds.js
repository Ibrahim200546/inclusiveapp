(function () {
  'use strict';
  // Each row adds a source to this grade and every later grade.
  // [first grade, stable ID, Kazakh label, Russian label, pictogram, local recording]
  const categories = {
    instruments: {
      labels: ["Музыкалық аспаптар", "Музыкальные инструменты"], icon: "🎺", screen: "g0Task3",
      sounds: [
        [0, "dombra", "Домбыра", "Домбра", "🪕", "sounds/instruments/dombra.mp3"],
        [0, "guitar", "Гитара", "Гитара", "🎸", "sounds/instruments/guitar.mp3"],
        [1, "drum", "Барабан", "Барабан", "🥁", "sounds/instruments/drum.mp3"],
        [2, "asatayak", "Асатаяқ", "Асатаяк", "🪇", "sounds/instruments/asatayak.mp3"],
        [2, "sazsyrnai", "Сазсырнай", "Сазсырнай", "🪈", "sounds/instruments/sazsyrnai.mp3"],
        [2, "violin", "Скрипка", "Скрипка", "🎻", "sounds/instruments/violin.mp3"],
        [3, "sybyzgy", "Сыбызғы", "Сыбызгы", "🪈", "sounds/instruments/sybyzgy.mp3"],
        [3, "trumpet", "Керней", "Труба", "🎺", "sounds/instruments/trumpet.mp3"],
        [4, "kobyz", "Қобыз", "Кобыз", "🎻", "sounds/instruments/kobyz.mp3"],
        [4, "zhetigen", "Жетіген", "Жетыген", "🎶", "sounds/instruments/zhetigen.mp3"],
      ],
    },
    animals: {
      labels: ["Үй жануарлар", "Домашние животные"], icon: "🐮", screen: "g0Task4",
      sounds: [
        [0, "dog", "Ит", "Собака", "🐕", "sounds/animals/dog.mp3"],
        [0, "cat", "Мысық", "Кошка", "🐈", "sounds/animals/cat.mp3"],
        [1, "cow", "Сиыр", "Корова", "🐮", "sounds/animals/cow.mp3"],
        [2, "horse", "Жылқы", "Лошадь", "🐴", "sounds/animals/horse.mp3"],
        [2, "sheep", "Қой", "Овца", "🐑", "sounds/animals/sheep.mp3"],
        [2, "parrot", "Тотықұс", "Попугай", "🦜", "sounds/animals/parrot.mp3"],
        [3, "rooster", "Әтеш", "Петух", "🐓", "sounds/animals/rooster.mp3"],
        [3, "duck", "Үйрек", "Утка", "🦆", "sounds/animals/duck.mp3"],
        [3, "goose", "Қаз", "Гусь", "🪿", "sounds/animals/goose.mp3"],
        [4, "goat", "Ешкі", "Коза", "🐐", "sounds/animals/goat.mp3"],
      ],
    },
    wild: {
      labels: ["Жабайы жануарлар", "Дикие животные"], icon: "🦁", screen: "g0TaskWild",
      sounds: [
        [0, "bear", "Аю", "Медведь", "🐻", "sounds/wild_animals/bear.mp3"],
        [0, "wolf", "Қасқыр", "Волк", "🐺", "sounds/wild_animals/wolf.mp3"],
        [1, "lion", "Арыстан", "Лев", "🦁", "sounds/wild_animals/lion.mp3"],
        [2, "fox", "Түлкі", "Лиса", "🦊", "sounds/wild/fox.mp3"],
        [2, "hedgehog", "Кірпі", "Ёж", "🦔", "sounds/wild/hedgehog.mp3"],
        [2, "squirrel", "Тиін", "Белка", "🐿️", "sounds/wild/squirrel.mp3"],
        [3, "eagle", "Бүркіт", "Орёл", "🦅", "sounds/wild/eagle.mp3"],
        [3, "owl", "Үкі", "Сова", "🦉", "sounds/wild/owl.mp3"],
        [3, "cuckoo", "Көкек", "Кукушка", "🐦", "sounds/wild/cuckoo.mp3"],
        [4, "elephant", "Піл", "Слон", "🐘", "sounds/wild_animals/elephant.mp3"],
        [4, "tiger", "Жолбарыс", "Тигр", "🐅", "sounds/wild/tiger.mp3"],
        [4, "crocodile", "Қолтырауын", "Крокодил", "🐊", "sounds/wild/crocodile.mp3"],
      ],
    },
    nature: {
      labels: ["Табиғат дыбыстары", "Звуки природы"], icon: "🌳", screen: "g0Task6",
      sounds: [
        [0, "bird", "Құс", "Птица", "🐦", "sounds/nature/bird.mp3"],
        [0, "water", "Су", "Вода", "💧", "sounds/nature/water.mp3"],
        [1, "wind", "Жел", "Ветер", "💨", "sounds/nature/wind.mp3"],
        [2, "rain", "Жаңбыр", "Дождь", "🌧️", "sounds/nature/rain.mp3"],
        [2, "thunder", "Күн күркіреуі", "Гром", "⚡", "sounds/nature/thunder.mp3"],
        [2, "storm", "Дауыл", "Буря", "🌪️", "sounds/nature/storm.mp3"],
        [3, "fire", "Алау", "Костёр", "🔥", "sounds/nature/fire.mp3"],
        [3, "leaves", "Жапырақ", "Листья", "🍂", "sounds/nature/leaves.mp3"],
        [3, "snow", "Қар", "Снег", "❄️", "sounds/nature/snow.mp3"],
        [4, "waterfall", "Сарқырама", "Водопад", "🌊", "sounds/nature/waterfall.mp3"],
        [4, "volcano", "Жанартау", "Вулкан", "🌋", "sounds/nature/volcano.mp3"],
        [4, "avalanche", "Қар көшкіні", "Лавина", "🏔️", "sounds/nature/avalanche.mp3"],
      ],
    },
    transport: {
      labels: ["Көлік дыбыстары", "Звуки транспорта"], icon: "🚗", screen: "g0Task8",
      sounds: [
        [0, "car", "Жеңіл көлік", "Легковая машина", "🚗", "sounds/transport/car.mp3"],
        [0, "motorcycle", "Мотоцикл", "Мотоцикл", "🏍️", "sounds/transport/motorcycle.mp3"],
        [1, "bus", "Автобус", "Автобус", "🚌", "sounds/transport/bus.mp3"],
        [2, "train", "Пойыз", "Поезд", "🚂", "sounds/transport/train.mp3"],
        [2, "tractor", "Трактор", "Трактор", "🚜", "sounds/technical/tractor.mp3"],
        [2, "fire-engine", "Өрт сөндіру көлігі", "Пожарная машина", "🚒", "sounds/transport/fire-engine.mp3"],
        [3, "plane", "Ұшақ", "Самолёт", "✈️", "sounds/transport/plane.mp3"],
        [3, "helicopter", "Тікұшақ", "Вертолёт", "🚁", "sounds/transport/helicopter.mp3"],
        [3, "ship", "Кеме", "Корабль", "🚢", "sounds/transport/ship.mp3"],
        [4, "truck", "Жүк көлігі", "Грузовик", "🚛", "sounds/transport/truck.mp3"],
        [4, "metro", "Метро", "Метро", "🚇", "sounds/transport/metro.mp3"],
        [4, "rocket", "Зымыран", "Ракета", "🚀", "sounds/transport/rocket.mp3"],
      ],
    },
    household: {
      labels: ["Тұрмыстық дыбыстар", "Бытовые звуки"], icon: "🏠", screen: "g0Task9",
      sounds: [
        [0, "clock", "Сағат", "Часы", "⏰", "sounds/Household sounds/clock.mp3"],
        [0, "phone", "Телефон", "Телефон", "📱", "sounds/Household sounds/phone.mp3"],
        [1, "doorbell", "Есік қоңырауы", "Дверной звонок", "🔔", "sounds/Household sounds/doorbell.mp3"],
        [2, "schoolbell", "Мектеп қоңырауы", "Школьный звонок", "🏫", "sounds/Household sounds/school_bell.mp3"],
        [2, "bike", "Велосипед", "Велосипед", "🚲", "sounds/Household sounds/bike.mp3"],
        [2, "vacuum", "Шаңсорғыш", "Пылесос", "🧹", "sounds/appliances/vacuum.mp3"],
        [2, "washer", "Кір жуғыш машина", "Стиральная машина", "🧺", "sounds/appliances/washing_machine.mp3"],
        [2, "dryer", "Шаш кептіргіш", "Фен", "💨", "sounds/appliances/hair_dryer.mp3"],
        [3, "fridge", "Тоңазытқыш", "Холодильник", "❄️", "sounds/appliances/fridge.mp3"],
        [4, "saw", "Ара", "Пила", "🪚", "sounds/technical/saw.mp3"],
        [4, "sewing", "Тігін машинасы", "Швейная машина", "🧵", "sounds/technical/sewing_machine.mp3"],
        [4, "drill", "Бұрғы", "Дрель", "🛠️", "sounds/household/drill.mp3"],
      ],
    },
    technical: {
      labels: ["Техникалық дыбыстар", "Технические звуки"], icon: "⚙️", screen: "g0TaskTech2",
      sounds: [
        [0, "water-pistol", "Су тапаншасы", "Водяной пистолет", "💦", "sounds/technical/water-pistol.mp3"],
        [0, "bow", "Садақ", "Лук", "🏹", "sounds/technical/bow.mp3"],
        [1, "swords", "Қылыштар", "Мечи", "⚔️", "sounds/technical/swords.mp3"],
        [2, "cracker", "Шартылдақ", "Хлопушка", "🎉", "sounds/technical/cracker.mp3"],
        [2, "fireworks", "Отшашу", "Салют", "🎆", "sounds/technical/fireworks.mp3"],
        [2, "balloon", "Жарылған шар", "Лопнувший шар", "🎈", "sounds/technical/balloon.mp3"],
        [3, "catapult", "Тасатқыш", "Катапульта", "🏰", "sounds/technical/catapult.mp3"],
        [4, "laser", "Лазер", "Лазер", "🕹️", "sounds/technical/laser.mp3"],
        [4, "crossbow", "Арбалет", "Арбалет", "🏹", "sounds/technical/crossbow.mp3"],
      ],
    },
    emotion: {
      labels: ["Адам эмоциясы", "Эмоции человека"], icon: "😊", screen: "g0TaskEmotion",
      sounds: [
        [0, "laugh", "Күлкі", "Смех", "😂", "sounds/human/laugh.mp3"],
        [0, "cry", "Жылау", "Плач", "😢", "sounds/human/cry.mp3"],
        [1, "sneeze", "Түшкіру", "Чихание", "🤧", "sounds/human/sneeze.mp3"],
        [2, "cough", "Жөтел", "Кашель", "😷", "sounds/human/cough.mp3"],
      ],
    },
  };

  const objectives = {
    instruments: [['0.1.1.6'], ['1.1.1.1', '1.1.1.7'], ['2.1.1.18'], ['3.1.1.18'], ['4.1.1.18']],
    animals: [['0.1.1.5']], wild: [[], ['1.1.1.9']],
    nature: [['0.1.1.12'], ['1.1.1.12'], ['2.1.1.6'], ['3.1.1.5']],
    household: [[], ['1.1.1.5', '1.1.1.8'], ['2.1.1.5'], ['3.1.1.17']],
    transport: [[], [], ['2.1.1.13']], emotion: [['0.1.1.9']],
  };
  function stages(grade, category) {
    if (grade === 2 && category === 'instruments') return ['start', 'extended'];
    if (grade === 4 && category === 'technical') return ['standard', 'vehicles'];
    return ['standard'];
  }
  function profile(grade, category, stage = stages(grade, category)[0]) {
    if (!Number.isInteger(grade) || grade < 0 || grade > 4 || !Object.hasOwn(categories, category) || !stages(grade, category).includes(stage)) throw new Error('Unknown sound profile');
    let rows = categories[category].sounds.filter(([firstGrade]) => firstGrade <= grade);
    let codes = objectives[category]?.[grade] || [];
    if (stage === 'start') { rows = rows.slice(0, 4); codes = ['2.1.1.1']; }
    if (stage === 'vehicles') {
      rows = categories.transport.sounds.filter(([, id]) => ['car', 'truck', 'tractor'].includes(id));
      codes = ['4.1.1.17'];
    }
    const items = rows.map(([, id, kk, ru, icon, audio]) => ({ id, answer: id, kk, ru, icon, audio }));
    return { grade, table: 5 + 2 * grade, exerciseId: 'recognition', category, stage, objectiveCodes: codes, items };
  }
  function options(items, target) {
    const distractors = window.CorexLearning.shuffle(items.filter(item => item.id !== target.id)).slice(0, 2);
    return window.CorexLearning.shuffle([target, ...distractors]);
  }
  window.CorexGradeSounds = { categories, stages, profile, options };
})();
