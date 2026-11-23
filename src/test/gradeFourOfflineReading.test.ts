import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { expect, it, vi } from 'vitest';

it.each([
  ['kk', 'Қолданба бұл оқылымды растамайды және ұпай қоспайды.'],
  ['ru', 'Приложение не подтверждает этот результат и не начисляет баллы.'],
])('keeps public no-microphone reading informational in %s', (lang, expected) => {
  const source = readFileSync('public/original/grade234-functions.js', 'utf8');
  const handlers = source.match(/function readingText\([\s\S]*?\n}/)![0] + '\n'
    + source.match(/function explainOfflineReading\([\s\S]*?\n}/)![0];
  const markup = readFileSync('public/original/index2.html', 'utf8');
  const dom = new JSDOM(markup, { runScripts: 'outside-only', url: 'https://example.test/original/' });
  const w = dom.window;
  try {
    const showReward = vi.fn(), clearReadingSample = vi.fn();
    Object.assign(w, { showReward, clearReadingSample, getProfileLang: () => lang });
    w.eval(handlers);
    const button = w.document.querySelector<HTMLButtonElement>('#g4ReadingOfflineHelp')!;
    expect(button.getAttribute('onclick')).toBe('explainOfflineReading()');
    const screen = w.document.querySelector('#g4Task3')!;
    const panel = w.document.querySelector<HTMLDetailsElement>('#g4ReadingLive')!;
    const status = w.document.querySelector('#g4t3Feedback')!;
    w.eval('explainOfflineReading()');
    expect(status.textContent).not.toContain(expected);
    panel.open = true;
    screen.classList.add('active');
    w.eval('explainOfflineReading(); explainOfflineReading()');
    expect(status.textContent).toContain(expected);
    expect(button.disabled).toBe(false);
    expect(showReward).not.toHaveBeenCalled();
    expect(clearReadingSample).not.toHaveBeenCalled();
    expect(w.localStorage.length).toBe(0);
  } finally {
    w.close();
  }
});
