// Vercel Serverless Function - Hugging Face TTS proxy for facebook/mms-tts-kaz
// Requires HF_TOKEN (or HUGGINGFACE_API_KEY / HUGGING_FACE_HUB_TOKEN / HUGGING_FACE_TOKEN / HF_API_TOKEN) in Vercel env vars.

const DEFAULT_MODEL = 'facebook/mms-tts-kaz';
const DEFAULT_MAX_TEXT_LENGTH = 700;
const DEFAULT_UPSTREAM_MAX_ATTEMPTS = 2;
const DEFAULT_UPSTREAM_RETRY_BASE_MS = 250;
const DEFAULT_UPSTREAM_FETCH_TIMEOUT_MS = 1200;

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parsePositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isRetryableStatus(status) {
  return status === 502 || status === 503 || status === 504;
}

function getRetryDelayMs({ attempt, retryAfterHeader, retryBaseMs }) {
  const retryAfterSeconds = Number(retryAfterHeader);
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return Math.round(retryAfterSeconds * 1000);
  }

  return retryBaseMs * attempt;
}

function buildSiblingUpstreamUrl(apiUrl, nextSegment) {
  return apiUrl.replace(/\/tts\/?$/i, `/${nextSegment}`);
}

async function createTimeoutSignal(timeoutMs) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs);
  }

  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

async function warmCustomTTSUpstream(apiUrl) {
  if (!/\/tts\/?$/i.test(apiUrl)) {
    return;
  }

  const warmupUrl = buildSiblingUpstreamUrl(apiUrl, 'warmup');
  const healthUrl = buildSiblingUpstreamUrl(apiUrl, 'healthz');
  const signal = await createTimeoutSignal(700);

  await Promise.allSettled([
    fetch(healthUrl, {
      method: 'GET',
      cache: 'no-store',
      signal,
    }),
    fetch(warmupUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      cache: 'no-store',
      signal,
    }),
  ]);
}

async function requestTTSUpstream({ apiUrl, token, payload }) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'audio/wav',
  };
  const signal = await createTimeoutSignal(DEFAULT_UPSTREAM_FETCH_TIMEOUT_MS);

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal,
  });

  return response;
}

