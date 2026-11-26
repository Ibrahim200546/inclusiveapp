import fs from 'node:fs';
import crypto from 'node:crypto';
import { validateGrade2Listening } from './validate-grade2-listening.mjs';

const folder = 'docs/trello-verification/';
const source = JSON.parse(fs.readFileSync(folder + 'content-drafts.json', 'utf8'));
validateGrade2Listening(source);
const pairs = JSON.parse(fs.readFileSync(folder + 'contrast-drafts.json', 'utf8'));
const additions = JSON.parse(fs.readFileSync(folder + 'contrast-card30-additions.json', 'utf8'));
pairs.pairs.push(...additions.pairs);
const approval = JSON.parse(fs.readFileSync(folder + 'content-approval.json', 'utf8'));
if (approval.approvedBy !== 'user') throw new Error('Content approval is required');
const manifestFile = 'public/original/sounds/curriculum/manifest.json';
const previousAudio = new Map((fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : []).map(item => [item.id, item]));
const audio = new Map(), lessons = [];
function clip(text) {
  const normalized = text.trim();
  const id = crypto.createHash('sha256').update('kk-KZ|amira|0.85|' + normalized).digest('hex').slice(0, 20);
  const file = `sounds/curriculum/${id}.mp3`;
  audio.set(id, { ...previousAudio.get(id), id, text: normalized, lang: 'kk-KZ', voice: 'amira', speed: 0.85, file, source: 'Edu CoreX /api/tts, synthetic narration' });
  return file;
}
function choice(id, prompt, stimulus, labels, answer, extra = {}) {
  return { id, kind: 'choice', prompt, audio: clip(stimulus), stimulus, supportText: stimulus, options: labels.map(label => ({ value: String(label), label: String(label) })), answer: String(answer), ...extra };
}
function oral(id, text, extra = {}) {
  return { id, kind: 'teacher', prompt: 'Тыңдап, қайталаңыз. Орындауды педагог белгілейді.', stimulus: text, display: text, audio: clip(text), ...extra };
}
function add(lesson) {
  if (!lesson.steps.length) return;
  if (lessons.some(item => item.id === lesson.id && item.grade === lesson.grade)) throw new Error('Duplicate lesson');
  lessons.push(lesson.integrationDate ? { ...lesson, integrationAuthorizedBy: 'user' } : { ...lesson, approvedBy: 'user', approvalDate: approval.date });
}
// Рсв и фп нач на каз.doc, tables 5 (pp. 26–27), 7 (pp. 29–31).
// These are scoped practice links, not certification that a learner attained a goal.
const card10Mappings = {
  '0:g01-objects': { codes: ['0.2.1.2'], scope: 'heard everyday words' },
  '1:g01-objects': { codes: ['1.2.1.7'], scope: 'heard words only, not sentence or phrase length' },
  '0:g01-school-6': { codes: ['0.2.1.13', '0.3.1.7'], range: [5, 6], scope: '6-sentence narrative, comprehension by choice' },
  '1:g01-school-6': { codes: ['1.2.1.5'], range: [6, 7], scope: '6-sentence narrative, comprehension by choice' },
  '0:g0-walk-7': { codes: [], range: [6, 8], candidates: ['0.3.1.9'], scope: 'the teacher must first confirm that the story is unfamiliar to this learner' },
  '1:g1-apple-7': { codes: ['1.2.1.5'], range: [6, 7], scope: '7-sentence narrative, comprehension by choice' },
  '0:g01-pencil': { codes: ['0.2.1.11'], candidates: ['0.2.1.8'], scope: 'recognition of an everyday request; live reciprocal dialogue is not assessed' },
  '1:g01-pencil': { codes: ['1.2.1.2'], candidates: ['1.3.1.5'], scope: 'recognition of an everyday request; live reciprocal dialogue is not assessed' },
};
function card10Mapping(grade, id) {
  const item = card10Mappings[grade + ':' + id];
  if (!item) return {};
  return {
    objectiveCodes: item.codes,
    // The original lessons were unmapped. Do not orphan saved progress.
    progressObjectiveCodes: [],
    sourceMappingPending: !item.codes.length,
    objectivePracticeScope: item.scope,
    ...(item.range ? { sourceRange: item.range } : {}),
    ...(item.candidates ? { conditionalObjectiveCodes: item.candidates } : {}),
  };
}
const objects = [{ word: 'кітап', icon: '📖' }, { word: 'қалам', icon: '✏️' }, { word: 'алма', icon: '🍎' }];
for (const grade of [0, 1]) add({ id: 'g01-objects', grade, table: grade === 0 ? 5 : 7, strand: 'listening-comprehension', objectiveCodes: [], category: 'comprehension', title: 'Затты таңда', card: 'https://trello.com/c/T4Er5qo2', ...card10Mapping(grade, 'g01-objects'),
  steps: objects.map((item, index) => choice('object-' + index, 'Тыңдаңыз. Естіген затты таңдаңыз.', item.word, objects.map(o => o.word), item.word,
    { options: objects.map(o => ({ value: o.word, label: o.icon + ' ' + o.word })) })) });
