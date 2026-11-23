import { readFileSync } from "node:fs"
import { expect, it, vi } from "vitest"

it("keeps rewards blocked when playback stalls and allows a fresh complete recording", () => {
  vi.useFakeTimers()
  try {
    const doc = document.implementation.createHTMLDocument()
    doc.body.innerHTML = '<label id="g2SoundPropertyLabel"></label><select id="g2SoundPropertyMode"></select><section class="screen active"><div id="intonation" data-speech-listening="3"></div></section><section class="screen"><div id="dialog" data-speech-listening="4"></div></section>'
    const audio: SampleAudio[] = []
    class SampleAudio {
      currentTime = 0
      onended: null | (() => void) = null
      ontimeupdate: null | (() => void) = null
      pause = vi.fn()
      play() { return Promise.resolve() }
      constructor(public readonly src: string) { audio.push(this) }
    }
    const browser = { getProfileLang: () => "ru", addEventListener: vi.fn(), showReward: vi.fn() }
    new Function("window", readFileSync("public/original/js/learning-session.js", "utf8"))(browser)
    const guard = "// Recorded listening exercises and isolated sound properties"
    const actual = readFileSync("public/original/grade234-functions.js", "utf8")
    new Function("window", "document", "Audio", actual.slice(actual.indexOf(guard)))(browser, doc, SampleAudio)
    doc.dispatchEvent(new Event("DOMContentLoaded"))
    const listen = doc.querySelector<HTMLButtonElement>("#intonation [data-speech-play]")!
    const answers = [...doc.querySelectorAll<HTMLButtonElement>("#intonation [data-speech-answer]")]
    const dialog = doc.querySelector("#dialog")!
    expect([...dialog.querySelectorAll<HTMLInputElement>("input")].map(el => el.dataset.speaker)).toEqual(["child", "adult", "both"])
    expect(dialog.querySelector<HTMLButtonElement>("[data-speech-play]")!.disabled).toBe(true)
    listen.click()
    expect(listen.disabled).toBe(true)
    expect(answers.every(answer => answer.disabled)).toBe(true)
    const staleEnd = audio[0].onended!
    vi.advanceTimersByTime(8000)
    expect(audio[0].pause).toHaveBeenCalledOnce()
    expect(listen.disabled).toBe(false)
    expect(doc.getElementById("g3t2Feedback")!.textContent).toContain("не прозвучала")
    staleEnd()
    expect(answers.every(answer => answer.disabled)).toBe(true)
    expect(browser.showReward).not.toHaveBeenCalled()
    listen.click()
    vi.advanceTimersByTime(7500)
    audio[1].currentTime = 4
    audio[1].ontimeupdate!()
    vi.advanceTimersByTime(7500)
    expect(listen.disabled).toBe(true)
    audio[1].onended!()
    expect(answers.every(answer => !answer.disabled)).toBe(true)
    expect(browser.showReward).not.toHaveBeenCalled()
  } finally {
    vi.useRealTimers()
  }
})
