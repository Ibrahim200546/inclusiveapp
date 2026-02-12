export type Locale = "kk" | "ru"

export const translations = {
  kk: {
    // Navigation
    home: "Басты бет",
    about: "Курс туралы",
    program: "Бағдарлама",
    materials: "Оқу материалдары",
    methodology: "Әдістеме",
    results: "Күтілетін нәтижелер",
    contact: "Байланыс",
    practice: "Жаттығулар",
    dashboard: "Менің прогресім",
    login: "Кіру",
    logout: "Шығу",

    // Course Info
    courseName: "Дыбыстардың айтылуын қалыптастыру және есту қабілетін дамыту",
    courseDescription:
      "Есту қабілетін дамыту және дұрыс айту дағдыларын қалыптастыру бойынша оқу процесін қолдауға арналған ақпараттық-білім беру ресурсы",

    // Common
    learnMore: "Толығырақ",
    selectLanguage: "Тілді таңдау",
    forTeachers: "Мұғалімдерге",
    forStudents: "Оқушыларға",
    forParents: "Ата-аналарға",

    // Classes
    preparatoryClass: "Дайындық сыныбы",
    class1: "1-сынып",
    class2: "2-сынып",
    class3: "3-сынып",
    class4: "4-сынып",

    // Headings
    goals: "Мақсаттар",
    objectives: "Міндеттер",
    content: "Мазмұны",
    expectedResults: "Күтілетін нәтижелер",
    learningStages: "Оқыту кезеңдері",
    mainTopics: "Негізгі тақырыптар",

    startPractice: "Жаттығуды бастау",
    selectClass: "Сыныпты таңдаңыз",
    exerciseTypes: "Жаттығу түрлері",
    pronunciation: "Айту",
    listening: "Тыңдау",
    articulation: "Артикуляция",
    allExercises: "Барлық жаттығулар",
    difficulty: "Қиындық",
    completed: "Аяқталды",
    notStarted: "Басталмаған",
  },
  ru: {
    // Navigation
    home: "Главная",
    about: "О курсе",
    program: "Программа",
    materials: "Учебные материалы",
    methodology: "Методика",
    results: "Ожидаемые результаты",
    contact: "Контакты",
    practice: "Упражнения",
    dashboard: "Мой прогресс",
    login: "Вход",
    logout: "Выход",

    // Course Info
    courseName: "Формирование произношения и развитие слухового восприятия",
    courseDescription:
      "Информационно-образовательный ресурс для поддержки учебного процесса по развитию слуха и формированию правильного произношения",

    // Common
    learnMore: "Узнать больше",
    selectLanguage: "Выбрать язык",
    forTeachers: "Для преподавателей",
    forStudents: "Для обучающихся",
    forParents: "Для родителей",

    // Classes
    preparatoryClass: "Подготовительный класс",
    class1: "1 класс",
    class2: "2 класс",
    class3: "3 класс",
    class4: "4 класс",

    // Headings
    goals: "Цели",
    objectives: "Задачи",
    content: "Содержание обучения",
    expectedResults: "Ожидаемые результаты",
    learningStages: "Этапы обучения",
    mainTopics: "Основные темы",

    startPractice: "Начать упражнение",
    selectClass: "Выберите класс",
    exerciseTypes: "Типы упражнений",
    pronunciation: "Произношение",
    listening: "Слушание",
    articulation: "Артикуляция",
    allExercises: "Все упражнения",
    difficulty: "Сложность",
    completed: "Выполнено",
    notStarted: "Не начато",
  },
}

export function getTranslation(locale: Locale, key: keyof typeof translations.kk): string {
  return translations[locale][key] || key
}
