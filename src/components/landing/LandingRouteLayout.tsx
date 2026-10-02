import React, { useState, useEffect } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { LandingNavigation } from "./LandingNavigation"
import { LandingFooter } from "./LandingFooter"
import type { Locale } from "@/lib/translations"
import "@/components/landing/landing.css"
import "@/components/landing/landing-home.css"

export default function LandingRouteLayout() {
  const location = useLocation()
  const isHome = location.pathname === "/"

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

  // On the home page, render without navigation/footer wrapper
  if (isHome) {
    return (
      <Outlet context={{ locale, theme, toggleTheme, onLanguageChange: handleLanguageChange }} />
    )
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
        <Outlet context={{ locale, theme, toggleTheme, onLanguageChange: handleLanguageChange }} />
      </main>
      <LandingFooter locale={locale} />
    </div>
  )
}
