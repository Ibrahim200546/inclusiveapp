// Vercel Serverless Function - Hugging Face TTS proxy for facebook/mms-tts-kaz
// Requires HF_TOKEN (or HUGGINGFACE_API_KEY / HUGGING_FACE_HUB_TOKEN / HUGGING_FACE_TOKEN / HF_API_TOKEN) in Vercel env vars.

const DEFAULT_MODEL = 'facebook/mms-tts-kaz';
const DEFAULT_MAX_TEXT_LENGTH = 700;

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

async function requestHuggingFaceTTS({ apiUrl, token, text, payload }) {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'audio/wav',
    },
    body: JSON.stringify(payload),
  });

  return response;
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

  if (!hfToken) {
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
  if (!text) {
    return sendJson(res, 400, { error: 'Invalid request: text is required.' });
  }

  if (text.length > maxTextLength) {
    return sendJson(res, 400, {
      error: `Text is too long. Maximum length is ${maxTextLength} characters.`,
    });
  }

  const apiUrl = `https://router.huggingface.co/hf-inference/models/${encodeURIComponent(modelName)}`;

  try {
    // Official HF task page shows `text_inputs` for raw TTS HTTP calls.
    // We retry with `inputs` as a compatibility fallback if the provider rejects the first shape.
    let upstreamResponse = await requestHuggingFaceTTS({
      apiUrl,
      token: hfToken,
      text,
      payload: {
        text_inputs: text,
        options: { wait_for_model: true, use_cache: false },
      },
    });

    if (!upstreamResponse.ok && upstreamResponse.status < 500) {
      upstreamResponse = await requestHuggingFaceTTS({
        apiUrl,
        token: hfToken,
        text,
        payload: {
          inputs: text,
          options: { wait_for_model: true, use_cache: false },
        },
      });
    }

    if (!upstreamResponse.ok) {
      const rawDetails = await upstreamResponse.text();
      return sendJson(res, 502, {
        error: 'Hugging Face TTS request failed.',
        details: rawDetails || `Status ${upstreamResponse.status}`,
        model: modelName,
        tokenSource,
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
    });
  }
}
