import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateGrade2Listening } from '../../tools/validate-grade2-listening.mjs';

const source = () => JSON.parse(readFileSync('docs/trello-verification/content-drafts.json', 'utf8'));

describe('Grade 2 listening content length validation', () => {
  it('accepts the existing three narrations and both ten-word phrases', () => {
    const data = source();
    expect(data.texts.filter(row => row.grade === 2).map(row => row.sentenceCount)).toEqual([6, 9, 5]);
    expect(data.longPhrases.map(row => row.wordCount)).toEqual([10, 10]);
    expect(() => validateGrade2Listening(data)).not.toThrow();
  });

  it('rejects a shorter unknown text even if the author updates its recorded count', () => {
    const data = source();
    const long = data.texts.find(row => row.id === 'g2-unfamiliar-9');
    long.sentences.pop();
    long.sentenceCount = 8;
    long.sourceRange = [5, 10];
    expect(() => validateGrade2Listening(data)).toThrow(/g2-unfamiliar-9 has 8; expected 9–10/);
  });

  it('rejects blank sentences and inaccurate phrase metadata', () => {
    const data = source();
    const short = data.texts.find(row => row.id === 'g2-unfamiliar-5');
    short.sentences[0] = ' ';
    expect(() => validateGrade2Listening(data)).toThrow(/blank sentence/);
    const another = source();
    another.longPhrases[0].wordCount = 9;
    expect(() => validateGrade2Listening(another)).toThrow(/has 10; expected 9–12/);
  });

  it('leaves other grades outside this card’s validation', () => {
    const data = source();
    data.texts.find(row => row.grade === 3).sentences = [];
    expect(() => validateGrade2Listening(data)).not.toThrow();
  });
});