const distractors = {
  'g01-school-6': [['Дүкенге', 'Саябаққа'], ['Доп', 'Алма']],
  'g0-walk-7': [['Мысық', 'Ит'], ['Данияр', 'Мұғалім']],
  'g1-apple-7': [['Әке', 'Мұғалім'], ['Лақтырды', 'Жасырды']],
  'g2-familiar-6': [['Есіктің жанында', 'Үстелдің астында'], ['Айша', 'Мұғалім']],
  'g2-unfamiliar-9': [['Жаз', 'Күз'], ['Анасы', 'Досы'], ['Су', 'Құм']],
  'g2-unfamiliar-5': [['Қалам', 'Доп'], ['Досына', 'Анасына']],
  'g3-familiar-8': [['Дүкенге', 'Алаңға'], ['Өсімдіктер туралы кітап', 'Көліктер туралы кітап'], ['Теңіз туралы кітап', 'Спорт туралы кітап']],
  'g3-unfamiliar-11': [['Бидайдың тұқымын', 'Жүгерінің тұқымын'], ['Қараңғы бөлмеге', 'Қардың үстіне'], ['Тек құм', 'Қар мен мұз']],
  'g3-extended-14': [['Дүйсенбі күні', 'Жұма күні'], ['Кітаптарды', 'Ойыншықтарды'], ['Өздері ұстады', 'Олармен ойнады']],
  'g3-disputed-15': [['Матадан доп', 'Ағаштан орындық'], ['Үйдің мекенжайы', 'Сабақ кестесі'], ['Ән айтты', 'Терезені ашты']],
  'g4-familiar-10': [['Жаңа ойыншық', 'Жазылмаған дәптер'], ['Күзетші', 'Дәрігер'], ['Бір жылдан кейін', 'Келесі айда']],
  'g4-extended-15': [['Терезенің сынғанын', 'Гүлдің құлағанын'], ['Оқушылар', 'Қонақтар'], ['Құстар туралы', 'Спорт туралы']],
  'g4-complex-8': [['Сыртта өте ыстық болғандықтан', 'Мұғалім болмағандықтан'], ['Жұлдыздарды', 'Қарды'], ['Үйге тарады', 'Сабақты өткізбеді']],
};
for (const item of source.texts) for (const grade of item.grades || [item.grade]) {
  const stimulus = item.sentences.join(' ');
  add({ id: item.id, grade, table: item.table || (grade === 0 ? 5 : 7), strand: item.strand,
    objectiveCodes: item.sourceObjectiveCodes, category: 'comprehension', title: item.title, card: item.card,
    sentenceCount: item.sentenceCount, sourceRange: item.sourceRange, sourceMappingPending: Boolean(item.mappingStatus), ...card10Mapping(grade, item.id),
    steps: item.questions.map((q, i) => choice(`q${i + 1}`, q.text, stimulus, [q.answer, ...distractors[item.id][i]], q.answer, { questionAudio: clip(q.text), supportText: stimulus })) });
  if (item.ordering) add({ id: item.id + '-order', grade, table: item.table, strand: item.strand,
    objectiveCodes: ['2.3.1.7'], category: 'comprehension', title: item.title + ' · Реті', card: item.card,
    steps: [{ id: 'order', kind: 'order', prompt: 'Сөйлемдерді оқиға ретімен орналастырыңыз.', stimulus, audio: clip(stimulus),
      orderItems: item.sentences.map((text, index) => ({ value: String(index), label: text })), initialOrder: item.ordering.shuffledSentenceIndices.map(String),
      expectedOrder: item.ordering.correctSentenceIndices.map(String), supportText: stimulus }] });
  if (item.pictureSequence) add({ id: item.id + '-pictures', grade, table: item.table, strand: item.strand,
    objectiveCodes: ['2.3.1.4'], category: 'comprehension', title: item.title + ' · Суреттер', card: item.card,
    steps: [{ id: 'pictures', kind: 'order', prompt: 'Суреттерді оқиға ретімен орналастырыңыз.', stimulus, audio: clip(stimulus), expectedOrder: ['0', '1', '2', '3'], initialOrder: ['2', '0', '3', '1'],
      orderItems: [ { value: '0', label: 'Құстар қарлы аулада', scene: 'winter' }, { value: '1', label: 'Әкесі мен Айша жемсауыт жасады', scene: 'build' },
        { value: '2', label: 'Айша дән салды', scene: 'seed' }, { value: '3', label: 'Құстар жемсауытқа келді', scene: 'birds' } ], supportText: stimulus }] });
  if (grade === 4 && item.id === 'g4-extended-15') {
    // The supplied Kazakh program, table 13 p. 44, names restoration of unfamiliar texts.
    // Reuse this existing narration as a practice sample. Only a teacher can certify
    // that the text is unfamiliar to a particular pupil.
    const groups = [item.sentences.slice(0, 6), item.sentences.slice(6, 11), item.sentences.slice(11)];
    add({ id: item.id + '-order', grade, table: item.table, strand: item.strand, objectiveCodes: ['4.3.1.8'],
      category: 'comprehension', title: item.title + ' · Мәтін реті', card: item.card, sentenceCount: item.sentenceCount,
      steps: [{ id: 'order', kind: 'order', prompt: 'Мәтінді тыңда. Бөліктерін оқиға ретімен орналастыр.', stimulus,
        audio: clip(stimulus), initialOrder: ['2', '0', '1'], expectedOrder: ['0', '1', '2'],
        reveal: 'Әуелі кранды жөндеді, содан кейін су туралы әңгімелесті, соңында плакат жасады.',
        orderItems: groups.map((sentences, index) => ({ value: String(index), label: sentences.join(' ') })) }] });
  }
  if (grade === 3) {
    const size = Math.ceil(item.sentences.length / 4), groups = [];
    for (let i = 0; i < item.sentences.length; i += size) groups.push(item.sentences.slice(i, i + size).join(' '));
    add({ id: item.id + '-order', grade, table: item.table, strand: item.strand, objectiveCodes: [], category: 'comprehension', title: item.title + ' · Реті', card: item.card,
      sourceMappingPending: true, steps: [{ id: 'order', kind: 'order', prompt: 'Мәтін бөліктерін оқиға ретімен орналастырыңыз.', stimulus, audio: clip(stimulus),
        orderItems: groups.map((label, index) => ({ value: String(index), label })), initialOrder: ['2', '0', '3', '1'], expectedOrder: ['0', '1', '2', '3'], supportText: stimulus }] });
  }
}
const familiarGrade3 = source.texts.find(item => item.id === 'g3-familiar-8');
add({ id: 'g3-sentence-choice', grade: 3, table: 11, strand: 'speech-comprehension', objectiveCodes: ['3.3.1.14'], category: 'comprehension', title: 'Естіген сөйлемді тап', card: familiarGrade3.card,
  steps: familiarGrade3.sentences.slice(0, 3).map((sentence, index) => choice('sentence-' + index, 'Естіген сөйлемді таңдаңыз.', sentence,
    [sentence, ...familiarGrade3.sentences.filter(s => s !== sentence).slice(0, 2)], sentence)) });
