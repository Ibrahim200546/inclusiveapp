import { useOutletContext } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Lightbulb, CheckCircle, AlertCircle, Users2 } from "lucide-react"
import type { Locale } from "@/lib/translations"

function MethodologyContent({ locale }: { locale: Locale }) {
  const content = {
    kk: {
      title: "Әдістеме",
      subtitle: "Оқыту әдістері мен мұғалімге арналған ұсыныстар",
      methodsTitle: "Қолданылатын оқыту әдістері",
      methodsDesc: "Курс келесі негізгі әдістерді қолданады:",
      methods: [
        { title: "Дифференциалды тәсіл", desc: "Әр баланың жеке ерекшеліктері мен қажеттіліктерін ескеру" },
        { title: "Кезең-кезеңмен оқыту", desc: "Қарапайымнан күрделіге қарай біртіндеп дамыту" },
        { title: "Интерактивті жаттығулар", desc: "Баланың белсенді қатысуы арқылы дағдыларды қалыптастыру" },
        { title: "Аудио-визуалды тәсіл", desc: "Естуді және көруді үйлестіру арқылы қабылдауды күшейту" },
        { title: "Ойын элементтері", desc: "Мотивацияны арттыру және оқу процесін қызықты ету" },
      ],
      requirementsTitle: "Сабақтарды өткізу талаптары",
      requirements: [
        "Сабақ ұзақтығы оқушылардың жасына және даму деңгейіне сәйкес келуі керек",
        "Тыныш ортаны қамтамасыз ету және сыртқы шуларды азайту",
        "Аудио жабдықтар мен көрнекі құралдардың сапалы болуы",
        "Жаттығуларды жүйелі түрде қайталау және бекіту",
        "Оқушының жетістіктерін үнемі бақылау және тіркеу",
      ],
      recommendationsTitle: "Мұғалімге ұсыныстар",
      recommendations: [
        {
          title: "Дайындық",
          items: [
            "Сабақ жоспарын алдын-ала құрастыру",
            "Барлық қажетті материалдар мен жабдықтарды дайындау",
            "Әр оқушының жеке ерекшеліктерін ескеру",
          ],
        },
        {
          title: "Сабақ барысында",
          items: [
            "Нұсқауларды анық және түсінікті беру",
            "Оқушыны мадақтау және қолдау көрсету",
            "Қиындықтар туындаған жағдайда көмек көрсету",
            "Әртүрлі жаттығуларды ауыстыру",
          ],
        },
        {
          title: "Бағалау",
          items: [
            "Жетістіктерді жүйелі түрде тіркеу",
            "Ата-аналарға кері байланыс беру",
            "Қажет болған жағдайда бағдарламаны түзету",
          ],
        },
      ],
    },
    ru: {
      title: "Методика",
      subtitle: "Методы обучения и рекомендации для преподавателей",
      methodsTitle: "Используемые методы обучения",
      methodsDesc: "Курс использует следующие основные методы:",
      methods: [
        { title: "Дифференцированный подход", desc: "Учет индивидуальных особенностей и потребностей каждого ребенка" },
        { title: "Поэтапное обучение", desc: "Постепенное развитие от простого к сложному" },
        { title: "Интерактивные упражнения", desc: "Формирование навыков через активное участие ребенка" },
        { title: "Аудиовизуальный подход", desc: "Усиление восприятия через координацию слуха и зрения" },
        { title: "Игровые элементы", desc: "Повышение мотивации и интереса к учебному процессу" },
      ],
      requirementsTitle: "Требования к проведению занятий",
      requirements: [
        "Продолжительность занятия должна соответствовать возрасту и уровню развития обучающихся",
        "Обеспечение тихой обстановки и минимизация внешних шумов",
        "Качественное аудио оборудование и наглядные материалы",
        "Систематическое повторение и закрепление упражнений",
        "Постоянный мониторинг и фиксация достижений обучающегося",
      ],
      recommendationsTitle: "Рекомендации преподавателю",
      recommendations: [
        {
          title: "Подготовка",
          items: [
            "Составление плана урока заранее",
            "Подготовка всех необходимых материалов и оборудования",
            "Учет индивидуальных особенностей каждого обучающегося",
          ],
        },
        {
          title: "Во время занятия",
          items: [
            "Четкое и понятное изложение инструкций",
            "Поощрение и поддержка обучающегося",
            "Оказание помощи при возникновении трудностей",
            "Чередование различных видов упражнений",
          ],
        },
        {
          title: "Оценка результатов",
          items: [
            "Систематическая фиксация достижений",
            "Обратная связь с родителями",
            "Корректировка программы при необходимости",
          ],
        },
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
                <Lightbulb className="size-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">{t.methodsTitle}</CardTitle>
            </div>
            <p className="text-muted-foreground mt-2">{t.methodsDesc}</p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {t.methods.map((method, index) => (
                <div key={index} className="p-4 rounded-lg bg-muted/50 border">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle className="size-4 text-accent shrink-0" />
                    {method.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{method.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-accent/10 p-3">
                <AlertCircle className="size-6 text-accent" />
              </div>
              <CardTitle className="text-2xl">{t.requirementsTitle}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {t.requirements.map((req, index) => (
                <li key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground text-sm font-semibold mt-0.5">
                    {index + 1}
                  </span>
                  <span className="text-muted-foreground leading-relaxed">{req}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-3">
                <Users2 className="size-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">{t.recommendationsTitle}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              {t.recommendations.map((rec, index) => (
                <div key={index}>
                  <h3 className="font-semibold text-lg mb-3 pb-2 border-b">{rec.title}</h3>
                  <ul className="space-y-2">
                    {rec.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="inline-block size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function MethodologyPage() {
  const { locale } = useOutletContext<{ locale: Locale }>()
  return <MethodologyContent locale={locale} />
}
