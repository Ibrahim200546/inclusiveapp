import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const folder = path.join(root, 'docs/trello-verification');
const drafts = JSON.parse(fs.readFileSync(path.join(folder, 'content-drafts.json'), 'utf8'));
const contrasts = JSON.parse(fs.readFileSync(path.join(folder, 'contrast-drafts.json'), 'utf8'));
const approval = JSON.parse(fs.readFileSync(path.join(folder, 'content-approval.json'), 'utf8'));
const checks = [];
function check(condition, label) { assert.ok(condition, label); checks.push(label); }
check(drafts.teacherApproved === false && drafts.enabledInChildExercises === false, 'Original review snapshot retained; professional approval is not invented');
check(drafts.audio === null, 'Review snapshot does not claim audio approval');
check(approval.approvedBy === 'user', 'User approved publication of these text examples');
check(contrasts.pairs.length === 30 && new Set(contrasts.pairs.map(item => item.pair)).size === 30, 'Thirty distinct draft contrasts');
check(contrasts.status === 'draft-not-approved-not-in-child-test', 'Original contrast review snapshot retained separately from publication');
for (const item of contrasts.pairs) check(item.syllables.length === 2 && item.words.length === 2 && item.sentences.length === 2, `${item.pair}: all three proposed levels`);
check(new Set(drafts.texts.map(item => item.id)).size === drafts.texts.length, 'Text IDs are unique');
for (const item of drafts.texts) {
  check(item.sentences.length === item.sentenceCount, `${item.id}: exact sentence count`);
  check(item.sentenceCount >= item.sourceRange[0] && item.sentenceCount <= item.sourceRange[1], `${item.id}: source sentence range`);
  check(item.sentences.every(sentence => /[.!?]$/.test(sentence.trim())), `${item.id}: explicit sentence boundaries`);
  check(item.questions.length > 0 && item.questions.every(q => q.text && q.answer), `${item.id}: questions and proposed answers`);
  check(item.audio === null, `${item.id}: audio awaits approval/recording`);
  if (item.ordering) {
    check(JSON.stringify([...item.ordering.shuffledSentenceIndices].sort((a, b) => a - b)) === JSON.stringify(item.ordering.correctSentenceIndices), `${item.id}: ordering is a complete permutation`);
  }
}
for (const item of drafts.syllableReading.items) {
  check(item.syllables.length === item.count && item.syllables.join('') === item.word, `${item.word}: draft syllable structure`);
}
for (const item of [...drafts.voicePractice.oneBreath, ...drafts.voicePractice.wholeWords]) {
  check(item.proposedSyllables.length === item.count, `${item.text}: declared syllable count`);
}
for (const item of drafts.longPhrases) {
  const count = item.text.trim().split(/\s+/u).length;
  check(count === item.wordCount && count >= item.sourceRangeWords[0] && count <= item.sourceRangeWords[1], `${item.sourceObjectiveCode}: word range, not sentence range`);
}
const math = drafts.mathVocabulary;
for (const item of [...math.terms, ...math.comparisonContrasts]) {
  const [a, b] = item.operands;
  const actual = { '+': a + b, '-': a - b, '*': a * b, '/': a / b }[item.operation];
  check(actual === item.answer, `${item.prompt}: arithmetic answer`);
}
for (const item of math.multiplication) check(item.operands[0] * item.operands[1] === item.answer, `Multiplication ${item.operands.join(' × ')}`);
for (const item of math.integerDivision) check(item.operands[0] % item.operands[1] === 0 && item.operands[0] / item.operands[1] === item.answer, `Integer division ${item.operands.join(' ÷ ')}`);
const entry = fs.readFileSync(path.join(root, 'public/original/index2.html'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'public/original/js/learning-work-ui.js'), 'utf8');
check(!entry.includes('content-drafts.json') && !runtime.includes('content-drafts.json'), 'Original review JSON is not fetched directly by the child UI');
check(entry.includes('js/curriculum-content.js') && fs.existsSync(path.join(root, 'public/original/js/curriculum-content.js')), 'Approved runtime content is connected');