for (const item of source.dialogues) for (const grade of item.grades || [item.grade]) {
  const stimulus = item.turns.map(turn => turn.text).join(' ');
  const wrong = item.id === 'g01-pencil' ? ['Доп', 'Кітап'] : item.id === 'g2-library' ? ['Спорт туралы кітап', 'Ғарыш туралы кітап'] : ['Жүз теңге', 'Үш жүз теңге'];
  add({ id: item.id, grade, table: item.table || (grade === 0 ? 5 : 7), strand: 'speech-comprehension', objectiveCodes: [], category: 'comprehension', title: 'Диалог · ' + (grade < 2 ? 'Қалам' : grade === 2 ? 'Кітапхана' : 'Дүкен'), card: item.card, ...card10Mapping(grade, item.id),
    steps: [choice('understand', item.question, stimulus, [item.answer, ...wrong], item.answer, { supportText: item.turns.map(t => t.speaker + ': ' + t.text).join('\n'), questionAudio: clip(item.question) }),
      ...item.turns.map((turn, i) => oral('role-' + i, turn.text, { prompt: turn.speaker + ' рөлінде айтыңыз.', speaker: turn.speaker }))] });
}
for (const item of source.longPhrases) add({ id: 'g2-long-phrase-' + source.longPhrases.indexOf(item), grade: item.grade, table: item.table, strand: item.strand, objectiveCodes: [item.sourceObjectiveCode], category: 'comprehension', title: 'Ұзақ сөйлем · ' + (source.longPhrases.indexOf(item) + 1), card: item.card,
  steps: [oral('repeat', item.text, { wordCount: item.wordCount })] });
