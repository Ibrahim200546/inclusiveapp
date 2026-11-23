import { readFileSync } from "node:fs"
import { expect, it, vi } from "vitest"

it.each(["kk", "ru"])("catalog has one junior syllable-reading voice route, with contextual return (%s)", language => {
  const doc = new DOMParser().parseFromString(readFileSync("public/original/index2.html", "utf8"), "text/html")
  const show = (id: string) => {
    doc.querySelector(".screen.active")?.classList.remove("active")
    doc.getElementById(id)?.classList.add("active")
  }
  const browser = {
    location: { search: "" }, getProfileLang: () => language, showScreen: show, addEventListener: vi.fn(), scrollTo: vi.fn(),
    CorexLearning: { shuffle: (items: unknown[]) => [...items] }, CorexGrades: { current: 0 },
    CorexExerciseOrbit: { illustrate(button: HTMLButtonElement, _picture: string, caption: string) { button.textContent = caption }, layout() {} },
  }
  // Model only the two generated source buttons. The actual DOM, registry, module
  // grouping, deduplication, catalog dispatch and return wrapper run unmodified.
  for (const id of ["grade0VoiceMenu", "grade0DauyspenmMenu"]) {
    const control = doc.createElement("button")
    control.className = "radial-item"
    control.dataset.catalogKey = "syllable-reading:voice"
    control.textContent = "Буындап оқу"
    control.addEventListener("click", () => browser.showScreen("g0TynysByTask2"))
    doc.querySelector(`#${id} .radial-menu-container`)!.append(control)
  }
  for (const file of ["curriculum-content", "curriculum-session", "curriculum-ui"]) {
    new Function("window", "document", "localStorage", readFileSync(`public/original/js/${file}.js`, "utf8"))(browser, doc, { getItem: () => null })
  }
  if (doc.readyState === "loading") doc.dispatchEvent(new Event("DOMContentLoaded"))
  const click = (selector: string) => {
    const control = doc.querySelector<HTMLButtonElement>(selector)
    expect(control, selector).not.toBeNull()
    control!.click()
  }
  const syllable = '[data-activity="syllable-reading:voice"]'
  click('#grade0Menu [data-curriculum-module="speech"]')
  click('#curriculumCatalog [data-topic-group="voice"]')
  expect(doc.querySelectorAll(syllable)).toHaveLength(1)
  expect(doc.querySelector(syllable)?.getAttribute("aria-label")).toBe(language === "kk" ? "Буындап оқу (Дауыс)" : "Чтение по слогам (Голос)")
  expect(doc.querySelectorAll("#curriculum-lessons .curriculum-task-tile").length).toBeLessThanOrEqual(6)
  click(syllable)
  expect(doc.querySelector(".screen.active")?.id).toBe("g0TynysByTask2")
  browser.showScreen("grade0VoiceMenu")
  expect(doc.querySelector(".screen.active")?.id).toBe("curriculumCatalog")
  expect(doc.querySelectorAll(syllable)).toHaveLength(1)
  click('#grade0Menu [data-curriculum-module="phonetics"]')
  click('#curriculumCatalog [data-topic-group="syllables"]')
  expect(doc.querySelector(syllable)).toBeNull()
  expect(doc.querySelector('[data-activity="g0TaskSyllables"]')).not.toBeNull()
  const containsVoiceRoute = (): boolean => {
    if (doc.querySelector(syllable)) return true
    for (const group of [...doc.querySelectorAll<HTMLButtonElement>("#curriculumCatalog [data-topic-group]")]) {
      // Re-rendering detaches the saved button, so reselect the current group.
      click(`#curriculumCatalog [data-topic-group="${group.dataset.topicGroup}"]`)
      if (containsVoiceRoute()) return true
      click("#curriculumCatalog .curriculum-toolbar button")
    }
    return false
  }
  for (const module of ["listening", "breathing"]) {
    click(`#grade0Menu [data-curriculum-module="${module}"]`)
    expect(containsVoiceRoute()).toBe(false)
  }
})
