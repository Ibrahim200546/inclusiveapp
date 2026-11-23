import type React from "react"
import { useRef, useState } from "react"
import { useOutletContext } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MessageSquare, Send, CheckCircle } from "lucide-react"
import type { Locale } from "@/lib/translations"

function ContactContent({ locale }: { locale: Locale }) {
  const [status, setStatus] = useState<"idle" | "busy" | "success" | "error">("idle")
  const pending = useRef(false)
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
      formDesc: "Сұрақ немесе ұсыныс жіберу үшін форманы толтырыңыз.",
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
      successMessage: "Рақмет. Хабарламаңыз қабылданды.",
      sending: "Жіберіліп жатыр…",
      error: "Хабарлама жіберілмеді. Қайталап көріңіз.",
      another: "Тағы бір хабарлама жіберу",
      contactInfoTitle: "Байланыс ақпараты",
      emailInfo: "Электрондық пошта",
      phoneInfo: "Телефон",
      addressInfo: "Мекенжай",
    },
    ru: {
      title: "Контакты",
      subtitle: "Свяжитесь с нами для вопросов и предложений",
      formTitle: "Форма обратной связи",
      formDesc: "Заполните форму, чтобы отправить вопрос или предложение.",
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
      successMessage: "Спасибо. Ваше сообщение принято.",
      sending: "Отправляем…",
      error: "Сообщение не отправлено. Попробуйте ещё раз.",
      another: "Отправить ещё сообщение",
      contactInfoTitle: "Контактная информация",
      emailInfo: "Электронная почта",
      phoneInfo: "Телефон",
      addressInfo: "Адрес",
    },
  }

  const t = content[locale]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pending.current) return
    pending.current = true
    setStatus("busy")
    try {
      const { error } = await supabase
        .from('contact_messages')
        .insert({
          name: formData.name,
          email: formData.email,
          role: formData.role || null,
          message: formData.message,
        })
      if (error) throw error
      setFormData({ name: "", email: "", role: "", message: "" })
      setStatus("success")
    } catch {
      setStatus("error")
    } finally {
      pending.current = false
    }
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
                {status === "success" ? (
                  <div className="text-center py-12">
                    <div role="status">
                    <div className="inline-flex size-16 items-center justify-center rounded-full bg-accent/10 mb-4">
                      <CheckCircle className="size-8 text-accent" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{t.successTitle}</h3>
                    <p className="text-muted-foreground">{t.successMessage}</p>
                    </div>
                    <Button type="button" variant="outline" className="mt-4" onClick={() => setStatus("idle")}>{t.another}</Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6" aria-busy={status === "busy"}>
                    <fieldset disabled={status === "busy"} className="space-y-6">
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
                    {status === "error" && <p role="alert" className="text-sm text-destructive">{t.error}</p>}
                    <Button type="submit" size="lg" className="w-full" disabled={status === "busy"}>
                      <Send className="mr-2 size-4" />
                      {status === "busy" ? t.sending : t.submitButton}
                    </Button>
                    </fieldset>
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
                <p>{locale === "kk" ? "Расталған байланыс деректері әлі жарияланбаған. Сұрақ үшін осы форманы пайдаланыңыз." : "Подтверждённые контактные данные пока не опубликованы. Для вопроса используйте эту форму."}</p>
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
  const { locale } = useOutletContext<{ locale: Locale }>()
  return <ContactContent locale={locale} />
}