const syllables = source.syllableReading;
add({ id: 'g2-syllable-count', grade: 2, table: 10, strand: syllables.strand, objectiveCodes: [syllables.sourceObjectiveCode], category: 'phonetics', title: 'Неше буын?', card: syllables.card,
  steps: syllables.items.map((item, i) => {
    if (!Number.isInteger(item.count) || item.count < 2 || item.count > 5 || !Array.isArray(item.syllables)
      || item.syllables.length !== item.count || item.syllables.some(part => typeof part !== 'string' || !part.trim())
      || item.syllables.join('') !== item.word) throw new Error('Invalid authored syllable breakdown: ' + item.word);
    return choice('word-' + i, 'Сөзде неше буын бар?', item.word, [2, 3, 4, 5], item.count, {
      reveal: item.syllables.join('–') + ' — ' + item.count + ' буын', syllables: item.syllables
    });
  }) });
const normalizePair = pair => pair.split('–').sort().join('–');
for (const grade of [1, 2, 3, 4]) {
  const grade2Pairs = ['а–ә', 'о–ө', 'ү–ұ', 'у–ү', 'с–з', 'ш–ж'];
  const permitted = grade === 1 ? pairs.pairs : pairs.pairs.filter(item => (grade === 2 ? grade2Pairs : source.pronunciationContrasts.find(group => group.grade === grade).candidateReferences).some(ref => normalizePair(ref) === normalizePair(item.pair)));
  for (const item of permitted) {
    const table = grade === 1 ? 8 : grade === 2 ? 10 : grade === 3 ? 12 : 14;
    add({ id: 'pair-' + pairs.pairs.indexOf(item), grade, table, strand: 'pronunciation', objectiveCodes: grade === 1 ? ['1.2.1.5'] : grade === 2 ? ['2.2.1.3'] : grade === 3 ? ['3.2.1.1', '3.2.1.2'] : ['4.2.1.1'], category: 'phonetics', title: item.pair.toUpperCase(), card: item.card || (grade < 3 ? pairs.card : source.pronunciationContrasts.find(g => g.grade === grade).card),
      ...(item.integrationDate ? { integrationDate: item.integrationDate, sampleProvenance: item.sampleProvenance } : {}),
      steps: ['syllables', 'words', 'sentences'].flatMap((level, index) => item[level].map((target, side) => choice(`${level}-${side}`, 'Тыңдаңыз. Естіген нұсқаны таңдаңыз.', target, item[level], target,
        { level: ['Буындар', 'Сөздер', 'Сөйлемдер'][index], reveal: target, illustrationWord: level === 'words' ? target : null }))) });
  }
}
for (const grade of [0, 1, 2]) {
  const table = grade === 0 ? 6 : grade === 1 ? 8 : 10;
  const phrases = source.voicePractice.oneBreath.filter(item => item.grade === (grade === 2 ? 1 : grade));
  const words = source.voicePractice.wholeWords.filter(item => item.grade === grade);
  add({ id: 'one-breath', grade, table, strand: 'pronunciation', objectiveCodes: grade === 0 ? ['0.1.1.2', '0.1.1.7', '0.1.1.8'] : grade === 1 ? ['1.1.1.1', '1.1.1.2'] : ['2.1.1.2'], category: 'speech', title: 'Бір деммен', card: source.voicePractice.card,
    steps: [...(grade < 2 ? source.voicePractice.syllableSequence.map((text, i) => ({ id: 'syllables-' + i, kind: 'teacher', prompt: 'Педагогтің үлгісін тыңдап, бір деммен қайталаңыз.', display: text.replaceAll('-', '').toLowerCase(), repetitions: i + 1, teacherModel: true })) : []), ...words.map((item, i) => oral('whole-' + i, item.text)),
      ...phrases.map((item, i) => oral('phrase-' + i, item.text, { syllables: item.proposedSyllables, syllableCount: item.count }))].map(step => ({ ...step, prompt: (step.teacherModel ? 'Педагогті тыңда. ' : 'Тыңда. ') + 'Бір дем шығарғанда қайтала. Қиналсаң, тоқтап, демал.' })) });
  add({ id: 'voice-strength', grade, table, strand: 'pronunciation', objectiveCodes: [grade === 0 ? '0.1.1.1' : grade === 1 ? '1.1.1.3' : '2.1.1.1'], category: 'speech', title: 'Дауыс күші', card: source.voicePractice.card,
    steps: source.voicePractice.strength.map(item => ({ id: item.id, kind: 'teacher', prompt: item.prompt, display: 'Ана', teacherModel: true, level: item.id === 'gentle-voice' ? 'Ақырын' : 'Сәл қаттырақ' })) });
}
for (const grade of [0, 1]) add({ id: 'word-stress', grade, table: grade === 0 ? 6 : 8, strand: 'pronunciation', objectiveCodes: grade === 0 ? ['0.1.1.6'] : [], category: 'speech', title: 'Сөз екпіні', card: source.voicePractice.card,
  steps: source.voicePractice.wordStress.map((item, i) => ({ id: 'word-' + i, kind: 'teacher', prompt: 'Белгіленген буынға екпін түсіріп, қайталаңыз.', display: item.text, syllables: item.syllables, stressedSyllableIndex: item.proposedStressedSyllableIndex, teacherModel: true })) });
