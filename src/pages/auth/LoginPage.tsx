import React, { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useNavigate, Link, useOutletContext } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Loader2 } from "lucide-react"
import type { Locale } from "@/lib/translations"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { signIn } = useAuth()
  const navigate = useNavigate()
  const { locale } = useOutletContext<{ locale: Locale }>()

  const t = {
    kk: {
      title: "Кіру",
      subtitle: "Оқуды жалғастыру үшін жүйеге кіріңіз",
      email: "Электрондық пошта",
      password: "Құпия сөз",
      submit: "Кіру",
      submitting: "Кіру...",
      noAccount: "Аккаунтыңыз жоқ па?",
      register: "Тіркелу",
      error: "Кіру қатесі",
    },
    ru: {
      title: "Вход",
      subtitle: "Войдите в систему, чтобы продолжить обучение",
      email: "Электронная почта",
      password: "Пароль",
      submit: "Войти",
      submitting: "Вход...",
      noAccount: "Нет аккаунта?",
      register: "Регистрация",
      error: "Ошибка входа",
    }
  }[locale]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await signIn(email, password)
      if (error) throw new Error(error)
      navigate("/practice") // Redirect to game/practice area
    } catch (err: any) {
      setError(err.message || "Failed to sign in")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto flex items-center justify-center min-h-[calc(100vh-200px)] py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">{t.title}</CardTitle>
          <CardDescription>{t.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
                <AlertCircle className="size-4" />
                <span>{error}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{t.email}</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t.password}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? t.submitting : t.submit}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <div className="text-sm text-muted-foreground">
            {t.noAccount}{" "}
            <Link to="/register" className="text-primary hover:underline underline-offset-4">
              {t.register}
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
