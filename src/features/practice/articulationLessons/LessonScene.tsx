import { useId } from 'react';
import type { Exercise } from './content';
import { lessonFrame, type FrameAttributes } from './animation';

function definitions(id: string) {
    return (<> <defs>
      <linearGradient id={`${id}-sky`} x2="1" y2="1"><stop stopColor="#edf9ff"/><stop offset="1" stopColor="#f5edff"/></linearGradient>
      <radialGradient id={`${id}-skin`} cx=".4" cy=".3" r=".8"><stop stopColor="#ffe0c9"/><stop offset=".56" stopColor="#f7c2a5"/><stop offset="1" stopColor="#dc967e"/></radialGradient>
      <radialGradient id={`${id}-cheek`} cx=".4" cy=".35"><stop stopColor="#ffd9ba"/><stop offset=".7" stopColor="#f5b69c"/><stop offset="1" stopColor="#e49883"/></radialGradient>
      <linearGradient id={`${id}-hair`} x2=".8" y2="1"><stop stopColor="#754535"/><stop offset=".5" stopColor="#4b2a28"/><stop offset="1" stopColor="#301e26"/></linearGradient>
      <radialGradient id={`${id}-mouth`}><stop stopColor="#773747"/><stop offset="1" stopColor="#3c2338"/></radialGradient>
      <linearGradient id={`${id}-lip`} x2="0" y2="1"><stop stopColor="#f6a69e"/><stop offset="1" stopColor="#d97480"/></linearGradient>
      <linearGradient id={`${id}-tooth`} x2=".1" y2="1"><stop stopColor="#fff"/><stop offset=".65" stopColor="#fffdf5"/><stop offset="1" stopColor="#dce1e9"/></linearGradient>
      <linearGradient id={`${id}-tongue`} x2=".3" y2="1"><stop stopColor="#ffb5b7"/><stop offset=".45" stopColor="#ee8498"/><stop offset="1" stopColor="#c35d7d"/></linearGradient>
      <linearGradient id={`${id}-shirt`} x2="1" y2="1"><stop stopColor="#69b5df"/><stop offset="1" stopColor="#6d79cc"/></linearGradient>
      <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#676298" floodOpacity=".18"/></filter>
      <filter id={`${id}-soft`}><feGaussianBlur stdDeviation="7"/></filter>
      <marker id={`${id}-arrow`} markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="none" stroke="#7466bc" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></marker>
    </defs> </>);
  }

  function background(id: string) {
    return (<> <rect className="art-scene-background" x="8" y="8" width="784" height="544" rx="38" fill={`url(#${id}-sky)`}/>
      <circle cx="94" cy="110" r="42" fill="#fff" opacity=".45"/>
      <circle cx="728" cy="430" r="70" fill="#dbe9f7" opacity=".48"/>
      <path d="M686 88h24m-12-12v24M80 438h18m-9-9v18" stroke="#b4a5d3" strokeWidth="5" strokeLinecap="round" opacity=".65"/>
      <ellipse cx="400" cy="501" rx="229" ry="17" fill="#a4a1cb" opacity=".13"/> </>);
  }

  function eyes(y: number, spacing: number) {
    return (<> <g className="art-eyes">
      <path d={`M${400 - spacing - 26} ${y - 34}q26-17 52-1M${400 + spacing - 26} ${y - 35}q26-16 52 1`} fill="none" stroke="#644137" strokeWidth="9" strokeLinecap="round"/>
      {[-1, 1].map(side => (<g key={side} transform={`translate(${400 + side * spacing} ${y})`}><ellipse rx="25" ry="28" fill="#fff8f0"/><ellipse rx="16" ry="22" fill="#556b79"/><ellipse rx="10" ry="17" fill="#283345"/><ellipse cx="-5" cy="-8" rx="5" ry="7" fill="#fff"/><circle cx="7" cy="8" r="3" fill="#fff" opacity=".8"/></g>))}
      <path d={`M389 ${y + 44}q11 8 22 0`} fill="none" stroke="#d78b75" strokeWidth="6" strokeLinecap="round"/>
    </g> </>);
  }

  function hair(id: string, top: number) {
    return (<> <path d={`M186 ${top + 111}C174 ${top + 9} 258 ${top - 43} 390 ${top - 26}C510 ${top - 59} 637 ${top + 23} 616 ${top + 133}L592 ${top + 82}C558 ${top + 77} 514 ${top + 52} 491 ${top + 27}C424 ${top + 86} 308 ${top + 73} 252 ${top + 55}L208 ${top + 125}Z`} fill={`url(#${id}-hair)`}/>
      <path d={`M243 ${top + 24}C322 ${top - 15} 387 ${top + 8} 421 ${top + 22}M484 ${top + 5}q63 4 93 48`} stroke="#a57253" strokeWidth="10" strokeLinecap="round" opacity=".45" fill="none"/> </>);
  }

  function toothRow(id: string, upper: boolean) {
    const widths = [34, 39, 42, 43, 43, 42, 39, 34];
    let x = 242;
    return widths.map((width, index) => {
      const arch = Math.abs(index - 3.5) * 3;
      const y = upper ? 209 + arch : 364 - arch;
      const height = upper ? 50 - arch * .6 : 35;
      const shape = (<rect key={index} x={x} y={y} width={width} height={height} rx={upper ? 10 : 8} fill={`url(#${id}-tooth)`} stroke="#d3c5ca" strokeWidth="1.5"/>);
      x += width + 1;
      return shape;
    });
  }

  function teethScene(id: string, attrs: FrameAttributes) {
    return (<> <g filter={`url(#${id}-shadow)`}>
      <path d="M215 508q13-85 125-93h120q112 8 125 93" fill={`url(#${id}-shirt)`}/>
      <path d="M352 434v53q48 36 96 0v-53" fill={`url(#${id}-skin)`}/>
      <ellipse cx="194" cy="270" rx="29" ry="47" fill="#edb198"/><ellipse cx="606" cy="270" rx="29" ry="47" fill="#edb198"/>
      <path d="M400 57C244 57 186 150 197 302C207 428 281 474 400 476C519 474 593 428 603 302C614 150 556 57 400 57Z" fill={`url(#${id}-skin)`}/>
      {hair(id, 61)}{eyes(167, 91)}
      <ellipse cx="249" cy="294" rx="39" ry="20" fill="#ee9e98" opacity=".3"/><ellipse cx="551" cy="294" rx="39" ry="20" fill="#ee9e98" opacity=".3"/>
      <ellipse cx="400" cy="314" rx="193" ry="118" fill={`url(#${id}-lip)`} stroke="#cf7d82" strokeWidth="3"/>
      <ellipse cx="400" cy="309" rx="179" ry="103" fill={`url(#${id}-mouth)`}/>
      <clipPath id={`${id}-mouthclip`}><ellipse cx="400" cy="309" rx="179" ry="103"/></clipPath>
      <g clipPath={`url(#${id}-mouthclip)`}>
        <path d="M215 205Q400 188 585 205v30Q400 220 215 237Z" fill="#d38391"/>
        <path data-art="tongue" fill={`url(#${id}-tongue)`} stroke="#ca647f" strokeWidth="3" strokeLinejoin="round" {...attrs['tongue']}/>
        <path data-art="tongue-shine" fill="none" stroke="#ffc4c7" strokeWidth="8" strokeLinecap="round" opacity=".64" {...attrs['tongue-shine']}/>
        {toothRow(id, true)}
        <path d="M216 390Q400 417 584 390v25H216Z" fill="#c87586"/>
        {toothRow(id, false)}
      </g>
      <path d="M275 224q112-33 249 0" fill="none" stroke="#ffe0d5" strokeWidth="5" opacity=".62" strokeLinecap="round"/>
      <path d="M292 422q109 21 214-2" fill="none" stroke="#ffc7b3" strokeWidth="6" opacity=".65" strokeLinecap="round"/>
    </g>
    <path data-art="guide" fill="none" stroke="#7a68bf" strokeWidth="4" strokeLinecap="round" strokeDasharray="2 10" opacity=".6" {...attrs['guide']}/>
    <circle data-art="target" r="9" fill="#fff" stroke="#8672c8" strokeWidth="3" {...attrs['target']}/>
    <g transform="translate(686 270)"><circle r="34" fill="#fff" opacity=".9"/><path d="M-15-7h30M-15 7h30" stroke="#9ba7b5" strokeWidth="5" strokeLinecap="round"/><path data-art="side-arrow" d="M-20 0H20" fill="none" stroke="#7966bc" strokeWidth="4" markerEnd={`url(#${id}-arrow)`} {...attrs['side-arrow']}/></g> </>);
  }

  function ballScene(id: string, attrs: FrameAttributes) {
    return (<> <g filter={`url(#${id}-shadow)`}>
      <path d="M209 513q22-87 132-97h118q110 10 132 97" fill={`url(#${id}-shirt)`}/>
      <path d="M352 432v51q48 39 96 0v-51" fill={`url(#${id}-skin)`}/>
      <ellipse cx="185" cy="254" rx="27" ry="44" fill="#edb198"/><ellipse cx="615" cy="254" rx="27" ry="44" fill="#edb198"/>
      <path data-art="face" fill={`url(#${id}-skin)`} {...attrs['face']}/>
      {hair(id, 78)}{eyes(212, 83)}
      <g data-art="left-cheek" {...attrs['left-cheek']}><ellipse cx="260" cy="348" rx="62" ry="60" fill={`url(#${id}-cheek)`}/><ellipse cx="245" cy="342" rx="25" ry="19" fill="#edaaa1" opacity=".35"/><path d="M229 311q-22 30-8 54" fill="none" stroke="#ffe6cf" strokeWidth="8" opacity=".65" strokeLinecap="round"/></g>
      <g data-art="right-cheek" {...attrs['right-cheek']}><ellipse cx="540" cy="348" rx="62" ry="60" fill={`url(#${id}-cheek)`}/><ellipse cx="555" cy="342" rx="25" ry="19" fill="#edaaa1" opacity=".35"/><path d="M571 311q22 30 8 54" fill="none" stroke="#ffe6cf" strokeWidth="8" opacity=".65" strokeLinecap="round"/></g>
      <path d="M353 337Q382 326 400 333Q417 326 447 337Q426 357 400 356Q374 357 353 337Z" fill={`url(#${id}-lip)`}/>
      <path d="M355 339q45 5 90 0" fill="none" stroke="#bc7480" strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M373 331q10-2 17 0" fill="none" stroke="#ffd0c2" strokeWidth="4" strokeLinecap="round"/>
    </g>
    <g data-art="air-left" opacity="0" {...attrs['air-left']}><ellipse cx="245" cy="344" rx="38" ry="35" fill="#fff" opacity=".2"/><path d="M219 342q-2-21 19-25" stroke="#fff" strokeWidth="4" opacity=".65" fill="none" strokeLinecap="round"/></g>
    <g data-art="air-right" opacity="0" {...attrs['air-right']}><ellipse cx="555" cy="344" rx="38" ry="35" fill="#fff" opacity=".2"/><path d="M568 320q20 9 15 30" stroke="#fff" strokeWidth="4" opacity=".65" fill="none" strokeLinecap="round"/></g>
    <g data-art="air-guide" {...attrs['air-guide']}><path d="M273 402Q400 459 527 402" fill="none" stroke="#7e70b7" strokeWidth="4" strokeDasharray="2 11" strokeLinecap="round" opacity=".6"/><circle data-art="air-dot" r="10" fill="#a192d7" stroke="#fff" strokeWidth="3" {...attrs['air-dot']}/></g>
    <g transform="translate(105 355)"><circle r="33" fill="#fff" opacity=".86"/><path d="M-13-3q13-18 26 0q-13 18-26 0Z" fill="none" stroke="#9b7f9e" strokeWidth="3"/><path d="M-15 0H15" stroke="#9b7f9e" strokeWidth="3" strokeLinecap="round"/></g> </>);
  }

  function hillScene(id: string, attrs: FrameAttributes) {
    return (<> <g filter={`url(#${id}-shadow)`}>
      <path d="M198 482Q151 455 158 390L132 347Q123 333 150 316L129 284Q120 273 153 262L190 239Q195 173 246 123Q324 48 456 81Q609 96 625 231L602 444Q578 482 530 483Z" fill={`url(#${id}-skin)`} stroke="#d39380" strokeWidth="3"/>
      <path d="M198 239Q190 126 294 78Q414 20 537 107Q625 165 616 257L574 194Q533 177 480 131Q369 169 291 134L220 204Z" fill={`url(#${id}-hair)`}/>
      <path d="M254 111q102-39 169 1" stroke="#a57253" strokeWidth="10" fill="none" opacity=".5" strokeLinecap="round"/>
      <path d="M201 481Q336 466 520 483L551 512H205Z" fill={`url(#${id}-shirt)`}/>
      <ellipse cx="234" cy="209" rx="19" ry="17" fill="#fff8f1"/><circle cx="225" cy="210" r="12" fill="#3c5065"/><circle cx="221" cy="205" r="4" fill="#fff"/>
      <path d="M212 177q20-13 40-4" stroke="#604033" strokeWidth="7" fill="none" strokeLinecap="round"/>
      <path d="M181 275Q297 182 494 215Q555 228 566 285L556 409Q365 440 187 360Z" fill={`url(#${id}-mouth)`} stroke="#b9737f" strokeWidth="5"/>
      <path d="M186 275Q335 204 494 232" stroke="#e6a1a8" strokeWidth="18" fill="none" strokeLinecap="round"/>
      <path d="M183 276l33-5v41q-15 8-27 1Z" fill={`url(#${id}-tooth)`} stroke="#d4c8cf" strokeWidth="2"/>
      <path d="M187 348l30-6v40q-14 3-25-5Z" fill={`url(#${id}-tooth)`} stroke="#d4c8cf" strokeWidth="2"/>
      <path data-art="tongue" fill={`url(#${id}-tongue)`} stroke="#c76982" strokeWidth="4" strokeLinejoin="round" {...attrs['tongue']}/>
      <path data-art="tongue-shine" fill="none" stroke="#ffc5c8" strokeWidth="7" opacity=".6" strokeLinecap="round" {...attrs['tongue-shine']}/>
      <path d="M191 381Q347 429 548 409" stroke="#d58c9b" strokeWidth="9" fill="none"/>
      <path d="M162 319q-13 4-13 14q4 17 36 15" stroke="#df8b89" strokeWidth="12" fill="none" strokeLinecap="round"/>
      <path d="M162 319q-13 4-13 14" stroke="#ffc4b6" strokeWidth="4" fill="none" strokeLinecap="round"/>
    </g>
    <circle cx="220" cy="357" r="8" fill="#fff" stroke="#8e79c7" strokeWidth="3"/>
    <path d="M220 357L117 409" stroke="#8e79c7" strokeWidth="3" strokeDasharray="3 7" strokeLinecap="round"/>
    <g transform="translate(86 424)"><circle r="28" fill="#fff"/><path d="M-12 1l8 8L14-11" fill="none" stroke="#7b6bb4" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></g>
    <path data-art="lift-arrow" d="M386 367V295" stroke="#8c7bcb" strokeWidth="5" fill="none" strokeLinecap="round" markerEnd={`url(#${id}-arrow)`} {...attrs['lift-arrow']}/>
    <g transform="translate(686 280)"><circle r="42" fill="#fff" opacity=".9"/><path data-art="hill-icon" d="M-27 17Q0-34 27 17Z" fill="#b7cbe4" {...attrs['hill-icon']}/><path d="M-28 18H28" stroke="#7e92bb" strokeWidth="4" strokeLinecap="round"/></g> </>);
  }


export function LessonScene({ exercise, progress, reducedMotion, label, description }: { exercise: Exercise; progress: number; reducedMotion: boolean; label: string; description: string }) {
 const id = 'lesson-' + useId().replace(/:/g, '');
 const attrs = lessonFrame(exercise, progress, reducedMotion);
 return <div className={'art-vector-lesson art-vector-' + exercise}><svg className="art-lesson-svg" viewBox="0 0 800 560" role="img" aria-labelledby={id + '-title ' + id + '-description'}>
 <title id={id + '-title'}>{label}</title><desc id={id + '-description'}>{description}</desc>
 {definitions(id)}{background(id)}{exercise === 'teeth' ? teethScene(id, attrs) : exercise === 'ball' ? ballScene(id, attrs) : hillScene(id, attrs)}
 <g className="art-phase-dots">{[0,1,2,3].map(index => <circle key={index} data-art={'phase-' + index} cx={367 + index * 22} cy="530" fill="#a494c9" {...attrs['phase-' + index]} />)}</g>
 </svg></div>;
}
