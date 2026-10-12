(function () {
  'use strict';
  const TEXT = {
    kk: {
      title: 'Күзгі оқиға', intro: 'Сөйлемді тыңдаңыз, анимацияны көріңіз. Сөйлемге сәйкес суретті таңдаңыз.',
      round: 'Тапсырма', listen: 'Сөйлемді тыңдау', listening: 'Тыңдап көріңіз…', choose: 'Қай сурет сәйкес келеді?',
      correct: 'Жарайсыз! Дұрыс суретті таңдадыңыз.', retry: 'Тағы байқап көріңіз. Анимацияға қарап, сөйлемді қайта тыңдаңыз.',
      unavailable: 'Қазір сөйлемді дыбыстау мүмкін емес. Қайта тыңдап көріңіз немесе сурет бойынша жалғастырыңыз.',
      next: 'Келесі сөйлем', finish: 'Аяқтау', done: 'Күзгі оқиға аяқталды!',
      doneText: 'Күз келді. Күн суытты. Жапырақтар түсті. Барлық суретті дұрыс таптыңыз!', replay: 'Қайта ойнау', result: 'Нәтижені көру',
      autumn: 'Күз келді.', cold: 'Күн суытты.', leaves: 'Жапырақтар түсті.',
      autumnOption: 'Сары жапырақ', springOption: 'Көктемгі гүлдер', winterOption: 'Аппақ қар',
      coldOption: 'Жылы киім', warmOption: 'Жеңіл киім', swimOption: 'Суға шомылу',
      leavesOption: 'Жапырақтардың түсуі', rainOption: 'Жаңбыр',
      autumnScene: 'Бала күзгі ағаштың жанында тұр, сары жапырақтар түсіп жатыр.',
      springScene: 'Бала гүлдеген ағаштың жанында тұр.', winterScene: 'Бала қар басқан ағаштың жанында тұр.',
      coldScene: 'Салқын жел соғып тұр. Бала жылы күртеше мен шарф киген.',
      warmScene: 'Күн жылы. Бала жеңіл жейде киген.', swimScene: 'Бала суда жүзуге дайындалып тұр.',
      leavesScene: 'Ағаштан сары жапырақтар түсіп жатыр. Бала түскен жапырақтарды қарап тұр.',
      rainScene: 'Жаңбыр жауып тұр. Бала қолшатыр ұстап тұр.'
    },
    ru: {
      title: 'Осенняя история', intro: 'Послушайте предложение и посмотрите анимацию. Выберите подходящий рисунок.',
      round: 'Задание', listen: 'Послушать предложение', listening: 'Послушайте…', choose: 'Какой рисунок подходит?',
      correct: 'Получилось! Вы выбрали подходящий рисунок.', retry: 'Попробуйте ещё раз. Посмотрите анимацию и послушайте предложение.',
      unavailable: 'Сейчас не удалось озвучить предложение. Попробуйте снова или продолжите по рисунку.',
      next: 'Следующее предложение', finish: 'Завершить', done: 'Осенняя история завершена!',
      doneText: 'Наступила осень. Похолодало. Опали листья. Все рисунки найдены!', replay: 'Играть ещё раз', result: 'Посмотреть результат',
      autumn: 'Наступила осень.', cold: 'Похолодало.', leaves: 'Опали листья.',
      autumnOption: 'Жёлтые листья', springOption: 'Весенние цветы', winterOption: 'Белый снег',
      coldOption: 'Тёплая одежда', warmOption: 'Лёгкая одежда', swimOption: 'Купание',
      leavesOption: 'Опадающие листья', rainOption: 'Дождь',
      autumnScene: 'Ребёнок стоит у осеннего дерева. Падают жёлтые листья.',
      springScene: 'Ребёнок стоит у цветущего дерева.', winterScene: 'Ребёнок стоит у заснеженного дерева.',
      coldScene: 'Дует холодный ветер. Ребёнок в тёплой куртке и шарфе.',
      warmScene: 'Тёплый день. Ребёнок в лёгкой футболке.', swimScene: 'Ребёнок готовится купаться.',
      leavesScene: 'С дерева падают жёлтые листья. Ребёнок рассматривает опавшие листья.',
      rainScene: 'Идёт дождь. Ребёнок держит зонт.'
    }
  };
  // The falling-leaves round is an original thematic example, rather than an audio transcript.
  const ROUNDS = [
    { key: 'autumn', choices: ['autumn', 'spring', 'winter'] },
    { key: 'cold', choices: ['cold', 'warm', 'swim'] },
    { key: 'leaves', choices: ['leaves', 'rain', 'spring'] }
  ];
  let mountCount = 0;
  const CSS = `
    .asg-root { color:#213e47; font-family:inherit; min-width:0; width:100%; isolation:isolate; }
    .asg-root *, .asg-root *::before, .asg-root *::after { box-sizing:border-box; }
    .asg-root .asg-panel { padding:clamp(12px,3vw,24px); background:linear-gradient(135deg,#fff9e9,#f5faf4); border:1px solid #e2e4cf; border-radius:24px; box-shadow:0 12px 30px #7759340e; }
    .asg-root .asg-meta { display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin:0 0 12px; }
    .asg-root .asg-counter { background:#f5e4b7; color:#624623; padding:6px 12px; border-radius:24px; font-size:.85rem; font-weight:700; }
    .asg-root .asg-progress { display:flex; gap:7px; }
    .asg-root .asg-progress span { width:10px; height:10px; border-radius:50%; background:#e1d7bb; }
    .asg-root .asg-progress span[data-done="true"] { background:#438666; }
    .asg-root h2 { color:#213e47; font-size:clamp(1.3rem,3vw,1.8rem); margin:0 0 8px; line-height:1.3; }
    .asg-root .asg-intro { font-size:.98rem; line-height:1.5; margin:0 0 16px; }
    .asg-root .asg-scene { margin:0; aspect-ratio:540/320; max-height:350px; border-radius:19px; overflow:hidden; background:#d6e6e3; }
    .asg-root .asg-scene svg { width:100%; height:100%; display:block; }
    .asg-root .asg-sentence { text-align:center; font-size:clamp(1.2rem,3.6vw,1.7rem); font-weight:800; margin:16px 0 10px; line-height:1.35; }
    .asg-root .asg-prompt { text-align:center; margin:14px 0 10px; font-weight:700; font-size:1rem; }
    .asg-root .asg-actions { display:flex; justify-content:center; flex-wrap:wrap; gap:10px; }
    .asg-root button { font:inherit; font-weight:700; cursor:pointer; border:2px solid transparent; border-radius:13px; min-height:46px; min-width:46px; touch-action:manipulation; padding:10px 15px; }
    .asg-root button:focus-visible { outline:3px solid #245b7b; outline-offset:3px; }
    .asg-root .asg-listen { color:#245675; background:#eef5f6; border-color:#c8dce3; display:flex; align-items:center; justify-content:center; gap:8px; }
    .asg-root .asg-listen svg { width:20px; height:20px; flex:none; }
    .asg-root .asg-listen:disabled { cursor:wait; }
    .asg-root .asg-choices { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
    .asg-root .asg-choice { display:flex; flex-direction:column; align-items:stretch; padding:6px; color:#213e47; background:#fff; border-color:#d3d8cb; box-shadow:0 4px 0 #e0e3d4; min-width:0; }
    .asg-root .asg-choice svg { width:100%; height:auto; display:block; aspect-ratio:540/320; border-radius:8px; }
    .asg-root .asg-choice span { padding:8px 3px 3px; font-size:clamp(.8rem,2.3vw,.98rem); line-height:1.3; overflow-wrap:break-word; }
    .asg-root .asg-choice:hover:not(:disabled) { border-color:#7d9e91; background:#f7fbf4; }
    .asg-root .asg-choice[data-correct="true"] { background:#edf7e9; border-color:#418061; box-shadow:0 4px 0 #b7d4b7; }
    .asg-root .asg-choice:disabled { cursor:default; opacity:.62; }
    .asg-root .asg-choice[data-correct="true"]:disabled { opacity:1; }
    .asg-root .asg-choice *, .asg-root .asg-choice *::before, .asg-root .asg-choice *::after { animation:none !important; }
    .asg-root .asg-status { min-height:3.2em; line-height:1.45; font-size:.96rem; text-align:center; padding-top:12px; margin-bottom:10px; font-weight:600; }
    .asg-root .asg-status[data-success="true"] { color:#2b6f4b; }
    .asg-root .asg-primary { background:#286a55; color:white; }
    .asg-root .asg-secondary { background:white; color:#286a55; border-color:#bcd0c3; }
    .asg-root .asg-finale { text-align:center; }
    .asg-root .asg-finale p { line-height:1.6; }
    .asg-root .asg-badge { display:block; width:118px; height:118px; margin:10px auto 20px; }
    .asg-root .asg-leaf { transform-box:fill-box; transform-origin:center; animation:asg-leaf 5s ease-in-out infinite; }
    .asg-root .asg-leaf.asg-delay { animation-delay:-2.4s; }
    .asg-root .asg-child { transform-origin:290px 260px; animation:asg-breathe 3.5s ease-in-out infinite; }
    .asg-root .asg-scarf { transform-origin:304px 182px; animation:asg-scarf 1.8s ease-in-out infinite; }
    .asg-root .asg-wind { animation:asg-wind 3.2s ease-in-out infinite; }
    .asg-root .asg-rain-line { animation:asg-rain .85s linear infinite; }
    .asg-root .asg-rain-line.asg-delay { animation-delay:-.4s; }
    .asg-root .asg-eye { transform-box:fill-box; transform-origin:center; animation:asg-blink 5s infinite; }
    .asg-root .asg-snow { animation:asg-snow 5s linear infinite; }
    .asg-root .asg-butterfly { transform-origin:384px 170px; animation:asg-butterfly 2.8s ease-in-out infinite; }
    .asg-root[data-solved="true"] .asg-child { animation:asg-celebrate 1.4s ease-in-out 2; }
    @keyframes asg-leaf { 0% { transform:translate(-9px,-12px) rotate(-22deg); opacity:.2; } 15% { opacity:1; } 70% { opacity:1; } 100% { transform:translate(28px,68px) rotate(135deg); opacity:0; } }
    @keyframes asg-breathe { 0%,100% { transform:scale(1); } 50% { transform:scale(1.007,1.012); } }
    @keyframes asg-scarf { 0%,100% { transform:rotate(-4deg); } 50% { transform:rotate(9deg); } }
    @keyframes asg-wind { 0%,100% { opacity:.15; transform:translateX(-12px); } 50% { opacity:.7; transform:translateX(14px); } }
    @keyframes asg-rain { from { transform:translate(5px,-12px); } to { transform:translate(-8px,22px); } }
    @keyframes asg-blink { 0%,43%,48%,100% { transform:scaleY(1); } 46% { transform:scaleY(.1); } }
    @keyframes asg-snow { from { transform:translateY(-12px); } to { transform:translate(8px,27px); } }
    @keyframes asg-butterfly { 0%,100% { transform:translateY(-5px) rotate(-5deg); } 50% { transform:translate(7px,4px) rotate(7deg); } }
    @keyframes asg-celebrate { 0%,100% { transform:translateY(0) rotate(0); } 35% { transform:translateY(-6px) rotate(-2deg); } 70% { transform:translateY(-3px) rotate(2deg); } }
    @media(max-width:380px) { .asg-root .asg-choices { gap:7px; } .asg-root .asg-choice { padding:4px; } .asg-root .asg-choice span { font-size:.79rem; padding:7px 1px 3px; } }
    @media(prefers-reduced-motion:reduce) { .asg-root *, .asg-root *::before, .asg-root *::after { animation:none !important; transition:none !important; } }
  `;

  function illustration(kind, id, label, decorative) {
    const isWinter = kind === 'winter';
    const rainy = kind === 'rain';
    const chilly = kind === 'cold' || isWinter;
    const spring = kind === 'spring';
    const autumn = kind === 'autumn' || kind === 'leaves' || chilly || rainy;
    const water = kind === 'swim';
    const skyTop = rainy ? '#aec7d0' : chilly ? '#c0dbe3' : '#bbdfeb';
    const ground = isWinter ? '#f2f7f7' : autumn ? '#d8bd83' : '#b7d599';
    const defs = `<defs><linearGradient id="${id}-sky" x2="0" y2="1"><stop stop-color="${skyTop}"/><stop offset="1" stop-color="#f6eee0"/></linearGradient><linearGradient id="${id}-coat" x2=".6" y2="1"><stop stop-color="${rainy ? '#f0c16a' : '#dd8261'}"/><stop offset="1" stop-color="${rainy ? '#d59b40' : '#b85747'}"/></linearGradient><radialGradient id="${id}-skin"><stop stop-color="#f8ceb0"/><stop offset="1" stop-color="#e6aa87"/></radialGradient><linearGradient id="${id}-umbrella" x2=".7" y2="1"><stop stop-color="#85bdd0"/><stop offset="1" stop-color="#40829d"/></linearGradient></defs>`;
    const sun = !rainy && !chilly ? `<circle cx="438" cy="57" r="23" fill="#f6d287"/><g stroke="#eec777" stroke-width="3" stroke-linecap="round"><path d="M438 22v-8m0 78v-8m-35-27h-8m78 0h-8m-52-25-6-6m52 50 6 6m-6-50 6-6m-52 50-6 6"/></g>` : '';
    const cloud = `<g fill="${rainy ? '#839eae' : '#ffffff'}" opacity="${rainy ? '.85' : '.65'}"><path d="M50 73q0-18 18-19q10-22 31-10q23-4 28 19q25-1 28 19H50Z"/><path d="M324 76q2-18 19-19q10-23 31-12q21-3 27 16q24-1 27 20H324Z"/></g>`;
    const landscape = `<path d="M0 183q105-52 203-10t175-17t162 31v133H0Z" fill="${isWinter ? '#d9e7e7' : '#c8cfac'}"/><path d="M0 236q141-63 277-17t263-18v119H0Z" fill="${ground}"/><path d="M0 281q118-35 257-7t283-16v62H0Z" fill="${isWinter ? '#ffffff' : autumn ? '#c5a56c' : '#9dc381'}"/>`;
    let tree = `<path d="M121 246l6-127h21l5 127" fill="#96714f"/><path d="M136 172l-29-32m29 13 32-32m-31 85-33-25" fill="none" stroke="#96714f" stroke-width="10" stroke-linecap="round"/>`;
    tree += `<g fill="${isWinter ? '#e6eeee' : spring ? '#d3b5be' : autumn ? '#d9a05a' : '#86b179'}"><circle cx="106" cy="113" r="35"/><circle cx="141" cy="88" r="42"/><circle cx="174" cy="120" r="37"/><circle cx="137" cy="134" r="36"/></g>`;
    tree += `<g fill="${isWinter ? '#ffffff' : spring ? '#f0d2d8' : autumn ? '#edc673' : '#b3cb8f'}" opacity=".85"><circle cx="107" cy="98" r="22"/><circle cx="145" cy="74" r="26"/><circle cx="175" cy="110" r="20"/></g>`;
    const leafShape = '<path d="M0 0q16-8 24 3q-1 15-22 17q-9-7-2-20Z" fill="currentColor"/><path d="M3 16L21 4" stroke="#9d693f" stroke-width="1.5"/>';
    const extraLeaves = kind === 'leaves' ? `<g transform="translate(180 104)"><g class="asg-leaf asg-delay" style="color:#d5a146">${leafShape}</g></g><g transform="translate(211 173)"><g class="asg-leaf" style="color:#bf7952">${leafShape}</g></g><g transform="translate(114 279) rotate(21)" style="color:#d9aa62">${leafShape}</g><g transform="translate(373 278) rotate(-36)" style="color:#bd8356">${leafShape}</g>` : '';
    const leaves = autumn && !isWinter ? `<g transform="translate(174 153)"><g class="asg-leaf" style="color:#c57c49">${leafShape}</g></g><g transform="translate(99 174)"><g class="asg-leaf asg-delay" style="color:#e6af5c">${leafShape}</g></g><g transform="translate(419 217) rotate(27)" style="color:#bb7750">${leafShape}</g><g transform="translate(183 271) rotate(-19)" style="color:#e1b164">${leafShape}</g>${extraLeaves}` : '';
    let weather = chilly ? `<g class="asg-wind" stroke="#ffffff" fill="none" stroke-width="3" stroke-linecap="round"><path d="M31 184h47q18 0 17-12q-1-10-12-7M371 157h84q19 0 19-12q-1-10-12-8M389 183h48q22 0 21 12q-1 9-13 7"/></g>` : '';
    if (isWinter) weather += `<g class="asg-snow" fill="white"><circle cx="58" cy="114" r="3"/><circle cx="213" cy="113" r="3"/><circle cx="398" cy="155" r="3"/><circle cx="467" cy="124" r="3"/><circle cx="372" cy="200" r="3"/><circle cx="207" cy="211" r="3"/></g>`;
    if (rainy) weather += `<g stroke="#6897ae" stroke-width="3" stroke-linecap="round" opacity=".65"><path class="asg-rain-line" d="M58 112l-8 19m35-16-8 19m91-31-8 19m61-18-8 19m190-30-8 19m51-18-8 19m50-16-8 19M48 185l-8 19m144-26-8 19m236-21-8 19m70-17-8 19"/><path class="asg-rain-line asg-delay" d="M112 134l-8 19m83-12-8 19m207-17-8 19m76-17-8 19M94 222l-8 19m105-18-8 19m199-19-8 19m109-22-8 19"/></g><ellipse cx="329" cy="291" rx="77" ry="10" fill="#99bfca" opacity=".7"/>`;
    if (spring) weather += `<g class="asg-butterfly"><path d="M382 170q-22-21-21-3q-3 17 21 8q18 15 24 0q4-21-24-5" fill="#e8ae96"/><path d="M382 165v14" stroke="#87604c" stroke-width="3"/></g><g fill="#e2a9b9"><circle cx="92" cy="116" r="7"/><circle cx="168" cy="133" r="7"/><circle cx="132" cy="86" r="7"/></g>`;
    if (water) weather += `<ellipse cx="302" cy="286" rx="162" ry="31" fill="#74b7c7"/><path d="M151 281q25-9 50 0t50 0t50 0t50 0t50 0" stroke="#c6e8e6" stroke-width="4" fill="none"/>`;

    const outfit = autumn ? `<path d="M267 175q28-12 54 0l16 66q-43 18-84 0Z" fill="url(#${id}-coat)" stroke="#aa624c" stroke-width="2"/><path d="M296 184v58" stroke="#efcfaa" stroke-width="3"/><circle cx="296" cy="203" r="2" fill="#9b604c"/><circle cx="296" cy="225" r="2" fill="#9b604c"/><path d="M259 212h18m38 0h15" stroke="#9c6551" stroke-width="3" stroke-linecap="round"/><path d="M270 171q20 13 43 0l3 16q-29 15-49-1Z" fill="#80a3a1"/><path class="asg-scarf" d="M310 182q29 8 48 5l-4 13q-26-2-46-12Z" fill="#80a3a1" stroke="#658987" stroke-width="2"/>`
      : water ? `<path d="M270 181q29-13 48 0l10 58h-66Z" fill="#f0bb91"/><path d="M261 230q34 10 67 0l-3 22h-61Z" fill="#638fa6"/><path d="M270 232v19m14-18v18m15-18v18m14-19v19" stroke="#d0e4dd" stroke-width="3"/>`
      : `<path d="M268 176q26-12 53 0l24 21-15 15-9-10 8 38q-34 12-68 0l8-38-11 10-14-15Z" fill="#9ac2b2" stroke="#709d8d" stroke-width="2"/><path d="M283 174q12 11 22 0" stroke="#e9ecce" stroke-width="5" fill="none"/><path d="M279 217h31" stroke="#e9ecce" stroke-width="6"/>`;
    const pants = water ? `<path d="M269 250v23m47-23v23" stroke="#e8ad88" stroke-width="13" stroke-linecap="round"/>` : `<path d="M265 238l6 37h18l6-30 7 30h19l6-37" fill="#566b83"/><path d="M282 251l2 21m25-20 2 20" stroke="#7b8ea1" stroke-width="2"/>`;
    let arms = `<path d="M263 193l-17 34m77-34 17 34" stroke="${autumn ? '#cf7455' : '#edb68f'}" stroke-width="15" stroke-linecap="round"/><circle cx="244" cy="232" r="8" fill="#efbd98"/><circle cx="342" cy="232" r="8" fill="#efbd98"/>`;
    if (rainy) arms = `<path d="M263 193l-16 36m77-36 17 12 20-21" stroke="#e2af50" stroke-width="15" fill="none" stroke-linecap="round"/><circle cx="245" cy="232" r="8" fill="#efbd98"/><circle cx="360" cy="182" r="8" fill="#efbd98"/>`;
    const face = `<ellipse cx="294" cy="140" rx="36" ry="38" fill="url(#${id}-skin)"/><circle cx="257" cy="143" r="7" fill="#edb68e"/><circle cx="331" cy="143" r="7" fill="#edb68e"/><path d="M261 133q-12-45 33-47q43 1 35 46l-11-10q-22 2-39-13l-13 28Z" fill="#75543f"/><path d="M269 101q19-18 38-8" fill="none" stroke="#946e50" stroke-width="7" stroke-linecap="round"/><g class="asg-eye" fill="#4c483f"><ellipse cx="281" cy="139" rx="3.7" ry="5"/><ellipse cx="307" cy="139" rx="3.7" ry="5"/></g><path d="M291 148q4 4 8 0" stroke="#ce9474" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M284 157q10 9 21-1" stroke="#945e4e" stroke-width="2.5" fill="none" stroke-linecap="round"/><ellipse cx="272" cy="151" rx="7" ry="4" fill="#e99e90" opacity=".55"/><ellipse cx="318" cy="151" rx="7" ry="4" fill="#e99e90" opacity=".55"/>`;
    const hat = isWinter || kind === 'cold' ? `<path d="M260 118q1-33 34-34q33 2 36 34Z" fill="#739e9e"/><path d="M258 115q35-9 73 0v13q-33-7-73 0Z" fill="#91b4ad"/><circle cx="294" cy="80" r="10" fill="#b1c9bc"/>` : '';
    const umbrella = rainy ? `<path d="M360 181V78" stroke="#655b4b" stroke-width="4"/><path d="M359 181v47q0 13-13 13q-9 0-9-8" stroke="#655b4b" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M280 113q12-67 80-68q65 0 81 68q-21-17-39 0q-23-18-42 0q-21-19-40 0q-22-17-40 0Z" fill="url(#${id}-umbrella)" stroke="#4d8da4" stroke-width="3"/><path d="M360 45q-37 22-40 68m40-68v68m0-68q37 23 42 68" stroke="#accfd7" stroke-width="2" fill="none"/><path d="M360 45v-9" stroke="#655b4b" stroke-width="4" stroke-linecap="round"/>` : '';
    const child = `<ellipse cx="294" cy="285" rx="60" ry="9" fill="#496350" opacity=".16"/><g class="asg-child">${pants}<path d="M269 274l-6 10h28v-11m11 1v10h28l-10-10" fill="${rainy ? '#bd7850' : '#68513f'}" stroke="#51493e" stroke-width="2"/>${arms}${outfit}<path d="M286 169v10q10 6 18-1v-10" fill="#eab08c"/>${face}${hat}</g>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 320"${decorative ? ' aria-hidden="true"' : ` role="img" aria-label="${label}"`}>${defs}<rect width="540" height="320" fill="url(#${id}-sky)"/>${sun}${cloud}${landscape}${tree}${weather}${leaves}${child}${umbrella}</svg>`;
  }

  function shuffle(values) {
    const list = values.slice();
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  function mount(container, settings) {
    if (!container || typeof container.appendChild !== 'function') throw new TypeError('A container element is required.');
    const config = settings || {};
    const id = `asg-${++mountCount}`;
    const root = document.createElement('section');
    root.className = 'asg-root';
    let locale = config.locale === 'ru' ? 'ru' : 'kk';
    let round = 0;
    let solved = false;
    let completed = false;
    let completionReported = false;
    let destroyed = false;
    let listening = false;
    let speechGeneration = 0;
    let feedback = '';
    let choices = shuffle(ROUNDS[0].choices);
    container.appendChild(root);
    root.addEventListener('click', handleClick);

    function state() {
      return { round, total: ROUNDS.length, solved, completed, locale, listening, sentence: TEXT[locale][ROUNDS[round].key], correctChoice: ROUNDS[round].key };
    }

    function announceCompletion() {
      if (destroyed || completionReported) return;
      completionReported = true;
      if (typeof config.onComplete === 'function') config.onComplete({ type: 'autumn-story', completed: true, correct: ROUNDS.length, total: ROUNDS.length });
    }

    function render(focusAction) {
      if (destroyed) return;
      const text = TEXT[locale];
      root.lang = locale;
      root.dataset.solved = String(solved);
      root.dataset.completed = String(completed);
      if (completed) {
        root.innerHTML = `<style>${CSS}</style><div class="asg-panel asg-finale"><svg class="asg-badge" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="53" fill="#f5dfaa"/><circle cx="60" cy="60" r="44" fill="#fff3d5"/><path d="M59 28l5 17 16-7-5 17 18 5-17 9 4 19-19-6-14 14-1-21-20-7 17-11-3-19 16 6Z" fill="#d69a4c"/><path d="M42 91q17-26 32-42" stroke="#976b38" stroke-width="3" fill="none" stroke-linecap="round"/></svg><h2 tabindex="-1" data-finale-title>${text.done}</h2><p>${text.doneText}</p><div class="asg-actions"><button class="asg-primary" data-action="result">${text.result}</button><button class="asg-secondary" data-action="reset">${text.replay}</button></div></div>`;
        if (focusAction) root.querySelector('[data-finale-title]').focus({ preventScroll: true });
        return;
      }
      const current = ROUNDS[round];
      root.innerHTML = `<style>${CSS}</style><div class="asg-panel"><div class="asg-meta"><span class="asg-counter">${text.round} ${round + 1} / ${ROUNDS.length}</span><span class="asg-progress" aria-hidden="true">${ROUNDS.map((_, index) => `<span data-done="${index < round || (index === round && solved)}"></span>`).join('')}</span></div><h2>${text.title}</h2><p class="asg-intro">${text.intro}</p><figure class="asg-scene">${illustration(current.key, `${id}-main-${round}`, text[`${current.key}Scene`])}</figure><p class="asg-sentence">${text[current.key]}</p><div class="asg-actions"><button class="asg-listen" data-action="listen"${listening ? ' disabled aria-busy="true"' : ''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4Zm12-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>${listening ? text.listening : text.listen}</span></button></div><p class="asg-prompt">${text.choose}</p><div class="asg-choices" role="group" aria-label="${text.choose}">${choices.map(choice => `<button class="asg-choice" data-choice="${choice}"${solved ? ' disabled' : ''}${solved && choice === current.key ? ' data-correct="true"' : ''}>${illustration(choice, `${id}-choice-${round}-${choice}`, '', true)}<span>${text[`${choice}Option`]}</span></button>`).join('')}</div><div class="asg-status" role="status" aria-live="polite" aria-atomic="true" data-success="${solved && feedback !== 'unavailable'}">${feedback ? text[feedback] : ''}</div>${solved ? `<div class="asg-actions"><button class="asg-primary" data-action="next">${round === ROUNDS.length - 1 ? text.finish : text.next}</button></div>` : ''}</div>`;
      if (focusAction) root.querySelector(`[data-action="${focusAction}"]`)?.focus({ preventScroll: true });
    }

    function invalidateSpeech() {
      speechGeneration++;
      listening = false;
      if (typeof config.onStopSpeech === 'function') config.onStopSpeech();
    }

    async function listen() {
      if (destroyed || completed || listening) return;
      const generation = ++speechGeneration;
      listening = true;
      const button = root.querySelector('[data-action="listen"]');
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.querySelector('span').textContent = TEXT[locale].listening;
      if (feedback === 'unavailable') {
        feedback = solved ? 'correct' : '';
        const status = root.querySelector('.asg-status');
        status.textContent = feedback ? TEXT[locale][feedback] : '';
        status.dataset.success = String(solved);
      }
      const isCurrent = () => !destroyed && !completed && generation === speechGeneration;
      function unavailable() {
        if (!isCurrent()) return;
        feedback = 'unavailable';
        const status = root.querySelector('.asg-status');
        if (status) { status.textContent = TEXT[locale].unavailable; status.dataset.success = 'false'; }
      }
      try {
        const result = typeof config.onSpeak === 'function' ? await config.onSpeak(TEXT[locale][ROUNDS[round].key], locale) : false;
        if (result === false) unavailable();
      } catch { unavailable(); }
      finally {
        if (isCurrent()) {
          listening = false;
          const currentButton = root.querySelector('[data-action="listen"]');
          if (currentButton) {
            currentButton.disabled = false;
            currentButton.removeAttribute('aria-busy');
            currentButton.querySelector('span').textContent = TEXT[locale].listen;
          }
        }
      }
    }

    function handleClick(event) {
      const button = event.target.closest('button');
      if (!button || !root.contains(button) || button.disabled || destroyed) return;
      const action = button.dataset.action;
      if (action === 'listen') { void listen(); return; }
      if (action === 'reset') { reset(); return; }
      if (action === 'result') { announceCompletion(); return; }
      if (action === 'next' && solved) {
        invalidateSpeech();
        if (round === ROUNDS.length - 1) { completed = true; render('finale'); announceCompletion(); }
        else { round++; solved = false; feedback = ''; choices = shuffle(ROUNDS[round].choices); render('listen'); }
        return;
      }
      if (!button.dataset.choice || solved || completed) return;
      if (button.dataset.choice !== ROUNDS[round].key) {
        feedback = 'retry';
        root.querySelector('.asg-status').textContent = TEXT[locale].retry;
        return;
      }
      solved = true; feedback = 'correct'; render('next');
    }

    function reset() {
      if (destroyed) return;
      invalidateSpeech(); round = 0; solved = false; completed = false; completionReported = false; feedback = '';
      choices = shuffle(ROUNDS[0].choices); render('listen');
    }

    render();
    return {
      destroy() { if (destroyed) return; destroyed = true; invalidateSpeech(); root.removeEventListener('click', handleClick); root.remove(); },
      reset,
      setLocale(value) {
        const nextLocale = value === 'ru' ? 'ru' : 'kk';
        if (nextLocale !== locale) invalidateSpeech();
        locale = nextLocale;
        render();
      },
      getState: state
    };
  }

  window.EduAutumnStory = Object.freeze({ mount });
}());
