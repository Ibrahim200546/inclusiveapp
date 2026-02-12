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
      <Languages className="size-4 text-muted-foreground" />
      <div className="flex gap-1">
        <Button
          variant={currentLocale === "kk" ? "default" : "ghost"}
          size="sm"
          onClick={() => onLanguageChange("kk")}
          className="text-sm"
        >
          ҚАЗ
        </Button>
        <Button
          variant={currentLocale === "ru" ? "default" : "ghost"}
          size="sm"
          onClick={() => onLanguageChange("ru")}
          className="text-sm"
        >
          РУС
        </Button>
      </div>
    </div>
  )
}
