import { Link, useLocation } from "react-router-dom"
import { LanguageSwitcher } from "./LanguageSwitcher"
import type { Locale } from "@/lib/translations"
import { getTranslation } from "@/lib/translations"
import { Menu, X } from "lucide-react"
import { useState } from "react"
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

  const navItems = [
    { href: "/", label: getTranslation(locale, "home") },
    { href: "/about", label: getTranslation(locale, "about") },
    { href: "/program", label: getTranslation(locale, "program") },
    { href: "/materials", label: getTranslation(locale, "materials") },
    { href: "/methodology", label: getTranslation(locale, "methodology") },
    { href: "/results", label: getTranslation(locale, "results") },
    { href: "/contact", label: getTranslation(locale, "contact") },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold text-lg">
          <img src="/favicon.ico" alt="Logo" className="size-8 rounded-lg object-contain" />
          <span className="hidden sm:inline-block text-balance">
            {getTranslation(locale, "courseName").split(" ").slice(0, 3).join(" ")}
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                location.pathname === item.href ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}

          <Button asChild size="sm">
            <Link to="/practice">{getTranslation(locale, "login")}</Link>
          </Button>

          <ThemeToggle isDark={theme === 'dark'} toggleTheme={onThemeChange} />
          <LanguageSwitcher currentLocale={locale} onLanguageChange={onLanguageChange} />
        </div>

        {/* Mobile Menu Button */}
        <div className="flex lg:hidden items-center gap-4">
          <ThemeToggle isDark={theme === 'dark'} toggleTheme={onThemeChange} />
          <LanguageSwitcher currentLocale={locale} onLanguageChange={onLanguageChange} />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-foreground"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t bg-background">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "text-sm font-medium px-3 py-2 rounded-md transition-colors",
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
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium px-3 py-2 rounded-md bg-primary text-primary-foreground"
            >
              {getTranslation(locale, "login")}
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