async function requestTTSUpstreamWithRetry({
  apiUrl,
  token,
  payload,
  maxAttempts = DEFAULT_UPSTREAM_MAX_ATTEMPTS,
  retryBaseMs = DEFAULT_UPSTREAM_RETRY_BASE_MS,
  onBeforeFirstAttempt,
  onRetryableFailure,
}) {
  let lastError = null;

  if (typeof onBeforeFirstAttempt === 'function') {
    await onBeforeFirstAttempt();
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await requestTTSUpstream({ apiUrl, token, payload });

      if (!isRetryableStatus(response.status) || attempt === maxAttempts) {
        return response;
      }

       if (typeof onRetryableFailure === 'function') {
        await onRetryableFailure({ attempt, response });
      }

      const retryDelayMs = getRetryDelayMs({
        attempt,
        retryAfterHeader: response.headers.get('retry-after'),
        retryBaseMs,
      });

      try {
        await response.body?.cancel?.();
      } catch (cancelError) {
        console.warn('Unable to cancel retryable TTS upstream response body:', cancelError);
      }

      await sleep(retryDelayMs);
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) {
        throw error;
      }

      if (typeof onRetryableFailure === 'function') {
        await onRetryableFailure({ attempt, error });
      }

      await sleep(retryBaseMs * attempt);
    }
  }

  throw lastError || new Error('TTS upstream retry exhausted');
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

  const tokenCandidates = [
    ['HF_TOKEN', process.env.HF_TOKEN],
    ['HF_API_TOKEN', process.env.HF_API_TOKEN],
    ['HUGGING_FACE_TOKEN', process.env.HUGGING_FACE_TOKEN],
    ['HUGGINGFACE_API_KEY', process.env.HUGGINGFACE_API_KEY],
    ['HUGGING_FACE_HUB_TOKEN', process.env.HUGGING_FACE_HUB_TOKEN],
  ];
  const firstNonEmptyTokenEntry = tokenCandidates.find(([, value]) => typeof value === 'string' && value.trim());
  const hfToken = firstNonEmptyTokenEntry ? firstNonEmptyTokenEntry[1].trim() : '';
  const tokenSource = firstNonEmptyTokenEntry ? firstNonEmptyTokenEntry[0] : '';
  const modelName = process.env.HF_TTS_MODEL || DEFAULT_MODEL;
  const maxTextLength = Number(process.env.TTS_MAX_TEXT_LENGTH || DEFAULT_MAX_TEXT_LENGTH);
  const customUpstreamUrl = (process.env.TTS_UPSTREAM_URL || '').trim();
  const dedicatedEndpointUrl = (process.env.HF_TTS_ENDPOINT_URL || '').trim();
  const upstreamMaxAttempts = Math.round(
    parsePositiveNumber(process.env.TTS_UPSTREAM_MAX_ATTEMPTS, DEFAULT_UPSTREAM_MAX_ATTEMPTS)
  );
  const upstreamRetryBaseMs = Math.round(
    parsePositiveNumber(process.env.TTS_UPSTREAM_RETRY_BASE_MS, DEFAULT_UPSTREAM_RETRY_BASE_MS)
  );
  const endpointType = customUpstreamUrl
    ? 'custom-upstream'
    : dedicatedEndpointUrl
      ? 'custom-endpoint'
      : 'hf-router';

  if (!hfToken && endpointType !== 'custom-upstream') {
    const emptyTokenNames = tokenCandidates
      .filter(([, value]) => typeof value === 'string' && !value.trim())
      .map(([name]) => name);

    return sendJson(res, 500, {
      error: 'HF_TOKEN is not configured on the server.',
      details: `No non-empty Hugging Face token was found at runtime. Current VERCEL_ENV=${process.env.VERCEL_ENV || 'unknown'}, NODE_ENV=${process.env.NODE_ENV || 'unknown'}. inclusiveapp.vercel.app uses Production env vars. Add HF_TOKEN to Production and redeploy. Accepted names: HF_TOKEN, HF_API_TOKEN, HUGGING_FACE_TOKEN, HUGGINGFACE_API_KEY, HUGGING_FACE_HUB_TOKEN.${emptyTokenNames.length ? ` Empty values detected for: ${emptyTokenNames.join(', ')}.` : ''}`,
      checkedKeys: tokenCandidates.map(([name]) => name),
      emptyKeys: emptyTokenNames,
    });
  }

  const text = String(req.body?.text || '').trim();
  const lang = String(req.body?.lang || 'kk-KZ').trim() || 'kk-KZ';
  if (!text) {
    return sendJson(res, 400, { error: 'Invalid request: text is required.' });
  }

  if (text.length > maxTextLength) {
    return sendJson(res, 400, {
      error: `Text is too long. Maximum length is ${maxTextLength} characters.`,
    });
  }

  const apiUrl = customUpstreamUrl ||
    dedicatedEndpointUrl ||
    `https://router.huggingface.co/hf-inference/models/${encodeURIComponent(modelName)}`;

  try {
    if (endpointType === 'custom-upstream') {
      const upstreamResponse = await requestTTSUpstreamWithRetry({
        apiUrl,
        token: '',
        payload: { text, lang },
        maxAttempts: upstreamMaxAttempts,
        retryBaseMs: upstreamRetryBaseMs,
        onBeforeFirstAttempt: async () => {
          await warmCustomTTSUpstream(apiUrl);
        },
        onRetryableFailure: async () => {
          await warmCustomTTSUpstream(apiUrl);
        },
      });

      if (!upstreamResponse.ok) {
        const rawDetails = await upstreamResponse.text();
        return sendJson(res, 502, {
          error: 'Custom TTS upstream request failed.',
          details: rawDetails || `Status ${upstreamResponse.status}`,
          model: modelName,
          tokenSource,
          endpointType,
          attempts: upstreamMaxAttempts,
        });
      }

      const arrayBuffer = await upstreamResponse.arrayBuffer();
      const contentType = upstreamResponse.headers.get('content-type') || 'audio/wav';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      return res.status(200).send(Buffer.from(arrayBuffer));
    }

    // Official HF task page shows `text_inputs` for raw TTS HTTP calls.
    // We retry with `inputs` as a compatibility fallback if the provider rejects the first shape.
    let upstreamResponse = await requestTTSUpstream({
      apiUrl,
      token: hfToken,
      payload: {
        text_inputs: text,
        options: { wait_for_model: true, use_cache: false },
      },
    });

    if (!upstreamResponse.ok && upstreamResponse.status < 500) {
      upstreamResponse = await requestTTSUpstream({
        apiUrl,
        token: hfToken,
        payload: {
          inputs: text,
          options: { wait_for_model: true, use_cache: false },
        },
      });
    }

    if (!upstreamResponse.ok) {
      const rawDetails = await upstreamResponse.text();
      const isMissingProvider =
        upstreamResponse.status === 404 &&
        endpointType === 'hf-router' &&
        modelName === DEFAULT_MODEL;

      return sendJson(res, 502, {
        error: isMissingProvider
          ? 'facebook/mms-tts-kaz is not deployed on Hugging Face Inference Providers.'
          : 'Hugging Face TTS request failed.',
        details: isMissingProvider
          ? 'The model page currently says this model is not deployed by any Inference Provider. Use a dedicated Hugging Face Inference Endpoint URL or your own TTS server, then set HF_TTS_ENDPOINT_URL or TTS_UPSTREAM_URL in Vercel.'
          : (rawDetails || `Status ${upstreamResponse.status}`),
        model: modelName,
        tokenSource,
        endpointType,
      });
    }

    const arrayBuffer = await upstreamResponse.arrayBuffer();
    const contentType = upstreamResponse.headers.get('content-type') || 'audio/wav';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(200).send(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error('TTS proxy error:', error);
    return sendJson(res, 500, {
      error: 'Internal Hugging Face TTS proxy error.',
      details: error?.message || 'Unknown error',
      model: modelName,
      tokenSource,
      endpointType,
    });
  }
}
