import { useSyncExternalStore, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useNavigator } from '../navigation/navigationContext';
import { voiceAnimals, voiceModeCopy, voiceModes, voicePicture } from '../voiceModes/content';
import type { VoiceModeStore } from '../voiceModes/store';
import '../voiceModes/voiceModes.css';

export function VoiceModePractice({ store }: { store: VoiceModeStore }) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot), navigator = useNavigator();
  if (!state.mode) return null;
  const mode = voiceModes[state.mode], copy = voiceModeCopy[state.locale];
  const host = document.querySelector<HTMLElement>(`#${mode.screen} [data-voice-mode-root]`);
  if (!host) return null;
  return createPortal(<section className="voice-mode-practice" data-react-owned="true" data-i18n-managed="true" data-card-audio="true"
    lang={state.locale} aria-labelledby="voiceModeTitle" style={{ '--voice-mode-color': mode.color } as CSSProperties}>
    <header><h2 id="voiceModeTitle">{mode.icon} {mode.title[state.locale]}</h2><p>{mode.description[state.locale]}</p></header>
    <div id={mode.grid} className="dv-cards">{voiceAnimals.map(animal => {
      const playing = state.selected === animal.id && state.status === 'playing';
      return <article key={animal.id} className="dv-card" data-animal={animal.id} data-playing={playing} aria-labelledby={`voiceAnimal-${animal.id}`}
        style={{ '--voice-card-start': animal.color[0], '--voice-card-end': animal.color[1], '--voice-card-glow': animal.glow } as CSSProperties}>
        <span className="dv-badge">{mode.badge[state.locale]}</span>
        <span className={`dv-emoji dv-animal-frame ${mode.animation}`}><img className="dv-animal-animation" src={voicePicture(state.mode!, animal.id)}
          alt={animal.name[state.locale]} decoding="async" /></span>
        <h3 id={`voiceAnimal-${animal.id}`}>{animal.phrase[state.locale]}</h3>
        <p className="dv-hint">{mode.icon} {mode.hint[state.locale]}</p>
        <button type="button" aria-pressed={playing} aria-label={`${playing ? copy.stop : copy.listen}: ${animal.phrase[state.locale]}`}
          onClick={() => { if (playing) store.stop(); else void store.play(animal.id); }}>
          {playing ? `⏹ ${copy.stop}` : `🔊 ${copy.listen}`}
        </button>
      </article>;
    })}</div>
    <p className="dv-status" role="status" data-status={state.status}>{copy[state.status]}</p>
    <p className="dv-instruction">{mode.icon} {mode.instruction[state.locale]}</p>
    <button type="button" className="btn btn-secondary dv-back" data-destination="grade0DauyspenmMenu"
      onClick={() => navigator.navigate('grade0DauyspenmMenu')}>⬅️ {copy.back}</button>
  </section>, host, mode.screen);
}