// Table 6 p.28 (0.1.1.9), Table 8 p.32 (1.1.1.4): teacher-led
// statement/question contrast. Reuse the approved text, not older-grade scores.
const juniorIntonation = source.intonation.find(item => item.id === 'grade2-intonation');
const juniorVariants = juniorIntonation.variants.filter(item => ['statement', 'question'].includes(item.type));
for (const grade of [0, 1]) add({
  id: 'junior-intonation', grade, table: grade === 0 ? 6 : 8, strand: 'pronunciation',
  objectiveCodes: [grade === 0 ? '0.1.1.9' : '1.1.1.4'], category: 'speech', title: 'Хабарлы және сұраулы интонация', card: source.voicePractice.card,
  steps: juniorVariants.map(variant => ({
    id: variant.type, kind: 'teacher', teacherModel: true, display: variant.text,
    level: variant.type === 'statement' ? 'Хабарлы сөйлем' : 'Сұраулы сөйлем',
    prompt: 'Педагогтің үлгісін тыңдап, сол интонациямен қайталаңыз.'
  }))
});
for (const item of source.intonation) add({ id: item.id, grade: item.grade, table: item.table, strand: item.strand, objectiveCodes: item.sourceObjectiveCodes || [item.sourceObjectiveCode], category: 'speech', title: 'Интонация', card: item.card,
  steps: item.variants.map((variant, i) => ({ id: 'variant-' + i, kind: 'teacher', teacherModel: true, display: variant.text, level: { statement: 'Хабарлы сөйлем', question: 'Сұраулы сөйлем', exclamation: 'Лепті сөйлем' }[variant.type], speaker: variant.speaker,
    prompt: 'Педагогтің үлгісін тыңдап, сол интонациямен қайталаңыз.' })) });
