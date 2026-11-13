import { describe, expect, it } from 'vitest';
import { alphabet } from './alphabet';
import { buildRows, normalizeInput, splitSentence, splitWord, syllableAudio } from './content';
import { generateSentenceRows, parseSentenceRows } from './sentences';

describe('reading content', () => {
  it('preserves syllable boundaries, whole sentence spacing and cumulative word rows', () => {
    expect(splitWord('Мектеп')).toEqual(['Мек', 'теп']);
    expect(splitWord('Ручка')).toEqual(['Руч', 'ка']);
    expect(splitSentence('  Ана   бала  ')).toEqual([{ text: 'А' }, { text: 'на' }, { space: true }, { text: 'ба' }, { text: 'ла' }]);
    expect(buildRows('words', 'Балалар')).toEqual([['Ба'], ['Ба', 'ла'], ['Ба', 'ла', 'лар']]);
    expect(buildRows('syllables', 'ТА')).toHaveLength(4);
    expect(buildRows('syllables', 'РА')).toHaveLength(5);
    expect(normalizeInput('syllables', 'т2aа!')).toBe('ТА');
    expect(syllableAudio('та')).toBe('sounds/syllable-reading/ta.mp3');
    expect(syllableAudio('ПА')).toContain('curriculum/');
  });
  it('preserves both complete alphabets and the corrected Kazakh examples', () => {
    expect(alphabet.kk).toHaveLength(42); expect(alphabet.ru).toHaveLength(33);
    expect(new Set(alphabet.kk.map(item => item.letter)).size).toBe(42);
    expect(alphabet.kk.find(item => item.letter === 'Н')?.words).toContain('Наурыз');
    expect(alphabet.ru.find(item => item.letter === 'А')?.words).toContain('Арбуз');
  });
  it('accepts progressive JSON and plain replies, and validates the complete seed word', () => {
    expect(parseSentenceRows('```json\n["Бала","Бала ойнады"]\n```', 'Бала')).toEqual([['Бала'], ['Бала', 'ойнады']]);
    expect(parseSentenceRows('1. Қыз кітап оқыды', 'Қыз')).toHaveLength(3);
    expect(() => parseSentenceRows('["Балалар ойнады"]', 'Бала')).toThrow();
    expect(() => parseSentenceRows('[null, {}, 123]', 'Бала')).toThrow();
  });
  it('passes the requested language and cancellation to the existing AI endpoint', async () => {
    let options: RequestInit | undefined;
    const fetcher = (async (url, init) => {
      expect(url).toBe('/api/ai-chat'); options = init;
      return { ok: true, json: async () => ({ reply: '["Мама","Мама читает"]' }) } as Response;
    }) as typeof fetch;
    const controller = new AbortController();
    expect(await generateSentenceRows(fetcher, 'Мама', 'ru', controller.signal)).toEqual([['Мама'], ['Мама', 'читает']]);
    expect(options?.signal).toBe(controller.signal); expect(JSON.parse(String(options?.body)).messages[0].content).toContain('Russian');
  });
});
