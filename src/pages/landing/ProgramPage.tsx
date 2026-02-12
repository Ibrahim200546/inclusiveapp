import LandingLayout from "@/components/landing/LandingLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { courseData, type ClassLevel } from "@/lib/course-data"
import { CheckCircle2, Target, BookText, Award } from "lucide-react"
import type { Locale } from "@/lib/translations"

function ProgramContent({ locale }: { locale: Locale }) {
  const classes: ClassLevel[] = ["preparatory", "class1", "class2", "class3", "class4"]

  const tabLabels = {
    kk: ["Дайындық", "1-сынып", "2-сынып", "3-сынып", "4-сынып"],
    ru: ["Подготовительный", "1 класс", "2 класс", "3 класс", "4 класс"],
  }

  return (
    <div className="container mx-auto px-4 py-12 md:py-20">
      <div className="max-w-5xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-balance">
            {locale === "kk" ? "Курс бағдарламасы" : "Программа курса"}
          </h1>
          <p className="text-xl text-muted-foreground text-pretty">
            {locale === "kk"
              ? "Әр сынып үшін егжей-тегжейлі оқу жоспары мен күтілетін нәтижелер"
              : "Подробный учебный план и ожидаемые результаты для каждого класса"}
          </p>
        </div>

        <Tabs defaultValue="preparatory" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8">
            {classes.map((classLevel, index) => (
              <TabsTrigger key={classLevel} value={classLevel} className="text-xs sm:text-sm">
                {tabLabels[locale][index]}
              </TabsTrigger>
            ))}
          </TabsList>

          {classes.map((classLevel) => {
            const data = courseData[classLevel][locale]
            return (
              <TabsContent key={classLevel} value={classLevel} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl md:text-3xl">{data.name}</CardTitle>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="rounded-full bg-primary/10 p-2">
                        <Target className="size-5 text-primary" />
                      </div>
                      <CardTitle>{locale === "kk" ? "Мақсат" : "Цель"}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed text-lg">{data.goal}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="rounded-full bg-accent/10 p-2">
                        <BookText className="size-5 text-accent" />
                      </div>
                      <CardTitle>{locale === "kk" ? "Оқыту мазмұны" : "Содержание обучения"}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {data.content.map((item, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <CheckCircle2 className="size-5 text-primary shrink-0 mt-0.5" />
                          <span className="text-muted-foreground leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="rounded-full bg-accent/10 p-2">
                        <Award className="size-5 text-accent" />
                      </div>
                      <CardTitle>{locale === "kk" ? "Күтілетін нәтиже" : "Ожидаемый результат"}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground leading-relaxed text-lg">{data.result}</p>
                  </CardContent>
                </Card>
              </TabsContent>
            )
          })}
        </Tabs>
      </div>
    </div>
  )
}

export default function ProgramPage() {
  return (
    <LandingLayout>
      {(locale) => <ProgramContent locale={locale} />}
    </LandingLayout>
  )
}
