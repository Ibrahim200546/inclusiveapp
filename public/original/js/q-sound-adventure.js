(function () {
  'use strict';

  const COPY = {
    kk: {
      title: 'Жоғалған Қ дыбысы', intro: 'Суретке қараңыз. Сөздегі жоғалған әріпті табыңыз.',
      round: 'Тапсырма', listen: 'Сөзді тыңдау', listening: 'Тыңдап көріңіз…', speechUnavailable: 'Қазір сөзді дыбыстау мүмкін емес. Қайта тыңдап көріңіз немесе сурет бойынша жалғастырыңыз.', choose: 'Қай әріп жетіспейді?',
      blank: 'жоғалған әріп', letters: 'Әріпті таңдаңыз', wrong: 'Тағы байқап көріңіз. Сөзді тыңдап, «Қ» дыбысына назар аударыңыз.',
      right: 'Жарайсыз! «Қ» әрпін таптыңыз.', next: 'Келесі сурет', finish: 'Аяқтау',
      completed: 'Үш сөз де табылды!', completedText: 'Қасқыр, қоян, тасбақа — жоғалған «Қ» әріптері өз орнына оралды.',
      replay: 'Қайта ойнау', completeAction: 'Нәтижені көру',
      wolf: 'Қасқыр', rabbit: 'Қоян', tortoise: 'Тасбақа',
      wolfScene: 'Айлы ормандағы қасқыр', rabbitScene: 'Гүлді шалғындағы қоян', tortoiseScene: 'Жасыл бақтағы тасбақа'
    },
    ru: {
      title: 'Пропавший звук Қ', intro: 'Посмотрите на рисунок. Найдите пропавшую букву в казахском слове.',
      round: 'Задание', listen: 'Послушать слово', listening: 'Послушайте…', speechUnavailable: 'Сейчас не удалось озвучить слово. Попробуйте снова или продолжите по рисунку.', choose: 'Какой буквы не хватает?',
      blank: 'пропавшая буква', letters: 'Выберите букву', wrong: 'Попробуйте ещё раз. Послушайте слово и обратите внимание на звук «Қ».',
      right: 'Получилось! Вы нашли букву «Қ».', next: 'Следующий рисунок', finish: 'Завершить',
      completed: 'Все три слова найдены!', completedText: 'Қасқыр, қоян, тасбақа — пропавшие буквы «Қ» вернулись на место.',
      replay: 'Играть ещё раз', completeAction: 'Посмотреть результат',
      wolf: 'Қасқыр', rabbit: 'Қоян', tortoise: 'Тасбақа',
      wolfScene: 'Волк в лунном лесу', rabbitScene: 'Заяц на цветущем лугу', tortoiseScene: 'Черепаха в зелёном саду'
    }
  };
  const SCENES = [
    { key: 'wolf', word: 'Қасқыр' },
    { key: 'rabbit', word: 'Қоян' },
    { key: 'tortoise', word: 'Тасбақа' }
  ];
  let instanceCount = 0;

  const STYLE = `
    .qsa-root { --qsa-ink:#183943; --qsa-accent:#245d7b; color:var(--qsa-ink); font-family:inherit; width:100%; min-width:0; isolation:isolate; }
    .qsa-root *, .qsa-root *::before, .qsa-root *::after { box-sizing:border-box; }
    .qsa-root .qsa-shell { background:linear-gradient(145deg,#fffcf4,#eff9f5); border:1px solid #dbe9df; border-radius:26px; padding:clamp(14px,3vw,26px); box-shadow:0 12px 34px #274e4612; }
    .qsa-root .qsa-eyebrow { display:flex; flex-wrap:wrap; align-items:center; gap:10px; margin-bottom:12px; font-size:.85rem; font-weight:700; color:#365761; }
    .qsa-root .qsa-counter { padding:6px 12px; border-radius:30px; background:#e0edf2; }
    .qsa-root .qsa-dots { display:flex; gap:6px; }
    .qsa-root .qsa-dot { height:10px; width:10px; background:#c7d8d6; border-radius:50%; }
    .qsa-root .qsa-dot[data-complete="true"] { background:#2a7b5c; }
    .qsa-root h2 { margin:0 0 8px; font-size:clamp(1.25rem,3vw,1.75rem); line-height:1.2; color:var(--qsa-ink); }
    .qsa-root .qsa-intro { margin:0 0 16px; font-size:.98rem; line-height:1.5; }
    .qsa-root .qsa-scene { border-radius:20px; overflow:hidden; background:#dbece5; aspect-ratio:560/320; max-height:340px; margin:0; }
    .qsa-root .qsa-scene svg { display:block; width:100%; height:100%; }
    .qsa-root .qsa-word { display:flex; justify-content:center; flex-wrap:wrap; align-items:center; gap:5px; margin:17px 0 12px; }
    .qsa-root .qsa-letter { min-width:clamp(27px,6vw,48px); font-size:clamp(1.6rem,6vw,2.4rem); font-weight:800; line-height:1.3; text-align:center; padding:2px 3px; }
    .qsa-root .qsa-missing { color:#255775; border-bottom:3px solid #4794ad; background:#dfedf2; border-radius:8px 8px 3px 3px; }
    .qsa-root .qsa-revealed { color:#216945; background:#deefdf; border-color:#398d57; animation:qsa-reveal .5s ease-out; }
    .qsa-root .qsa-word-label { text-align:center; margin:0 0 10px; font-weight:700; font-size:1rem; }
    .qsa-root .qsa-actions { display:flex; justify-content:center; flex-wrap:wrap; gap:10px; margin-top:12px; }
    .qsa-root button { min-height:46px; min-width:46px; font:inherit; font-weight:700; cursor:pointer; border-radius:14px; padding:10px 16px; border:2px solid transparent; touch-action:manipulation; }
    .qsa-root button:focus-visible { outline:3px solid #145172; outline-offset:3px; }
    .qsa-root .qsa-listen { background:#eef4f7; color:#244f69; border-color:#cadae3; display:flex; gap:8px; align-items:center; justify-content:center; }
    .qsa-root .qsa-listen svg { flex:none; width:20px; height:20px; }
    .qsa-root .qsa-choices { display:flex; justify-content:center; gap:10px; flex-wrap:wrap; margin-top:12px; }
    .qsa-root .qsa-choice { min-width:56px; min-height:56px; font-size:1.65rem; background:#fff; border-color:#c4d6d4; color:#183943; box-shadow:0 4px 0 #d1dcd7; }
    .qsa-root .qsa-choice:hover:not(:disabled) { background:#e5f2f3; border-color:#68a6b8; }
    .qsa-root .qsa-choice:active:not(:disabled) { transform:translateY(2px); box-shadow:0 2px 0 #d1dcd7; }
    .qsa-root .qsa-choice[data-correct="true"] { background:#ddefdf; color:#1c6543; border-color:#4a9269; box-shadow:0 4px 0 #b7d6bb; }
    .qsa-root .qsa-choice:disabled { cursor:default; opacity:.62; }
    .qsa-root .qsa-choice[data-correct="true"]:disabled { opacity:1; }
    .qsa-root .qsa-status { min-height:3.5em; padding:12px 4px 0; font-size:.96rem; line-height:1.45; text-align:center; font-weight:600; }
    .qsa-root .qsa-status[data-success="true"] { color:#216945; }
    .qsa-root .qsa-primary { background:#245d7b; color:white; }
    .qsa-root .qsa-secondary { color:#245d7b; background:white; border-color:#c3d6db; }
    .qsa-root .qsa-finale { text-align:center; }
    .qsa-root .qsa-medal { width:120px; height:120px; margin:12px auto 18px; display:block; }
    .qsa-root .qsa-finale p { line-height:1.6; }
    .qsa-root .qsa-rabbit-body { transform-origin:280px 249px; animation:qsa-rabbit-breathe 3s ease-in-out infinite; }
    .qsa-root .qsa-ear-left { transform-origin:258px 173px; animation:qsa-ear 4.2s ease-in-out infinite; }
    .qsa-root .qsa-ear-right { transform-origin:294px 170px; animation:qsa-ear 4.2s 1s ease-in-out infinite; }
    .qsa-root .qsa-wolf-chest { transform-origin:287px 218px; animation:qsa-wolf-breathe 4s ease-in-out infinite; }
    .qsa-root .qsa-blink { transform-box:fill-box; transform-origin:center; animation:qsa-blink 5s infinite; }
    .qsa-root .qsa-star { transform-box:fill-box; transform-origin:center; animation:qsa-star 3s ease-in-out infinite alternate; }
    .qsa-root .qsa-tortoise-head { transform-origin:376px 226px; animation:qsa-nod 3.2s ease-in-out infinite; }
    .qsa-root[data-solved="true"] .qsa-rabbit-body { animation:qsa-rabbit-hop .95s ease-in-out 3; }
    .qsa-root[data-solved="true"] .qsa-wolf-head { transform-origin:270px 160px; animation:qsa-wolf-howl 2.2s ease-in-out 2; }
    .qsa-root[data-solved="true"] .qsa-howl-ring { animation:qsa-howl 2.2s ease-out 2; }
    .qsa-root[data-solved="true"] .qsa-tortoise-body { animation:qsa-walk 3s ease-in-out forwards; }
    .qsa-root[data-solved="true"] .qsa-tortoise-leg { transform-box:fill-box; transform-origin:top; animation:qsa-leg .6s ease-in-out 5 alternate; }
    .qsa-root[data-solved="true"] .qsa-tortoise-leg.qsa-leg-back { animation-delay:.3s; }
    @keyframes qsa-reveal { from { transform:scale(.6); } to { transform:scale(1); } }
    @keyframes qsa-rabbit-breathe { 0%,100% { transform:scale(1); } 50% { transform:scale(1.014,.994); } }
    @keyframes qsa-wolf-breathe { 0%,100% { transform:scale(1); } 50% { transform:scale(1.012,1.015); } }
    @keyframes qsa-ear { 0%,80%,100% { transform:rotate(0deg); } 88% { transform:rotate(-5deg); } 95% { transform:rotate(4deg); } }
    @keyframes qsa-blink { 0%,44%,48%,100% { transform:scaleY(1); } 46% { transform:scaleY(.12); } }
    @keyframes qsa-star { from { opacity:.4; transform:scale(.8); } to { opacity:1; transform:scale(1.1); } }
    @keyframes qsa-nod { 0%,100% { transform:rotate(-2deg); } 50% { transform:rotate(3deg); } }
    @keyframes qsa-rabbit-hop { 0%,100% { transform:translateY(0) scale(1); } 18% { transform:translateY(3px) scale(1.025,.97); } 48% { transform:translateY(-30px) scale(.985,1.03); } 80% { transform:translateY(0) scale(1.04,.96); } }
    @keyframes qsa-wolf-howl { 0%,100% { transform:rotate(0deg); } 35%,65% { transform:rotate(-12deg); } }
    @keyframes qsa-howl { 0%,25%,100% { opacity:0; } 35% { opacity:.75; transform:translate(0,0); } 80% { opacity:0; transform:translate(-15px,-18px); } }
    @keyframes qsa-walk { 0% { transform:translateX(0); } 100% { transform:translateX(34px); } }
    @keyframes qsa-leg { from { transform:rotate(-12deg); } to { transform:rotate(12deg); } }
    @media(max-width:380px) { .qsa-root .qsa-shell { padding:12px; border-radius:18px; } .qsa-root .qsa-choices { gap:8px; } .qsa-root .qsa-choice { min-width:50px; padding:8px 12px; } .qsa-root .qsa-actions button { max-width:100%; } }
    @media(prefers-reduced-motion:reduce) { .qsa-root *, .qsa-root *::before, .qsa-root *::after { animation:none !important; transition:none !important; } }
  `;

  function sceneSvg(key, id, label) {
    const defs = `<defs>
      <linearGradient id="${id}-sky" x2="0" y2="1"><stop stop-color="${key === 'wolf' ? '#273e64' : '#bde6ee'}"/><stop offset="1" stop-color="${key === 'wolf' ? '#91afb9' : '#edf6df'}"/></linearGradient>
      <linearGradient id="${id}-fur" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${key === 'wolf' ? '#8dabc2' : '#fff9ee'}"/><stop offset="1" stop-color="${key === 'wolf' ? '#496982' : '#dcd6c8'}"/></linearGradient>
      <linearGradient id="${id}-shell" x1="0" y1="0" x2="0.7" y2="1"><stop stop-color="#a3ba63"/><stop offset="1" stop-color="#3b7254"/></linearGradient>
      <radialGradient id="${id}-moon"><stop stop-color="#fffce2"/><stop offset="1" stop-color="#e9e7c0"/></radialGradient>
    </defs>`;
    const hills = key === 'wolf'
      ? `<path d="M0 188Q87 103 177 174T354 142T560 174V320H0Z" fill="#66879c"/><path d="M0 215Q115 171 242 203T560 178V320H0Z" fill="#496e7a"/><path d="M0 263Q142 232 277 259T560 228V320H0Z" fill="#40645d"/>`
      : `<path d="M0 205Q97 124 207 184T410 148T560 182V320H0Z" fill="#a6cd96"/><path d="M0 232Q141 173 296 224T560 193V320H0Z" fill="#7db985"/><path d="M0 275Q180 231 331 267T560 250V320H0Z" fill="#5f9f73"/>`;
    const foliage = `<g opacity=".65" stroke="#487e59" stroke-width="3" fill="none"><path d="M38 292q4-23 17-32m-10 27q-13-17-22-19m10 24q-7-24-2-35M476 291q1-23 16-39m-8 29q10-23 21-25m-28 37q-11-16-17-20"/></g>`;
    let animal;
    let decoration;
    if (key === 'wolf') {
      decoration = `<circle cx="433" cy="65" r="29" fill="url(#${id}-moon)"/><circle cx="443" cy="54" r="6" fill="#d5d7b8" opacity=".4"/><g fill="#f8eed0"><path class="qsa-star" d="M119 38l2 6 6 2-6 2-2 6-2-6-6-2 6-2Z"/><path class="qsa-star" d="M309 52l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5Z"/><circle cx="192" cy="68" r="2"/><circle cx="355" cy="23" r="1.8"/><circle cx="503" cy="106" r="2"/></g><g fill="#305366"><path d="M35 225l37-83 36 83H88l26 40H25l25-40Z"/><path d="M475 223l29-72 29 72h-15l22 36h-73l20-36Z"/></g>`;
      animal = `<ellipse cx="279" cy="279" rx="95" ry="14" fill="#203e3d" opacity=".22"/>
        <path d="M308 222q74-26 82 15q-38 8-69 23" fill="#496982"/><path d="M350 229q28-7 40 8q-18 4-34 8" fill="#cbd5da"/>
        <g class="qsa-wolf-chest"><path d="M251 161q-42 12-37 64l-13 43q28 17 77 9q61-8 45-65l-22-42Z" fill="url(#${id}-fur)"/><path d="M245 172q-15 53 18 72q35-20 30-62l-28 16Z" fill="#e3e7df"/><path d="M235 225l-4 43q-5 11-25 11q-15-1-11-9l19-8 6-38M284 220l11 46q19 2 24 10q-8 10-34 4l-16-53" fill="#60829b" stroke="#486b84" stroke-width="3" stroke-linejoin="round"/></g>
        <g class="qsa-wolf-head"><path d="M226 142l-9-61 38 33 37-29-2 59" fill="#617f99" stroke="#496982" stroke-width="3" stroke-linejoin="round"/><path d="M225 124l-3-30 23 24M267 122l18-24-2 31" fill="#bfa9a2"/><path d="M220 129q25-34 56-11q17 7 25 38l-19 25-46-4-24-21Z" fill="url(#${id}-fur)"/><path d="M224 143l-25-14-25 21 34 27q20 6 37-1l19-27" fill="#d6e2df"/><path d="M174 150l3-9 12 2 2 7-8 8Z" fill="#243b48"/><path d="M189 160q16 12 32 3" fill="none" stroke="#425d6c" stroke-width="3" stroke-linecap="round"/><g class="qsa-blink"><ellipse cx="239" cy="136" rx="8" ry="9" fill="#f5e6a4"/><ellipse cx="237" cy="136" rx="3.5" ry="6" fill="#243b48"/><circle cx="236" cy="133" r="1.6" fill="white"/></g><path d="M229 123l15-3" stroke="#425d6c" stroke-width="3" stroke-linecap="round"/><path d="M275 159l15 1-9 8 11 2-14 6" fill="#e3e7df"/></g>
        <g class="qsa-howl-ring" opacity="0" stroke="#f8f0d3" stroke-width="3" fill="none" stroke-linecap="round"><path d="M151 121q-11 11-8 23M137 108q-17 19-12 41M122 97q-22 27-17 57"/></g>`;
    } else if (key === 'rabbit') {
      decoration = `<g fill="#ffffff" opacity=".75"><path d="M46 61q2-14 17-14q8-18 27-8q16-4 23 13q20 0 22 17H46Z"/><path d="M364 77q4-12 16-11q7-17 24-10q16-4 21 11q17 0 19 13h-80Z"/></g><g><path d="M117 254v-21m-7 12q9-1 7 9m10-19q-11 1-10 10M433 270v-22m-10 12q9-2 10 10" fill="none" stroke="#397c58" stroke-width="3"/><g fill="#faf5db"><circle cx="117" cy="229" r="9"/><circle cx="109" cy="235" r="8"/><circle cx="125" cy="235" r="8"/><circle cx="433" cy="245" r="8"/><circle cx="426" cy="250" r="7"/><circle cx="440" cy="250" r="7"/></g><g fill="#e5b052"><circle cx="117" cy="236" r="5"/><circle cx="433" cy="251" r="4"/></g></g>`;
      animal = `<ellipse cx="280" cy="284" rx="92" ry="13" fill="#285b3f" opacity=".19"/><g class="qsa-rabbit-body">
        <ellipse cx="333" cy="231" rx="25" ry="25" fill="#f7f3e9"/><ellipse cx="279" cy="224" rx="65" ry="54" fill="url(#${id}-fur)"/><ellipse cx="276" cy="233" rx="39" ry="36" fill="#fffaf1"/>
        <g class="qsa-ear-left"><path d="M244 176q-33-72-17-101q14-15 31 20l15 80" fill="url(#${id}-fur)" stroke="#d8cebe" stroke-width="2"/><path d="M247 161q-20-58-15-73q9-9 20 24l11 49" fill="#dfa8aa"/></g>
        <g class="qsa-ear-right"><path d="M279 173q5-89 23-103q23-13 21 22l-14 86" fill="url(#${id}-fur)" stroke="#d8cebe" stroke-width="2"/><path d="M290 160q8-65 17-77q11-8 8 22l-14 58" fill="#dfa8aa"/></g>
        <ellipse cx="277" cy="184" rx="53" ry="45" fill="url(#${id}-fur)"/><g class="qsa-blink" fill="#39494b"><ellipse cx="254" cy="179" rx="6" ry="10"/><ellipse cx="298" cy="179" rx="6" ry="10"/></g><g fill="white"><circle cx="252" cy="176" r="2"/><circle cx="296" cy="176" r="2"/></g>
        <ellipse cx="246" cy="198" rx="12" ry="6" fill="#e9b8b1" opacity=".65"/><ellipse cx="306" cy="198" rx="12" ry="6" fill="#e9b8b1" opacity=".65"/><path d="M270 194q6-5 12 0l-6 7Z" fill="#bd848c"/><path d="M276 201v6m0 0q-9 10-17 0m17 0q9 10 17 0" stroke="#8e7780" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M239 195l-18-4m18 10-20 3m92-9 18-4m-18 10 20 3" stroke="#b2aa9d" stroke-width="2" stroke-linecap="round"/>
        <ellipse cx="238" cy="266" rx="30" ry="15" fill="#ede7da"/><ellipse cx="314" cy="266" rx="30" ry="15" fill="#ede7da"/><path d="M253 224l-5 27m53-27 5 27" stroke="#d7cdbe" stroke-width="4" stroke-linecap="round"/><path d="M234 267v6m9-5v6m65-6v6m9-7v6" stroke="#c9beae" stroke-width="2" stroke-linecap="round"/>
        </g>`;
    } else {
      decoration = `<circle cx="84" cy="64" r="26" fill="#f8df92"/><g stroke="#f3d782" stroke-width="3" stroke-linecap="round"><path d="M84 25v-8m0 94v-8M45 64h-8m94 0h-8M57 37l-6-6m60 60 6 6m-6-60 6-6m-60 60-6 6"/></g><path d="M67 288q107-28 220-5t206-11" stroke="#d9d7b0" stroke-width="20" fill="none" stroke-linecap="round"/><g fill="#8cab73"><ellipse cx="163" cy="284" rx="12" ry="5"/><ellipse cx="426" cy="281" rx="15" ry="6"/></g><g fill="#e9dbb4"><ellipse cx="102" cy="290" rx="8" ry="4"/><ellipse cx="468" cy="278" rx="9" ry="5"/></g>`;
      animal = `<ellipse cx="287" cy="280" rx="113" ry="12" fill="#285b3f" opacity=".2"/><g class="qsa-tortoise-body">
        <path d="M202 241l-30-5 11 18 23 5" fill="#b6bc76" stroke="#7d985f" stroke-width="3"/>
        <path class="qsa-tortoise-leg qsa-leg-back" d="M222 239l-5 30q-5 8-22 5q-5-4 0-10l10-26" fill="#99b46c" stroke="#76965c" stroke-width="2"/>
        <path class="qsa-tortoise-leg" d="M329 241l9 29q-5 10-23 6l-10-35" fill="#a7bd76" stroke="#76965c" stroke-width="2"/>
        <g class="qsa-tortoise-head"><path d="M341 230l27-18q20-18 47-8q32 17 18 39q-16 23-49 11l-43-5" fill="#bccb80" stroke="#87a366" stroke-width="3"/><path d="M412 239q8 3 16-4" stroke="#608354" stroke-width="3" fill="none" stroke-linecap="round"/><g class="qsa-blink"><ellipse cx="404" cy="222" rx="6" ry="9" fill="#334b36"/><circle cx="402" cy="219" r="2" fill="white"/></g><circle cx="430" cy="228" r="2" fill="#608354"/><ellipse cx="396" cy="240" rx="11" ry="5" fill="#a5b86f"/></g>
        <path d="M194 243q-1-96 86-103q76-3 89 95q-86 32-175 8Z" fill="url(#${id}-shell)" stroke="#3d7155" stroke-width="5"/>
        <g stroke="#3c7253" stroke-width="4" stroke-linejoin="round"><path d="M260 158l34-2 26 31-12 35-43 7-28-30Z" fill="#81a557"/><path d="M237 199l-31 11 1 27 58-8" fill="#70974f"/><path d="M320 187l26-9 16 44-54 0" fill="#5e8b4c"/><path d="M260 158l-30-1-20 42 27 0" fill="#a8be68"/><path d="M294 156l14-7 37 29-25 9" fill="#95b55f"/></g>
        <path d="M194 244q80 22 175-9" stroke="#c7cb86" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M240 157q29-13 52-6" stroke="#d9dda0" stroke-width="5" fill="none" opacity=".65" stroke-linecap="round"/>
        </g>`;
    }
    return `<svg viewBox="0 0 560 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}">${defs}<rect width="560" height="320" fill="url(#${id}-sky)"/>${hills}${decoration}${foliage}${animal}</svg>`;
  }

  function shuffle(values) {
    const result = values.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function mount(container, options) {
    if (!container || typeof container.appendChild !== 'function') throw new TypeError('A container element is required.');
    const config = options || {};
    const id = `qsa-${++instanceCount}`;
    const root = document.createElement('section');
    root.className = 'qsa-root';
    let locale = config.locale === 'ru' ? 'ru' : 'kk';
    let round = 0;
    let solved = false;
    let completed = false;
    let completionReported = false;
    let destroyed = false;
    let listening = false;
    let speechGeneration = 0;
    let feedback = '';
    let choices = shuffle(['Қ', 'К', 'Ғ', 'Т']);
    root.addEventListener('click', handleClick);
    container.appendChild(root);

    function state() {
      return { round, total: SCENES.length, solved, completed, listening, locale, word: SCENES[round].word, correctLetter: 'Қ' };
    }

    function announceCompletion() {
      if (completionReported || destroyed) return;
      completionReported = true;
      if (typeof config.onComplete === 'function') config.onComplete({ type: 'q-sound-adventure', completed: true, correct: SCENES.length, total: SCENES.length });
    }

    function render(focusAction) {
      if (destroyed) return;
      const text = COPY[locale];
      root.setAttribute('lang', locale === 'ru' ? 'ru' : 'kk');
      root.dataset.solved = String(solved);
      root.dataset.completed = String(completed);
      if (completed) {
        root.innerHTML = `<style>${STYLE}</style><div class="qsa-shell qsa-finale">
          <svg class="qsa-medal" viewBox="0 0 120 120" aria-hidden="true"><path d="M30 63l-8 48 26-10 13 15 13-49" fill="#4793af"/><path d="M71 66l13 48 10-15 22 7-17-44" fill="#326d8d"/><circle cx="61" cy="47" r="42" fill="#f0c46b" stroke="#d9a849" stroke-width="5"/><circle cx="61" cy="47" r="32" fill="#ffde8a"/><path d="M61 23l7 15 16 2-12 12 3 17-14-8-15 8 3-17-12-12 17-2Z" fill="#ffffff"/></svg>
          <h2 tabindex="-1" data-finale-title>${text.completed}</h2><p>${text.completedText}</p>
          <div class="qsa-actions"><button class="qsa-primary" data-action="result">${text.completeAction}</button><button class="qsa-secondary" data-action="reset">${text.replay}</button></div></div>`;
        if (focusAction) root.querySelector('[data-finale-title]').focus({ preventScroll: true });
        return;
      }
      const scene = SCENES[round];
      const accessibleWord = solved ? scene.word : Array.from(scene.word).map(letter => letter === 'Қ' || letter === 'қ' ? text.blank : letter).join(' ');
      const wordMarkup = Array.from(scene.word).map(letter => {
        const missing = letter === 'Қ' || letter === 'қ';
        return `<span aria-hidden="true" class="qsa-letter${missing ? ' qsa-missing' : ''}${missing && solved ? ' qsa-revealed' : ''}">${missing && !solved ? '?' : letter}</span>`;
      }).join('');
      root.innerHTML = `<style>${STYLE}</style><div class="qsa-shell">
        <div class="qsa-eyebrow"><span class="qsa-counter">${text.round} ${round + 1} / ${SCENES.length}</span><span class="qsa-dots" aria-hidden="true">${SCENES.map((_, index) => `<span class="qsa-dot" data-complete="${index < round || (index === round && solved)}"></span>`).join('')}</span></div>
        <h2>${text.title}</h2><p class="qsa-intro">${text.intro}</p>
        <figure class="qsa-scene">${sceneSvg(scene.key, `${id}-${round}`, text[`${scene.key}Scene`])}</figure>
        <div class="qsa-word" role="img" aria-label="${accessibleWord}" lang="kk">${wordMarkup}</div>
        <div class="qsa-actions"><button class="qsa-listen" data-action="listen"${listening ? ' disabled aria-busy="true"' : ''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4Zm12-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>${listening ? text.listening : text.listen}</span></button></div>
        <p class="qsa-word-label">${text.choose}</p>
        <div class="qsa-choices" role="group" aria-label="${text.letters}">${choices.map(letter => `<button class="qsa-choice" data-letter="${letter}"${solved ? ' disabled' : ''}${solved && letter === 'Қ' ? ' data-correct="true"' : ''}>${letter}</button>`).join('')}</div>
        <div class="qsa-status" role="status" aria-live="polite" aria-atomic="true" data-success="${solved && feedback !== 'speechUnavailable'}">${feedback ? text[feedback] : ''}</div>
        ${solved ? `<div class="qsa-actions"><button class="qsa-primary" data-action="next">${round === SCENES.length - 1 ? text.finish : text.next}</button></div>` : ''}
      </div>`;
      if (focusAction) root.querySelector(`[data-action="${focusAction}"]`)?.focus({ preventScroll: true });
    }

    function invalidateSpeech() {
      speechGeneration++;
      listening = false;
      if (typeof config.onStopSpeech === 'function') config.onStopSpeech();
    }

    async function listen() {
      if (listening || destroyed || completed) return;
      const generation = ++speechGeneration;
      listening = true;
      const button = root.querySelector('[data-action="listen"]');
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.querySelector('span').textContent = COPY[locale].listening;
      if (feedback === 'speechUnavailable') {
        feedback = solved ? 'right' : '';
        const status = root.querySelector('.qsa-status');
        status.textContent = feedback ? COPY[locale][feedback] : '';
        status.dataset.success = String(solved);
      }
      const isCurrent = () => !destroyed && !completed && generation === speechGeneration;
      function unavailable() {
        if (!isCurrent()) return;
        feedback = 'speechUnavailable';
        const status = root.querySelector('.qsa-status');
        if (status) {
          status.textContent = COPY[locale].speechUnavailable;
          status.dataset.success = 'false';
        }
      }
      try {
        const result = typeof config.onSpeak === 'function' ? await config.onSpeak(SCENES[round].word, 'kk') : false;
        if (result === false) unavailable();
      } catch {
        unavailable();
      } finally {
        if (isCurrent()) {
          listening = false;
          const currentButton = root.querySelector('[data-action="listen"]');
          if (currentButton) {
            currentButton.disabled = false;
            currentButton.removeAttribute('aria-busy');
            currentButton.querySelector('span').textContent = COPY[locale].listen;
          }
        }
      }
    }

    function handleClick(event) {
      const button = event.target.closest('button');
      if (!button || !root.contains(button) || button.disabled || destroyed) return;
      const action = button.dataset.action;
      if (action === 'listen') {
        void listen();
        return;
      }
      if (action === 'reset') { reset(); return; }
      if (action === 'result') { announceCompletion(); return; }
      if (action === 'next' && solved) {
        invalidateSpeech();
        if (round === SCENES.length - 1) {
          completed = true;
          render('finale');
          announceCompletion();
        } else {
          round++;
          solved = false;
          feedback = '';
          choices = shuffle(['Қ', 'К', 'Ғ', 'Т']);
          render('listen');
        }
        return;
      }
      if (!button.dataset.letter || solved || completed) return;
      if (button.dataset.letter !== 'Қ') {
        feedback = 'wrong';
        const status = root.querySelector('.qsa-status');
        status.textContent = COPY[locale].wrong;
        return;
      }
      solved = true;
      feedback = 'right';
      render('next');
    }

    function reset() {
      if (destroyed) return;
      invalidateSpeech();
      round = 0; solved = false; completed = false; completionReported = false; feedback = '';
      choices = shuffle(['Қ', 'К', 'Ғ', 'Т']);
      render('listen');
    }

    render();
    return {
      destroy() { if (destroyed) return; destroyed = true; invalidateSpeech(); root.removeEventListener('click', handleClick); root.remove(); },
      setLocale(value) { locale = value === 'ru' ? 'ru' : 'kk'; render(); },
      reset,
      getState: state
    };
  }

  window.EduQSoundAdventure = Object.freeze({ mount });
}());
