import { Button } from "@/components/ui/button"
import { Languages } from "lucide-react"
import type { Locale } from "@/lib/translations"

interface LanguageSwitcherProps {
  onLanguageChange: (locale: Locale) => void
  currentLocale: Locale
}

export function LanguageSwitcher({ onLanguageChange, currentLocale }: LanguageSwitcherProps) {
  return (
    <div className="flex items-center gap-2">
      <Languages className="hidden size-4 text-muted-foreground sm:block" />
      <div className="flex gap-1">
        <Button
          variant={currentLocale === "kk" ? "default" : "ghost"}
          size="sm"
          onClick={() => onLanguageChange("kk")}
          className="min-h-11 min-w-11 text-sm"
          aria-pressed={currentLocale === "kk"}
        >
          {currentLocale === "ru" ? "КАЗ" : "ҚАЗ"}
        </Button>
        <Button
          variant={currentLocale === "ru" ? "default" : "ghost"}
          size="sm"
          onClick={() => onLanguageChange("ru")}
          className="min-h-11 min-w-11 text-sm"
          aria-pressed={currentLocale === "ru"}
        >
          РУС
        </Button>
      </div>
    </div>
  )
}
