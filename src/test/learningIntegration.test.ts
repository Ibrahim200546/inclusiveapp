import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const base = resolve('public/original');
const html = readFileSync(resolve(base, 'index2.html'), 'utf8');

describe('legacy exercise integration', () => {
  it('keeps all shipped audio, script and stylesheet references resolvable and audio IDs unique', () => {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    for (const element of document.querySelectorAll('audio[src], script[src], link[href]')) {
      const raw = element.getAttribute('src') || element.getAttribute('href') || '';
      if (!raw || /^(https?:|\/|data:)/.test(raw)) continue;
      const relative = decodeURIComponent(raw.split('?')[0]);
      expect(existsSync(resolve(base, relative)), `${element.tagName}: ${raw}`).toBe(true);
    }
    const ids = Array.from(document.querySelectorAll('audio[id]') as NodeListOf<HTMLAudioElement>).map(element => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    dom.window.close();
  });

  it('loads a single train owner after legacy scripts and before the audio coordinator', () => {
    const dom = new JSDOM(html);
    const scripts = Array.from(dom.window.document.querySelectorAll('script[src]') as NodeListOf<HTMLScriptElement>).map(element => element.getAttribute('src')!.split('?')[0]);
    expect(scripts.filter(script => script === 'js/voice-practice.js')).toHaveLength(1);
    expect(scripts.indexOf('js/voice-practice.js')).toBeGreaterThan(scripts.indexOf('grade234-functions.js'));
    expect(scripts.indexOf('js/voice-practice.js')).toBeLessThan(scripts.indexOf('js/app-audio.js'));
    for (const file of ['script.js', 'grade234-functions.js']) {
      expect(readFileSync(resolve(base, file), 'utf8')).not.toMatch(/(?:function\s+startVoicePractice|window\.startVoicePractice\s*=)/);
    }
    const button = dom.window.document.getElementById('voiceCenterBtn');
    expect(button?.tagName).toBe('BUTTON');
    expect(button?.getAttribute('type')).toBe('button');
    dom.window.close();
  });

  it('checks new-word mapping against actual files instead of assuming all words have recordings', () => {
    const target: {
      getKkHumanVoiceoverAudioPath?: (text: string, lang: string) => string;
      learningContent?: { syllableWords: Array<{ word: string; original: boolean }> };
    } = {};
    new Function('window', readFileSync(resolve(base, 'js/kk-human-voice-map.js'), 'utf8'))(target);
    new Function('window', 'document', readFileSync(resolve(base, 'js/learning-content.js'), 'utf8'))(target, { readyState: 'loading', addEventListener() {} });
    const newWords = target.learningContent!.syllableWords.filter(entry => !entry.original).map(entry => entry.word);
    expect(newWords).toHaveLength(20);
    const mapped: string[] = [];
    for (const word of newWords) {
      const path = target.getKkHumanVoiceoverAudioPath!(word, 'kk-KZ');
      if (!path) continue;
      expect(existsSync(resolve(base, decodeURIComponent(path))), word).toBe(true);
      const basename = decodeURIComponent(path.split('/').pop()!).replace(/\.[^.]+$/, '').replace(/ \d+$/, '');
      if (basename === word) mapped.push(word);
    }
    // These are map/file-availability checks, not a transcription of the recordings.
    expect(mapped).toHaveLength(14);
    expect(mapped).not.toContain('шар');
  });
});

describe('independent asynchronous playback checks', () => {
  const app = window as any;
  let sounds: Array<EventTarget & { pause: ReturnType<typeof vi.fn> }>;
  let play: ReturnType<typeof vi.fn>;
  const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = `<div id="g0TaskSyllables" class="screen active"><p class="instruction"></p><div class="feedback" id="g0tSyllablesFeedback"></div></div><div id="g0Task3"><div class="letter-circle-container"></div><div id="g0t3Feedback"></div></div>`;
    vi.stubGlobal('currentSyllableCount', 0);
    vi.stubGlobal('currentSyllableWord', '');
    vi.stubGlobal('showReward', vi.fn());
    app.showScreen = vi.fn(); app.playSound = vi.fn();
    app.getKkHumanVoiceoverAudioPath = (word: string) => `sounds/kk-human/${encodeURIComponent(word)}.mp4`;
    vi.stubGlobal('speechSynthesis', { getVoices: () => [], speak: vi.fn(), cancel: vi.fn() });
    sounds = []; play = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('Audio', class extends EventTarget {
      pause = vi.fn();
      play = () => play();
      constructor() { super(); sounds.push(this); }
    });
    new Function(readFileSync(resolve(base, 'js/learning-content.js'), 'utf8'))();
  });
  afterEach(() => {
    vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks();
  });
  function choose(id: string) {
    const data = app.learningContent.syllableWords as Array<{ id: string }>;
    const index = data.findIndex(entry => entry.id === id);
    expect(index).toBeGreaterThan(-1);
    vi.spyOn(Math, 'random').mockReturnValue((index + 0.01) / data.length);
  }
  it('bounds a hung original recording at eight seconds and leaves its answer locked', async () => {
    choose('original-1'); play.mockReturnValue(new Promise(() => {}));
    const pending = app.playSound('syllable');
    await vi.advanceTimersByTimeAsync(7999);
    expect(document.getElementById('g0tSyllablesFeedback')).toHaveTextContent('дайындалуда');
    await vi.advanceTimersByTimeAsync(1); await pending;
    expect(sounds[0].pause).toHaveBeenCalled();
    expect(document.getElementById('g0tSyllablesFeedback')).toHaveTextContent('Жазба ойналмады');
    app.checkSyllables(1);
    expect(app.showReward).not.toHaveBeenCalled();
  });
  it('invalidates an instrument answer after a post-start media error', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    await app.playInstrumentSound();
    sounds[0].dispatchEvent(new Event('error'));
    await flush();
    app.checkInstrument('piano');
    expect(app.showReward).not.toHaveBeenCalled();
    expect(document.getElementById('g0t3Feedback')).toHaveTextContent('Алдымен дыбысты тыңдаңыз');
  });
  it('invalidates an original syllable recording after a post-start error', async () => {
    choose('original-1'); await app.playSound('syllable');
    sounds[0].dispatchEvent(new Event('error'));
    app.checkSyllables(1);
    expect(app.showReward).not.toHaveBeenCalled();
  });
  it('does not let rejection from an old round overwrite a new round', async () => {
    choose('original-1');
    let reject!: (error: Error) => void;
    play.mockImplementationOnce(() => new Promise((_, rej) => { reject = rej; }));
    const oldRound = app.playSound('syllable');
    const newRound = app.playSound('syllable');
    await newRound;
    const newFeedback = document.getElementById('g0tSyllablesFeedback')!.textContent;
    reject(new Error('old failed')); await oldRound;
    expect(document.getElementById('g0tSyllablesFeedback')!.textContent).toBe(newFeedback);
    expect(app.currentSyllableCount).toBe(1);
    expect(sounds[0].pause).toHaveBeenCalled();
  });
  it('falls back visibly when a local Kazakh voice never starts', async () => {
    choose('ат'); app.getKkHumanVoiceoverAudioPath = () => '';
    const cancel = vi.fn();
    vi.stubGlobal('speechSynthesis', { getVoices: () => [{ lang: 'kk-KZ', localService: true }], speak: vi.fn(), cancel });
    vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(public text: string) {} });
    await app.playSound('syllable');
    await vi.advanceTimersByTimeAsync(5000);
    expect(cancel).toHaveBeenCalled();
    expect(document.getElementById('syllableWordDisplay')).toHaveTextContent('ат');
    expect(document.getElementById('syllableWordDisplay')).not.toHaveAttribute('hidden');
  });
  it('ignores a late local-speech error after a correct answer', async () => {
    choose('ат'); app.getKkHumanVoiceoverAudioPath = () => '';
    let utterance: any;
    vi.stubGlobal('speechSynthesis', { getVoices: () => [{ lang: 'kk-KZ', localService: true }], speak: vi.fn(value => { utterance = value; }), cancel: vi.fn() });
    vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(public text: string) {} });
    await app.playSound('syllable');
    utterance.onstart();
    app.checkSyllables(1);
    utterance.onerror();
    app.checkSyllables(1);
    expect(app.showReward).toHaveBeenCalledTimes(1);
  });
  it('ignores a late local-speech start after timeout and completed reading fallback', async () => {
    choose('ат'); app.getKkHumanVoiceoverAudioPath = () => '';
    let utterance: any;
    vi.stubGlobal('speechSynthesis', { getVoices: () => [{ lang: 'kk-KZ', localService: true }], speak: vi.fn(value => { utterance = value; }), cancel: vi.fn() });
    vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(public text: string) {} });
    await app.playSound('syllable');
    await vi.advanceTimersByTimeAsync(5000);
    app.checkSyllables(1);
    utterance.onstart();
    app.checkSyllables(1);
    expect(app.showReward).toHaveBeenCalledTimes(1);
  });
  it('does not award the same round twice when an error arrives after a correct answer', async () => {
    choose('доп'); await app.playSound('syllable');
    app.checkSyllables(1);
    expect(app.showReward).toHaveBeenCalledTimes(1);
    sounds[0].dispatchEvent(new Event('error'));
    app.checkSyllables(1);
    expect(app.showReward).toHaveBeenCalledTimes(1);
  });
});
