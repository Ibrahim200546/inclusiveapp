import type React from "react"
import { useState } from "react"
import LandingLayout from "@/components/landing/LandingLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Mail, Phone, MessageSquare, Send, CheckCircle } from "lucide-react"
import type { Locale } from "@/lib/translations"

function ContactContent({ locale }: { locale: Locale }) {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    message: "",
  })

  const content = {
    kk: {
      title: "Байланыс",
      subtitle: "Сұрақтарыңыз бен ұсыныстарыңыз үшін бізбен байланысыңыз",
      formTitle: "Кері байланыс формасы",
      formDesc: "Форманы толтырыңыз, біз сізбен жақын арада байланысамыз",
      nameLabel: "Толық аты-жөні",
      namePlaceholder: "Атыңызды енгізіңіз",
      emailLabel: "Электрондық пошта",
      emailPlaceholder: "email@example.com",
      roleLabel: "Сіз кімсіз?",
      rolePlaceholder: "Мұғалім, ата-ана немесе басқа",
      messageLabel: "Хабарлама",
      messagePlaceholder: "Сұрағыңызды немесе ұсынысыңызды жазыңыз...",
      submitButton: "Хабарлама жіберу",
      successTitle: "Хабарлама жіберілді!",
      successMessage: "Сұрағыңыз үшін рақмет. Біз сізбен жақын арада байланысамыз.",
      contactInfoTitle: "Байланыс ақпараты",
      emailInfo: "Электрондық пошта",
      phoneInfo: "Телефон",
      addressInfo: "Мекенжай",
    },
    ru: {
      title: "Контакты",
      subtitle: "Свяжитесь с нами для вопросов и предложений",
      formTitle: "Форма обратной связи",
      formDesc: "Заполните форму, и мы свяжемся с вами в ближайшее время",
      nameLabel: "Полное имя",
      namePlaceholder: "Введите ваше имя",
      emailLabel: "Электронная почта",
      emailPlaceholder: "email@example.com",
      roleLabel: "Вы являетесь?",
      rolePlaceholder: "Преподаватель, родитель или другое",
      messageLabel: "Сообщение",
      messagePlaceholder: "Напишите ваш вопрос или предложение...",
      submitButton: "Отправить сообщение",
      successTitle: "Сообщение отправлено!",
      successMessage: "Спасибо за ваш вопрос. Мы свяжемся с вами в ближайшее время.",
      contactInfoTitle: "Контактная информация",
      emailInfo: "Электронная почта",
      phoneInfo: "Телефон",
      addressInfo: "Адрес",
    },
  }

  const t = content[locale]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Form submitted:", formData)
    setIsSubmitted(true)
    setTimeout(() => {
      setIsSubmitted(false)
      setFormData({ name: "", email: "", role: "", message: "" })
    }, 3000)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <div className="container mx-auto px-4 py-12 md:py-20">
      <div className="max-w-5xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-balance">{t.title}</h1>
          <p className="text-xl text-muted-foreground text-pretty">{t.subtitle}</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-3">
                    <MessageSquare className="size-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">{t.formTitle}</CardTitle>
                    <CardDescription className="mt-1">{t.formDesc}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isSubmitted ? (
                  <div className="text-center py-12">
                    <div className="inline-flex size-16 items-center justify-center rounded-full bg-accent/10 mb-4">
                      <CheckCircle className="size-8 text-accent" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{t.successTitle}</h3>
                    <p className="text-muted-foreground">{t.successMessage}</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t.nameLabel}</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder={t.namePlaceholder}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">{t.emailLabel}</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder={t.emailPlaceholder}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">{t.roleLabel}</Label>
                      <Input
                        id="role"
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        placeholder={t.rolePlaceholder}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">{t.messageLabel}</Label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        placeholder={t.messagePlaceholder}
                        rows={6}
                        required
                      />
                    </div>
                    <Button type="submit" size="lg" className="w-full">
                      <Send className="mr-2 size-4" />
                      {t.submitButton}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t.contactInfoTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-2 shrink-0">
                    <Mail className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">{t.emailInfo}</p>
                    <p className="text-sm text-muted-foreground">info@course-example.kz</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-2 shrink-0">
                    <Phone className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">{t.phoneInfo}</p>
                    <p className="text-sm text-muted-foreground">+7 (XXX) XXX-XX-XX</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-2 shrink-0">
                    <MessageSquare className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">{t.addressInfo}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {locale === "kk" ? "Қазақстан Республикасы" : "Республика Казахстан"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {locale === "kk"
                    ? "Біз сіздің сұрақтарыңызды тыңдауға әрқашан дайынбыз. Курс туралы немесе оқу материалдары туралы қосымша ақпарат алу үшін бізбен хабарласыңыз."
                    : "Мы всегда готовы выслушать ваши вопросы. Свяжитесь с нами для получения дополнительной информации о курсе или учебных материалах."}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ContactPage() {
  return (
    <LandingLayout>
      {(locale) => <ContactContent locale={locale} />}
    </LandingLayout>
  )
}
