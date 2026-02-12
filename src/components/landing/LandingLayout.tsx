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

  return (
    <div className="landing-theme min-h-screen flex flex-col">
      <LandingNavigation locale={locale} onLanguageChange={handleLanguageChange} />
      <main className="flex-1">
        {typeof children === "function" ? children(locale) : children}
      </main>
      <LandingFooter locale={locale} />
    </div>
  )
}
