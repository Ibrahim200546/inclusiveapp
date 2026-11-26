import { useOutletContext } from "react-router-dom"
import { ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Locale } from "@/lib/translations"

const repository = "https://github.com/Ibrahim200546/inclusiveapp"

const copy = {
  kk: {
    title: "Байланыс",
    project: "Жоба беті",
    description: "Сайтта хабарлама жіберу формасы жоқ. Жоба туралы ақпаратты GitHub бетінен таба аласыз.",
    link: "GitHub-та ашу",
    privacy: "Оқушының жеке деректерін немесе дауыс жазбаларын ашық жарияламаңыз.",
  },
  ru: {
    title: "Контакты",
    project: "Страница проекта",
    description: "На сайте нет формы отправки сообщений. Информация о проекте доступна на GitHub.",
    link: "Открыть на GitHub",
    privacy: "Не публикуйте личные данные и голосовые записи учеников в открытом доступе.",
  },
}

export default function ContactPage() {
  const { locale } = useOutletContext<{ locale: Locale }>()
  const t = copy[locale]

  return (
    <div className="container mx-auto px-4 py-12 md:py-20">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 text-balance">{t.title}</h1>
        <Card>
          <CardHeader>
            <CardTitle>{t.project}</CardTitle>
            <CardDescription>{t.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild>
              <a href={repository}>
                {t.link}
                <ExternalLink className="ml-2 size-4" aria-hidden="true" />
              </a>
            </Button>
            <p className="text-sm text-muted-foreground">{t.privacy}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
