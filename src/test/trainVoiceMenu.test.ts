import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const scope: { TrainVoiceMenu?:{nextLetters(previous?:string[],random?:()=>number):string[]} } = {};
new Function('window',readFileSync('public/original/js/train-voice-menu.js','utf8'))(scope);
const next = scope.TrainVoiceMenu!.nextLetters;
describe('eight voice circles refreshed on reopening', () => {
  it('always presents eight unique supported vowels', () => {
    let previous:string[]=[];
    for(let i=0;i<20;i++){ previous=next(previous); expect(previous).toHaveLength(8); expect(new Set(previous).size).toBe(8); expect(previous.every(letter=>[...'АӘОӨҰҮЫІУ'].includes(letter))).toBe(true); }
  });
  it('includes every letter absent from the preceding menu before reusing others', () => {
    const previous=['А','Ә','О','Ө','Ұ','Ү','Ы','І'];
    const result=next(previous,()=>0.3);
    expect(result).toContain('У');
    for(const letter of ['П','Б','Т','К']) expect(result).not.toContain(letter);
    expect(new Set(result).size).toBe(8);
  });
});