for (const grade of [1, 3, 4]) {
  const item = source.stressAndPauses.logicalStress;
  add({ id: 'logical-stress', grade, table: grade === 1 ? 8 : grade === 3 ? 12 : 14, strand: 'pronunciation', objectiveCodes: item.sourceObjectiveCodesByGrade[grade] ? [item.sourceObjectiveCodesByGrade[grade]] : [], category: 'speech', title: 'Логикалық екпін', card: source.stressAndPauses.cards[grade === 1 ? 0 : grade === 3 ? 1 : 2],
    steps: item.variants.map((v, i) => ({ id: 'stress-' + i, kind: 'teacher', teacherModel: true, display: item.text, words: item.words, stressedWordIndex: v.stressedWordIndex, prompt: v.question + ' Сөйлемді қайтала. Белгіленген сөзді дауыспен бөліп айт.', reveal: v.answer })) });
}
add({ id: 'g4-syntagms', grade: 4, table: 14, strand: 'pronunciation', objectiveCodes: ['4.1.1.1', '4.1.1.2'], category: 'speech', title: 'Кідіріс және тыныс', card: source.stressAndPauses.cards[2],
  steps: source.stressAndPauses.syntagms.map((item, i) => ({ id: 'group-' + i, kind: 'teacher', teacherModel: true, display: item.text, groups: item.proposedGroups, prompt: 'Белгіленген жерде кідіріс жасап, педагогпен бірге айтыңыз.' })) });
const roles = ['бастауыш', 'баяндауыш', 'толықтауыш', 'анықтауыш', 'пысықтауыш'];
add({ id: 'g4-syntax', grade: 4, table: 13, strand: 'speech-comprehension', objectiveCodes: [], category: 'sentence', title: 'Сөйлем мүшелері', card: source.syntax.card,
  steps: source.syntax.items.flatMap((item, i) => item.roles.map((role, j) => choice(`sentence-${i}-role-${j}`, `«${role.word}» — сөйлемнің қай мүшесі?`, item.text, roles, role.role, { display: item.text, targetWord: role.word, reveal: role.word + ' — ' + role.role + ' (' + role.question + ')' }))) });
add({ id: 'g4-syntax-role-to-word', grade: 4, table: 13, strand: 'speech-comprehension', objectiveCodes: ['4.2.1.11', '4.3.1.11'], category: 'sentence',
  title: 'Сөйлемнен сөзді тап', card: source.syntax.card,
  steps: source.syntax.items.flatMap((item, i) => {
    const words = item.roles.map(role => role.word);
    if (new Set(words).size !== words.length || new Set(item.roles.map(role => role.role)).size !== item.roles.length) {
      throw new Error('Ambiguous grade 4 role-to-word exercise: ' + item.text);
    }
    return item.roles.map((role, j) => choice(`sentence-${i}-word-${j}`, `Тыңдаңыз. «${role.role}» қызметін атқаратын сөзді таңдаңыз.`,
      item.text, words, role.word, { supportText: null, reveal: item.text + ' ' + role.word + ' — ' + role.role + ' (' + role.question + ')' }));
  }) });
