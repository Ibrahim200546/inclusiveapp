import { useOutletContext } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Target, TrendingUp, CheckCircle2, Star } from "lucide-react"
import type { Locale } from "@/lib/translations"

function ResultsContent({ locale }: { locale: Locale }) {
  const content = {
    kk: {
      title: "Күтілетін нәтижелер",
      subtitle: "Оқу барысында қалыптасатын дағдылар мен қабілеттер",
      skillsTitle: "Қалыптасатын дағдылар",
      skillsDesc: "Курс соңында оқушылар келесі дағдыларды меңгереді:",
      skills: [
        {
          category: "Естуді қабылдау",
          items: [
            "Сөйлеу мен сөйлеу емес дыбыстарды ажырату",
            "Дыбыстардың қатты-тыныштығын және ұзақтығын анықтау",
            "Дыбыс бағытын анықтау",
            "Буындар, сөздер және сөйлемдерді тану",
            "Байланыстырылған сөйлеуді түсіну",
          ],
        },
        {
          category: "Айту",
          items: [
            "Барлық дауысты және дауыссыз дыбыстарды дұрыс айту",
            "Буындар мен сөздерді айқын айту",
            "Сөйлемдерде екпінді дұрыс қою",
            "Интонацияны қолдану",
            "Байланыстырылған сөйлеуде дыбыстарды автоматтандыру",
          ],
        },
        {
          category: "Коммуникация",
          items: [
            "Диалогқа белсенді қатысу",
            "Сұрақтарға жауап беру",
            "Ойларын байланыстырып айту",
            "Қысқа мәтіндерді қайта айту",
            "Оқу және тұрмыстық жағдайларда сөйлеуді пайдалану",
          ],
        },
      ],
      criteriaTitle: "Бағалау критерийлері",
      criteriaDesc: "Жетістіктерді бағалау келесі критерийлер бойынша жүргізіледі:",
      criteria: [
        "Дыбыстарды тану және қайталау дәлдігі",
        "Айтудың айқындығы мен дұрыстығы",
        "Сөйлемдерді түсіну деңгейі",
        "Байланыстырылған сөйлеуді пайдалану қабілеті",
        "Білім мен дағдыларды өмірде қолдану",
      ],
      stagesTitle: "Кезеңдер бойынша нәтижелер",
      stages: [
        { name: "Дайындық сыныбы", result: "Дыбысқа реакция, қарапайым шуларды ажырату, жекелеген дыбыстарды қайталау" },
        { name: "1-сынып", result: "Қарапайым дыбыстар мен сөздерді дұрыс айту, сөйлеуді естумен ажырату" },
        { name: "2-сынып", result: "Сөздерді сенімді айту, қысқа нұсқаулар мен сөйлемдерді түсіну" },
        { name: "3-сынып", result: "Айқын сөйлеу, диалогқа қатысу, ауызша сөйлеуді саналы пайдалану" },
        { name: "4-сынып", result: "Ауызша сөйлеуді еркін пайдалану, қаратылған сөйлеуді түсіну, ойларын білдіру" },
      ],
      finalTitle: "Курс бойынша қорытынды нәтиже",
      finalDesc: "Оқыту аяқталғанда:",
      finalItems: [
        "Естуді қабылдау қалыптасқан және дамыған",
        "Барлық дыбыстардың айтылуы қойылған және автоматтандырылған",
        "Байланыстырылған ауызша сөйлеу дамыған",
        "Коммуникативтік дағдылар қалыптасқан",
        "Әрі қарай оқуға толық дайындық қамтамасыз етілген",
      ],
    },
    ru: {
      title: "Ожидаемые результаты",
      subtitle: "Навыки и способности, формируемые в процессе обучения",
      skillsTitle: "Формируемые навыки",
      skillsDesc: "По окончании курса обучающиеся приобретают следующие навыки:",
      skills: [
        {
          category: "Слуховое восприятие",
          items: [
            "Различение речевых и неречевых звуков",
            "Определение громкости и длительности звуков",
            "Определение направления звука",
            "Распознавание слогов, слов и предложений",
            "Понимание связной речи",
          ],
        },
        {
          category: "Произношение",
          items: [
            "Правильное произношение всех гласных и согласных звуков",
            "Четкое произношение слогов и слов",
            "Правильная постановка ударения в словах",
            "Использование интонации",
            "Автоматизация звуков в связной речи",
          ],
        },
        {
          category: "Коммуникация",
          items: [
            "Активное участие в диалоге",
            "Ответы на вопросы",
            "Связное изложение мыслей",
            "Пересказ коротких текстов",
            "Использование речи в учебных и бытовых ситуациях",
          ],
        },
      ],
      criteriaTitle: "Критерии оценки",
      criteriaDesc: "Оценка достижений проводится по следующим критериям:",
      criteria: [
        "Точность распознавания и воспроизведения звуков",
        "Четкость и правильность произношения",
        "Уровень понимания речи",
        "Способность использовать связную речь",
        "Применение знаний и навыков в жизни",
      ],
      stagesTitle: "Результаты по этапам обучения",
      stages: [
        { name: "Подготовительный класс", result: "Реакция на звук, различение простых шумов, воспроизведение отдельных звуков" },
        { name: "1 класс", result: "Правильное произношение простых звуков и слов, различение речи на слух" },
        { name: "2 класс", result: "Уверенное произношение слов, понимание коротких инструкций и фраз" },
        { name: "3 класс", result: "Четкая речь, участие в диалоге, осознанное использование устной речи" },
        { name: "4 класс", result: "Свободное использование устной речи, понимание обращенной речи, выражение мыслей" },
      ],
      finalTitle: "Итоговый результат по курсу",
      finalDesc: "К концу обучения:",
      finalItems: [
        "Сформировано и развито слуховое восприятие",
        "Поставлено и автоматизировано произношение всех звуков",
        "Развита связная устная речь",
        "Сформированы коммуникативные навыки",
        "Обеспечена полная готовность к дальнейшему обучению",
      ],
    },
  }

  const t = content[locale]

  return (
    <div className="container mx-auto px-4 py-12 md:py-20">
      <div className="max-w-5xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-balance">{t.title}</h1>
          <p className="text-xl text-muted-foreground text-pretty">{t.subtitle}</p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-3">
                <Star className="size-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">{t.skillsTitle}</CardTitle>
            </div>
            <p className="text-muted-foreground mt-2">{t.skillsDesc}</p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              {t.skills.map((skill, index) => (
                <div key={index} className="p-4 rounded-lg border bg-card">
                  <h3 className="font-semibold text-lg mb-3 pb-2 border-b">{skill.category}</h3>
                  <ul className="space-y-2">
                    {skill.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="size-4 text-accent shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-accent/10 p-3">
                <Target className="size-6 text-accent" />
              </div>
              <CardTitle className="text-2xl">{t.criteriaTitle}</CardTitle>
            </div>
            <p className="text-muted-foreground mt-2">{t.criteriaDesc}</p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {t.criteria.map((criterion, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground text-sm font-semibold">
                    {index + 1}
                  </span>
                  <span className="text-muted-foreground leading-relaxed">{criterion}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-3">
                <TrendingUp className="size-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">{t.stagesTitle}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {t.stages.map((stage, index) => (
                <div key={index} className="flex gap-4 p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                    {index === 0 ? "0" : index}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{stage.name}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{stage.result}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-accent/10 p-3">
                <Trophy className="size-6 text-accent" />
              </div>
              <CardTitle className="text-2xl">{t.finalTitle}</CardTitle>
            </div>
            <p className="text-muted-foreground mt-2">{t.finalDesc}</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {t.finalItems.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-foreground leading-relaxed font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ResultsPage() {
  const { locale } = useOutletContext<{ locale: Locale }>()
  return <ResultsContent locale={locale} />
}
