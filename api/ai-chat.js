// Vercel Serverless Function — AI Chat Proxy
// API key is stored securely in Vercel Environment Variables (GEMINI_API_KEY)

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
  }

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request: messages array is required.' });
    }

    // Separate system prompt from conversation
    const systemMsg = messages.find(m => m.role === 'system');
    const conversationMsgs = messages.filter(m => m.role !== 'system');

    // Convert to Gemini format
    const geminiMessages = conversationMsgs.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const body = {
      contents: geminiMessages
    };

    if (systemMsg) {
      body.systemInstruction = { parts: [{ text: systemMsg.content }] };
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    );

    const data = await response.json();

    if (data && data.candidates && data.candidates.length > 0) {
      const aiText = data.candidates[0].content.parts[0].text;
      return res.status(200).json({ reply: aiText });
    } else {
      console.error('Gemini API error:', JSON.stringify(data));
      return res.status(502).json({
        error: 'AI service returned an invalid response.',
        details: data?.error?.message || 'Unknown error'
      });
    }
  } catch (error) {
    console.error('AI Chat proxy error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
