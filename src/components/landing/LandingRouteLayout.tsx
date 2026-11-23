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

  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window === "undefined") return "ru"
    const selected = localStorage.getItem("locale")
    const legacy = localStorage.getItem("profileLang")
    if (selected === "kk" || selected === "ru") return selected
    return legacy === "kk" || legacy === "ru" ? legacy : "ru"
  })
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem("theme") as 'light' | 'dark'
      return (savedTheme === 'light' || savedTheme === 'dark') ? savedTheme : 'light'
    }
    return 'light'
  })

  useEffect(() => {
    localStorage.setItem("locale", locale)
    localStorage.setItem("profileLang", locale)
    document.documentElement.lang = locale
    window.dispatchEvent(new CustomEvent("profile-language-change", { detail: { lang: locale } }))
  }, [locale])

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
      <Outlet context={{ locale, theme, toggleTheme, onLanguageChange: setLocale }} />
    )
  }

  return (
    <div className={`landing-theme min-h-screen flex flex-col ${theme === 'dark' ? 'dark' : ''}`}>
      <LandingNavigation
        locale={locale}
        onLanguageChange={setLocale}
        theme={theme}
        onThemeChange={toggleTheme}
      />
      <main className="flex-1">
        <Outlet context={{ locale, theme, toggleTheme, onLanguageChange: setLocale }} />
      </main>
      <LandingFooter locale={locale} />
    </div>
  )
}
