import { HeroSection } from "@/components/landing/HeroSection"
import { TargetAudience } from "@/components/landing/TargetAudience"
import { CourseOverview } from "@/components/landing/CourseOverview"
import LandingLayout from "@/components/landing/LandingLayout"

export default function LandingPage() {
  return (
    <LandingLayout>
      {(locale) => (
        <>
          <HeroSection locale={locale} />
          <TargetAudience locale={locale} />
          <CourseOverview locale={locale} />
        </>
      )}
    </LandingLayout>
  )
}
