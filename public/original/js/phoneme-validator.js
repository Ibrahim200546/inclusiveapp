class PhonemeValidator {
  constructor() {
    this.references = {};
    this.thresholds = {
      'A': 45.0,
      'O': 50.0,
      'U': 45.0,
      'I': 45.0,
      'E': 50.0,
      'default': 50.0
    };

    // --- CONSERVATIVE RANGES for Safe Bootstrapping ---
    // Hz ranges for F1 (Height) and F2 (Backness)
    this.FORMANT_RANGES = {
      'A': { f1: [650, 1100], f2: [1000, 1600] },
      'Ә': { f1: [500, 800], f2: [1400, 1900] }, // AE sound
      'O': { f1: [400, 700], f2: [700, 1100] },
      'Ө': { f1: [350, 600], f2: [1200, 1600] }, // Front O
      'I': { f1: [250, 500], f2: [1800, 2500] }, // И/І
      'U': { f1: [300, 600], f2: [700, 1200] },
      'E': { f1: [400, 700], f2: [1600, 2200] }
    };

    this.bootstrapMode = true; // Auto-save references if rules pass
  }

  // --- 1. Core Validation ---
  async validate(inputAudioBuffer, targetPhoneme) {
    if (!targetPhoneme) return { success: false, reason: 'NO_TARGET' };

    const target = targetPhoneme.toUpperCase();

    // A. VAD Segmentation
    const rawData = inputAudioBuffer.getChannelData(0);
    const trimmedData = window.AudioDSP.segmentAudio(rawData, inputAudioBuffer.sampleRate);

    if (!trimmedData || trimmedData.length < inputAudioBuffer.sampleRate * 0.1) {
      return { target, success: false, reason: 'SILENCE_OR_NOISE', score: -1 };
    }

    // B. Feature Extraction
    const frames = this.computeSpectrogram(trimmedData, inputAudioBuffer.sampleRate);
    const mfccs = window.AudioDSP.computeMFCC(frames, {
      sampleRate: inputAudioBuffer.sampleRate,
      fftSize: 512,
      numMelBands: 26,
      numMfcc: 13
    });

    const hasRefs = this.references[target] && this.references[target].length > 0;

    // --- C. BOOTSTRAPPING LOGIC (Cold Start) ---
    if (!hasRefs || this.references[target].length < 3) {
      console.log(`[Validator] Cold Start / Bootstrapping for ${target}...`);

      // 1. Check if it's a vowel we have rules for
      const rules = this.FORMANT_RANGES[target];

      if (rules) {
        // physics-based check
        const lpc = window.AudioDSP.computeLPC(trimmedData, 12); // Order 12 for formants
        const formants = window.AudioDSP.getFormants(lpc, inputAudioBuffer.sampleRate);

        const f1 = formants[0] || 0;
        const f2 = formants[1] || 0;

        console.log(`[Formants] F1: ${f1}, F2: ${f2} (Expected F1: ${rules.f1}, F2: ${rules.f2})`);

        const f1_ok = f1 >= rules.f1[0] && f1 <= rules.f1[1];
        const f2_ok = f2 >= rules.f2[0] && f2 <= rules.f2[1];

        if (f1_ok && f2_ok) {
          // RULE PASSED!
          if (this.bootstrapMode) {
            this.addManualReference(target, mfccs); // Save this success
          }
          return { target, success: true, reason: 'BOOTSTRAP_RULE_PASS', score: 0.0, details: { f1, f2 } };
        } else {
          // Strict rejection during bootstrapping
          return { target, success: false, reason: 'FORMANT_MISMATCH', score: 100.0, details: { f1, f2 } };
        }
      }
      // If no rules (Consonant?), we cannot bootstrap safely without reference.
      // Return False unless references exist.
      if (!hasRefs) {
        return { target, success: false, reason: 'NO_REF_AND_NO_RULES', score: -1 };
      }
    }

    // --- D. Standard MFCC Comparison (Warm State) ---
    const refs = this.references[target];
    let minScore = Infinity;
    for (let ref of refs) {
      const score = window.AudioDSP.computeDTW(mfccs, ref);
      if (score < minScore) minScore = score;
    }

    const threshold = this.thresholds[target] || this.thresholds['default'];
    // Strict margin adjustment if we only have 1 reference
    const effectiveThreshold = refs.length === 1 ? threshold * 0.8 : threshold;

    const passed = minScore < effectiveThreshold;

    // Auto-update references if score is very good (continuous learning)
    if (passed && minScore < threshold * 0.5 && refs.length < 5) {
      this.addManualReference(target, mfccs);
    }

    return {
      target,
      success: passed,
      score: minScore,
      threshold: effectiveThreshold,
      reason: passed ? 'MATCH' : 'WRONG_PHONEME'
    };
  }

  computeSpectrogram(signal, sampleRate) {
    const fftSize = 512;
    const hopSize = 256;
    const frames = [];
    const window = new Float32Array(fftSize);
    for (let i = 0; i < fftSize; i++) window[i] = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (fftSize - 1));

    for (let i = 0; i < signal.length - fftSize; i += hopSize) {
      const slice = new Float32Array(fftSize);
      for (let j = 0; j < fftSize; j++) slice[j] = signal[i + j] * window[j];
      const spectrum = window.AudioDSP.fft(slice);
      frames.push(spectrum);
    }
    return frames;
  }

  // Helper to add MFCCs directly
  addManualReference(target, mfccs) {
    if (!this.references[target]) this.references[target] = [];
    this.references[target].push(mfccs);
    console.log(`[Validator] Saved new reference for ${target}. Total: ${this.references[target].length}`);
  }

  // Called by UI to add raw audio
  addReference(phoneme, audioBuffer) {
    const rawData = audioBuffer.getChannelData(0);
    const trimmed = window.AudioDSP.segmentAudio(rawData, audioBuffer.sampleRate);
    if (!trimmed) return false;
    const frames = this.computeSpectrogram(trimmed, audioBuffer.sampleRate);
    const mfcc = window.AudioDSP.computeMFCC(frames, {
      sampleRate: audioBuffer.sampleRate,
      fftSize: 512
    });
    this.addManualReference(phoneme, mfcc);
    return true;
  }
}

window.PhonemeValidator = new PhonemeValidator();
