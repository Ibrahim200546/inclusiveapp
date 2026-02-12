# Phoneme Validation System Specification (Version 1)

## 1. System Overview
This system implements a deterministic, acoustic validation model for isolated phonemes. It is designed to verify if a user's spoken input matches a specific **Target Phoneme** (e.g., "A", "O", "S") by comparing it against a set of validated reference samples using MFCC features and Dynamic Time Warping (DTW), reinforced by Formant Analysis for vowels.

**Core Principle**: One-Class Classification. The system models *only* the target phoneme and discriminates everything else (silence, noise, wrong phonemes) as outliers.

---

## 2. Pipeline Architecture

### Step 1: Input & VAD (Voice Activity Detection)
- **Input**: Raw AudioBuffer (Time Domain).
- **Process**:
  1. Calculate Short-Term Energy (STE) and Zero-Crossing Rate (ZCR).
  2. Apply adaptive thresholding to detect speech onset/offset.
  3. **Trim**: Remove leading/trailing silence to isolate the phoneme core.
  4. **Duration Check**: Reject if < 100ms (click/noise) or > 2000ms (phrase).

### Step 2: Feature Extraction
- **Frame Size**: 25ms, **Hop Size**: 10ms.
- **Features**:
  1. **MFCC (Mel-Frequency Cepstral Coefficients)**: 13 coefficients (0-12). Represents the spectral envelope (timbre).
  2. **Formants (F1, F2)** [Vowels Only]: Extracted via LPC (Linear Predictive Coding) roots. Represents vowel quality (tongue height/position).

### Step 3: Reference-Based Validation (DTW)
- **Reference Set**: 3-5 pre-recorded "Gold Standard" samples per phoneme.
- **Algorithm**: Dynamic Time Warping (DTW).
- **Metric**: Euclidean distance between input MFCC vectors and reference MFCC vectors.
- **Score**: `min(DTW_Distance(Input, Ref))` over all refs.

### Step 4: Formant Gating (Vowels)
- **Logic**: Even if MFCC distance is low, check F1/F2.
- **Constraints**: Target "A" has specific F1/F2 box (e.g., F1: 700-1000Hz, F2: 1200-1500Hz).
- **Decision**: Reject if outside boundaries.

### Step 5: Decision Logic
- **Thresholds**:
  - `Strict`: For high-stakes testing.
  - `Lenient`: For practice mode.
- **Result**: `True` (Pass) / `False` (Reject).
- **Reason**: `SILENCE`, `NOISE`, `WRONG_PHONEME` (High DTW), `FORMANT_MISMATCH`.

---

## 3. Pseudocode

### A. Main Validation Loop
```python
function validate_phoneme(input_audio, target_phoneme, strictness="normal"):
    # 1. VAD & Preprocessing
    files inputs = vad_segment(input_audio)
    if inputs.is_empty(): return REJECT("SILENCE")
    
    trimmed_signal = inputs.best_segment()
    
    # 2. Extract Features
    mfcc_seq = extract_mfcc(trimmed_signal)
    formants = extract_formants_lpc(trimmed_signal) if is_vowel(target_phoneme) else None
    
    # 3. Load References
    references = load_references(target_phoneme)
    if references.is_empty(): return REJECT("NO_REFERENCES")
    
    # 4. DTW Comparison
    min_dist = INFINITY
    for ref in references:
        dist = dtw_distance(mfcc_seq, ref.mfcc_seq)
        if dist < min_dist: min_dist = dist
        
    # 5. Threshold Logic
    threshold = get_threshold(target_phoneme, strictness) # e.g., 50.0
    
    if min_dist > threshold:
        return REJECT("WRONG_PHONEME", score=min_dist)
        
    # 6. Formant Check (Vowels Only)
    if is_vowel(target_phoneme):
        f1, f2 = formants.average_over_time()
        ranges = get_formant_ranges(target_phoneme)
        if not (ranges.f1_min < f1 < ranges.f1_max and ranges.f2_min < f2 < ranges.f2_max):
            return REJECT("FORMANT_MISMATCH", details={f1, f2})
            
    return ACCEPT("MATCH", score=min_dist)
```

### B. MFCC + DTW Detail
```python
function dtw_distance(seqA, seqB):
    n, m = length(seqA), length(seqB)
    dtw_matrix = new matrix(n+1, m+1, value=INFINITY)
    dtw_matrix[0][0] = 0
    
    for i in 1..n:
        for j in 1..m:
            cost = euclidean_dist(seqA[i], seqB[j])
            dtw_matrix[i][j] = cost + min(
                dtw_matrix[i-1][j],   # deletion
                dtw_matrix[i][j-1],   # insertion
                dtw_matrix[i-1][j-1]  # match
            )
            
    return dtw_matrix[n][m] / (n + m) # normalized distance
```

### C. Version 2 Consideration (Autoencoder)
*Future Implementation*:
- Train a small neural network (Autoencoder) *only* on the target phoneme.
- **Input**: MFCC frame or Spectrogram slice.
- **Loss**: Reconstruction MSE.
- **Logic**: If `MSE(input, autoencoder(input)) > threshold`, it is an anomaly (not the target).
- **Pro**: Better at modeling complex distributions than DTW.
- **Con**: Requires training data and TF.js.

---

## 4. Implementation Strategy (JS)
1. **`audio-processor.js`**: Contains pure math (FFT, DCT, MFCC, DTW). No external big libs to keep it lightweight.
2. **`phoneme-validator.js`**: High-level class managing state, references, and validation calls.
3. **`recorder-ui.js`**: Logic to capture user audio and feed it to the validator.

## 5. Decision Matrix

| Metric | Target "A" (Input) | "O" (Input) | Noise (Input) | Result "A" |
|:---|:---:|:---:|:---:|:---:|
| **DTW Score** (Lower is better) | 15.0 | 65.0 | 90.0 | **< 40.0** |
| **F1 (Hz)** | 800 | 500 | Random | **700-1000** |
| **F2 (Hz)** | 1300 | 900 | Random | **1200-1500** |
