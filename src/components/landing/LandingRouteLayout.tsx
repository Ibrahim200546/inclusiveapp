
import React, { useState, useEffect } from "react"
import { Outlet } from "react-router-dom"
import { LandingNavigation } from "./LandingNavigation"
import { LandingFooter } from "./LandingFooter"
import type { Locale } from "@/lib/translations"
import "@/components/landing/landing.css"

export default function LandingRouteLayout() {
  const [locale, setLocale] = useState<Locale>("ru")
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem("theme") as 'light' | 'dark'
      return (savedTheme === 'light' || savedTheme === 'dark') ? savedTheme : 'light'
    }
    return 'light'
  })

  // Prevent flash by setting class on mount immediately if possible, 
  // but React state init should handle it for the div className.

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
        <Outlet context={{ locale }} />
      </main>
      <LandingFooter locale={locale} />
    </div>
  )
}
