import LandingLayout from "@/components/landing/LandingLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Target, Users, BookOpen, TrendingUp } from "lucide-react"
import type { Locale } from "@/lib/translations"

function AboutContent({ locale }: { locale: Locale }) {
  const content = {
    kk: {
      title: "Курс туралы",
      subtitle: "Білім беру курсының мақсаты мен міндеттері",
      purposeTitle: "Курстың мақсаты",
      purpose:
        "Бұл курс балалардың естуді қабылдауын дамытуға және дұрыс айту дағдыларын қалыптастыруға бағытталған. Курс мұғалімдерге оқу процесін тиімді ұйымдастыруға және оқушылардың жеке қажеттіліктерін ескеруге көмектеседі.",
      audienceTitle: "Мақсатты аудитория",
      teachers: "Мұғалімдер",
      teachersDesc: "Сабаққа дайындалу және оқу процесін ұйымдастыру үшін негізгі аудитория",
      students: "Оқушылар",
      studentsDesc: "Өз бетінше жұмыс істеу және дағдыларды бекіту үшін қосымша ресурстар",
      parents: "Ата-аналар",
      parentsDesc: "Бағдарламамен танысу және баланың жетістіктерін қадағалау",
      structureTitle: "Курстың құрылымы",
      section1: "Естуді дамыту",
      section1Desc: "Естуді қабылдау және ажырату дағдыларын қалыптастыру",
      section2: "Дыбыстану",
      section2Desc: "Дыбыстарды қою, автоматтандыру және дұрыс айту",
    },
    ru: {
      title: "О курсе",
      subtitle: "Назначение и задачи образовательного курса",
      purposeTitle: "Назначение курса",
      purpose:
        "Данный курс направлен на развитие слухового восприятия детей и формирование правильных произносительных навыков. Курс помогает преподавателям эффективно организовать учебный процесс и учитывать индивидуальные потребности обучающихся.",
      audienceTitle: "Целевая аудитория",
      teachers: "Преподаватели",
      teachersDesc: "Основная аудитория для подготовки к занятиям и организации учебного процесса",
      students: "Обучающиеся",
      studentsDesc: "Дополнительные ресурсы для самостоятельной работы и закрепления навыков",
      parents: "Родители",
      parentsDesc: "Ознакомление с программой и отслеживание достижений ребенка",
      structureTitle: "Структура курса",
      section1: "Развитие слуха",
      section1Desc: "Формирование навыков слухового восприятия и различения",
      section2: "Дыбыстану (Произношение)",
      section2Desc: "Постановка, автоматизация звуков и правильное произношение",
    },
  }

  const t = content[locale]

  return (
    <div className="container mx-auto px-4 py-12 md:py-20">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-balance">{t.title}</h1>
          <p className="text-xl text-muted-foreground text-pretty">{t.subtitle}</p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-3">
                <Target className="size-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">{t.purposeTitle}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed text-lg">{t.purpose}</p>
          </CardContent>
        </Card>

        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <Users className="size-6 text-primary" />
            {t.audienceTitle}
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t.teachers}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{t.teachersDesc}</p>
                <div className="mt-3 inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                  {locale === "kk" ? "Негізгі" : "Основная"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t.students}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{t.studentsDesc}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t.parents}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{t.parentsDesc}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-accent/10 p-3">
                <BookOpen className="size-6 text-accent" />
              </div>
              <CardTitle className="text-2xl">{t.structureTitle}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4 p-4 rounded-lg bg-muted/50">
                <TrendingUp className="size-5 text-primary shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">{t.section1}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t.section1Desc}</p>
                </div>
              </div>
              <div className="flex gap-4 p-4 rounded-lg bg-muted/50">
                <TrendingUp className="size-5 text-accent shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">{t.section2}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t.section2Desc}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function AboutPage() {
  return (
    <LandingLayout>
      {(locale) => <AboutContent locale={locale} />}
    </LandingLayout>
  )
}
