import type { CSSProperties } from "react"
import { useOutletContext, Link } from "react-router-dom"
import type { Locale } from "@/lib/translations"
import { getTranslation } from "@/lib/translations"
import {
  BookOpen, Users, FolderOpen, Lightbulb, BarChart3, Mail,
  Sun, Moon, Download
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

  const isDark = theme === 'dark'

  const t = {
    kk: {
      playTitle: "Жаттығуды бастау",
      goToPractice: "Жаттығулар",
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
      playTitle: "Начать занятия",
      goToPractice: "Упражнения",
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

        {/* Center circle with game entry */}
        <div className="landing-center-circle">
          <div className="landing-center-circle-inner">
            <div className="landing-practice">
              <h1 className="landing-practice-title">{t.playTitle}</h1>
              <Link to="/practice" reloadDocument className="landing-practice-btn">
                {t.goToPractice}
              </Link>
            </div>
          </div>
        </div>

        {/* Fixed compass positions keep links stable and keyboard-reachable. */}
        {navCards.map((card, i) => {
          const Icon = card.icon
          const angle = 2 * Math.PI * i / navCards.length - Math.PI / 2

          return (
            <div
              key={card.href}
              className="landing-nav-slot"
              style={{
                '--orbit-x': Math.cos(angle).toFixed(6),
                '--orbit-y': Math.sin(angle).toFixed(6),
              } as CSSProperties}
            >
              <Link
                to={card.href}
                className="landing-nav-card"
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
      </div>
    </div>
  )
}
