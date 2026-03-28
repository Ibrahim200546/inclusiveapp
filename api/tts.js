const DEFAULT_MAX_TEXT_LENGTH = 700;
const DEFAULT_REQUEST_TIMEOUT_MS = 1800;

const DEFAULT_OPENAI_TTS_MODEL = 'gpt-4o-mini-tts';
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
  const normalizedLang = normalizeLanguageCode(lang);
  const instructions = normalizedLang === 'kk'
    ? 'Speak naturally and clearly in Kazakh.'
    : normalizedLang === 'ru'
      ? 'Speak naturally and clearly in Russian.'
      : undefined;

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
      ...(instructions ? { instructions } : {}),
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

  const openAiApiKey = (process.env.OPENAI_API_KEY || '').trim();
  const elevenLabsApiKey = (process.env.ELEVENLABS_API_KEY || '').trim();
  const customUpstreamUrl = (process.env.TTS_UPSTREAM_URL || '').trim();

  const providers = [];

  if (openAiApiKey) {
    providers.push(() => requestOpenAITTS({
      apiKey: openAiApiKey,
      text,
      lang,
      timeoutMs,
    }));
  }

  if (elevenLabsApiKey) {
    providers.push(() => requestElevenLabsTTS({
      apiKey: elevenLabsApiKey,
      text,
      lang,
      timeoutMs,
    }));
  }

  if (customUpstreamUrl) {
    providers.push(() => requestCustomUpstream({
      apiUrl: customUpstreamUrl,
      text,
      lang,
      timeoutMs,
    }));
  }

  if (!providers.length) {
    return sendJson(res, 500, {
      error: 'No TTS provider is configured.',
      details: 'Add OPENAI_API_KEY, or ELEVENLABS_API_KEY + ELEVENLABS_VOICE_ID, or TTS_UPSTREAM_URL in Vercel.',
    });
  }

  const failures = [];

  for (const runProvider of providers) {
    try {
      const result = await runProvider();
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
