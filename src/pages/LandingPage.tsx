import React, { useState, useEffect, useRef } from "react"
import { useOutletContext, Link, useNavigate } from "react-router-dom"
import type { Locale } from "@/lib/translations"
import { getTranslation } from "@/lib/translations"
import { useAuth } from "@/contexts/AuthContext"
import {
  BookOpen, Users, FolderOpen, Lightbulb, BarChart3, Mail,
  AlertCircle, Loader2, Sun, Moon, LogOut, Eye, EyeOff
} from "lucide-react"
import { LanguageSwitcher } from "@/components/landing/LanguageSwitcher"

interface OutletCtx {
  locale: Locale
  theme: 'light' | 'dark'
  toggleTheme: () => void
  onLanguageChange: (l: Locale) => void
}

export default function LandingPage() {
  const { locale, theme, toggleTheme, onLanguageChange } = useOutletContext<OutletCtx>()
  const { user, signIn, signUp, signOut } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Orbit rotation angle (in degrees), updated via requestAnimationFrame
  const [orbitAngle, setOrbitAngle] = useState(0)
  const animRef = useRef<number>(0)
  const startTimeRef = useRef<number>(Date.now())
  const ORBIT_DURATION = 60000 // 60 seconds per full revolution

  useEffect(() => {
    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current
      const angle = (elapsed / ORBIT_DURATION) * 360
      setOrbitAngle(angle % 360)
      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  const isDark = theme === 'dark'

  const t = {
    kk: {
      loginTitle: "Кіру",
      registerTitle: "Тіркелу",
      email: "Пошта",
      password: "Құпия сөз",
      confirmPassword: "Растау",
      name: "Аты-жөні",
      loginBtn: "Кіру",
      registerBtn: "Тіркелу",
      submitting: "...",
      passwordMismatch: "Құпия сөздер сәйкес келмейді",
      welcomeBack: "Қош келдіңіз!",
      goToPractice: "Жаттығулар",
      logoutBtn: "Шығу",
      aboutDesc: "Курс мақсаттары",
      programDesc: "Оқу бағдарламасы",
      materialsDesc: "Оқу ресурстары",
      methodologyDesc: "Оқыту әдістері",
      resultsDesc: "Нәтижелер",
      contactDesc: "Байланыс",
      themeLight: "Күндізгі",
      themeDark: "Түнгі",
    },
    ru: {
      loginTitle: "Вход",
      registerTitle: "Регистрация",
      email: "Почта",
      password: "Пароль",
      confirmPassword: "Подтвердите",
      name: "Имя",
      loginBtn: "Войти",
      registerBtn: "Регистрация",
      submitting: "...",
      passwordMismatch: "Пароли не совпадают",
      welcomeBack: "Добро пожаловать!",
      goToPractice: "Упражнения",
      logoutBtn: "Выйти",
      aboutDesc: "Цели курса",
      programDesc: "Программа",
      materialsDesc: "Ресурсы",
      methodologyDesc: "Методика",
      resultsDesc: "Результаты",
      contactDesc: "Контакты",
      themeLight: "Дневная",
      themeDark: "Ночная",
    }
  }[locale]

  const navCards = [
    { href: "/about", label: getTranslation(locale, "about"), desc: t.aboutDesc, icon: BookOpen, color: "hsl(200, 80%, 55%)" },
    { href: "/program", label: getTranslation(locale, "program"), desc: t.programDesc, icon: Users, color: "hsl(160, 60%, 45%)" },
    { href: "/materials", label: getTranslation(locale, "materials"), desc: t.materialsDesc, icon: FolderOpen, color: "hsl(280, 60%, 55%)" },
    { href: "/methodology", label: getTranslation(locale, "methodology"), desc: t.methodologyDesc, icon: Lightbulb, color: "hsl(40, 80%, 50%)" },
    { href: "/results", label: getTranslation(locale, "results"), desc: t.resultsDesc, icon: BarChart3, color: "hsl(340, 65%, 55%)" },
    { href: "/contact", label: getTranslation(locale, "contact"), desc: t.contactDesc, icon: Mail, color: "hsl(120, 50%, 45%)" },
  ]

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { error } = await signIn(email, password)
      if (error) throw new Error(error)
      navigate("/practice")
    } catch (err: any) {
      setError(err.message || "Failed to sign in")
    } finally {
      setLoading(false)
    }
  }

  const count = navCards.length
  const anglePerCard = 360 / count
  const orbitRadius = 260 // pixels from center

  return (
    <div
      className="landing-home-root"
      style={{
        backgroundImage: `url('/original/assets/${isDark ? 'night' : 'background'}.jpg')`,
      }}
      data-theme={theme}
    >
      {/* Overlay */}
      <div className="landing-home-overlay" />

      {/* Top controls */}
      <div className="landing-home-controls">
        <button
          className="landing-theme-toggle-btn"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {isDark ? (
            <Moon className="landing-theme-icon" />
          ) : (
            <Sun className="landing-theme-icon" />
          )}
          <span className="landing-theme-label">
            {isDark ? t.themeDark : t.themeLight}
          </span>
        </button>
        <LanguageSwitcher currentLocale={locale} onLanguageChange={onLanguageChange} />
      </div>

      {/* Central layout */}
      <div className="landing-home-layout">

        {/* Nav cards — wrapper handles position, inner Link handles hover scale */}
        {navCards.map((card, i) => {
          const Icon = card.icon
          const baseAngle = anglePerCard * i - 90 // start from top
          const currentAngle = baseAngle + orbitAngle
          const rad = (currentAngle * Math.PI) / 180
          const x = Math.cos(rad) * orbitRadius
          const y = Math.sin(rad) * orbitRadius

          return (
            <div
              key={card.href}
              className="landing-nav-slot"
              style={{
                position: 'absolute',
                top: `calc(50% + ${y}px)`,
                left: `calc(50% + ${x}px)`,
              }}
            >
              <Link
                to={card.href}
                className="landing-nav-card"
                style={{ '--card-accent': card.color } as React.CSSProperties}
              >
                <div className="landing-nav-card-icon" style={{ backgroundColor: card.color }}>
                  <Icon size={26} color="#fff" />
                </div>
                <span className="landing-nav-card-label">{card.label}</span>
                <span className="landing-nav-card-desc">{card.desc}</span>
              </Link>
            </div>
          )
        })}

        {/* Center circle with auth form */}
        <div className="landing-center-circle">
          <div className="landing-center-circle-inner">
            {user ? (
              <div className="landing-auth-welcome">
                <div className="landing-auth-avatar">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <h2 className="landing-auth-welcome-title">{t.welcomeBack}</h2>
                <p className="landing-auth-welcome-email">{user.email}</p>
                <Link to="/practice" className="landing-auth-practice-btn">
                  {t.goToPractice}
                </Link>
                <button onClick={() => signOut()} className="landing-auth-logout-btn">
                  <LogOut size={12} />
                  {t.logoutBtn}
                </button>
              </div>
            ) : (
              <>
                <h2 style={{ color: "white", fontSize: "24px", marginBottom: "20px", textAlign: "center" }}>{t.loginTitle}</h2>

                {error && (
                  <div className="landing-auth-error">
                    <AlertCircle size={12} />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleLogin} className="landing-auth-form">
                  <input
                    type="email"
                    placeholder={t.email}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="landing-auth-input"
                  />
                  <div className="landing-auth-password-wrap">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder={t.password}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      className="landing-auth-input"
                    />
                    <button
                      type="button"
                      className="landing-auth-eye-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <button type="submit" className="landing-auth-submit" disabled={loading}>
                    {loading && <Loader2 size={14} className="animate-spin" />}
                    {loading ? t.submitting : t.loginBtn}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
