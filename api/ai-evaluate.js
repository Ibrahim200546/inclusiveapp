// Vercel Serverless Function — AI Speech Evaluation Proxy
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
    const { target, spoken } = req.body;

    if (!target || spoken === undefined) {
      return res.status(400).json({ error: 'Invalid request: target and spoken fields are required.' });
    }

    // Detect language
    const isRussian = /[а-яА-ЯёЁ]/.test(target) && !/[қғңұүіөәҚҒҢҰҮІӨӘ]/.test(target);
    const feedbackLanguage = isRussian ? "Russian" : "Kazakh (Қазақша)";

    const prompt = `You are an AI Speech Therapist analyzing a kid's speech in an inclusive app.
Task: Evaluate pronunciation for the target word/sound.
Target: "${target}"
What the kid actually said: "${spoken}"

If they correctly pronounced the target sound/word, give high score.
If what they said partially matches, give medium score.
If it is totally wrong or empty, give low score.

Return a JSON strictly in this format without markdown code blocks:
{
  "score": integer_between_0_and_100,
  "feedback": "1-2 short, highly encouraging and simple sentences giving feedback in ${feedbackLanguage}."
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await response.json();

    if (data && data.candidates && data.candidates.length > 0) {
      let aiText = data.candidates[0].content.parts[0].text.trim();

      // Remove markdown formatting if model outputs it
      aiText = aiText.replace(/^```json\s*/m, '').replace(/^```\s*/m, '').replace(/\s*```$/m, '');

      try {
        const result = JSON.parse(aiText.trim());
        return res.status(200).json(result);
      } catch (e) {
        console.error('Failed to parse AI JSON:', aiText);
        return res.status(200).json({
          score: 75,
          feedback: isRussian
            ? "Хорошая попытка! Попробуй ещё раз! 👍"
            : "Жақсы! Тағы бір рет көріңіз! 👍"
        });
      }
    } else {
      console.error('Gemini API error:', JSON.stringify(data));
      return res.status(200).json({
        score: 70,
        feedback: isRussian
          ? "Молодец! Продолжай стараться! 💪"
          : "Жарайсың! Жалғастыр! 💪"
      });
    }
  } catch (error) {
    console.error('AI Evaluate proxy error:', error);
    return res.status(200).json({
      score: 70,
      feedback: "Жарайсың! Тағы бір рет көріңіз! 💪"
    });
  }
}
