import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

function api(env: Record<string, string> = {}, fetch = vi.fn()) {
  const source = readFileSync('api/tts.js', 'utf8').replace(/^import .*;\r?\n/gm, '').split('export default')[0];
  return new Function('process', 'fetch', source + ';return {pickYandexVoice,requestYandexTTSV3};')({ env }, fetch) as {
    pickYandexVoice(lang: string, explicit?: string, endpoint?: string): string;
    requestYandexTTSV3(options: Record<string, unknown>): Promise<{ ok: boolean }>;
  };
}

describe('regional Yandex speech voices', () => {
  it('uses a supported regional Russian voice while retaining the global fallback', () => {
    const { pickYandexVoice } = api();
    expect(pickYandexVoice('ru-RU', undefined, 'https://tts.api.ml.yandexcloud.kz/tts/v3/utteranceSynthesis')).toBe('zhanar_ru');
    expect(pickYandexVoice('ru-RU', undefined, 'https://tts.api.cloud.yandex.net/tts/v3/utteranceSynthesis')).toBe('alena');
    expect(pickYandexVoice('kk-KZ')).toBe('amira');
  });
  it('respects configured and explicitly requested voices', () => {
    expect(api({ YANDEX_TTS_VOICE_RU: 'configured' }).pickYandexVoice('ru-RU', undefined, 'yandexcloud.kz')).toBe('configured');
    expect(api().pickYandexVoice('ru-RU', 'explicit', 'yandexcloud.kz')).toBe('explicit');
  });
  it('changes the voice together with the endpoint when retrying the global service', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response('Regional request failed', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ result: { audioChunk: { data: 'YXVkaW8=' } } })));
    const result = await api({}, fetch).requestYandexTTSV3({ apiKey: 'test-only', text: 'Найди число один.', lang: 'ru-RU', timeoutMs: 10 });
    expect(result.ok).toBe(true);
    const voices = fetch.mock.calls.map(([, options]) => JSON.parse(options.body).hints[0].voice);
    expect(voices).toEqual(['zhanar_ru', 'alena']);
  });
});
