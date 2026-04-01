const DEFAULT_MAX_TEXT_LENGTH = 700;
const DEFAULT_REQUEST_TIMEOUT_MS = 1800;
const DEFAULT_YANDEX_REQUEST_TIMEOUT_MS = 4500;

const DEFAULT_YANDEX_TTS_URL = 'https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize';
const DEFAULT_YANDEX_TTS_FORMAT = 'mp3';
const DEFAULT_YANDEX_TTS_SPEED = 0.9;
const DEFAULT_YANDEX_VOICE_KK = 'amira';
const DEFAULT_YANDEX_VOICE_RU = 'alena';

const DEFAULT_OPENAI_TTS_MODEL = 'tts-1';
const DEFAULT_OPENAI_TTS_VOICE = 'alloy';
const DEFAULT_OPENAI_TTS_FORMAT = 'mp3';
const DEFAULT_OPENAI_TTS_SPEED = 1;

const DEFAULT_ELEVENLABS_MODEL_ID = 'eleven_multilingual_v2';
const DEFAULT_ELEVENLABS_OUTPUT_FORMAT = 'mp3_44100_128';

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

function parsePositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeLanguageCode(lang) {
  const value = String(lang || '').trim().toLowerCase();
  if (value.startsWith('kk')) return 'kk';
  if (value.startsWith('ru')) return 'ru';
  return 'kk';
}

function normalizeYandexLanguageCode(lang) {
  const value = String(lang || '').trim().toLowerCase();
  if (value.startsWith('ru')) return 'ru-RU';
  return 'kk-KZ';
}

function pickYandexVoice(lang, explicitVoice) {
  const explicit = String(explicitVoice || '').trim();
  if (explicit) {
    return explicit;
  }

  return normalizeYandexLanguageCode(lang) === 'ru-RU'
    ? (process.env.YANDEX_TTS_VOICE_RU || DEFAULT_YANDEX_VOICE_RU)
    : (process.env.YANDEX_TTS_VOICE_KK || DEFAULT_YANDEX_VOICE_KK);
}

function getTimeoutSignal(timeoutMs) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs);
  }

  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS) {
  return fetch(url, {
    ...options,
    signal: getTimeoutSignal(timeoutMs),
  });
}

async function readErrorText(response) {
  try {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const payload = await response.json();
      const nestedError = payload?.error;
      if (nestedError && typeof nestedError === 'object') {
        return [
          nestedError?.message,
          nestedError?.code,
          nestedError?.type,
          payload?.message,
          payload?.details,
        ].filter(Boolean).join(' | ');
      }

      return [payload?.error, payload?.message, payload?.details].filter(Boolean).join(' ');
    }

    return await response.text();
  } catch {
    return '';
  }
}

async function requestOpenAITTS({ apiKey, text, lang, timeoutMs }) {
  const model = process.env.OPENAI_TTS_MODEL || DEFAULT_OPENAI_TTS_MODEL;
  const voice = process.env.OPENAI_TTS_VOICE || DEFAULT_OPENAI_TTS_VOICE;
  const responseFormat = process.env.OPENAI_TTS_FORMAT || DEFAULT_OPENAI_TTS_FORMAT;
  const speed = parsePositiveNumber(process.env.OPENAI_TTS_SPEED, DEFAULT_OPENAI_TTS_SPEED);

  const response = await fetchWithTimeout('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      voice,
      input: text,
      response_format: responseFormat,
      speed,
    }),
  }, timeoutMs);

  if (!response.ok) {
    const details = await readErrorText(response);
    return {
      ok: false,
      provider: 'openai',
      status: response.status,
      details: details || `Status ${response.status}`,
    };
  }

  return {
    ok: true,
    provider: 'openai',
    response,
  };
}

async function requestYandexTTSV1({ apiKey, iamToken, folderId, text, lang, timeoutMs, voice }) {
  const authHeader = apiKey
    ? `Api-Key ${apiKey}`
    : (iamToken ? `Bearer ${iamToken}` : '');

  if (!authHeader) {
    return {
      ok: false,
      provider: 'yandex',
      status: 500,
      details: 'YANDEX_API_KEY or YANDEX_IAM_TOKEN is not configured.',
    };
  }

  const normalizedLang = normalizeYandexLanguageCode(lang);
  const body = new URLSearchParams();
  body.set('text', text);
  body.set('lang', normalizedLang);
  body.set('voice', pickYandexVoice(normalizedLang, voice));
  body.set('format', process.env.YANDEX_TTS_FORMAT || DEFAULT_YANDEX_TTS_FORMAT);
  body.set('speed', String(parsePositiveNumber(process.env.YANDEX_TTS_SPEED, DEFAULT_YANDEX_TTS_SPEED)));

  if (!apiKey && folderId) {
    body.set('folderId', folderId);
  }

  const response = await fetchWithTimeout(DEFAULT_YANDEX_TTS_URL, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'audio/mpeg, audio/ogg, audio/*',
    },
    body: body.toString(),
  }, Math.max(timeoutMs, DEFAULT_YANDEX_REQUEST_TIMEOUT_MS));

  if (!response.ok) {
    const details = await readErrorText(response);
    return {
      ok: false,
      provider: 'yandex',
      status: response.status,
      details: details || `Status ${response.status}`,
    };
  }

  return {
    ok: true,
    provider: 'yandex',
    response,
  };
}

