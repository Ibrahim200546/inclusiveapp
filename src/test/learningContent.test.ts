import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const source = readFileSync(resolve('public/original/js/learning-content.js'), 'utf8');
const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
let play: ReturnType<typeof vi.fn>, pause: ReturnType<typeof vi.fn>;
function setup() {
  document.body.innerHTML = `<div id="g0TaskSyllables" class="screen active"><p class="instruction"></p><div class="feedback" id="g0tSyllablesFeedback"></div></div><div id="g0Task3" class="screen"><div class="letter-circle-container"></div><div id="g0t3Feedback"></div></div><div id="g4t2Feedback"></div>`;
  vi.stubGlobal('currentSyllableCount', 0); vi.stubGlobal('currentSyllableWord', ''); vi.stubGlobal('currentDialogSpeaker', '');
  (window as any).showScreen = vi.fn(); (window as any).showReward = vi.fn(); (window as any).playSound = vi.fn();
  (window as any).getKkHumanVoiceoverAudioPath = vi.fn(() => '');
  play = vi.fn(() => Promise.resolve()); pause = vi.fn();
  vi.stubGlobal('Audio', function(this: any, src: string) { this.src = src; this.play = play; this.pause = pause; });
  new Function(source)();
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
beforeEach(setup);
describe('Kazakh syllables and instruments', () => {
  it('retains all four original recordings and adds exactly five distinct words per group', () => {
    const data = (window as any).learningContent.syllableWords;
    expect(data).toHaveLength(24);
    for (let count = 1; count <= 4; count++) {
      const group = data.filter((x: any) => x.count === count);
      expect(group.filter((x: any) => !x.original)).toHaveLength(5);
      expect(group.find((x: any) => x.original).audio).toBe(`sounds/syllables/word_${count}.mp3`);
      for (const entry of group.filter((x: any) => x.word)) expect(entry.word.match(/[аәеоөұүыіиуяюэ]/g)?.length).toBe(count);
    }
    expect(new Set(data.map((x: any) => x.id)).size).toBe(24);
  });
  it('shows honest reading mode without a Kazakh recording/installed local voice, and rewards only once', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(1 / 24 + .001); // ат
    await (window as any).playSound('syllable'); await flush();
    expect(document.querySelector('#syllableWordDisplay')).toHaveTextContent('ат');
    expect(document.querySelector('#g0tSyllablesFeedback')).toHaveTextContent('аудиосы әзірге жоқ');
    (window as any).checkSyllables(2); expect((window as any).showReward).not.toHaveBeenCalled();
    (window as any).checkSyllables(1); (window as any).checkSyllables(1);
    expect((window as any).showReward).toHaveBeenCalledTimes(1);
  });
  it('does not unlock answers for a failed original recording', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); play.mockRejectedValue(new Error('missing'));
    await (window as any).playSound('syllable');
    (window as any).checkSyllables(1);
    expect((window as any).showReward).not.toHaveBeenCalled();
  });
  it('does not substitute a remote or Russian system voice', async () => {
    const speak = vi.fn(); vi.stubGlobal('speechSynthesis', {getVoices: () => [{lang:'ru-RU',localService:true},{lang:'kk-KZ',localService:false}], speak, cancel: vi.fn()});
    vi.spyOn(Math,'random').mockReturnValue(1 / 24 + .001);
    await (window as any).playSound('syllable'); expect(speak).not.toHaveBeenCalled();
  });
  it('ignores a late playback resolution after navigation', async () => {
    let finish!: () => void; play.mockImplementation(() => new Promise<void>(r => { finish = r; }));
    vi.spyOn(Math,'random').mockReturnValue(0);
    const pending = (window as any).playSound('syllable');
    (window as any).showScreen('grade0Menu'); finish(); await pending;
    expect((window as any).currentSyllableCount).toBe(0); expect(pause).toHaveBeenCalled();
  });
  it('never requests missing dialogue tracks or permits a stale answer', () => {
    (window as any).currentDialogSpeaker = 'child'; (window as any).playSound('dialog');
    expect((window as any).currentDialogSpeaker).toBe(''); expect(play).not.toHaveBeenCalled();
    expect(document.querySelector('#g4t2Feedback')).toHaveTextContent('уақытша қолжетімсіз');
  });
  it('only enables instruments with real available files and displays unrecorded instruments as information', () => {
    const data = (window as any).learningContent.instrumentData;
    expect(data.some((x: any) => x.id === 'dombra')).toBe(true); expect(data.some((x: any) => x.id === 'qobyz')).toBe(true);
    for (const entry of data.filter((x: any) => x.audio)) expect(existsSync(resolve('public/original',entry.audio))).toBe(true);
    expect(document.querySelectorAll('.instrument-choice')).toHaveLength(data.filter((x:any)=>x.audio).length);
    expect(document.querySelectorAll('audio[src*="human_complex"]')).toHaveLength(0);
  });
});
