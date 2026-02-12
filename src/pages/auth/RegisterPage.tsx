import React, { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useNavigate, Link, useOutletContext } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Loader2 } from "lucide-react"
import type { Locale } from "@/lib/translations"

export default function RegisterPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { signUp } = useAuth()
  const navigate = useNavigate()
  const { locale } = useOutletContext<{ locale: Locale }>()

  const t = {
    kk: {
      title: "Тіркелу",
      subtitle: "Жаңа аккаунт жасау",
      name: "Аты-жөні",
      email: "Электрондық пошта",
      password: "Құпия сөз",
      confirmPassword: "Құпия сөзді растаңыз",
      submit: "Тіркелу",
      submitting: "Тіркелу...",
      hasAccount: "Аккаунтыңыз бар ма?",
      login: "Кіру",
      error: "Тіркелу қатесі",
      passwordMismatch: "Құпия сөздер сәйкес келмейді",
      successMsg: "Тіркелу сәтті өтті!",
    },
    ru: {
      title: "Регистрация",
      subtitle: "Создать новый аккаунт",
      name: "Имя и фамилия",
      email: "Электронная почта",
      password: "Пароль",
      confirmPassword: "Подтвердите пароль",
      submit: "Зарегистрироваться",
      submitting: "Регистрация...",
      hasAccount: "Уже есть аккаунт?",
      login: "Войти",
      error: "Ошибка регистрации",
      passwordMismatch: "Пароли не совпадают",
      successMsg: "Регистрация прошла успешно!",
    }
  }[locale]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError(t.passwordMismatch)
      return
    }

    setLoading(true)

    try {
      const { error } = await signUp(email, password, name)
      if (error) throw new Error(error)
      // Check if session established or confirmation needed
      // For now, redirect to login with a message or directly to game if session exists
      navigate("/login")
    } catch (err: any) {
      setError(err.message || "Failed to register")
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
              <Label htmlFor="name">{t.name}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
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
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t.confirmPassword}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
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
            {t.hasAccount}{" "}
            <Link to="/login" className="text-primary hover:underline underline-offset-4">
              {t.login}
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
