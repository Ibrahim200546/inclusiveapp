import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
const html = readFileSync(resolve('public/original/index2.html'),'utf8');
describe('legacy source audit', () => {
  it('keeps unique IDs and resolves every static local audio/script/style/image reference', () => {
    const doc = new DOMParser().parseFromString(html,'text/html');
    const ids = [...doc.querySelectorAll('[id]')].map(e=>e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of doc.querySelectorAll('audio[src],script[src],img[src],link[href]')) {
      const raw=e.getAttribute('src')||e.getAttribute('href')||'';
      if (/^(https?:|data:|#)/.test(raw)) continue;
      const url=new URL(raw,'https://example.test/original/index2.html');
      expect(existsSync(resolve('public',decodeURIComponent(url.pathname.slice(1)))),raw).toBe(true);
    }
    for(const script of doc.scripts) {
      const src=script.getAttribute('src');
      if(src && /^https?:/.test(src)) continue;
      expect(()=>new vm.Script(src?readFileSync(resolve('public/original',src.split('?')[0]),'utf8'):script.textContent||'')).not.toThrow();
    }
  });
  it('uses recorded Kazakh audio before remote speech in all three pyramid handlers', () => {
    const handlers = ['tynsbyGetYandexAudioUrl2','tynsbyGetYandexAudioUrl3','tynsbyGetYandexAudioUrl4'];
    for (const name of handlers) {
      const body=html.slice(html.indexOf('async function '+name),html.indexOf('async function '+name)+1900);
      expect(body).toContain('getKkHumanVoiceoverAudioPath(text, speechLang)');
      expect(body.indexOf('getKkHumanVoiceoverAudioPath')).toBeLessThan(body.indexOf("fetch('/api/tts'"));
    }
  });
  it('renders untrusted leaderboard names and counts as text, refusing unsafe avatar URLs', async () => {
    const source=readFileSync(resolve('public/original/script.js'),'utf8');
    const from=source.indexOf('async function loadLeaderboard()');
    const to=source.indexOf('// Ensure theme toggle',from);
    const attack='<img src=x onerror="window.attack=true">';
    document.body.innerHTML='<div id="leaderboardList"></div>';
    const fetch=vi.fn(async()=>({ok:true,json:async()=>[{profiles:{full_name:attack,avatar_url:'javascript:alert(1)'},coins:'<svg/onload=alert(1)>'}]}));
    const run=new Function('fetch',`const SUPA_KEY='test',SUPA_URL='https://test.invalid';function getSupaAuth(){return null;} ${source.slice(from,to)}; return loadLeaderboard();`);
    await run(fetch);
    expect(document.querySelector('.lb-name')?.textContent).toBe(attack);
    expect(document.querySelector('#leaderboardList img')).toBeNull();
    expect(document.querySelector('#leaderboardList svg')).toBeNull();
    expect(document.querySelector('.lb-coins')).toHaveTextContent('0');
  });
});
