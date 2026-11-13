import { createAudioPreloader } from './preloader';
import { createMediaCoordinator } from './mediaCoordinator';
import { createTtsClient } from './ttsClient';
import { createSoundTriggers } from './soundTriggers';
import type { AudioWindow, StopAudioOptions } from './types';
import type { ScreenNavigator } from '../navigation/screenNavigator';

const voiceoverSelector = 'button, [role="button"], .profile-action-row, .profile-logout-btn, .profile-close-btn';
const voiceoverSkip = '.profile-lang-btn, .theme-toggle, .center-circle, #voiceCenterBtn, .chatbot-message-voice, .ai-message-audio-btn, [data-reading-audio], .voice-btn, .verb-picto-card, .spatial-audio-trigger';
function attempt(action: () => unknown) { try { action(); } catch { /* One legacy failure must not prevent other audio from stopping. */ } }

export function installPracticeAudio(app: AudioWindow, root: Document, navigator: ScreenNavigator, stopInputs: () => void) {
  const preloader = createAudioPreloader(app, root);
  const tts = createTtsClient(app);
  const triggers = createSoundTriggers(app);
  let voiceover: HTMLAudioElement | null = null;
  let disposed = false;
  function cancelSpeech(stopRecognition = true, clearPendingReply = true) {
    attempt(() => app.speechSynthesis?.cancel());
    if (clearPendingReply) attempt(() => app.chatbotControls?.clearPendingReply?.());
    if (stopRecognition) attempt(() => app.chatbotControls?.stopRecognition?.());
  }
  const media = createMediaCoordinator(app, root, {
    prepare(audio) { if (audio.currentSrc || audio.src) preloader.schedule(audio.currentSrc || audio.src, 0); triggers.attach(audio); },
    released: triggers.release,
    contentStarted(audio) { if (!tts.ownsAudio(audio)) tts.stop(); cancelSpeech(false, false); },
  });
  function stopRemote() { tts.stop(); attempt(() => app.chatbotTTS?.stop()); }
  function stopAllAppAudio({ includeEffects = true, stopRecognition = true }: StopAudioOptions = {}) {
    stopRemote(); media.stop({ includeEffects }); triggers.clear(); cancelSpeech(stopRecognition); attempt(stopInputs); voiceover = null;
  }
  function stopContentPlayback() { stopRemote(); media.stop({ includeEffects: false }); triggers.clear(); cancelSpeech(false, false); voiceover = null; }
  function stopAllAudio() { stopRemote(); media.stop(); triggers.clear(); cancelSpeech(false, false); voiceover = null; }
  function playEffect(id: string) {
    const audio = root.getElementById(id);
    if (audio instanceof app.HTMLAudioElement) void audio.play().catch(() => {});
  }
  function playVoiceover(event: MouseEvent) {
    let ru = false;
    try { ru = app.getProfileLang?.() === 'ru' || (app.localStorage.getItem('profileLang') || app.localStorage.getItem('locale')) === 'ru'; } catch { /* No persisted language. */ }
    if (!ru || !app.getRuVoiceoverAudioPath) return;
    const trigger = event.target instanceof app.Element ? event.target.closest(voiceoverSelector) : null;
    if (!trigger || trigger.closest(voiceoverSkip)) return;
    const raw = [trigger.getAttribute('data-ru-voiceover'), trigger.getAttribute('aria-label'), (trigger as HTMLElement).innerText || trigger.textContent || ''].filter(Boolean).join(' / ');
    const candidates = raw.split('/').map(part => part.replace(/\u200B|\u200C|\u200D|\uFE0E|\uFE0F/g, '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
    const path = candidates.map(candidate => app.getRuVoiceoverAudioPath!(candidate, 'ru-RU')).find(Boolean);
    if (!path) return;
    if (voiceover) attempt(() => { voiceover!.pause(); voiceover!.currentTime = 0; });
    voiceover = new app.Audio(path); voiceover.preload = 'auto'; void voiceover.play().catch(() => {});
  }
  const click = (event: MouseEvent) => { playVoiceover(event); triggers.click(event); };
  const hidden = () => { if (root.hidden) stopAllAppAudio(); };
  const leaving = () => stopAllAppAudio();
  root.addEventListener('click', click, true); root.addEventListener('visibilitychange', hidden);
  app.addEventListener('pagehide', leaving); app.addEventListener('beforeunload', leaving);
  const releaseNavigation = navigator.register({ name: 'app-audio', leave: leaving });
  const globals: Record<string, unknown> = {
    appTts: tts, appAudioPreloader: preloader, trackAudio: media.track, stopAllAudio, stopAllAppAudio, stopContentPlayback,
    playClick: () => playEffect('clickSound'), playSuccess: () => playEffect('successSound'), playError: () => playEffect('errorSound'),
  };
  const previous = new Map<string, PropertyDescriptor | undefined>();
  Object.entries(globals).forEach(([name, value]) => {
    previous.set(name, Object.getOwnPropertyDescriptor(app, name)); Object.defineProperty(app, name, { value, configurable: true, writable: true });
  });
  previous.set('_activeAudios', Object.getOwnPropertyDescriptor(app, '_activeAudios'));
  Object.defineProperty(app, '_activeAudios', { get: () => media.active, configurable: true });
  return {
    media, tts, preloader, stopAllAppAudio, stopContentPlayback,
    dispose() {
      if (disposed) return; disposed = true;
      releaseNavigation(); root.removeEventListener('click', click, true); root.removeEventListener('visibilitychange', hidden);
      app.removeEventListener('pagehide', leaving); app.removeEventListener('beforeunload', leaving);
      stopAllAppAudio(); tts.dispose(); media.dispose(); triggers.clear(); preloader.dispose();
      previous.forEach((descriptor, name) => { if (descriptor) Object.defineProperty(app, name, descriptor); else Reflect.deleteProperty(app, name); });
    },
  };
}