const md = [
  '# Учебные черновики для проверки', '',
  'Дата: 19 октября 2026. Тексты и примеры ниже одобрены пользователем и подключены к учебным занятиям. Это стартовый набор, а не полный учебный курс. Отдельное профессиональное утверждение не заявляется.', '',
  'Исходные JSON сохранены как снимки черновиков; согласование хранится в content-approval.json. Синтетическая озвучка текстов подготовлена. Интонацию, силу голоса и специальные акценты показывает и оценивает педагог.', '',
  '## Что проверить', '',
  '- Грамотность казахского текста, слогоделение и возрастную сложность.',
  '- Соответствие исходной строке программы и её направлению.',
  '- Однозначность вопросов и допустимые варианты ответа.',
  '- Ударение, паузы и интонацию по настоящим аудиообразцам.',
  '- Спорные пары ң/н, у–ұ и русскоязычные твёрдые/мягкие пары.', '',
  '**Ограничения:** синтетические записи текста не объявляются эталонами интонации, шёпота или специального ударения. В таких занятиях используется живой образец педагога. Произнесение оценивает педагог. Страница 42 программы отсутствует.', '',
  '## Голос и выдох — карточка 07', '',
  '0 класс: таблица 6; 1 класс: таблица 8. Режимы «вместе» / «самостоятельно», подтверждение педагогом. Никакой оценки по случайному шуму.', '',
  ...drafts.voicePractice.strength.map(item => `- **${item.labelRu}:** ${item.prompt}`), '',
  `Последовательность: ${drafts.voicePractice.syllableSequence.join(' → ')}.`, '',
  '| Класс | Фраза | Предложенное деление | Слогов |', '|---|---|---|---|',
  ...drafts.voicePractice.oneBreath.map(item => `| ${item.grade} | ${item.text} | ${item.proposedSyllables.join('–')} | ${item.count} |`), '',
  `Слова целиком: ${drafts.voicePractice.wholeWords.map(item => `${item.text} (${item.count} слога)`).join('; ')}.`, '',
  'Предложение словесного ударения: а–**на**, ба–**ла**. Место ударения и образец пока не утверждены.', '',
  drafts.voicePractice.note, '',
  '## Слогоделение — карточка 09, 2 класс', '',
  `Таблица 10, цель ${drafts.syllableReading.sourceObjectiveCode}. Проверить каждое деление, особенно слова с у/и и заимствования.`, '',
  '| Слово | Предложенное деление | Слогов |', '|---|---|---|',
  ...drafts.syllableReading.items.map(item => `| ${item.word} | ${item.syllables.join('–')} | ${item.count} |`), '',
  '## Интонации, логическое ударение и паузы — 09/13/16', '',
];
for (const item of drafts.intonation) {
  md.push(`### ${item.grade} класс — ${item.id}`, '', ...item.variants.map(variant => `- ${variant.type}${variant.speaker ? `, ${variant.speaker}` : ''}: ${variant.text}`), '', `Вопрос: ${item.question} Предполагаемый ответ: ${item.answer || item.answerType}.`, 'Для каждой реплики нужна собственная проверенная запись.', '');
}
md.push('### Логическое ударение', '', drafts.stressAndPauses.logicalStress.text, '', ...drafts.stressAndPauses.logicalStress.variants.map(item => `- Выделить **${drafts.stressAndPauses.logicalStress.words[item.stressedWordIndex]}**. Вопрос: ${item.question} Ответ: ${item.answer}.`), '', drafts.stressAndPauses.logicalStress.reviewNote, '', '### Синтагмы, 4 класс', '');
for (const item of drafts.stressAndPauses.syntagms) md.push(`- ${item.sourceObjectiveCode}: ${item.proposedGroups.join(' / ')}. Предложенная граница дыхательной паузы обозначена «/».`);
md.push('', '## Близкие звуки — 04/13/16', '', 'Все 30 пар, слоги, слова, предложения и замечания: [contrast-drafts.json](contrast-drafts.json). Проверить, что неминимальные пары подходят именно для нужного этапа. Не выдавать этот список за утверждённую фонетическую норму.', '');
for (const item of drafts.pronunciationContrasts) md.push(`### ${item.grade} класс, таблица ${item.table}`, '', ...Object.entries(item.sourceGroups).map(([group, pairs]) => `- ${group}: ${pairs.join(', ')}`), '', ...item.unresolved.map(note => `- Требует проверки: ${note}`), '');
md.push('## Тексты, вопросы и предполагаемые ответы — 10/12/15/17', '', 'Объём каждого текста ниже проверен автоматически. Связь с программой остаётся предложением для человеческой проверки; знакомость темы определяется педагогом.', '');
for (const item of drafts.texts) {
  md.push(`### ${item.title} — ${item.grade ?? item.grades.join('–')} класс`, '', `ID: ${item.id}. Таблица: ${item.table ?? item.tables.join('/')}. Предложений: **${item.sentenceCount}**, отдельный исходный диапазон: ${item.sourceRange.join('–')}. Цели: ${item.sourceObjectiveCodes.join(', ') || 'точную строку уточнить'}.`, '', `[Карточка](${item.card})`, '', item.sentences.join(' '), '', ...item.questions.map(q => `- ${q.text} → **${q.answer}**`), '');
  if (item.mappingStatus) md.push(`Проверить привязку: ${item.mappingStatus}`, '');
  if (item.reviewNote) md.push(item.reviewNote, '');
  if (item.pictureSequence) md.push(`Предложенные 4 картинки: ${item.pictureSequence.join(' → ')}.`, '');
  if (item.ordering) md.push('Для восстановления текста использовать отдельные карточки предложений. Индексы и эталон порядка находятся в JSON; переключение частей должно быть доступно кнопками.', '');
}
md.push('### Длинные фразы, 2 класс', '', 'Это ограничение по **словам**, отдельно от количества предложений в текстах.', '', ...drafts.longPhrases.map(item => `- ${item.text} — **${item.wordCount} слов**, цель ${item.sourceObjectiveCode}, диапазон ${item.sourceRangeWords.join('–')}.`), '', '## Диалоги', '');
for (const item of drafts.dialogues) md.push(`### ${item.id}`, '', ...item.turns.map(turn => `- **${turn.speaker}:** ${turn.text}`), '', `Вопрос: ${item.question} Ответ: ${item.answer}.`, 'Устный ответ отмечает педагог. Реплики разных ролей должны иметь проверенные образцы.', '');
md.push('## Члены предложения — 15, 4 класс', '');
for (const item of drafts.syntax.items) md.push(`- **${item.text}** ${item.roles.map(role => `${role.word} — ${role.role} (${role.question})`).join('; ')}.`);
md.push('', drafts.syntax.reviewNote, '', '## Математический словарь — 12/15/17', '', 'Распознавание термина и вычисление — два отдельных результата. Возраст и формулировки требуют проверки.', '', ...math.terms.map(item => `- ${item.grade} класс: ${item.prompt} → ${item.answer}.`), '', ...math.comparisonContrasts.map(item => `- ${item.prompt} → ${item.operands[0]} ${item.operation} ${item.operands[1]} = **${item.answer}**.`), '', `Предложенные примеры умножения: ${math.multiplication.map(item => `${item.operands.join(' × ')} = ${item.answer}`).join('; ')}. Это образцы, а не вся таблица умножения.`, '', `Деление без остатка: ${math.integerDivision.map(item => `${item.operands.join(' ÷ ')} = ${item.answer}`).join('; ')}.`, '', '## Что остаётся', '', ...drafts.remainingGaps.map(note => `- ${note}`), '', '## Ответ для проверки', '', 'Можно прислать замечания по ID, например: «g2-unfamiliar-9 — принять», «мектеп — исправить деление …», «grade4-dialogue-intonation — заменить реплику …». Подтверждение текста не означает автоматического утверждения ещё не записанного аудио.', '');
fs.writeFileSync(path.join(folder, 'METHODIST_REVIEW.md'), md.join('\n'));
fs.writeFileSync(path.join(folder, 'draft-validation.json'), JSON.stringify({ date: drafts.date, checks: checks.length, passed: true, texts: drafts.texts.length, syllableWords: drafts.syllableReading.items.length, scope: 'Structure, declared lengths and arithmetic only; no linguistic/pedagogical approval', details: checks }, null, 2) + '\n');
console.log(`${checks.length} structural checks passed; ${drafts.texts.length} draft texts. Review document regenerated.`);
