import type { SVGProps } from 'react';
import type { Exercise } from './content';
type Geometry = Pick<SVGProps<SVGElement>, 'd' | 'cx' | 'cy' | 'r' | 'opacity' | 'transform'>;
export type FrameAttributes = Record<string, Geometry>;
export const durationMs = 10000;
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const smooth = (value: number) => value * value * (3 - 2 * value);
const easeRange = (value: number, start: number, end: number) => smooth(clamp((value - start) / (end - start), 0, 1));
export const phases = { teeth: ['prepare', 'upper', 'lower', 'relax'], ball: ['prepare', 'left', 'right', 'relax'], hill: ['prepare', 'lift', 'hold', 'relax'] } as const;
export function lessonFrame(exerciseId: Exercise, progress: number, reducedMotion: boolean): FrameAttributes {
 const attrs: FrameAttributes = {};
 const attr = (name: string, values: Geometry) => { attrs[name] = values; };
      const p = progress;
      const phase = Math.min(3, Math.floor(p * 4));
      let displayProgress = p;
      // Explicit playback is allowed, but reduced-motion avoids continuous morphing.
      if (reducedMotion) displayProgress = [0, .375, .625, .98][phase];
      const t = displayProgress;
      if (exerciseId === 'teeth') {
        const upper = t >= .25 && t < .5;
        const lower = t >= .5 && t < .75;
        let x = 400;
        let y = 344;
        if (upper || lower) {
          const stageProgress = (t - (upper ? .25 : .5)) * 4;
          x = 400 - 125 * Math.sin(stageProgress * Math.PI * 2);
          const moveDown = easeRange(t, .45, .55);
          y = 258 + 100 * moveDown + Math.abs(x - 400) * (-.03 + .045 * moveDown);
        } else if (t < .25) y = 344 - easeRange(t, .12, .25) * 86;
        else y = 358 - easeRange(t, .75, 1) * 14;
        attr('tongue', { d: `M310 404Q321 365 ${x - 26} ${y + 16}Q${x - 35} ${y - 7} ${x} ${y - 8}Q${x + 35} ${y - 7} ${x + 26} ${y + 16}Q485 365 490 404Q400 438 310 404Z` });
        attr('tongue-shine', { d: `M365 395Q${x - 4} ${y + 37} ${x} ${y + 5}` });
        attr('target', { cx: x, cy: y - 4, opacity: upper || lower ? .78 : 0 });
        attr('guide', { d: upper ? 'M279 252Q400 232 521 252' : 'M279 363Q400 377 521 363', opacity: upper || lower ? .65 : 0 });
        attr('side-arrow', { opacity: upper || lower ? .85 : .2 });
      } else if (exerciseId === 'ball') {
        const left = easeRange(t, .12, .3) * (1 - easeRange(t, .45, .57));
        const right = easeRange(t, .45, .57) * (1 - easeRange(t, .74, .93));
        const leftEdge = 197 - left * 37;
        const rightEdge = 603 + right * 37;
        attr('face', { d: `M400 78C244 78 184 178 197 290C${leftEdge - 22} 357 ${leftEdge + 25} 442 400 473C${rightEdge - 25} 442 ${rightEdge + 22} 357 603 290C616 178 556 78 400 78Z` });
        attr('left-cheek', { transform: `translate(260 348) scale(${.76 + left * .54} ${.78 + left * .34}) translate(-260 -348)` });
        attr('right-cheek', { transform: `translate(540 348) scale(${.76 + right * .54} ${.78 + right * .34}) translate(-540 -348)` });
        attr('air-left', { opacity: left * .7 });
        attr('air-right', { opacity: right * .7 });
        const airPosition = easeRange(t, .45, .57);
        attr('air-dot', { cx: 273 + airPosition * 254, cy: 402 + 27 * Math.sin(airPosition * Math.PI) });
        attr('air-guide', { opacity: t >= .25 && t <= .75 ? .75 : .15 });
      } else {
        const lift = easeRange(t, .2, .43) * (1 - easeRange(t, .78, .96));
        const height = 372 - lift * 116;
        // The tip at (220, 357) stays anchored behind the lower incisors.
        attr('tongue', { d: `M220 357C249 360 264 ${height} 380 ${height}C469 ${height} 518 315 548 353L547 404Q367 422 250 390Q221 380 220 357Z` });
        attr('tongue-shine', { d: `M260 369C293 ${height + 18} 350 ${height + 5} 407 ${height + 14}` });
        attr('lift-arrow', { d: `M386 ${height - 12}V${Math.max(239, height - 70)}`, opacity: t >= .25 && t < .5 ? .75 : 0 });
        attr('hill-icon', { d: `M-27 17Q0 ${9 - lift * 45} 27 17Z` });
      }
      for (let index = 0; index < 4; index++) attr(`phase-${index}`, { r: index === phase ? 6 : 4, opacity: index === phase ? 1 : .35 });

 return attrs;
}
