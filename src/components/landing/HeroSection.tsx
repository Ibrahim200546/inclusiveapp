import { Button } from "@/components/ui/button"
import { ArrowRight, Ear, Volume2, BookOpen } from "lucide-react"
import { Link } from "react-router-dom"

interface HeroSectionProps {
  locale: "kk" | "ru"
}

export function HeroSection({ locale }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted/20 py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance mb-6">
            {locale === "kk"
              ? "Дыбыстардың айтылуын қалыптастыру және есту қабілетін дамыту"
              : "Формирование произношения и развитие слухового восприятия"}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground text-pretty leading-relaxed mb-8 max-w-3xl mx-auto">
            {locale === "kk"
              ? "Есту қабілетін дамыту және дұрыс айту дағдыларын қалыптастыру бойынша оқу процесін қолдауға арналған ақпараттық-білім беру ресурсы"
              : "Информационно-образовательный ресурс для поддержки учебного процесса по развитию слуха и формированию правильного произношения"}
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/program">
                {locale === "kk" ? "Бағдарламаны көру" : "Смотреть программу"}
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/about">{locale === "kk" ? "Курс туралы" : "О курсе"}</Link>
            </Button>
          </div>
        </div>

        <div className="mt-20 grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
          <div className="flex flex-col items-center text-center p-6 rounded-lg bg-card border">
            <div className="mb-4 rounded-full bg-primary/10 p-4">
              <Ear className="size-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">
              {locale === "kk" ? "Есту қабілетін дамыту" : "Развитие слуха"}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {locale === "kk"
                ? "Естуді қабылдау дағдыларын қалыптастыру және дамыту"
                : "Формирование и развитие навыков слухового восприятия"}
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-6 rounded-lg bg-card border">
            <div className="mb-4 rounded-full bg-accent/10 p-4">
              <Volume2 className="size-8 text-accent" />
            </div>
            <h3 className="font-semibold text-lg mb-2">{locale === "kk" ? "Дұрыс айту" : "Правильное произношение"}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {locale === "kk" ? "Дыбыстарды қою және автоматтандыру" : "Постановка и автоматизация звуков"}
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-6 rounded-lg bg-card border">
            <div className="mb-4 rounded-full bg-primary/10 p-4">
              <BookOpen className="size-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">
              {locale === "kk" ? "Байланыстырылған сөйлеу" : "Связная речь"}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {locale === "kk" ? "Коммуникативтік дағдыларды дамыту" : "Развитие коммуникативных навыков"}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
