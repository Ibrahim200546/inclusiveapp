// Card 17: Table 9 lengths (familiar vs. two separate unfamiliar targets).
// These checks confirm size and mapping, not whether a text is familiar to a learner.
const textRanges = {
  '2.2.1.3': [5, 10],
  '2.3.1.3': [5, 10],
  '2.2.1.11': [9, 10],
  '2.2.1.12': [5, 6],
};

function assertLength(label, actual, declared, storedRange, range) {
  if (actual !== declared || actual < range[0] || actual > range[1] ||
      !Array.isArray(storedRange) || storedRange.length !== 2 ||
      storedRange.some((value, index) => value !== range[index])) {
    throw new Error(`Grade 2 listening: ${label} has ${actual}; expected ${range.join('–')} with matching declared count and range`);
  }
}

export function validateGrade2Listening({ texts, longPhrases }) {
  for (const item of texts.filter(row => row.grade === 2 && row.table === 9)) {
    const ranges = item.sourceObjectiveCodes.filter(code => Object.hasOwn(textRanges, code));
    if (!ranges.length) continue;
    const count = item.sentences.filter(sentence => typeof sentence === 'string' && sentence.trim()).length;
    if (count !== item.sentences.length) throw new Error(`Grade 2 listening: blank sentence in ${item.id}`);
    for (const code of ranges) assertLength(item.id, count, item.sentenceCount, item.sourceRange, textRanges[code]);
  }
  for (const item of longPhrases.filter(row => row.grade === 2 && row.table === 9 && row.sourceObjectiveCode === '2.3.1.10')) {
    // Internal punctuation and hyphens do not split an orthographic word.
    const words = item.text.match(/[\p{L}\p{N}]+(?:[-‐‑’'][\p{L}\p{N}]+)*/gu) || [];
    assertLength('2.3.1.10 phrase', words.length, item.wordCount, item.sourceRangeWords, [9, 12]);
  }
}
