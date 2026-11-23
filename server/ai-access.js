const BODY_LIMIT = 32 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(res, status, error) {
  res.status(status).json({ error });
  return false;
}

export function validateAiBody(body, endpoint) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
  if (endpoint === 'ai-chat') {
    return Array.isArray(body.messages) && body.messages.length > 0 && body.messages.length <= 24
      && body.messages.every((message) => message && ['system', 'user', 'assistant'].includes(message.role)
        && typeof message.content === 'string' && message.content.trim().length > 0
        && message.content.length <= 4000)
      && body.messages.reduce((size, message) => size + message.content.length, 0) <= 12000;
  }
  if (endpoint === 'ai-evaluate') {
    return typeof body.target === 'string' && body.target.trim().length > 0 && body.target.length <= 200
      && typeof body.spoken === 'string' && body.spoken.length <= 2000;
  }
  if (endpoint === 'tts') {
    return typeof body.text === 'string' && body.text.trim().length > 0 && body.text.length <= 700
      && ['lang', 'provider', 'preferredProvider', 'voice'].every((key) => body[key] === undefined
        || (typeof body[key] === 'string' && body[key].length <= 64))
      && (body.speed === undefined || (typeof body.speed === 'number' && Number.isFinite(body.speed)
        && body.speed >= 0.25 && body.speed <= 4));
  }
  return false;
}

// Every deployment instance uses the same atomic database quota. Never fall back
// to an in-memory limiter or allow a provider call when auth/quota is unavailable.
export async function requireAiAccess(req, res, endpoint) {
  res.setHeader('Cache-Control', 'no-store');
  const contentType = req.headers?.['content-type'] || '';
  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
    return fail(res, 415, 'Content-Type must be application/json.');
  }
  try {
    if (Number(req.headers?.['content-length']) > BODY_LIMIT
      || Buffer.byteLength(JSON.stringify(req.body) || '', 'utf8') > BODY_LIMIT) {
      return fail(res, 413, 'Request body is too large.');
    }
  } catch {
    return fail(res, 400, 'Invalid request body.');
  }
  if (!validateAiBody(req.body, endpoint)) return fail(res, 400, 'Invalid request body.');

  const authorization = req.headers?.authorization;
  if (typeof authorization !== 'string' || !/^Bearer \S+$/i.test(authorization) || authorization.length > 8192) {
    return fail(res, 401, 'Sign in to use this feature.');
  }
  const url = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey || anonKey === serviceKey) {
    return fail(res, 503, 'AI access is not configured.');
  }

  try {
    const authResponse = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: authorization },
      signal: AbortSignal.timeout(5000),
    });
    if (!authResponse.ok) {
      return fail(res, [400, 401, 403].includes(authResponse.status) ? 401 : 503, 'Unable to verify access.');
    }
    const user = await authResponse.json();
    if (!UUID.test(user?.id || '') || user.is_anonymous === true || user.role !== 'authenticated') {
      return fail(res, 403, 'A registered account is required.');
    }
    const quotaResponse = await fetch(`${url}/rest/v1/rpc/consume_ai_quota`, {
      method: 'POST',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_user_id: user.id, p_endpoint: endpoint }),
      signal: AbortSignal.timeout(5000),
    });
    if (quotaResponse.status === 429) {
      res.setHeader('Retry-After', '60');
      return fail(res, 429, 'AI request limit reached. Try again later.');
    }
    if (!quotaResponse.ok || (await quotaResponse.json())?.allowed !== true) {
      return fail(res, 503, 'AI quota is temporarily unavailable.');
    }
    return true;
  } catch {
    return fail(res, 503, 'AI access is temporarily unavailable.');
  }
}
