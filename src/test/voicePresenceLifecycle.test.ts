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

it('recovers from video stalls and blocks preview confirmation for a constant signal', async () => {
  vi.useFakeTimers();
  const doc = document.implementation.createHTMLDocument();
  const markup = readFileSync('public/original/index2.html', 'utf8');
  const start = markup.indexOf('<div id="voicePresenceScreen"');
  doc.body.innerHTML = markup.slice(start, markup.indexOf('<div id="g0Task1"', start));
  const screen = doc.getElementById('voicePresenceScreen')!;
  screen.classList.add('active');
  const control = (act: string) => screen.querySelector<HTMLButtonElement>(`[data-act="${act}"]`)!;
  const input = screen.querySelector<HTMLInputElement>('input[type="file"]')!;
  const feedback = screen.querySelector('[data-part="feedback"]')!;
  const load = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
  const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  const recordListening = vi.fn();
  let varying = false;
  const connect = vi.fn();
  const analyser = {
    fftSize: 2048, connect,
    getByteTimeDomainData(samples: Uint8Array) {
      samples.fill(135);
      if (varying) samples[0] = 140;
    },
  };
  const browser = {
    AudioContext: class {
      state = 'running';
      createMediaElementSource() { return { connect }; }
      createGain() { return { connect, gain: { value: 1 } }; }
      createAnalyser() { return analyser; }
    },
    getProfileLang: () => 'ru',
    CorexGrades: { current: 1, recordListening },
    addEventListener: vi.fn(),
  };
  try {
    new Function('window', 'document', 'navigator', 'URL', 'requestAnimationFrame', 'cancelAnimationFrame',
      readFileSync('public/original/js/voice-presence.js', 'utf8'))(
      browser, doc, {}, { createObjectURL: () => 'blob:local' }, () => 1, () => {});
    doc.dispatchEvent(new Event('DOMContentLoaded'));
    Object.defineProperty(input, 'files', { value: [new Blob()] });
    input.dispatchEvent(new Event('change'));
    const video = screen.querySelector<HTMLVideoElement>('[data-part="video"]')!;
    Object.defineProperties(video, { videoWidth: { value: 320 }, videoHeight: { value: 240 } });
    video.dispatchEvent(new Event('loadedmetadata'));

    control('play').click();
    expect(control('play').disabled).toBe(true);
    vi.advanceTimersByTime(7000);
    video.currentTime = 2;
    video.dispatchEvent(new Event('timeupdate'));
    vi.advanceTimersByTime(7000);
    expect(control('play').disabled).toBe(true);
    vi.advanceTimersByTime(1000);
    expect(control('play').disabled).toBe(false);
    expect(feedback.textContent).toContain('Не удалось воспроизвести');
    video.dispatchEvent(new Event('ended'));
    expect(control('continue').hidden).toBe(true);

    control('play').click();
    video.dispatchEvent(new Event('ended'));
    expect(feedback.textContent).toContain('Звуковой сигнал не обнаружен');
    expect(control('continue').hidden).toBe(true);
    varying = true;
    control('play').click();
    video.dispatchEvent(new Event('ended'));
    expect(control('continue').hidden).toBe(false);
    expect(recordListening).not.toHaveBeenCalled();
  } finally {
    vi.useRealTimers();
    play.mockRestore();
    pause.mockRestore();
    load.mockRestore();
  }
});
