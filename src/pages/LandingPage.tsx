import React, { useState, useEffect, useRef } from "react"
import { useOutletContext, Link } from "react-router-dom"
import type { Locale } from "@/lib/translations"
import { getTranslation } from "@/lib/translations"
import { useAuth } from "@/contexts/AuthContext"
import {
  BookOpen, Users, FolderOpen, Lightbulb, BarChart3, Mail,
  Home, Brain, FileText, UserRound,
  Sun, Moon, LogOut, Download
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
  const { user, signOut } = useAuth()

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
      playTitle: "Ойынды бастау",
      loginOptional: "Кіру міндетті емес. Профильге кейін кіре аласыз.",
      loginProfile: "Профильге кіру",
      aboutDesc: "Курс мақсаттары",
      programDesc: "Оқу бағдарламасы",
      materialsDesc: "Оқу ресурстары",
      methodologyDesc: "Оқыту әдістері",
      resultsDesc: "Нәтижелер",
      contactDesc: "Байланыс",
      downloadDesc: "APK/EXE нұсқалары",
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
      playTitle: "Начать игру",
      loginOptional: "Вход необязателен. В профиль можно войти позже.",
      loginProfile: "Войти в профиль",
      aboutDesc: "Цели курса",
      programDesc: "Программа",
      materialsDesc: "Ресурсы",
      methodologyDesc: "Методика",
      resultsDesc: "Результаты",
      contactDesc: "Контакты",
      downloadDesc: "APK/EXE версии",
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
    { href: "/download", label: getTranslation(locale, "download"), desc: t.downloadDesc, icon: Download, color: "hsl(0, 75%, 55%)" },
  ]

  const mobileNavItems = [
    { href: "/", label: locale === "kk" ? "Басты" : "Главная", icon: Home },
    { href: "/contact", label: locale === "kk" ? "ЖИ" : "ИИ", icon: Brain },
    { href: "/materials", label: locale === "kk" ? "Есеп" : "Отчёты", icon: FileText },
    { href: "/results", label: locale === "kk" ? "Прогресс" : "Прогресс", icon: BarChart3 },
    { href: "/practice", label: locale === "kk" ? "Профиль" : "Профиль", icon: UserRound },
  ]

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

        {/* Center circle with game entry */}
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
              <div className="landing-auth-welcome">
                <h2 className="landing-auth-welcome-title">{t.playTitle}</h2>
                <p className="landing-auth-welcome-email">{t.loginOptional}</p>
                <Link to="/practice" className="landing-auth-practice-btn">
                  {t.goToPractice}
                </Link>
                <Link to="/login" className="landing-auth-logout-btn">
                  <UserRound size={12} />
                  {t.loginProfile}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <nav className="landing-mobile-bottom-nav" aria-label={locale === "kk" ? "Мобильді навигация" : "Мобильная навигация"}>
        {mobileNavItems.map((item, index) => {
          const Icon = item.icon
          return (
            <Link
              key={`${item.href}-${item.label}`}
              to={item.href}
              className={`landing-mobile-bottom-nav-item${index === 0 ? " active" : ""}`}
            >
              <Icon size={20} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
