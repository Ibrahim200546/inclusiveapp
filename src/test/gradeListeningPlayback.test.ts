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

it("rejects silent and constant dialogue uploads without unlocking answers or rewards", async () => {
  const doc = document.implementation.createHTMLDocument()
  doc.body.innerHTML = '<label id="g2SoundPropertyLabel"></label><select id="g2SoundPropertyMode"></select><section class="screen active"><div id="dialog" data-speech-listening="4"></div></section>'
  const waveforms = [[0, 0], [0.3, 0.3], [0, 0.1], [0, 0.2], [0, 0.3]]
  const decodeAudioData = vi.fn(async (buffer: ArrayBuffer) => ({
    duration: 1,
    length: 2,
    numberOfChannels: 1,
    getChannelData: () => Float32Array.from(waveforms[new Uint8Array(buffer)[0]]),
  }))
  const browser = {
    getProfileLang: () => "ru", addEventListener: vi.fn(), showReward: vi.fn(),
    AudioContext: class { decodeAudioData = decodeAudioData },
  }
  const urls = { createObjectURL: vi.fn(() => "blob:sample"), revokeObjectURL: vi.fn() }
  const crypto = { subtle: { digest: vi.fn(async (_name: string, buffer: ArrayBuffer) => buffer.slice(0)) } }
  new Function("window", readFileSync("public/original/js/learning-session.js", "utf8"))(browser)
  const marker = "// Recorded listening exercises and isolated sound properties"
  const actual = readFileSync("public/original/grade234-functions.js", "utf8")
  new Function("window", "document", "URL", "crypto", actual.slice(actual.indexOf(marker)))(browser, doc, urls, crypto)
  doc.dispatchEvent(new Event("DOMContentLoaded"))

  async function upload(speaker: string, id: number) {
    const input = doc.querySelector<HTMLInputElement>(`[data-speaker="${speaker}"]`)!
    Object.defineProperty(input, "files", {
      configurable: true,
      value: [{ size: 4, arrayBuffer: async () => Uint8Array.of(id).buffer }],
    })
    input.dispatchEvent(new Event("change"))
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  }

  const listen = doc.querySelector<HTMLButtonElement>("[data-speech-play]")!
  const next = doc.querySelector<HTMLButtonElement>("[data-speech-next]")!
  const answers = [...doc.querySelectorAll<HTMLButtonElement>("[data-speech-answer]")]
  await upload("child", 2)
  await upload("adult", 3)
  await upload("both", 4)
  expect(listen.disabled).toBe(false)
  expect(urls.createObjectURL).toHaveBeenCalledTimes(3)

  for (const id of [0, 1]) {
    await upload("child", id)
    expect(doc.getElementById("g4t2Feedback")!.textContent).toContain("В записи нет звука")
    expect(listen.disabled).toBe(true)
    expect(next.disabled).toBe(true)
    expect(answers.every(answer => answer.disabled)).toBe(true)
    for (const answer of answers) answer.click()
    expect(browser.showReward).not.toHaveBeenCalled()
    expect(urls.createObjectURL).toHaveBeenCalledTimes(3)
  }
  expect(urls.revokeObjectURL).toHaveBeenCalledOnce()

  await upload("child", 2)
  expect(listen.disabled).toBe(false)
  expect(answers.every(answer => answer.disabled)).toBe(true)
})
