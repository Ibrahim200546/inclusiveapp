import LandingLayout from "@/components/landing/LandingLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Headphones, Mic, FileText, Music } from "lucide-react"
import type { Locale } from "@/lib/translations"

function MaterialsContent({ locale }: { locale: Locale }) {
  const content = {
    kk: {
      title: "Оқу материалдары",
      subtitle: "Мұғалімдер мен оқушыларға арналған жаттығулар мен ресурстар",
      hearingTitle: "Естуді дамыту жаттығулары",
      hearingDesc: "Естуді қабылдау мен ажырату дағдыларын дамытуға арналған материалдар",
      hearingItems: [
        "Сөйлеу емес дыбыстарды тану",
        "Қатты/тыныш дыбыстарды ажырату",
        "Ұзын/қысқа дыбыстарды ажырату",
        "Дыбыс бағытын анықтау",
        "Буындар мен сөздерді тану",
      ],
      articulationTitle: "Артикуляциялық жаттығулар",
      articulationDesc: "Сөйлеу аппаратын дайындау және дыбыстарды қою",
      articulationItems: [
        "Тыныс алу жаттығулары",
        "Тіл, ерін, жақтарға арналған жаттығулар",
        "Дауысты дыбыстарды қою",
        "Дауыссыз дыбыстарды қою",
        "Дыбыстарды автоматтандыру",
      ],
      tasksTitle: "Тапсырмалар мысалдары",
      tasksDesc: "Әр сынып үшін практикалық тапсырмалар",
      tasksItems: [
        "Сөздерді қайталау жаттығулары",
        "Сөйлемдерді құрастыру",
        "Диалогтар мен рөлдік ойындар",
        "Қысқа мәтіндерді қайта айту",
        "Әндер мен өлеңдер",
      ],
      audioTitle: "Аудио материалдар",
      audioDesc: "Дыбыстар, сөздер және жаттығулар үшін аудио жазбалар",
      audioItems: [
        "Жекелеген дыбыстар",
        "Буындар мен сөздер",
        "Сөз тіркестері",
        "Сөйлемдер мен диалогтар",
        "Қысқа әңгімелер",
      ],
      note: "Ескерту: Аудио материалдар курстың толық нұсқасында қолжетімді болады",
    },
    ru: {
      title: "Учебные материалы",
      subtitle: "Упражнения и ресурсы для преподавателей и обучающихся",
      hearingTitle: "Упражнения по развитию слуха",
      hearingDesc: "Материалы для развития навыков слухового восприятия и различения",
      hearingItems: [
        "Распознавание неречевых звуков",
        "Различение громких/тихих звуков",
        "Различение длинных/коротких звуков",
        "Определение направления звука",
        "Распознавание слогов и слов",
      ],
      articulationTitle: "Артикуляционные упражнения",
      articulationDesc: "Подготовка речевого аппарата и постановка звуков",
      articulationItems: [
        "Дыхательные упражнения",
        "Упражнения для языка, губ, челюсти",
        "Постановка гласных звуков",
        "Постановка согласных звуков",
        "Автоматизация звуков",
      ],
      tasksTitle: "Примеры заданий",
      tasksDesc: "Практические задания для каждого класса",
      tasksItems: [
        "Упражнения на повторение слов",
        "Составление предложений",
        "Диалоги и ролевые игры",
        "Пересказ коротких текстов",
        "Песни и стихотворения",
      ],
      audioTitle: "Аудиоматериалы",
      audioDesc: "Аудиозаписи звуков, слов и упражнений",
      audioItems: ["Отдельные звуки", "Слоги и слова", "Словосочетания", "Предложения и диалоги", "Короткие рассказы"],
      note: "Примечание: Аудиоматериалы будут доступны в полной версии курса",
    },
  }

  const t = content[locale]

  const materials = [
    {
      icon: Headphones,
      title: t.hearingTitle,
      description: t.hearingDesc,
      items: t.hearingItems,
      color: "primary" as const,
    },
    {
      icon: Mic,
      title: t.articulationTitle,
      description: t.articulationDesc,
      items: t.articulationItems,
      color: "accent" as const,
    },
    {
      icon: FileText,
      title: t.tasksTitle,
      description: t.tasksDesc,
      items: t.tasksItems,
      color: "primary" as const,
    },
    {
      icon: Music,
      title: t.audioTitle,
      description: t.audioDesc,
      items: t.audioItems,
      color: "accent" as const,
    },
  ]

  return (
    <div className="container mx-auto px-4 py-12 md:py-20">
      <div className="max-w-5xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-balance">{t.title}</h1>
          <p className="text-xl text-muted-foreground text-pretty">{t.subtitle}</p>
        </div>

        <div className="grid gap-8">
          {materials.map((material, index) => {
            const Icon = material.icon
            return (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div
                      className={`rounded-full ${material.color === "primary" ? "bg-primary/10" : "bg-accent/10"} p-3 shrink-0`}
                    >
                      <Icon className={`size-6 ${material.color === "primary" ? "text-primary" : "text-accent"}`} />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-2xl mb-2">{material.title}</CardTitle>
                      <CardDescription className="text-base">{material.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {material.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span
                          className={`inline-block size-1.5 rounded-full ${material.color === "primary" ? "bg-primary" : "bg-accent"} mt-1.5 shrink-0`}
                        />
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Card className="mt-8 bg-muted/50 border-dashed">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center leading-relaxed">{t.note}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function MaterialsPage() {
  return (
    <LandingLayout>
      {(locale) => <MaterialsContent locale={locale} />}
    </LandingLayout>
  )
}
