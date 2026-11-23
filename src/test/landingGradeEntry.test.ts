import { readFileSync } from "node:fs"
import { expect, it, vi } from "vitest"
import { gradePracticeHref, practiceGrades } from "@/lib/practice-sections"

const source = readFileSync("public/original/js/landing-grade-entry.js", "utf8")
function open(search: string) {
  const showScreen = vi.fn()
  const applyProfileLanguage = vi.fn()
  const document = { readyState: "complete", getElementById: (id: string) => /^grade[0234]Menu$/.test(id) }
  new Function("window", "document", source)({ location: { search }, showScreen, applyProfileLanguage }, document)
  return { showScreen, applyProfileLanguage }
}

it.each(practiceGrades)("opens the real grade menu for %s using the link language", grade => {
  const href = gradePracticeHref(grade, "kk")
  const { showScreen, applyProfileLanguage } = open(new URL(href, "http://localhost").search)
  expect(showScreen).toHaveBeenCalledExactlyOnceWith(`grade${grade === "0-1" ? 0 : grade}Menu`)
  expect(applyProfileLanguage).toHaveBeenCalledExactlyOnceWith("kk")
  expect(applyProfileLanguage.mock.invocationCallOrder[0]).toBeLessThan(showScreen.mock.invocationCallOrder[0])
})

it("leaves historical plain and unknown routes alone", () => {
  for (const search of ["", "?grade=4Menu&lang=ru", "?grade=1&lang=kk", "?lang=ru"]) {
    const result = open(search)
    expect(result.showScreen).not.toHaveBeenCalled()
    expect(result.applyProfileLanguage).not.toHaveBeenCalled()
  }
})
