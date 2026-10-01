/**
 * Compatibility entry point for old callers. There is no trained/validated
 * pronunciation model in this app. Energy, pitch and MFCC similarity cannot
 * justify marking a child's target phoneme correct or incorrect.
 */
(function (root) {
  'use strict';
  root.PhonemeValidator = {
    async validate(audioBuffer, targetPhoneme) {
      const result = {
        target: targetPhoneme ? String(targetPhoneme).toUpperCase() : null,
        success: false,
        pronunciationEvaluated: false,
        reason: 'PRONUNCIATION_NOT_EVALUATED',
        voiceDetected: false
      };
      if (!targetPhoneme) return { ...result, reason: 'NO_TARGET' };
      if (!audioBuffer || typeof audioBuffer.getChannelData !== 'function' || !root.AudioDSP) return result;
      const samples = audioBuffer.getChannelData(0);
      let voicedFrames = 0;
      for (let offset = 0; offset + 4096 <= samples.length; offset += 2048) {
        if (root.AudioDSP.analyzeVoicedFrame(samples.subarray(offset, offset + 4096), audioBuffer.sampleRate).voiced) voicedFrames++;
      }
      return { ...result, voiceDetected: voicedFrames >= 2 };
    },
    // Do not bootstrap a reference from a child's unverified attempt or save audio.
    addReference() { return false; },
    addManualReference() { return false; }
  };
})(window);
