import type { Locale } from "@/lib/translations"
import { getTranslation } from "@/lib/translations"

interface FooterProps {
  locale: Locale
}

export function LandingFooter({ locale }: FooterProps) {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t bg-muted/30">
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="font-semibold mb-3">{getTranslation(locale, "courseName")}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {getTranslation(locale, "courseDescription")}
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-3">{locale === "kk" ? "Мақсатты аудитория" : "Целевая аудитория"}</h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>{getTranslation(locale, "forTeachers")}</li>
              <li>{getTranslation(locale, "forStudents")}</li>
              <li>{getTranslation(locale, "forParents")}</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3">{getTranslation(locale, "contact")}</h4>
            <p className="text-sm text-muted-foreground">
              {locale === "kk"
                ? "Қосымша ақпарат алу үшін бізбен хабарласыңыз"
                : "Свяжитесь с нами для получения дополнительной информации"}
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
          © {currentYear} {getTranslation(locale, "courseName")}
        </div>
      </div>
    </footer>
  )
}
