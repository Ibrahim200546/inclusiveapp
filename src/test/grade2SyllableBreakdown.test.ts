import { readFileSync } from "node:fs"
import { expect, it, vi } from "vitest"

const read = (file: string) => readFileSync(`public/original/js/${file}.js`, "utf8")

function setup() {
  const documentCopy = document.implementation.createHTMLDocument()
  documentCopy.body.innerHTML = '<section id="grade0Menu" class="screen"></section>'
  const storage = new Map<string, string>()
  const browser = {
    location: { search: "" }, getProfileLang: () => "kk", showScreen: vi.fn(), showReward: vi.fn(), addEventListener: vi.fn(), scrollTo: vi.fn(),
    CorexLearning: { shuffle: (items: unknown[]) => [...items] },
    CorexExerciseOrbit: { illustrate(button: HTMLButtonElement, _picture: string, caption: string) { button.textContent = caption }, layout() {} },
  }
  class SampleAudio extends EventTarget {
    currentTime = 0
    play() { queueMicrotask(() => this.dispatchEvent(new Event("ended"))); return Promise.resolve() }
    pause() {}
  }
  for (const file of ["curriculum-content", "curriculum-session", "curriculum-ui"]) {
    new Function("window", "document", "localStorage", "Audio", read(file))(browser, documentCopy, {
      getItem: (key: string) => storage.get(key), setItem: (key: string, value: string) => storage.set(key, value),
    }, SampleAudio)
  }
  if (documentCopy.readyState === "loading") documentCopy.dispatchEvent(new Event("DOMContentLoaded"))
  const { CorexCurriculumContent: content, CorexCurriculumUI: ui, CorexCurriculum: engine } = browser as unknown as {
    CorexCurriculumContent: { lessons: { grade: number; id: string; steps: { id: string; syllables: string[]; answer: string; stimulus: string; audio: string }[] }[] },
    CorexCurriculumUI: { openLesson(item: unknown): void },
    CorexCurriculum: { identity(item: unknown): string },
  }
  return { documentCopy, storage, content, ui, engine }
}

it("assigns the exact authored segments and leaves the grade-2 lesson progress identity intact", () => {
  const { content, engine } = setup()
  const lesson = content.lessons.find(l => l.id === "g2-syllable-count")!
  const source = JSON.parse(readFileSync("docs/trello-verification/content-drafts.json", "utf8")).syllableReading.items
  expect(lesson.steps).toHaveLength(9)
  expect(engine.identity(lesson)).toBe("2:10:pronunciation:2.2.1.7:g2-syllable-count")
  for (const [i, step] of lesson.steps.entries()) {
    expect(step).toMatchObject({ id: `word-${i}`, syllables: source[i].syllables, answer: String(source[i].count), stimulus: source[i].word })
    expect(step.syllables.join("")).toBe(step.stimulus)
    expect(readFileSync("public/original/" + step.audio).length).toBeGreaterThan(0)
  }
})

it("reveals sequential syllables only after a correct answer and clears them on the next word", async () => {
  const { documentCopy: doc, content, ui } = setup()
  ui.openLesson(content.lessons.find(l => l.id === "g2-syllable-count")!)
  const breakdown = doc.querySelector<HTMLElement>(".curriculum-syllable-breakdown")!
  const answer = doc.querySelector<HTMLButtonElement>('[data-choice="2"]')!
  expect(breakdown.hidden).toBe(true)
  expect(answer.disabled).toBe(true)
  doc.querySelector<HTMLButtonElement>(".curriculum-listen")!.click()
  await vi.waitFor(() => expect(answer.disabled).toBe(false))
  doc.querySelector<HTMLButtonElement>('[data-choice="3"]')!.click()
  expect(breakdown.hidden).toBe(true)
  const now = vi.spyOn(Date, "now").mockReturnValue(Date.now() + 400)
  try { answer.click() } finally { now.mockRestore() }
  expect(breakdown.hidden).toBe(false)
  const shown = [...breakdown.querySelectorAll<HTMLElement>(".curriculum-syllable-animate")]
  expect(shown.map(n => n.textContent)).toEqual(["мек", "теп"])
  expect(shown.map(n => n.style.getPropertyValue("--syllable-delay"))).toEqual(["0ms", "450ms"])
  expect(doc.querySelector(".curriculum-feedback")?.textContent).toContain("мек–теп")
  doc.querySelector<HTMLButtonElement>(".curriculum-next")!.click()
  expect(breakdown.hidden).toBe(true)
  expect(breakdown.textContent).toBe("")
})
