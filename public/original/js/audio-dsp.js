/**
 * Local audio signal utilities (not a pronunciation recognizer)
 * Implements: FFT, Mel Filterbank, MFCC, DTW, LPC, Formants
 */

const AudioDSP = {
  sampleRate: 44100,
  fftSize: 512,
  numMelBands: 26,
  numMfcc: 13,

  /**
   * Detect energy plus a repeating waveform, typical of a sustained voiced sound.
   * This is a local heuristic, not speech/letter recognition or a clinical score.
   * Music, another speaker, or a periodic machine can also satisfy it.
   */
  analyzeVoicedFrame: function (samples, sampleRate, minimumRms = 0.012) {
    const empty = { rms: 0, periodicity: 0, voiced: false };
    if (!samples || samples.length < 64 || !Number.isFinite(sampleRate) || sampleRate < 4000) return empty;
    let mean = 0;
    for (let i = 0; i < samples.length; i++) {
      if (!Number.isFinite(samples[i])) return empty;
      mean += samples[i];
    }
    mean /= samples.length;
    let energy = 0;
    for (let i = 0; i < samples.length; i++) energy += (samples[i] - mean) ** 2;
    const rms = Math.sqrt(energy / samples.length);
    if (rms < minimumRms) return { ...empty, rms };

    // Average small groups to limit CPU use and suppress high-frequency noise.
    const stride = Math.max(1, Math.floor(sampleRate / 8000));
    const size = Math.floor(samples.length / stride);
    const signal = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < stride; j++) signal[i] += samples[i * stride + j] - mean;
      signal[i] /= stride;
    }
    const rate = sampleRate / stride;
    const firstLag = Math.max(2, Math.floor(rate / 650));
    const lastLag = Math.min(Math.ceil(rate / 85), Math.floor(size / 2));
    const correlations = new Float32Array(lastLag + 2);
    for (let lag = firstLag - 1; lag <= lastLag + 1; lag++) {
      let cross = 0, first = 0, second = 0;
      for (let i = 0; i < size - lag; i++) {
        const a = signal[i], b = signal[i + lag];
        cross += a * b;
        first += a * a;
        second += b * b;
      }
      correlations[lag] = cross / Math.max(1e-12, Math.sqrt(first * second));
    }
    let periodicity = 0;
    for (let lag = firstLag; lag <= lastLag; lag++) {
      // A local peak avoids treating DC / low-frequency mains hum as voicing.
      if (correlations[lag] >= correlations[lag - 1] && correlations[lag] > correlations[lag + 1]) {
        periodicity = Math.max(periodicity, correlations[lag]);
      }
    }
    return { rms, periodicity, voiced: periodicity >= 0.65 };
  },

  // --- 1. FFT Implementation (Iterative Cooley-Tukey) ---
  fft: function (buffer) {
    const n = buffer.length;
    const width = Math.log2(n);
    if (width % 1 !== 0) throw "FFT size must be power of 2";

    // Bit reversal
    const real = new Float32Array(buffer);
    const imag = new Float32Array(n).fill(0);

    let j = 0;
    for (let i = 0; i < n; i++) {
      if (j > i) {
        [real[i], real[j]] = [real[j], real[i]];
        [imag[i], imag[j]] = [imag[j], imag[i]];
      }
      let m = n >> 1;
      while (m >= 1 && j >= m) {
        j -= m;
        m >>= 1;
      }
      j += m;
    }

    // Butterfly
    for (let s = 1; s <= width; s++) {
      const m = 1 << s;
      const m2 = m >> 1;
      const theta = -2 * Math.PI / m;
      const w_m_r = Math.cos(theta);
      const w_m_i = Math.sin(theta);

      for (let k = 0; k < n; k += m) {
        let w_r = 1, w_i = 0;
        for (let j = 0; j < m2; j++) {
          const t_r = w_r * real[k + j + m2] - w_i * imag[k + j + m2];
          const t_i = w_r * imag[k + j + m2] + w_i * real[k + j + m2];

          real[k + j + m2] = real[k + j] - t_r;
          imag[k + j + m2] = imag[k + j] - t_i;
          real[k + j] += t_r;
          imag[k + j] += t_i;

          const temp_w_r = w_r * w_m_r - w_i * w_m_i;
          w_i = w_r * w_m_i + w_i * w_m_r;
          w_r = temp_w_r;
        }
      }
    }

    // Compute Magnitude
    const output = new Float32Array(n / 2 + 1);
    for (let i = 0; i < output.length; i++) {
      output[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
    }
    return output;
  },

  // --- 2. MFCC Extraction ---
  computeMFCC: function (spectrogram, config) {
    const mfccs = [];
    const numBands = config.numMelBands || 26;
    const numCoeffs = config.numMfcc || 13;

    const filters = this.createMelFilters(config.sampleRate, config.fftSize, numBands);

    for (let i = 0; i < spectrogram.length; i++) {
      const frame = spectrogram[i];

      const melEnergies = new Float32Array(numBands);
      for (let b = 0; b < numBands; b++) {
        let energy = 0;
        for (let k = 0; k < frame.length; k++) {
          energy += frame[k] * filters[b][k];
        }
        melEnergies[b] = Math.log(energy + 1e-6);
      }

      const mfccVector = new Float32Array(numCoeffs);
      for (let k = 0; k < numCoeffs; k++) {
        let sum = 0;
        for (let n = 0; n < numBands; n++) {
          sum += melEnergies[n] * Math.cos((Math.PI * k * (2 * n + 1)) / (2 * numBands));
        }
        mfccVector[k] = sum;
      }
      mfccs.push(mfccVector);
    }
    return mfccs;
  },

  createMelFilters: function (sampleRate, fftSize, numBands) {
    const fMax = sampleRate / 2;
    const melMax = 2595 * Math.log10(1 + fMax / 700);
    const melPoints = new Float32Array(numBands + 2);

    for (let i = 0; i < melPoints.length; i++) {
      melPoints[i] = (melMax * i) / (numBands + 1);
    }

    const hzPoints = melPoints.map(m => 700 * (Math.pow(10, m / 2595) - 1));
    const binPoints = hzPoints.map(h => Math.floor((fftSize + 1) * h / sampleRate));

    const filters = [];
    for (let i = 1; i <= numBands; i++) {
      const filter = new Float32Array(fftSize / 2 + 1);
      const start = binPoints[i - 1];
      const center = binPoints[i];
      const end = binPoints[i + 1];

      for (let j = start; j < center; j++) {
        filter[j] = (j - start) / (center - start);
      }
      for (let j = center; j < end; j++) {
        filter[j] = (end - j) / (end - center);
      }
      filters.push(filter);
    }
    return filters;
  },

  // --- 3. DTW ---
  computeDTW: function (seq1, seq2) {
    const n = seq1.length;
    const m = seq2.length;
    const width = m + 1;
    const dtw = new Float32Array((n + 1) * (m + 1)).fill(Infinity);

    dtw[0] = 0;

    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        const vec1 = seq1[i - 1];
        const vec2 = seq2[j - 1];

        let dist = 0;
        for (let k = 0; k < vec1.length; k++) {
          const diff = vec1[k] - vec2[k];
          dist += diff * diff;
        }
        dist = Math.sqrt(dist);

        const idx = i * width + j;
        const costInsertion = dtw[idx - 1]; // left
        const costDeletion = dtw[idx - width]; // up
        const costMatch = dtw[idx - width - 1]; // diag

        dtw[idx] = dist + Math.min(costInsertion, costDeletion, costMatch);
      }
    }
    return dtw[n * width + m] / (n + m);
  },

  // --- 4. Simple VAD ---
  segmentAudio: function (audioData, sampleRate) {
    const frameSize = Math.floor(0.02 * sampleRate);
    const energyThresh = 0.005;

    let start = -1;
    let end = -1;

    for (let i = 0; i < audioData.length; i += frameSize) {
      let sum = 0;
      const limit = Math.min(i + frameSize, audioData.length);
      for (let j = i; j < limit; j++) {
        sum += audioData[j] * audioData[j];
      }
      const rms = Math.sqrt(sum / (limit - i));

      if (rms > energyThresh) {
        if (start === -1) start = i;
        end = limit;
      }
    }

    if (start === -1) return null;
    const pad = Math.floor(0.1 * sampleRate);
    start = Math.max(0, start - pad);
    end = Math.min(audioData.length, end + pad);

    return audioData.slice(start, end);
  },

  // --- 5. LPC & Formants ---
  computeLPC: function (signal, order) {
    const n = signal.length;
    const r = new Float32Array(order + 1);
    for (let m = 0; m <= order; m++) {
      let sum = 0;
      for (let i = 0; i < n - m; i++) {
        sum += signal[i] * signal[i + m];
      }
      r[m] = sum;
    }

    const a = new Float32Array(order + 1).fill(0);
    a[0] = 1;
    let e = r[0];

    for (let k = 1; k <= order; k++) {
      let sum = 0;
      for (let j = 1; j < k; j++) {
        sum += a[j] * r[k - j];
      }
      const reflection = (r[k] - sum) / e;
      a[k] = reflection;
      for (let j = 1; j < k / 2; j++) {
        const temp = a[j];
        a[j] = temp - reflection * a[k - j];
        a[k - j] = a[k - j] - reflection * temp;
      }
      if (k % 2 === 1) a[Math.floor(k / 2) + 1] -= reflection * a[Math.floor(k / 2) + 1];
      e *= (1 - reflection * reflection);
    }
    return a;
  },

  getFormants: function (lpcCoeffs, sampleRate) {
    const step = 10;
    const maxFreq = 4000;
    const magnitudes = [];
    for (let f = 0; f < maxFreq; f += step) {
      const w = 2 * Math.PI * f / sampleRate;
      let re = 0;
      let im = 0;
      for (let k = 0; k < lpcCoeffs.length; k++) {
        re += lpcCoeffs[k] * Math.cos(-k * w);
        im += lpcCoeffs[k] * Math.sin(-k * w);
      }
      const mag = 1.0 / Math.sqrt(re * re + im * im);
      magnitudes.push(mag);
    }

    const peaks = [];
    for (let i = 2; i < magnitudes.length - 2; i++) {
      if (magnitudes[i] > magnitudes[i - 1] &&
        magnitudes[i] > magnitudes[i - 2] &&
        magnitudes[i] > magnitudes[i + 1] &&
        magnitudes[i] > magnitudes[i + 2]) {
        peaks.push(i * step);
      }
    }
    return peaks;
  }
};

window.AudioDSP = AudioDSP;
