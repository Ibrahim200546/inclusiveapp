import type { Locale } from "@/lib/translations"

export const practiceGrades = ["0-1", "2", "3", "4"] as const
export type PracticeGrade = typeof practiceGrades[number]

export function gradePracticeHref(grade: PracticeGrade, locale: Locale) {
  return `/original/index2.html?grade=${grade}&lang=${locale}`
}
