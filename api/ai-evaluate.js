// Compatibility endpoint: deterministic text matching, NOT pronunciation grading.
// No recording/transcript is sent to a paid or third-party AI provider here.
export function compareTranscript(target, spoken) {
  const normalize = value => value.normalize('NFC').toLocaleLowerCase('kk-KZ')
    .replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
  const expected = normalize(target), actual = normalize(spoken);
  if (!expected) return null;
  let previous = Array.from({ length: expected.length + 1 }, (_, index) => index);
  for (let row = 1; row <= actual.length; row++) {
    const current = [row];
    for (let col = 1; col <= expected.length; col++) {
      current[col] = Math.min(current[col - 1] + 1, previous[col] + 1,
        previous[col - 1] + (actual[row - 1] === expected[col - 1] ? 0 : 1));
    }
    previous = current;
  }
  return Math.max(0, Math.round((1 - previous[expected.length] / Math.max(expected.length, actual.length)) * 100));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { target, spoken, lang } = req.body || {};
  if (typeof target !== 'string' || typeof spoken !== 'string' || target.length > 160 || spoken.length > 1000) {
    return res.status(400).json({ error: 'Expected target (1–160 characters) and spoken (0–1000 characters) strings.' });
  }
  const score = compareTranscript(target, spoken);
  if (score === null) return res.status(400).json({ error: 'Target must contain letters or numbers.' });
  const ru = String(lang || '').toLowerCase().startsWith('ru');
  return res.status(200).json({
    score,
    assessmentType: 'text_similarity',
    pronunciationEvaluated: false,
    feedback: ru
      ? `Совпадение распознанного текста: ${score}%. Это не оценка произношения. Проверьте, правильно ли браузер распознал слова.`
      : `Танылған мәтіннің сәйкестігі: ${score}%. Бұл айтылым бағасы емес. Браузер сөзді дұрыс танығанын тексеріңіз.`
  });
}
