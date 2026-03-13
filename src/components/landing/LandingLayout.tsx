import React, { useState, useEffect } from "react"
import { LandingNavigation } from "./LandingNavigation"
import { LandingFooter } from "./LandingFooter"
import type { Locale } from "@/lib/translations"
import "@/components/landing/landing.css"

interface LandingLayoutProps {
  children: React.ReactNode | ((locale: Locale) => React.ReactNode)
}

export default function LandingLayout({ children }: LandingLayoutProps) {
  const [locale, setLocale] = useState<Locale>("ru")
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem("theme") as 'light' | 'dark'
      return (savedTheme === 'light' || savedTheme === 'dark') ? savedTheme : 'light'
    }
    return 'light'
  })

  useEffect(() => {
    const savedLocale = localStorage.getItem("locale") as Locale
    if (savedLocale && (savedLocale === "kk" || savedLocale === "ru")) {
      setLocale(savedLocale)
    }
  }, [])

  const handleLanguageChange = (newLocale: Locale) => {
    setLocale(newLocale)
    localStorage.setItem("locale", newLocale)
  }

  const toggleTheme = () => {
    setTheme(prev => {
      const newTheme = prev === 'light' ? 'dark' : 'light'
      localStorage.setItem("theme", newTheme)
      return newTheme
    })
  }

  return (
    <div className={`landing-theme min-h-screen flex flex-col ${theme === 'dark' ? 'dark' : ''}`}>
      <LandingNavigation
        locale={locale}
        onLanguageChange={handleLanguageChange}
        theme={theme}
        onThemeChange={toggleTheme}
      />
      <main className="flex-1">
        {typeof children === "function" ? children(locale) : children}
      </main>
      <LandingFooter locale={locale} />
    </div>
  )
}
