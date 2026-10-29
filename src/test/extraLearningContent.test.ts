import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

interface Word { word: string; count: number; audio: string; source: string; license: string }
interface Content { syllables: Word[] }
function loadContent(): Content {
  const scope: { EXTRA_LEARNING_CONTENT?: Content } = {};
  const script = readFileSync(resolve("public/original/js/extra-learning-content.js"), "utf8");
  new Function("window", script)(scope);
  return scope.EXTRA_LEARNING_CONTENT!;
}

function assetBytes(path: string) {
  expect(path).not.toMatch(/^(https?:|data:)|\.\./);
  const bytes = readFileSync(resolve("public/original", path));
  expect(bytes.length).toBeGreaterThan(500);
  expect(bytes.subarray(0, 128).toString()).not.toMatch(/<!doctype|<html|Too many requests/i);
  return bytes;
}

describe("additional listening content", () => {
  it("adds five distinct real recordings to each existing syllable group", () => {
    const { syllables } = loadContent();
    expect(syllables).toHaveLength(20);
    expect(new Set(syllables.map(item => item.word)).size).toBe(20);
    expect(new Set(syllables.map(item => item.audio)).size).toBe(20);
    for (const count of [1, 2, 3, 4]) expect(syllables.filter(item => item.count === count)).toHaveLength(5);
    for (const item of syllables) {
      expect(item.word).not.toMatch(/\s/);
      expect((item.word.match(/[аәеёиіоөұүуыэюя]/gi) ?? []).length).toBe(item.count);
      expect(item.audio).not.toMatch(/Alippe|kk-human\/[а-яәғқңөұүһі] /i);
      expect(item.source).toBeTruthy();
      expect(item.license).toBeTruthy();
      const bytes = assetBytes(item.audio);
      if (item.audio.endsWith(".wav")) {
        expect(bytes.subarray(0, 4).toString()).toBe("RIFF");
        expect(bytes.subarray(8, 12).toString()).toBe("WAVE");
      } else if (item.audio.endsWith(".mp4")) {
        expect(bytes.subarray(4, 8).toString()).toBe("ftyp");
      }
    }
  });

  it("plays exactly three instrument melodies in the grade 1 instrument task", () => {
    const ui = readFileSync(resolve("public/original/js/extra-learning-ui.js"), "utf8");
    const audio = [...ui.matchAll(/audio:'(sounds\/instruments\/[^']+)'/g)].map(match => match[1]);
    expect(audio).toEqual(["sounds/instruments/drum.mp3", "sounds/instruments/guitar.mp3", "sounds/instruments/dombra.mp3"]);
    for (const path of audio) {
      const bytes = assetBytes(path);
      // MP3 files start with an ID3 tag or an MPEG frame sync.
      expect(bytes.subarray(0, 3).toString() === "ID3" || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)).toBe(true);
    }
  });
});
