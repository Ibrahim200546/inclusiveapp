// Vercel Serverless Function — TTS proxy for facebook/mms-tts-kaz service.
// Expected upstream: a Python/FastAPI service compatible with POST /tts { text, lang } -> audio/wav

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const upstreamUrl = process.env.TTS_UPSTREAM_URL || 'http://127.0.0.1:8001/tts';
  const { text, lang } = req.body || {};

  if (!text || !String(text).trim()) {
    return res.status(400).json({ error: 'Invalid request: text is required.' });
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: String(text).trim(),
        lang: lang || 'kk-KZ'
      })
    });

    if (!upstreamResponse.ok) {
      const details = await upstreamResponse.text();
      return res.status(502).json({
        error: 'Upstream TTS service failed.',
        details: details || `Status ${upstreamResponse.status}`
      });
    }

    const arrayBuffer = await upstreamResponse.arrayBuffer();
    const contentType = upstreamResponse.headers.get('content-type') || 'audio/wav';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(200).send(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error('TTS proxy error:', error);
    return res.status(500).json({
      error: 'Internal TTS proxy error.',
      details: error?.message || 'Unknown error'
    });
  }
}
