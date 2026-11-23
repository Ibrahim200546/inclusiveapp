import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';

it('stops both tracks from a late permission response after leaving voice presence', async () => {
  const markup = readFileSync('public/original/index2.html', 'utf8');
  const start = markup.indexOf('<div id="voicePresenceScreen"');
  const end = markup.indexOf('<div id="g0Task1"', start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const template = document.createElement('template');
  template.innerHTML = markup.slice(start, end);
  document.body.append(template.content);
  const screen = document.getElementById('voicePresenceScreen')!;
  screen.classList.add('active');
  const control = (act: string) => screen.querySelector<HTMLButtonElement>(`[data-act="${act}"]`)!;
  const camera = screen.querySelector<HTMLVideoElement>('[data-part="camera"]')!;
  const input = screen.querySelector<HTMLInputElement>('input[type="file"]')!;
  const attach = vi.fn();
  Object.defineProperty(camera, 'srcObject', { set: attach });
  const stop = [vi.fn(), vi.fn()];
  const stream = { getTracks: () => stop.map(stopTrack => ({ stop: stopTrack })) };
  let finishPermission!: (media: typeof stream) => void;
  const permission = new Promise<typeof stream>(resolve => { finishPermission = resolve; });
  const getUserMedia = vi.fn(() => permission);
  const browser = {
    MediaRecorder: vi.fn(),
    CorexGrades: { current: 1, recordListening: vi.fn() },
    showScreen: () => screen.classList.remove('active'),
    addEventListener: vi.fn(),
  };
  const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  const load = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
  const source = readFileSync('public/original/js/voice-presence.js', 'utf8');
  // Run the shipped code against its real section and a completely synthetic media API.
  try {
    new Function('window', 'navigator', 'cancelAnimationFrame', source)(browser, { mediaDevices: { getUserMedia } }, () => {});
    document.dispatchEvent(new Event('DOMContentLoaded'));
    control('record').click();
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(input.disabled).toBe(true);
    control('back').click();
    await vi.waitFor(() => expect(input.disabled).toBe(false));
    finishPermission(stream);
    await vi.waitFor(() => stop.forEach(stopTrack => expect(stopTrack).toHaveBeenCalledTimes(1)));
    expect(attach.mock.calls).toEqual([[null]]);
    expect(browser.MediaRecorder).not.toHaveBeenCalled();
    expect(browser.CorexGrades.recordListening).not.toHaveBeenCalled();
    expect(control('play').hidden).toBe(true);
    expect(control('continue').hidden).toBe(true);
  } finally {
    screen.remove();
    pause.mockRestore();
    load.mockRestore();
  }
});
