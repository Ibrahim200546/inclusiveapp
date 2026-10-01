import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
type Segment = { phone:string; start:number; end:number; confidence?:number };
type Verdict = { correct:boolean; reason:string; score?:number; progress?:number };
const scope: { TrainPhonemeSession?: { signalProgress(milliseconds:number):number; assess(letter:string, mode:string, segments:Segment[], duration?:number):Verdict; speechBounds(pcm:Float32Array):{first:number;last:number;maxRms:number}|null } } = {};
new Function('window',readFileSync('public/original/js/train-phoneme-session.js','utf8'))(scope);
const assess = scope.TrainPhonemeSession!.assess;
const phones = (...values:string[]) => values.map((phone,index) => ({phone,start:index*200,end:(index+1)*200}));
describe('selected phoneme verification', () => {
  it('rejects B, T, K and a vowel when P is selected', () => {
    for (const other of ['b','t','k','a']) expect(assess('П','short',phones(other)).correct).toBe(false);
  });
  it('accepts p with a carrier vowel and requires three repetitions in long mode', () => {
    expect(assess('П','short',phones('p','ɨ')).correct).toBe(true);
    expect(assess('П','long',phones('p','ɨ')).correct).toBe(false);
    expect(assess('П','long',phones('p','ɨ','p','ɨ','p','ɨ')).correct).toBe(true);
  });
  it('rejects a mixed word or competing consonant even when it contains P', () => {
    expect(assess('П','long',phones('p','a','p','a','p','t')).correct).toBe(false);
    expect(assess('П','short',phones('p','a','l')).correct).toBe(false);
  });
  it('requires both vowel identity and measured sustained voice', () => {
    expect(assess('А','long',phones('a'),2000).correct).toBe(true);
    expect(assess('А','long',phones('a'),1999).correct).toBe(false);
    expect(assess('А','long',phones('o'),2000).correct).toBe(false);
  });
  it('accepts a recognized short vowel without pretending CTC spikes measure duration', () => {
    expect(assess('А','short',phones('a'),200).correct).toBe(true);
    expect(assess('А','short',phones('a'),0).correct).toBe(true);
    expect(assess('А','short',phones('o'),5000).correct).toBe(false);
  });
  it('does not accept silence, unknown phones or empty recognition with long activity', () => {
    for (const segments of [[],phones(''),phones('<unknown-id>')]) expect(assess('А','long',segments,5000).correct).toBe(false);
  });
  it('distinguishes kazakh front rounded vowels from U', () => {
    expect(assess('Ү','short',phones('u')).correct).toBe(false);
    expect(assess('Ө','short',phones('o')).correct).toBe(false);
    expect(assess('У','short',phones('uː'),200).correct).toBe(true);
  });
});

describe('same microphone preprocessing as local QA', () => {
  const bounds = scope.TrainPhonemeSession!.speechBounds;
  it('does not infer a letter from silence or weak room noise', () => {
    expect(bounds(new Float32Array(16000))).toBeNull();
    expect(bounds(new Float32Array(16000).fill(0.005))).toBeNull();
  });
  it('retains speech and 300ms margins while trimming leading/trailing silence', () => {
    const pcm = new Float32Array(64000); pcm.fill(0.1,16000,32000);
    expect(bounds(pcm)).toMatchObject({first:11200,last:36800});
    expect(pcm[16000]).toBeCloseTo(0.1);
  });
  it('does not remove internal pauses or truncate clips shorter than 5 seconds', () => {
    const pcm = new Float32Array(64000); pcm.fill(0.1,8000,12000); pcm.fill(0.1,40000,44000);
    const result = bounds(pcm)!;
    expect(result.first).toBeLessThan(8000); expect(result.last).toBeGreaterThan(44000);
    expect(result.last-result.first).toBeLessThanOrEqual(80000);
  });
});

describe('phoneme length is not a different letter', () => {
  it('accepts a long A marker only with sufficient measured duration', () => {
    expect(assess('А','long',phones('aː'),2000).correct).toBe(true);
    expect(assess('А','long',phones('aː'),500).correct).toBe(false);
    expect(assess('А','long',phones('oː'),2000).correct).toBe(false);
  });
  it('allows central carrier vowel variants in py without accepting by, ty or ky', () => {
    expect(assess('П','short',phones('p','ɐ')).correct).toBe(true);
    expect(assess('П','short',phones('p','ɨː')).correct).toBe(true);
    for (const other of ['b','t','k']) expect(assess('П','short',phones(other,'ɨː')).correct).toBe(false);
  });
});

describe('confidence-aware phone assessment', () => {
  const weighted = (...values:[string,number][]) => values.map(([phone,confidence],index) => ({phone,confidence,start:index*100,end:(index+1)*100}));
  it('accepts clear repeated T with weak spurious M and unknown output', () => {
    const result=assess('Т','long',weighted(['t',.95],['a',.8],['t',.94],['m',.2],['u',.8],['t',.92],['?',.1]));
    expect(result.correct).toBe(true); expect(result.score).toBeGreaterThan(85);
  });
  it('rejects a strong competing consonant even when target occurs', () => {
    expect(assess('Т','short',weighted(['t',.9],['m',.95])).correct).toBe(false);
    expect(assess('П','long',weighted(['p',.9],['p',.9],['p',.9],['b',.96])).correct).toBe(false);
  });
  it('does not complete from weak target evidence or dominant wrong letters', () => {
    expect(assess('Т','short',weighted(['t',.2])).correct).toBe(false);
    expect(assess('Т','short',weighted(['t',.6],['b',.7],['k',.7])).correct).toBe(false);
  });
  it('keeps partial progress under 100 and long-mode duration required', () => {
    const result=assess('А','long',weighted(['a',.95]),500);
    expect(result.correct).toBe(false); expect(result.progress).toBeGreaterThan(0); expect(result.progress).toBeLessThan(100);
  });
});

describe('signal movement before phoneme confirmation', () => {
  it('advances with signal and caps at seventy percent', () => {
    const progress = scope.TrainPhonemeSession!.signalProgress;
    expect(progress(0)).toBe(0);
    expect(progress(250)).toBe(35);
    expect(progress(500)).toBe(70);
    expect(progress(8000)).toBe(70);
    expect(progress(-1)).toBe(0);
    expect(assess('Т','short',[]).correct).toBe(false);
  });
});