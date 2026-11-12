import { afterEach, expect, it, vi } from 'vitest';
import { installPracticeAudio } from './runtime';
import { createScreenNavigator } from '../navigation/screenNavigator';
import type { AudioWindow } from './types';

const disposers: (() => void)[] = [];
afterEach(() => { disposers.splice(0).forEach(dispose => dispose()); vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

it('owns stopping on navigation and pagehide, then restores globals and subscriptions', async () => {
  document.body.innerHTML = '<div id="levelsScreen" class="screen active"></div><div id="lesson" class="screen"></div>';
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
  const native = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  const cancel = vi.fn(); vi.stubGlobal('speechSynthesis', { cancel });
  const stopRecognition = vi.fn(), clearPendingReply = vi.fn(), stopRemote = vi.fn();
  vi.stubGlobal('chatbotControls', { stopRecognition, clearPendingReply }); vi.stubGlobal('chatbotTTS', { stop: stopRemote });
  const navigator = createScreenNavigator(document, { scrollToTop: vi.fn() }); const inputs = vi.fn();
  const originalAudio = window.Audio;
  const service = installPracticeAudio(window as AudioWindow, document, navigator, inputs); disposers.push(service.dispose);
  const media = new Audio('/lesson.mp3'); service.media.track(media); await media.play();
  navigator.navigate('lesson');
  expect(service.media.active).toHaveLength(0); expect(pause).toHaveBeenCalled(); expect(inputs).toHaveBeenCalledOnce();
  expect(stopRecognition).toHaveBeenCalledOnce(); expect(clearPendingReply).toHaveBeenCalledOnce(); expect(stopRemote).toHaveBeenCalledOnce();
  window.dispatchEvent(new Event('pagehide')); expect(inputs).toHaveBeenCalledTimes(2);
  service.dispose(); const calls = inputs.mock.calls.length;
  expect(window.Audio).toBe(originalAudio); expect(HTMLMediaElement.prototype.play).toBe(native);
  expect((window as AudioWindow).appTts).toBeUndefined();
  navigator.navigate('levelsScreen'); window.dispatchEvent(new Event('pagehide')); expect(inputs).toHaveBeenCalledTimes(calls);
});

it('does not run a pending TTS request when another content recording starts', async () => {
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(); vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  const service = installPracticeAudio(window as AudioWindow, document, createScreenNavigator(document), vi.fn()); disposers.push(service.dispose);
  const speaking = service.tts.speakText('Pending speech');
  await new Audio('/lesson.mp3').play();
  expect(await speaking).toEqual({ ok: false, reason: 'cancelled' });
});
