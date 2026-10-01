import { afterEach, describe, expect, it, vi } from 'vitest';
import handler, { compareTranscript } from '../../api/ai-evaluate.js';
function response() { const res:any={statusCode:200,payload:null,setHeader:vi.fn(),status(code:number){this.statusCode=code;return this;},json(payload:any){this.payload=payload;return this;},end:vi.fn()};return res; }
afterEach(()=>vi.unstubAllGlobals());
describe('text-only evaluation endpoint',()=>{
 it('scores transparent text similarity and explicitly never evaluates pronunciation',async()=>{
  const fetch=vi.fn();vi.stubGlobal('fetch',fetch);const res=response();
  await handler({method:'POST',body:{target:'Қалам',spoken:'қалам!'}},res);
  expect(res.statusCode).toBe(200);expect(res.payload.score).toBe(100);expect(res.payload.pronunciationEvaluated).toBe(false);expect(res.payload.assessmentType).toBe('text_similarity');expect(fetch).not.toHaveBeenCalled();
 });
 it('does not fabricate success for empty or unrelated transcripts',()=>{
  expect(compareTranscript('Қалам','')).toBe(0);expect(compareTranscript('нан','шар')).toBeLessThan(70);
 });
 it('rejects malformed or oversized input without returning an invented score',async()=>{
  for(const body of [null,{target:{},spoken:'x'},{target:'!!!',spoken:'x'},{target:'a'.repeat(161),spoken:'x'},{target:'a',spoken:'x'.repeat(1001)}]){
   const res=response();await handler({method:'POST',body},res);expect(res.statusCode).toBe(400);expect(res.payload.score).toBeUndefined();
  }
 });
 it('handles preflight and unsupported method',async()=>{
  const pre=response();await handler({method:'OPTIONS'},pre);expect(pre.end).toHaveBeenCalled();const get=response();await handler({method:'GET'},get);expect(get.statusCode).toBe(405);
 });
});
