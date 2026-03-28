const DEFAULT_OPENAI_CHAT_MODEL = 'gpt-4o-mini';
const DEFAULT_REQUEST_TIMEOUT_MS = 10000;

function sendJson(res, status, payload) {
  res.status(status).json(payload);
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
    const payload = await response.json();
    const nestedError = payload?.error;

    if (nestedError && typeof nestedError === 'object') {
      return [
        nestedError?.message,
        nestedError?.code,
        nestedError?.type,
        payload?.details,
      ].filter(Boolean).join(' | ');
    }

    return [payload?.error, payload?.message, payload?.details].filter(Boolean).join(' | ');
  } catch {
    return '';
  }
}

function extractOpenAIReply(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === 'string' && content.trim()) {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item?.text === 'string' ? item.text : ''))
      .join('\n')
      .trim();
  }

  return '';
}

async function requestOpenAIChat({ apiKey, messages, timeoutMs }) {
  const model = process.env.OPENAI_CHAT_MODEL || DEFAULT_OPENAI_CHAT_MODEL;
  const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
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

  const data = await response.json();
  const reply = extractOpenAIReply(data);
  if (!reply) {
    return {
      ok: false,
      provider: 'openai',
      status: 502,
      details: 'OpenAI returned an empty reply.',
    };
  }

  return {
    ok: true,
    provider: 'openai',
    reply,
  };
}

async function requestGeminiChat({ apiKey, messages, timeoutMs }) {
  const systemMsg = messages.find((message) => message.role === 'system');
  const conversationMsgs = messages.filter((message) => message.role !== 'system');

  const geminiMessages = conversationMsgs.map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.content }],
  }));

  const body = {
    contents: geminiMessages,
  };

  if (systemMsg) {
    body.systemInstruction = { parts: [{ text: systemMsg.content }] };
  }

  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    timeoutMs,
  );

  if (!response.ok) {
    const details = await readErrorText(response);
    return {
      ok: false,
      provider: 'gemini',
      status: response.status,
      details: details || `Status ${response.status}`,
    };
  }

  const data = await response.json();
  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  if (!reply) {
    return {
      ok: false,
      provider: 'gemini',
      status: 502,
      details: 'Gemini returned an empty reply.',
    };
  }

  return {
    ok: true,
    provider: 'gemini',
    reply,
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

  const messages = req.body?.messages;
  if (!messages || !Array.isArray(messages)) {
    return sendJson(res, 400, { error: 'Invalid request: messages array is required.' });
  }

  const timeoutMs = Number(process.env.AI_PROVIDER_TIMEOUT_MS || DEFAULT_REQUEST_TIMEOUT_MS);
  const openAiApiKey = (process.env.OPENAI_API_KEY || '').trim();
  const geminiApiKey = (process.env.GEMINI_API_KEY || '').trim();

  const providers = [];

  if (openAiApiKey) {
    providers.push(() => requestOpenAIChat({
      apiKey: openAiApiKey,
      messages,
      timeoutMs,
    }));
  }

  if (geminiApiKey) {
    providers.push(() => requestGeminiChat({
      apiKey: geminiApiKey,
      messages,
      timeoutMs,
    }));
  }

  if (!providers.length) {
    return sendJson(res, 500, {
      error: 'No AI provider is configured.',
      details: 'Add OPENAI_API_KEY or GEMINI_API_KEY in Vercel.',
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

      res.setHeader('X-AI-Provider', result.provider);
      return sendJson(res, 200, { reply: result.reply });
    } catch (error) {
      failures.push({
        provider: 'unknown',
        status: 500,
        details: error?.message || 'Unknown provider error',
      });
    }
  }

  return sendJson(res, 502, {
    error: 'All AI providers failed.',
    details: failures.map((failure) => `${failure.provider}: ${failure.details}`).join(' | '),
    failures,
  });
}
