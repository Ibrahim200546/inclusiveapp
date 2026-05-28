import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const htmlPath = resolve(process.cwd(), "public/original/index2.html");

declare global {
  interface Window {
    getProfileLang: () => string;
    initAlippeLocal: () => void;
    playAlippeSoundLocal: (letter: string) => void;
  }
}

function loadAlippeModeScript() {
  const html = readFileSync(htmlPath, "utf8");
  const start = html.indexOf("function getAlippeModeLabels()");
  const endMarker = "window.addEventListener('profile-language-change', () => setTimeout(bindAlippeModeControls, 0));";
  const end = html.indexOf(endMarker, start);

  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);

  const script = html.slice(start, end + endMarker.length);
  new Function(script)();
}

function createAlippePanel() {
  document.body.innerHTML = `
    <div class="alippe-panel">
      <div class="alippe-header">Alippe</div>
      <div class="alippe-grid">
        <div class="alippe-item"><span>apple</span><span>A</span><span>Alma</span></div>
        <div class="alippe-item"><span>bird</span><span>B</span><span>Bala</span></div>
        <div class="alippe-item"><span>cat</span><span>C</span><span>Cat</span></div>
      </div>
    </div>
  `;

  return document.querySelector<HTMLElement>(".alippe-panel")!;
}

function click(selector: string) {
  const element = document.querySelector<HTMLElement>(selector);
  expect(element).not.toBeNull();
  element!.click();
  return element!;
}

describe("legacy Alippe focus mode", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.getProfileLang = () => "kk";
    window.initAlippeLocal = vi.fn();
    window.playAlippeSoundLocal = vi.fn();
  });

  it("navigates letters and fully exits through the center Alippe button", () => {
    const panel = createAlippePanel();
    loadAlippeModeScript();

    click(".alippe-header-button");

    expect(panel).toHaveClass("alippe-focus-mode");
    expect(document.querySelectorAll(".alippe-focus-card")).toHaveLength(1);
    expect(window.playAlippeSoundLocal).toHaveBeenLastCalledWith("A");

    click('[data-alippe-action="next"]');
    expect(document.querySelector(".alippe-focus-letter")).toHaveTextContent("B");
    expect(window.playAlippeSoundLocal).toHaveBeenLastCalledWith("B");

    click('[data-alippe-action="back"]');
    expect(panel).toHaveClass("alippe-focus-mode");
    expect(document.querySelector(".alippe-focus-letter")).toHaveTextContent("A");
    expect(window.playAlippeSoundLocal).toHaveBeenLastCalledWith("A");

    click('[data-alippe-action="replay"]');
    expect(window.playAlippeSoundLocal).toHaveBeenLastCalledWith("A");

    click('[data-alippe-action="toggle"]');
    expect(panel).not.toHaveClass("alippe-focus-mode");
    expect(document.querySelector(".alippe-focus-card")).toBeNull();

    click(".alippe-item:nth-child(2)");
    expect(panel).not.toHaveClass("alippe-focus-mode");
    expect(document.querySelector(".alippe-focus-card")).toBeNull();
  });
});
