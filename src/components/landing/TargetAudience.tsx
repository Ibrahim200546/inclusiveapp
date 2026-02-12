import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, GraduationCap, Heart } from "lucide-react"

interface TargetAudienceProps {
  locale: "kk" | "ru"
}

export function TargetAudience({ locale }: TargetAudienceProps) {
  const audiences = [
    {
      icon: GraduationCap,
      title: locale === "kk" ? "Мұғалімдерге" : "Для преподавателей",
      description:
        locale === "kk"
          ? "Сабаққа дайындалуға және оқу процесін ұйымдастыруға көмек"
          : "Помощь в подготовке к занятиям и организации учебного процесса",
      isPrimary: true,
    },
    {
      icon: Users,
      title: locale === "kk" ? "Оқушыларға" : "Для обучающихся",
      description:
        locale === "kk"
          ? "Өз бетінше жұмыс істеуге және дағдыларды бекітуге ресурстар"
          : "Ресурсы для самостоятельной работы и закрепления навыков",
      isPrimary: false,
    },
    {
      icon: Heart,
      title: locale === "kk" ? "Ата-аналарға" : "Для родителей",
      description:
        locale === "kk"
          ? "Бағдарламамен және баланың жетістіктерімен танысу"
          : "Ознакомление с программой и достижениями ребенка",
      isPrimary: false,
    },
  ]

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {locale === "kk" ? "Мақсатты аудитория" : "Целевая аудитория"}
          </h2>
          <p className="text-muted-foreground text-lg text-pretty max-w-2xl mx-auto">
            {locale === "kk"
              ? "Курс әртүрлі қатысушылардың қажеттіліктерін ескере отырып жасалған"
              : "Курс разработан с учетом потребностей различных участников образовательного процесса"}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          {audiences.map((audience, index) => {
            const Icon = audience.icon
            return (
              <Card key={index} className={audience.isPrimary ? "border-primary shadow-lg" : ""}>
                <CardHeader>
                  <div className="mb-3 rounded-full bg-primary/10 p-3 w-fit">
                    <Icon className="size-6 text-primary" />
                  </div>
                  <CardTitle className="flex items-center gap-2">
                    {audience.title}
                    {audience.isPrimary && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                        {locale === "kk" ? "Негізгі" : "Основная"}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{audience.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