const multiplicativeObjectives = ['4.2.1.14', '4.3.1.13'];
function mathStep(id, item, prompt = item.prompt, extra = {}) {
  const a = item.answer;
  const alternatives = [...new Set([a, Math.max(0, a - 1), a + 1, a + (item.operands[0] || 2)])];
  return choice(id, 'Дұрыс жауапты таңдаңыз.', prompt, alternatives, a, { display: null, reveal: `${item.operands[0]} ${item.operation} ${item.operands[1]} = ${a}`, ...extra });
}
for (const grade of [2, 3]) add({ id: 'math-terms', grade, table: grade === 2 ? 9 : 11, strand: 'speech-comprehension', objectiveCodes: grade === 2 ? ['2.3.1.8', '2.3.1.9'] : [], category: 'math', title: 'Математикалық сөздер', card: source.mathVocabulary.cards[grade === 2 ? 0 : 1],
  steps: source.mathVocabulary.terms.filter(item => item.grade === grade).map((item, i) => mathStep('term-' + i, item)) });
for (const grade of [2, 4]) add({ id: `g${grade}-comparison`, grade, table: grade === 2 ? 9 : 13, strand: 'speech-comprehension', objectiveCodes: grade === 2 ? ['2.3.1.8', '2.3.1.9'] : ['4.3.1.6'],
  ...(grade === 4 ? { progressObjectiveCodes: [] } : {}), category: 'math', title: 'Артық, кем, есе', card: source.mathVocabulary.cards[grade === 2 ? 0 : 2],
  steps: source.mathVocabulary.comparisonContrasts.flatMap((item, i) => {
    const objectives = grade !== 4 ? {} : { objectiveCodes: ['4.3.1.6', ...(['*', '/'].includes(item.operation) ? multiplicativeObjectives : [])] };
    return [choice('operation-' + i, 'Қай амалды орындау керек?', item.prompt, ['+', '−', '×', '÷'],
      { '+': '+', '-': '−', '*': '×', '/': '÷' }[item.operation], { skill: 'term-recognition', ...objectives }),
      mathStep('calculation-' + i, item, item.prompt, objectives)];
  }) });
const accusative = { 2: 'Екіні', 3: 'Үшті', 4: 'Төртті', 5: 'Бесті', 6: 'Алтыны', 7: 'Жетіні', 8: 'Сегізді', 9: 'Тоғызды' };
const dative = { 2: 'екіге', 3: 'үшке', 4: 'төртке', 5: 'беске', 6: 'алтыға', 7: 'жетіге', 8: 'сегізге', 9: 'тоғызға' };
for (let a = 2; a <= 9; a++) add({ id: 'g4-times-' + a, grade: 4, table: 13, strand: 'speech-comprehension', objectiveCodes: multiplicativeObjectives, progressObjectiveCodes: [], category: 'math', title: `Көбейту · ${a}`, card: source.mathVocabulary.cards[2],
  steps: Array.from({ length: 8 }, (_, i) => { const b = i + 2; return mathStep('times-' + b, { answer: a * b, operands: [a, b], operation: '*' }, `${accusative[a]} ${dative[b]} көбейт.`); }) });
add({ id: 'g4-division', grade: 4, table: 13, strand: 'speech-comprehension', objectiveCodes: ['4.3.1.6'], progressObjectiveCodes: [], category: 'math', title: 'Қалдықсыз бөлу', card: source.mathVocabulary.cards[2],
  steps: source.mathVocabulary.integerDivision.map((item, i) => mathStep('division-' + i, { ...item, operation: '/' }, `${item.operands[0]} санын ${item.operands[1]} санына бөл.`)) });
const result = { version: 1, approval: { by: approval.approvedBy, date: approval.date }, language: 'kk', lessons };
fs.writeFileSync('public/original/js/curriculum-content.js', '/* Generated from user-approved curriculum examples. Rebuild with tools/build-curriculum-content.mjs. */\nwindow.CorexCurriculumContent = ' + JSON.stringify(result) + ';\n');
fs.mkdirSync('public/original/sounds/curriculum', { recursive: true });
fs.writeFileSync('public/original/sounds/curriculum/manifest.json', JSON.stringify([...audio.values()], null, 2) + '\n');
console.log(JSON.stringify({ lessons: lessons.length, steps: lessons.reduce((sum, item) => sum + item.steps.length, 0), uniqueClips: audio.size, grades: [0, 1, 2, 3, 4].map(grade => ({ grade, lessons: lessons.filter(l => l.grade === grade).length })) }));
