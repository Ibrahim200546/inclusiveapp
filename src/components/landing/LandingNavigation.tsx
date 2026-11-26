import { Link, useLocation } from "react-router-dom"
import { LanguageSwitcher } from "./LanguageSwitcher"
import type { Locale } from "@/lib/translations"
import { getTranslation } from "@/lib/translations"
import { Menu, X, Home, Mail, FolderOpen, BarChart3, BookOpen } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import ThemeToggle from "./ThemeToggle"

interface NavigationProps {
  locale: Locale
  onLanguageChange: (locale: Locale) => void
  theme: 'light' | 'dark'
  onThemeChange: () => void
}

export function LandingNavigation({ locale, onLanguageChange, theme, onThemeChange }: NavigationProps) {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const mobileMenuButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!mobileMenuOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      setMobileMenuOpen(false)
      mobileMenuButton.current?.focus()
    }
    document.addEventListener("keydown", closeOnEscape)
    return () => document.removeEventListener("keydown", closeOnEscape)
  }, [mobileMenuOpen])

  const navItems = [
    { href: "/", label: getTranslation(locale, "home") },
    { href: "/about", label: getTranslation(locale, "about") },
    { href: "/program", label: getTranslation(locale, "program") },
    { href: "/materials", label: getTranslation(locale, "materials") },
    { href: "/methodology", label: getTranslation(locale, "methodology") },
    { href: "/results", label: getTranslation(locale, "results") },
    { href: "/contact", label: getTranslation(locale, "contact") },
    { href: "/download", label: getTranslation(locale, "download") },
  ]

  const mobileBottomItems = [
    { href: "/", label: getTranslation(locale, "home"), icon: Home },
    { href: "/contact", label: getTranslation(locale, "contact"), icon: Mail },
    { href: "/materials", label: getTranslation(locale, "materials"), icon: FolderOpen },
    { href: "/results", label: getTranslation(locale, "results"), icon: BarChart3 },
    { href: "/practice", label: getTranslation(locale, "practice"), icon: BookOpen },
  ]

  return (
    <>
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex min-h-11 min-w-11 items-center gap-2 shrink-0 font-semibold text-lg" aria-label={getTranslation(locale, "home")}>
          <img src="/favicon.ico" alt="Logo" className="size-8 rounded-lg object-contain" />
          <span className="hidden sm:inline-block max-w-[180px] truncate">
            {getTranslation(locale, "courseName").split(" ").slice(0, 3).join(" ")}
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden xl:flex items-center gap-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "inline-flex min-h-11 items-center text-sm font-medium transition-colors hover:text-primary",
                location.pathname === item.href ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}

          <Button asChild size="sm" variant="outline">
            <Link to="/practice" reloadDocument>{getTranslation(locale, "practice")}</Link>
          </Button>

          <ThemeToggle isDark={theme === 'dark'} toggleTheme={onThemeChange} />
          <LanguageSwitcher currentLocale={locale} onLanguageChange={onLanguageChange} />
        </div>

        {/* Mobile Menu Button */}
        <div className="flex xl:hidden items-center gap-2 sm:gap-4">
          <ThemeToggle isDark={theme === 'dark'} toggleTheme={onThemeChange} />
          <LanguageSwitcher currentLocale={locale} onLanguageChange={onLanguageChange} />
          <button
            ref={mobileMenuButton}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-foreground inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl"
            aria-label={locale === "kk" ? "Навигация мәзірі" : "Меню навигации"}
            aria-expanded={mobileMenuOpen}
            aria-controls="landing-mobile-menu"
          >
            {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div id="landing-mobile-menu" className="xl:hidden max-h-[calc(100dvh-160px)] overflow-y-auto border-t bg-background">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "text-sm font-medium min-h-11 flex items-center px-3 py-2 rounded-md transition-colors",
                  location.pathname === item.href
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/practice"
              reloadDocument
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium min-h-11 flex items-center px-3 py-2 rounded-md bg-primary text-primary-foreground"
            >
              {getTranslation(locale, "practice")}
            </Link>
          </div>
        </div>
      )}
    </header>

      <nav className="fixed bottom-3 left-1/2 z-50 grid w-[calc(100%-32px)] max-w-[430px] -translate-x-1/2 grid-cols-5 gap-1 rounded-2xl border bg-background/95 p-2 shadow-xl backdrop-blur xl:hidden">
        {mobileBottomItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.href
          return (
            <Link
              key={`${item.href}-${item.label}`}
              to={item.href}
              reloadDocument={item.href === "/practice"}
              className={cn(
                "flex min-h-12 min-w-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-extrabold leading-none transition-colors",
                isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
