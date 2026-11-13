import type { Locale } from '../learning/content';
import { normalizeInput, progressiveRows } from './content';

export function parseSentenceRows(reply: string, seed: string): string[][] {
  const cleaned = reply.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  let values: unknown;
  try { values = JSON.parse(cleaned); } catch { /* Plain numbered lines are also accepted. */ }
  const lines = Array.isArray(values) ? values : cleaned.split(/\r?\n+/).map(line => line.replace(/^\s*[-–—*\d.)]+\s*/, ''));
  const rows = lines.filter((line): line is string => typeof line === 'string')
    .map(line => normalizeInput('sentences', line, true)).filter(Boolean);
  const normalizedSeed = seed.toLowerCase();
  const startsWithSeed = (row: string) => row.toLowerCase() === normalizedSeed || row.toLowerCase().startsWith(normalizedSeed + ' ');
  if (rows.length && rows[0].toLowerCase() === normalizedSeed && rows.every((row, index) =>
    index === 0 || row.toLowerCase().startsWith(rows[index - 1].toLowerCase() + ' '))) return rows.map(row => row.split(' '));
  const longest = rows.filter(startsWithSeed).sort((a, b) => b.split(' ').length - a.split(' ').length)[0];
  if (!longest) throw new Error('Unexpected sentence format');
  return progressiveRows(longest.split(' '));
}

export async function generateSentenceRows(fetcher: typeof fetch, seed: string, locale: Locale, signal: AbortSignal) {
  const response = await fetcher('/api/ai-chat', {
    method: 'POST', signal, headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [
      { role: 'system', content: `You create simple ${locale === 'ru' ? 'Russian' : 'Kazakh'} sentence pyramids for children. Return only a JSON array of 4 strings. Rule 1: the first string must be exactly the given seed word. Rule 2: every next string must start with the previous string and add only 1 or 2 words at the end. Rule 3: keep the language simple and natural for kids. Rule 4: the final string must be at most 5 words. Do not add markdown or explanations.` },
      { role: 'user', content: `Seed word: "${seed}". Return only JSON.` },
    ] }),
  });
  if (!response.ok) throw new Error('Sentence request failed');
  const data: unknown = await response.json();
  if (!data || typeof data !== 'object' || !('reply' in data) || typeof data.reply !== 'string') throw new Error('Missing sentence reply');
  return parseSentenceRows(data.reply, seed);
}
