import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2 } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"

interface CourseOverviewProps {
  locale: "kk" | "ru"
}

export function CourseOverview({ locale }: CourseOverviewProps) {
  const stages = [
    {
      name: locale === "kk" ? "Дайындық сыныбы" : "Подготовительный класс",
      goal: locale === "kk" ? "Алғашқы есту реакцияларын қалыптастыру" : "Формирование первичных слуховых реакций",
    },
    {
      name: locale === "kk" ? "1-сынып" : "1 класс",
      goal:
        locale === "kk"
          ? "Негізгі дауысты және қарапайым дауыссыз дыбыстарды қою"
          : "Постановка основных гласных и простых согласных",
    },
    {
      name: locale === "kk" ? "2-сынып" : "2 класс",
      goal:
        locale === "kk" ? "Айту дағдыларын бекіту және кеңейту" : "Закрепление и расширение произносительных навыков",
    },
    {
      name: locale === "kk" ? "3-сынып" : "3 класс",
      goal: locale === "kk" ? "Байланыстырылған сөйлеуді дамыту" : "Развитие связной речи",
    },
    {
      name: locale === "kk" ? "4-сынып" : "4 класс",
      goal:
        locale === "kk"
          ? "Айтуды автоматтандыру және коммуникативтік сөйлеуді дамыту"
          : "Автоматизация произношения и развитие коммуникативной речи",
    },
  ]

  const finalResults =
    locale === "kk"
      ? [
        "Естуді қабылдау қалыптасқан",
        "Айту қойылған және автоматтандырылған",
        "Байланыстырылған ауызша сөйлеу дамыған",
        "Әрі қарай оқуға дайындық қамтамасыз етілген",
      ]
      : [
        "Сформировано слуховое восприятие",
        "Поставлено и автоматизировано произношение",
        "Развита связная устная речь",
        "Обеспечена готовность к дальнейшему обучению",
      ]

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {locale === "kk" ? "Курстың құрылымы" : "Структура курса"}
          </h2>
          <p className="text-muted-foreground text-lg text-pretty max-w-2xl mx-auto">
            {locale === "kk"
              ? "Оқыту 5 кезеңнен тұрады, әр кезең белгілі бір дағдыларды қалыптастыруға бағытталған"
              : "Обучение состоит из 5 этапов, каждый из которых направлен на формирование определенных навыков"}
          </p>
        </div>

        <div className="max-w-4xl mx-auto mb-16">
          <div className="space-y-4">
            {stages.map((stage, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                      {index === 0 ? "0" : index}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="mb-1">{stage.name}</CardTitle>
                      <CardDescription className="text-base">{stage.goal}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        <Card className="max-w-4xl mx-auto bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl">{locale === "kk" ? "Курс бойынша қорытынды" : "Итог по курсу"}</CardTitle>
            <CardDescription>{locale === "kk" ? "Оқыту соңында:" : "К концу обучения:"}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {finalResults.map((result, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-accent shrink-0 mt-0.5" />
                  <span className="text-foreground leading-relaxed">{result}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 pt-6 border-t">
              <Button asChild>
                <Link to="/program">
                  {locale === "kk" ? "Толық бағдарламаны көру" : "Посмотреть полную программу"}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
