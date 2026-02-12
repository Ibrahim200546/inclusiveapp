import { useOutletContext } from "react-router-dom"
import type { Locale } from "@/lib/translations"
import { HeroSection } from "@/components/landing/HeroSection"
import { TargetAudience } from "@/components/landing/TargetAudience"
import { CourseOverview } from "@/components/landing/CourseOverview"

export default function LandingPage() {
  const { locale } = useOutletContext<{ locale: Locale }>()

  return (
    <>
      <HeroSection locale={locale} />
      <TargetAudience locale={locale} />
      <CourseOverview locale={locale} />
    </>
  )
}