async function requestYandexTTSV3({ apiKey, iamToken, folderId, text, lang, timeoutMs, voice }) {
  const authHeader = apiKey
    ? `Api-Key ${apiKey}`
    : (iamToken ? `Bearer ${iamToken}` : '');

  if (!authHeader) {
    return {
      ok: false,
      provider: 'yandex',
      status: 500,
      details: 'YANDEX_API_KEY or YANDEX_IAM_TOKEN is not configured.',
    };
  }

  const normalizedLang = normalizeYandexLanguageCode(lang);
  const requestBody = {
    text,
    hints: [
      {
        voice: pickYandexVoice(normalizedLang, voice),
      },
      {
        speed: parsePositiveNumber(process.env.YANDEX_TTS_SPEED, DEFAULT_YANDEX_TTS_SPEED),
      },
    ],
    unsafeMode: true,
    outputAudioSpec: {
      containerAudio: {
        containerAudioType: 'MP3',
      },
    },
  };

  const headers = {
    Authorization: authHeader,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (!apiKey && folderId) {
    headers['x-folder-id'] = folderId;
  }

  const response = await fetchWithTimeout('https://tts.api.cloud.yandex.net/tts/v3/utteranceSynthesis', {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  }, Math.max(timeoutMs, DEFAULT_YANDEX_REQUEST_TIMEOUT_MS));

  if (!response.ok) {
    const details = await readErrorText(response);
    return {
      ok: false,
      provider: 'yandex',
      status: response.status,
      details: details || `Status ${response.status}`,
    };
  }

  const payload = await response.json();
  const base64Audio = payload?.result?.audioChunk?.data || payload?.audioChunk?.data || '';
  if (!base64Audio) {
    return {
      ok: false,
      provider: 'yandex',
      status: 502,
      details: 'Yandex TTS v3 returned no audioChunk.data payload.',
    };
  }

  const audioBuffer = Buffer.from(base64Audio, 'base64');
  return {
    ok: true,
    provider: 'yandex',
    response: new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    }),
  };
}

async function requestYandexTTS({ apiKey, iamToken, folderId, text, lang, timeoutMs, voice }) {
  const failures = [];

  const v1Result = await requestYandexTTSV1({
    apiKey,
    iamToken,
    folderId,
    text,
    lang,
    timeoutMs,
    voice,
  });

  if (v1Result.ok) {
    return v1Result;
  }
  failures.push(`v1: ${v1Result.details}`);

  const v3Result = await requestYandexTTSV3({
    apiKey,
    iamToken,
    folderId,
    text,
    lang,
    timeoutMs,
    voice,
  });

  if (v3Result.ok) {
    return v3Result;
  }
  failures.push(`v3: ${v3Result.details}`);

  return {
    ok: false,
    provider: 'yandex',
    status: v3Result.status || v1Result.status || 502,
    details: failures.join(' | '),
  };
}

