import { readFileSync } from "node:fs"
import { expect, it, vi } from "vitest"

it("finds either order of the same Grade 1 sounds, without blending classes or distinct letters", () => {
  const doc = document.implementation.createHTMLDocument()
  doc.body.innerHTML = '<section id="grade0Menu" class="screen"></section>'
  const browser = {
    location: { search: "" }, getProfileLang: () => "ru", showScreen: vi.fn(), addEventListener: vi.fn(), scrollTo: vi.fn(),
    CorexLearning: { shuffle: (items: unknown[]) => [...items] },
    CorexExerciseOrbit: { illustrate(button: HTMLButtonElement, _picture: string, caption: string) { button.textContent = caption }, layout() {} },
  }
  for (const f of ["curriculum-content", "curriculum-session", "curriculum-ui"]) {
    new Function("window", "document", "localStorage", readFileSync(`public/original/js/${f}.js`, "utf8"))(browser, doc, { getItem: () => null })
  }
  if (doc.readyState === "loading") doc.dispatchEvent(new Event("DOMContentLoaded"))
  const { CorexCurriculumContent: content, CorexCurriculumUI: ui } = browser as unknown as {
    CorexCurriculumContent: { lessons: { grade: number; id: string; title: string }[] },
    CorexCurriculumUI: { openLesson(lesson: unknown): void },
  }
  const grade1 = content.lessons.filter(l => l.grade === 1 && /^pair-\d+$/.test(l.id))
  ui.openLesson(grade1.find(l => l.title === "А–Ә")!)
  const panel = doc.querySelector(".curriculum-pair-tools")!
  const search = panel.querySelector<HTMLInputElement>('input[type="search"]')!
  const pairs = panel.querySelector<HTMLSelectElement>("select")!
  const status = panel.querySelector('[role="status"]')!
  const controls = [...panel.querySelectorAll<HTMLButtonElement>("button")]
  const start = controls.at(-1)!
  const filter = (value: string) => { search.value = value; search.dispatchEvent(new Event("input")) }
  expect(search.getAttribute("aria-describedby")).toBe(status.id)
  expect(pairs.options.length).toBe(grade1.length)
  filter("ә‑а")
  expect([...pairs.options].map(x => x.textContent)).toEqual(["А–Ә"])
  expect(status.textContent).toBe("Найдено пар: 1")
  const samples = panel.querySelector(".curriculum-pair-samples")!
  expect(samples.children.length).toBe(2)
  filter("ә‑ә")
  expect(pairs.disabled).toBe(true)
  expect(start.disabled).toBe(true)
  expect(status.textContent).toContain("Пара не найдена")
  expect(samples.children.length).toBe(0)
  filter("")
  expect(pairs.disabled).toBe(false)
  expect(start.disabled).toBe(false)
  expect(status.textContent).toBe("")
  expect(pairs.options.length).toBe(grade1.length)
})