async function requestElevenLabsTTS({ apiKey, text, lang, timeoutMs }) {
  const voiceId = (process.env.ELEVENLABS_VOICE_ID || '').trim();
  if (!voiceId) {
    return {
      ok: false,
      provider: 'elevenlabs',
      status: 500,
      details: 'ELEVENLABS_VOICE_ID is not configured.',
    };
  }

  const modelId = process.env.ELEVENLABS_MODEL_ID || DEFAULT_ELEVENLABS_MODEL_ID;
  const outputFormat = process.env.ELEVENLABS_OUTPUT_FORMAT || DEFAULT_ELEVENLABS_OUTPUT_FORMAT;
  const normalizedLang = normalizeLanguageCode(lang);
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream?output_format=${encodeURIComponent(outputFormat)}`;

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      language_code: normalizedLang,
    }),
  }, timeoutMs);

  if (!response.ok) {
    const details = await readErrorText(response);
    return {
      ok: false,
      provider: 'elevenlabs',
      status: response.status,
      details: details || `Status ${response.status}`,
    };
  }

  return {
    ok: true,
    provider: 'elevenlabs',
    response,
  };
}

async function requestCustomUpstream({ apiUrl, text, lang, timeoutMs }) {
  const response = await fetchWithTimeout(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'audio/*',
    },
    body: JSON.stringify({ text, lang }),
  }, timeoutMs);

  if (!response.ok) {
    const details = await readErrorText(response);
    return {
      ok: false,
      provider: 'custom-upstream',
      status: response.status,
      details: details || `Status ${response.status}`,
    };
  }

  return {
    ok: true,
    provider: 'custom-upstream',
    response,
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const text = String(req.body?.text || '').trim();
  const lang = String(req.body?.lang || 'kk-KZ').trim() || 'kk-KZ';
  const preferredProvider = String(req.body?.provider || req.body?.preferredProvider || '').trim().toLowerCase();
  const requestedVoice = String(req.body?.voice || '').trim();
  const maxTextLength = Number(process.env.TTS_MAX_TEXT_LENGTH || DEFAULT_MAX_TEXT_LENGTH);
  const timeoutMs = Math.round(parsePositiveNumber(process.env.TTS_PROVIDER_TIMEOUT_MS, DEFAULT_REQUEST_TIMEOUT_MS));

  if (!text) {
    return sendJson(res, 400, { error: 'Invalid request: text is required.' });
  }

  if (text.length > maxTextLength) {
    return sendJson(res, 400, {
      error: `Text is too long. Maximum length is ${maxTextLength} characters.`,
    });
  }

  const yandexApiKey = (process.env.YANDEX_API_KEY || '').trim();
  const yandexIamToken = (process.env.YANDEX_IAM_TOKEN || '').trim();
  const yandexFolderId = (process.env.YANDEX_FOLDER_ID || '').trim();
  const openAiApiKey = (process.env.OPENAI_API_KEY || '').trim();
  const elevenLabsApiKey = (process.env.ELEVENLABS_API_KEY || '').trim();
  const customUpstreamUrl = (process.env.TTS_UPSTREAM_URL || '').trim();

  const providers = [];

  if (openAiApiKey) {
    providers.push({
      name: 'openai',
      run: () => requestOpenAITTS({
        apiKey: openAiApiKey,
        text,
        lang,
        timeoutMs,
      }),
    });
  }

  if (elevenLabsApiKey) {
    providers.push({
      name: 'elevenlabs',
      run: () => requestElevenLabsTTS({
        apiKey: elevenLabsApiKey,
        text,
        lang,
        timeoutMs,
      }),
    });
  }

  if (customUpstreamUrl) {
    providers.push({
      name: 'custom-upstream',
      run: () => requestCustomUpstream({
        apiUrl: customUpstreamUrl,
        text,
        lang,
        timeoutMs,
      }),
    });
  }

  if (yandexApiKey || yandexIamToken) {
    providers.push({
      name: 'yandex',
      run: () => requestYandexTTS({
        apiKey: yandexApiKey,
        iamToken: yandexIamToken,
        folderId: yandexFolderId,
        text,
        lang,
        timeoutMs,
        voice: requestedVoice,
      }),
    });
  }

  if (!providers.length) {
    return sendJson(res, 500, {
      error: 'No TTS provider is configured.',
      details: 'Add YANDEX_API_KEY (or YANDEX_IAM_TOKEN), OPENAI_API_KEY, ELEVENLABS_API_KEY + ELEVENLABS_VOICE_ID, or TTS_UPSTREAM_URL in Vercel.',
    });
  }

  const selectedProviders = preferredProvider
    ? providers.filter((provider) => provider.name === preferredProvider)
    : providers;

  if (preferredProvider && !selectedProviders.length) {
    return sendJson(res, 500, {
      error: `Requested TTS provider is not configured: ${preferredProvider}.`,
      details: 'Configure the matching provider env vars or omit the provider field to allow normal fallback order.',
    });
  }

  const failures = [];

  for (const provider of selectedProviders) {
    try {
      const result = await provider.run();
      if (!result.ok) {
        failures.push({
          provider: result.provider,
          status: result.status,
          details: result.details,
        });
        continue;
      }

      const arrayBuffer = await result.response.arrayBuffer();
      const contentType = result.response.headers.get('content-type') || 'audio/mpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      res.setHeader('X-TTS-Provider', result.provider);
      return res.status(200).send(Buffer.from(arrayBuffer));
    } catch (error) {
      failures.push({
        provider: 'unknown',
        status: 500,
        details: error?.message || 'Unknown provider error',
      });
    }
  }

  return sendJson(res, 502, {
    error: 'All TTS providers failed.',
    details: failures.map((failure) => `${failure.provider}: ${failure.details}`).join(' | '),
    failures,
  });
}
