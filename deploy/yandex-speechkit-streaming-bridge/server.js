const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const fs = require("fs");
const http = require("http");
const https = require("https");
const os = require("os");
const express = require("express");
const cors = require("cors");
const WebSocket = require("ws");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const PORT = Number(process.env.PORT || 3001);
const HTTPS_PORT = Number(process.env.HTTPS_PORT || 3443);
const HOST = (process.env.HOST || "0.0.0.0").trim();
const PUBLIC_HOST = (process.env.PUBLIC_HOST || "").trim();
const YANDEX_API_KEY = (process.env.YANDEX_API_KEY || "").trim();
const YANDEX_FOLDER_ID = (process.env.YANDEX_FOLDER_ID || process.env.FOLDER_ID || "").trim();
const YANDEX_TTS_ENDPOINT = (process.env.YANDEX_TTS_ENDPOINT || "tts.api.ml.yandexcloud.kz:443").trim();
const YANDEX_STT_ENDPOINT = (process.env.YANDEX_STT_ENDPOINT || "stt.api.ml.yandexcloud.kz:443").trim();
const HTTPS_PFX_PATH = (process.env.HTTPS_PFX_PATH || "./certs/localhost.pfx").trim();
const HTTPS_PFX_PASSPHRASE = process.env.HTTPS_PFX_PASSPHRASE || "";
const REFERENCE_AUDIO_DIR = path.join(__dirname, "reference-audio");

if (!YANDEX_API_KEY) {
  throw new Error("YANDEX_API_KEY is missing");
}

fs.mkdirSync(REFERENCE_AUDIO_DIR, { recursive: true });

const CLOUDAPI_ROOT = path.join(__dirname, "cloudapi");
const PROTO_LOADER_OPTIONS = {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
  includeDirs: [
    CLOUDAPI_ROOT,
    path.join(CLOUDAPI_ROOT, "third_party", "googleapis"),
  ],
};

const ttsPackageDefinition = protoLoader.loadSync(
  path.join(CLOUDAPI_ROOT, "yandex", "cloud", "ai", "tts", "v3", "tts_service.proto"),
  PROTO_LOADER_OPTIONS
);
const sttPackageDefinition = protoLoader.loadSync(
  path.join(CLOUDAPI_ROOT, "yandex", "cloud", "ai", "stt", "v3", "stt_service.proto"),
  PROTO_LOADER_OPTIONS
);

const ttsProto = grpc.loadPackageDefinition(ttsPackageDefinition);
const sttProto = grpc.loadPackageDefinition(sttPackageDefinition);

const Synthesizer = ttsProto.speechkit.tts.v3.Synthesizer;
const Recognizer = sttProto.speechkit.stt.v3.Recognizer;

const synthClient = new Synthesizer(
  YANDEX_TTS_ENDPOINT,
  grpc.credentials.createSsl()
);

const recognizerClient = new Recognizer(
  YANDEX_STT_ENDPOINT,
  grpc.credentials.createSsl()
);

const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Private-Network", "true");
  next();
});
app.use(cors({
  origin: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  return next();
});
app.use(express.json({ limit: "1mb" }));

const rawAudioParser = express.raw({
  type: ["audio/wav", "application/octet-stream", "audio/webm"],
  limit: "4mb",
});

function getHttpsConfig() {
  const resolvedPfxPath = path.resolve(__dirname, HTTPS_PFX_PATH);
  if (!fs.existsSync(resolvedPfxPath)) {
    return null;
  }

  return {
    pfx: fs.readFileSync(resolvedPfxPath),
    passphrase: HTTPS_PFX_PASSPHRASE,
    path: resolvedPfxPath,
  };
}

function getNetworkHosts() {
  const hosts = new Set();
  if (PUBLIC_HOST) {
    hosts.add(PUBLIC_HOST);
  }

  hosts.add("localhost");
  hosts.add("127.0.0.1");

  const interfaces = os.networkInterfaces();
  Object.values(interfaces).forEach((addresses) => {
    (addresses || []).forEach((entry) => {
      if (!entry || entry.internal || entry.family !== "IPv4" || !entry.address) {
        return;
      }
      if (entry.address.startsWith("169.254.")) {
        return;
      }
      hosts.add(entry.address);
    });
  });

  return Array.from(hosts);
}

function createMetadata() {
  const md = new grpc.Metadata();
  md.set("authorization", `Api-Key ${YANDEX_API_KEY}`);
  if (YANDEX_FOLDER_ID) {
    md.set("x-folder-id", YANDEX_FOLDER_ID);
  }
  return md;
}

function ensureTrailingSpace(text) {
  return /\s$/.test(text) ? text : `${text} `;
}

function safeWordFileName(word) {
  return String(word || "reference")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/\s+/g, "_");
}

function normalizePlainText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractBestText(update) {
  if (!update || !Array.isArray(update.alternatives)) {
    return "";
  }

  const best = update.alternatives.find((item) => item && item.text) || update.alternatives[0];
  return String(best?.text || "").trim();
}

function writeString(view, offset, value) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function encodePcm16ToWav(pcmBuffer, sampleRate, channelCount) {
  const byteRate = sampleRate * channelCount * 2;
  const blockAlign = channelCount * 2;
  const wavBuffer = Buffer.alloc(44 + pcmBuffer.length);
  const view = new DataView(wavBuffer.buffer, wavBuffer.byteOffset, wavBuffer.byteLength);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + pcmBuffer.length, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, pcmBuffer.length, true);
  Buffer.from(wavBuffer).set(Buffer.from(pcmBuffer), 44);

  return wavBuffer;
}

function parseWavBuffer(wavBuffer) {
  if (!Buffer.isBuffer(wavBuffer) || wavBuffer.length < 44) {
    throw new Error("Audio file is empty or too small.");
  }

  const view = new DataView(wavBuffer.buffer, wavBuffer.byteOffset, wavBuffer.byteLength);
  const riff = wavBuffer.subarray(0, 4).toString("ascii");
  const wave = wavBuffer.subarray(8, 12).toString("ascii");
  if (riff !== "RIFF" || wave !== "WAVE") {
    throw new Error("Only WAV audio is supported.");
  }

  let offset = 12;
  let fmtChunk = null;
  let dataChunkOffset = -1;
  let dataChunkSize = 0;

  while (offset + 8 <= wavBuffer.length) {
    const chunkId = wavBuffer.subarray(offset, offset + 4).toString("ascii");
    const chunkSize = view.getUint32(offset + 4, true);
    const chunkDataOffset = offset + 8;

    if (chunkId === "fmt ") {
      fmtChunk = {
        audioFormat: view.getUint16(chunkDataOffset, true),
        channelCount: view.getUint16(chunkDataOffset + 2, true),
        sampleRate: view.getUint32(chunkDataOffset + 4, true),
        bitsPerSample: view.getUint16(chunkDataOffset + 14, true),
      };
    } else if (chunkId === "data") {
      dataChunkOffset = chunkDataOffset;
      dataChunkSize = chunkSize;
    }

    offset = chunkDataOffset + chunkSize + (chunkSize % 2);
  }

  if (!fmtChunk) {
    throw new Error("WAV fmt chunk was not found.");
  }
  if (dataChunkOffset < 0 || dataChunkSize <= 0) {
    throw new Error("WAV data chunk was not found.");
  }
  if (fmtChunk.audioFormat !== 1 || fmtChunk.bitsPerSample !== 16) {
    throw new Error("Only PCM16 WAV audio is supported.");
  }

  const bytesPerSample = fmtChunk.bitsPerSample / 8;
  const frameCount = Math.floor(dataChunkSize / bytesPerSample / fmtChunk.channelCount);
  const channelSamples = Array.from({ length: fmtChunk.channelCount }, () => new Float32Array(frameCount));

  let readOffset = dataChunkOffset;
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    for (let channelIndex = 0; channelIndex < fmtChunk.channelCount; channelIndex += 1) {
      const sample = view.getInt16(readOffset, true);
      channelSamples[channelIndex][frameIndex] = sample / 32768;
      readOffset += bytesPerSample;
    }
  }

  const monoSamples = new Float32Array(frameCount);
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    let sum = 0;
    for (let channelIndex = 0; channelIndex < channelSamples.length; channelIndex += 1) {
      sum += channelSamples[channelIndex][frameIndex];
    }
    monoSamples[frameIndex] = sum / channelSamples.length;
  }

  return {
    sampleRate: fmtChunk.sampleRate,
    channelCount: fmtChunk.channelCount,
    samples: monoSamples,
  };
}

function resampleLinear(samples, inputRate, outputRate) {
  if (inputRate === outputRate) {
    return samples;
  }

  const outputLength = Math.max(1, Math.round(samples.length * outputRate / inputRate));
  const output = new Float32Array(outputLength);
  const ratio = inputRate / outputRate;

  for (let index = 0; index < outputLength; index += 1) {
    const position = index * ratio;
    const leftIndex = Math.floor(position);
    const rightIndex = Math.min(samples.length - 1, leftIndex + 1);
    const fraction = position - leftIndex;
    const left = samples[leftIndex] || 0;
    const right = samples[rightIndex] || 0;
    output[index] = left + (right - left) * fraction;
  }

  return output;
}

function trimSilence(samples, threshold = 0.003) {
  let start = 0;
  let end = samples.length - 1;

  while (start < samples.length && Math.abs(samples[start]) < threshold) {
    start += 1;
  }

  while (end > start && Math.abs(samples[end]) < threshold) {
    end -= 1;
  }

  if (start >= end) {
    return samples;
  }

  return samples.subarray(start, end + 1);
}

function createHammingWindow(frameSize) {
  const window = new Float32Array(frameSize);
  for (let index = 0; index < frameSize; index += 1) {
    window[index] = 0.54 - 0.46 * Math.cos((2 * Math.PI * index) / (frameSize - 1));
  }
  return window;
}

function hzToMel(hz) {
  return 2595 * Math.log10(1 + hz / 700);
}

function melToHz(mel) {
  return 700 * (10 ** (mel / 2595) - 1);
}

function createMelFilterBank(filterCount, fftSize, sampleRate, minHz, maxHz) {
  const fftBins = Math.floor(fftSize / 2) + 1;
  const melMin = hzToMel(minHz);
  const melMax = hzToMel(maxHz);
  const melPoints = [];

  for (let index = 0; index < filterCount + 2; index += 1) {
    melPoints.push(melMin + ((melMax - melMin) * index) / (filterCount + 1));
  }

  const hzPoints = melPoints.map(melToHz);
  const binPoints = hzPoints.map((hz) => Math.floor(((fftSize + 1) * hz) / sampleRate));
  const bank = Array.from({ length: filterCount }, () => new Float32Array(fftBins));

  for (let filterIndex = 0; filterIndex < filterCount; filterIndex += 1) {
    const left = binPoints[filterIndex];
    const center = binPoints[filterIndex + 1];
    const right = binPoints[filterIndex + 2];

    for (let bin = left; bin < center && bin < fftBins; bin += 1) {
      bank[filterIndex][bin] = (bin - left) / Math.max(1, center - left);
    }
    for (let bin = center; bin < right && bin < fftBins; bin += 1) {
      bank[filterIndex][bin] = (right - bin) / Math.max(1, right - center);
    }
  }

  return bank;
}

function computePowerSpectrum(frame, fftSize) {
  const halfSize = Math.floor(fftSize / 2) + 1;
  const spectrum = new Float32Array(halfSize);

  for (let bin = 0; bin < halfSize; bin += 1) {
    let real = 0;
    let imag = 0;

    for (let sampleIndex = 0; sampleIndex < fftSize; sampleIndex += 1) {
      const value = sampleIndex < frame.length ? frame[sampleIndex] : 0;
      const angle = (2 * Math.PI * bin * sampleIndex) / fftSize;
      real += value * Math.cos(angle);
      imag -= value * Math.sin(angle);
    }

    spectrum[bin] = real * real + imag * imag;
  }

  return spectrum;
}

function computeMelSpectrogram(samples, sampleRate) {
  const targetRate = 16000;
  const resampled = resampleLinear(samples, sampleRate, targetRate);
  const trimmed = trimSilence(resampled);

  if (!trimmed.length) {
    return [];
  }

  const frameSize = 400;
  const hopSize = 160;
  const fftSize = 512;
  const filterCount = 20;
  const window = createHammingWindow(frameSize);
  const filterBank = createMelFilterBank(filterCount, fftSize, targetRate, 50, targetRate / 2);
  const frameCount = Math.max(1, Math.floor((trimmed.length - frameSize) / hopSize) + 1);
  const features = [];

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const start = frameIndex * hopSize;
    const frame = new Float32Array(fftSize);
    for (let sampleIndex = 0; sampleIndex < frameSize; sampleIndex += 1) {
      const sourceIndex = start + sampleIndex;
      const sample = sourceIndex < trimmed.length ? trimmed[sourceIndex] : 0;
      frame[sampleIndex] = sample * window[sampleIndex];
    }

    const powerSpectrum = computePowerSpectrum(frame, fftSize);
    const melFrame = new Float32Array(filterCount);

    for (let filterIndex = 0; filterIndex < filterCount; filterIndex += 1) {
      const filter = filterBank[filterIndex];
      let energy = 0;
      for (let bin = 0; bin < filter.length; bin += 1) {
        energy += powerSpectrum[bin] * filter[bin];
      }
      melFrame[filterIndex] = Math.log10(Math.max(energy, 1e-9));
    }

    features.push(melFrame);
  }

  return features;
}

function compressFeatureFrames(frames, outputFrameCount = 16) {
  if (!frames.length) {
    return new Float32Array(0);
  }

  const binCount = frames[0].length;
  const compressed = new Float32Array(outputFrameCount * binCount);

  for (let outputIndex = 0; outputIndex < outputFrameCount; outputIndex += 1) {
    const start = Math.floor((outputIndex * frames.length) / outputFrameCount);
    const end = Math.max(start + 1, Math.floor(((outputIndex + 1) * frames.length) / outputFrameCount));
    const count = Math.max(1, end - start);

    for (let frameIndex = start; frameIndex < end && frameIndex < frames.length; frameIndex += 1) {
      const frame = frames[frameIndex];
      for (let binIndex = 0; binIndex < binCount; binIndex += 1) {
        compressed[(outputIndex * binCount) + binIndex] += frame[binIndex];
      }
    }

    for (let binIndex = 0; binIndex < binCount; binIndex += 1) {
      compressed[(outputIndex * binCount) + binIndex] /= count;
    }
  }

  return compressed;
}

function cosineSimilarity(vectorA, vectorB) {
  if (!vectorA.length || !vectorB.length || vectorA.length !== vectorB.length) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let index = 0; index < vectorA.length; index += 1) {
    dot += vectorA[index] * vectorB[index];
    normA += vectorA[index] * vectorA[index];
    normB += vectorB[index] * vectorB[index];
  }

  if (!normA || !normB) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function classifyPronunciation(similarity) {
  if (similarity > 0.8) {
    return { label: "хорошее", bucket: "good" };
  }
  if (similarity >= 0.6) {
    return { label: "нормальное", bucket: "normal" };
  }
  return { label: "плохое", bucket: "poor" };
}

function toSerializableError(error, fallbackMessage) {
  const message = String(error?.message || fallbackMessage || "Request failed.");
  const code = Number.isFinite(error?.code) ? Number(error.code) : null;

  if (code === 7 || /PERMISSION_DENIED/i.test(message)) {
    return {
      status: 403,
      error: "Yandex STT access is denied. Add SpeechKit STT permissions to the service account and create a fresh API key.",
      details: message,
      stack: error?.stack,
    };
  }

  return {
    status: 500,
    error: fallbackMessage || message,
    details: message,
    stack: error?.stack,
  };
}

async function synthesizeWordRawPcm(word) {
  return new Promise((resolve, reject) => {
    const call = synthClient.StreamSynthesis(createMetadata());
    const chunks = [];
    let settled = false;

    function finish(error, data) {
      if (settled) {
        return;
      }
      settled = true;
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    }

    call.on("data", (response) => {
      if (response.audioChunk && response.audioChunk.data) {
        chunks.push(Buffer.from(response.audioChunk.data));
      }
    });

    call.on("error", (error) => finish(error));
    call.on("end", () => finish(null, Buffer.concat(chunks)));

    call.write({
      options: {
        voice: "zhanar",
        role: "friendly",
        outputAudioSpec: {
          rawAudio: {
            audioEncoding: "LINEAR16_PCM",
            sampleRateHertz: 22050,
          },
        },
      },
    });
    call.write({
      synthesisInput: {
        text: ensureTrailingSpace(word),
      },
    });
    call.write({ forceSynthesis: {} });
    call.end();
  });
}

async function ensureReferenceAudio(targetWord) {
  const filePath = path.join(REFERENCE_AUDIO_DIR, `${safeWordFileName(targetWord)}.wav`);
  if (fs.existsSync(filePath)) {
    return {
      word: targetWord,
      filePath,
      wavBuffer: fs.readFileSync(filePath),
      created: false,
    };
  }

  const rawPcm = await synthesizeWordRawPcm(targetWord);
  if (!rawPcm.length) {
    throw new Error(`Reference audio could not be synthesized for "${targetWord}".`);
  }

  const wavBuffer = encodePcm16ToWav(rawPcm, 22050, 1);
  fs.writeFileSync(filePath, wavBuffer);

  return {
    word: targetWord,
    filePath,
    wavBuffer,
    created: true,
  };
}

async function recognizeWavBuffer(wavBuffer, languageCode = "kk-KZ") {
  return new Promise((resolve, reject) => {
    const call = recognizerClient.RecognizeStreaming(createMetadata());
    const finalTexts = [];
    const normalizedTexts = [];
    let partialText = "";
    let settled = false;
    const timeout = setTimeout(() => {
      finish(new Error("Yandex STT timed out."));
    }, 20000);

    function finish(error, payload) {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      if (error) {
        reject(error);
      } else {
        resolve(payload);
      }
    }

    call.on("data", (response) => {
      if (response.partial) {
        partialText = extractBestText(response.partial) || partialText;
      }

      if (response.final) {
        const finalText = extractBestText(response.final);
        if (finalText) {
          finalTexts.push(finalText);
        }
      }

      if (response.finalRefinement && response.finalRefinement.normalizedText) {
        const normalizedText = extractBestText(response.finalRefinement.normalizedText);
        if (normalizedText) {
          normalizedTexts.push(normalizedText);
        }
      }
    });

    call.on("error", (error) => finish(error));
    call.on("end", () => {
      const rawText = finalTexts.join(" ").trim() || partialText.trim();
      const normalizedText = normalizedTexts.join(" ").trim() || rawText;

      if (!rawText && !normalizedText) {
        finish(new Error("Yandex STT did not return text."));
        return;
      }

      finish(null, {
        text: normalizedText || rawText,
        rawText,
        normalizedText,
        partialText: partialText.trim(),
      });
    });

    call.write({
      sessionOptions: {
        recognitionModel: {
          model: "general",
          audioFormat: {
            containerAudio: {
              containerAudioType: "WAV",
            },
          },
          textNormalization: {
            textNormalization: "TEXT_NORMALIZATION_ENABLED",
            literatureText: true,
            profanityFilter: false,
          },
          languageRestriction: {
            restrictionType: "WHITELIST",
            languageCode: [languageCode],
          },
          audioProcessingType: "FULL_DATA",
        },
        eouClassifier: {
          externalClassifier: {},
        },
      },
    });

    const chunkSize = 32 * 1024;
    for (let offset = 0; offset < wavBuffer.length; offset += chunkSize) {
      call.write({
        chunk: {
          data: wavBuffer.subarray(offset, Math.min(offset + chunkSize, wavBuffer.length)),
        },
      });
    }

    call.write({ eou: {} });
    call.end();
  });
}

function comparePronunciation(userWavBuffer, referenceWavBuffer) {
  const userAudio = parseWavBuffer(userWavBuffer);
  const referenceAudio = parseWavBuffer(referenceWavBuffer);

  const userFeatures = computeMelSpectrogram(userAudio.samples, userAudio.sampleRate);
  const referenceFeatures = computeMelSpectrogram(referenceAudio.samples, referenceAudio.sampleRate);

  if (!userFeatures.length) {
    throw new Error("User audio is empty after trimming silence.");
  }
  if (!referenceFeatures.length) {
    throw new Error("Reference audio is empty after trimming silence.");
  }

  const userVector = compressFeatureFrames(userFeatures);
  const referenceVector = compressFeatureFrames(referenceFeatures);
  const similarity = Math.max(0, Math.min(1, cosineSimilarity(userVector, referenceVector)));
  const pronunciation = classifyPronunciation(similarity);

  return {
    similarity,
    score: Math.round(similarity * 100),
    pronunciation,
    method: "mel spectrogram",
  };
}

function createTtsStream(ws, startMessage = {}) {
  const call = synthClient.StreamSynthesis(createMetadata());

  call.on("data", (response) => {
    if (response.audioChunk && response.audioChunk.data) {
      ws.send(response.audioChunk.data, { binary: true });
    }

    if (response.textChunk && response.textChunk.text) {
      ws.send(JSON.stringify({
        type: "text-chunk-accepted",
        text: response.textChunk.text,
        startMs: response.startMs || 0,
        lengthMs: response.lengthMs || 0,
      }));
    }
  });

  call.on("error", (error) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "error",
        message: error.message,
        stack: error.stack,
        code: error.code,
      }));
    }
  });

  call.on("end", () => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "done" }));
    }
  });

  call.write({
    options: {
      voice: startMessage.voice || "zhanar",
      role: startMessage.role || "friendly",
      outputAudioSpec: {
        rawAudio: {
          audioEncoding: "LINEAR16_PCM",
          sampleRateHertz: 22050,
        },
      },
    },
  });

  return call;
}

function attachTtsSocket(server) {
  const wss = new WebSocket.Server({ server, path: "/tts-stream" });

  wss.on("connection", (ws) => {
    let call = null;
    let started = false;

    function closeStream() {
      if (call) {
        try {
          call.end();
        } catch {}
      }
      call = null;
      started = false;
    }

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === "start") {
          closeStream();
          call = createTtsStream(ws, msg);
          started = true;
          ws.send(JSON.stringify({ type: "started" }));
          return;
        }

        if (!call || !started) {
          ws.send(JSON.stringify({
            type: "error",
            message: "TTS session is not started. Send {type:'start'} first.",
          }));
          return;
        }

        if (msg.type === "text") {
          const text = String(msg.text || "");
          if (!text.trim()) {
            return;
          }

          call.write({
            synthesisInput: {
              text: ensureTrailingSpace(text),
            },
          });

          if (msg.flush !== false) {
            call.write({ forceSynthesis: {} });
          }
          return;
        }

        if (msg.type === "flush") {
          call.write({ forceSynthesis: {} });
          return;
        }

        if (msg.type === "end") {
          call.end();
        }
      } catch (error) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "error",
            message: error.message,
            stack: error.stack,
          }));
        }
      }
    });

    ws.on("close", closeStream);
    ws.on("error", closeStream);
  });

  return wss;
}

app.get("/", (_req, res) => {
  const httpsConfig = getHttpsConfig();
  const secureStreamUrl = httpsConfig ? `wss://localhost:${HTTPS_PORT}/tts-stream` : "not configured";
  const secureApiUrl = httpsConfig ? `https://localhost:${HTTPS_PORT}` : "not configured";
  const reachableHosts = getNetworkHosts();
  const networkListItems = reachableHosts
    .map((host) => `<li><code>${host}</code></li>`)
    .join("");
  const lanExample = reachableHosts.find((host) => host !== "localhost" && host !== "127.0.0.1") || "192.168.0.10";

  res.type("html").send(`<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Yandex SpeechKit Bridge</title>
    <style>
      body {
        margin: 0;
        font-family: Arial, sans-serif;
        background: #0f172a;
        color: #e2e8f0;
      }
      main {
        max-width: 820px;
        margin: 40px auto;
        padding: 24px;
      }
      .card {
        background: #111827;
        border: 1px solid #334155;
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
      }
      h1 {
        margin-top: 0;
        font-size: 28px;
      }
      code {
        background: #020617;
        border: 1px solid #334155;
        border-radius: 8px;
        padding: 2px 8px;
      }
      ul {
        line-height: 1.7;
      }
      .ok {
        color: #86efac;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <main>
      <div class="card">
        <h1>Yandex SpeechKit Bridge</h1>
        <p class="ok">Bridge server is running.</p>
        <ul>
          <li>Health check: <code>/healthz</code></li>
          <li>TTS WebSocket: <code>/tts-stream</code></li>
          <li>STT endpoint: <code>POST /stt?lang=kk-KZ</code></li>
          <li>Pronunciation endpoint: <code>POST /pronunciation-check?word=Қала</code></li>
          <li>TTS endpoint: <code>${YANDEX_TTS_ENDPOINT}</code></li>
          <li>STT endpoint: <code>${YANDEX_STT_ENDPOINT}</code></li>
          <li>Folder ID header: <code>${YANDEX_FOLDER_ID || "not configured"}</code></li>
          <li>Listen host: <code>${HOST}</code></li>
          <li>HTTP port: <code>${PORT}</code></li>
          <li>HTTPS port: <code>${HTTPS_PORT}</code></li>
        </ul>
        <p>Reachable hosts on this machine:</p>
        <ul>${networkListItems}</ul>
        <p>For local HTTP pages use:</p>
        <p><code>ws://127.0.0.1:${PORT}/tts-stream</code></p>
        <p><code>http://127.0.0.1:${PORT}</code></p>
        <p>For HTTPS pages use:</p>
        <p><code>${secureStreamUrl}</code></p>
        <p><code>${secureApiUrl}</code></p>
        <p>For other devices on the same network, open inclusiveapp with:</p>
        <p><code>?bridgeHost=${lanExample}</code></p>
      </div>
    </main>
  </body>
</html>`);
});

app.get("/favicon.ico", (_req, res) => {
  res.status(204).end();
});

app.get("/healthz", (_req, res) => {
  const httpsConfig = getHttpsConfig();
  const reachableHosts = getNetworkHosts();
  res.json({
    ok: true,
    service: "yandex-speechkit-streaming-bridge",
    ttsEndpoint: YANDEX_TTS_ENDPOINT,
    sttEndpoint: YANDEX_STT_ENDPOINT,
    folderIdConfigured: Boolean(YANDEX_FOLDER_ID),
    host: HOST,
    publicHost: PUBLIC_HOST || null,
    reachableHosts,
    networkWsUrls: reachableHosts.map((host) => `ws://${host}:${PORT}/tts-stream`),
    networkWssUrls: httpsConfig ? reachableHosts.map((host) => `wss://${host}:${HTTPS_PORT}/tts-stream`) : [],
    networkApiUrls: reachableHosts.map((host) => `http://${host}:${PORT}`),
    networkSecureApiUrls: httpsConfig ? reachableHosts.map((host) => `https://${host}:${HTTPS_PORT}`) : [],
    wsUrl: `ws://127.0.0.1:${PORT}/tts-stream`,
    wssUrl: httpsConfig ? `wss://localhost:${HTTPS_PORT}/tts-stream` : null,
    apiBaseUrl: `http://127.0.0.1:${PORT}`,
    secureApiBaseUrl: httpsConfig ? `https://localhost:${HTTPS_PORT}` : null,
  });
});

app.post("/stt", rawAudioParser, async (req, res) => {
  try {
    const wavBuffer = Buffer.from(req.body || Buffer.alloc(0));
    if (!wavBuffer.length) {
      res.status(400).json({ error: "Audio is empty. Please repeat." });
      return;
    }

    const audio = parseWavBuffer(wavBuffer);
    if (!audio.samples.length) {
      res.status(400).json({ error: "Audio is empty. Please repeat." });
      return;
    }

    const languageCode = String(req.query.lang || "kk-KZ").trim() || "kk-KZ";
    const recognition = await recognizeWavBuffer(wavBuffer, languageCode);

    res.json({
      text: recognition.text,
      rawText: recognition.rawText,
      normalizedText: recognition.normalizedText,
      partialText: recognition.partialText,
    });
  } catch (error) {
    console.error("STT failed:", error);
    const payload = toSerializableError(error, "STT failed.");
    res.status(payload.status).json(payload);
  }
});

app.post("/pronunciation-check", rawAudioParser, async (req, res) => {
  try {
    const targetWord = String(req.query.word || "").trim();
    if (!targetWord) {
      res.status(400).json({ error: "Target word is missing." });
      return;
    }

    const wavBuffer = Buffer.from(req.body || Buffer.alloc(0));
    if (!wavBuffer.length) {
      res.status(400).json({ error: "Audio is empty. Please repeat." });
      return;
    }

    const audio = parseWavBuffer(wavBuffer);
    if (!audio.samples.length) {
      res.status(400).json({ error: "Audio is empty. Please repeat." });
      return;
    }

    const referenceAudio = await ensureReferenceAudio(targetWord);
    const comparison = comparePronunciation(wavBuffer, referenceAudio.wavBuffer);

    res.json({
      word: targetWord,
      pronunciationScore: comparison.score,
      similarity: Number(comparison.similarity.toFixed(4)),
      pronunciation: comparison.pronunciation.label,
      pronunciationBucket: comparison.pronunciation.bucket,
      method: comparison.method,
      referenceAudioPath: referenceAudio.filePath,
      referenceAudioCreated: referenceAudio.created,
    });
  } catch (error) {
    console.error("Pronunciation check failed:", error);
    const payload = toSerializableError(error, "Pronunciation check failed.");
    res.status(payload.status).json(payload);
  }
});

const httpServer = http.createServer(app);
attachTtsSocket(httpServer);

const httpsConfig = getHttpsConfig();
let httpsServer = null;

if (httpsConfig) {
  httpsServer = https.createServer({
    pfx: httpsConfig.pfx,
    passphrase: httpsConfig.passphrase,
  }, app);
  attachTtsSocket(httpsServer);
}

httpServer.listen(PORT, HOST, () => {
  console.log(`Server started on http://${HOST}:${PORT}`);
  console.log(`SpeechKit TTS endpoint: ${YANDEX_TTS_ENDPOINT}`);
  console.log(`SpeechKit STT endpoint: ${YANDEX_STT_ENDPOINT}`);
  console.log(`Reachable hosts: ${getNetworkHosts().join(", ")}`);
});

if (httpsServer) {
  httpsServer.listen(HTTPS_PORT, HOST, () => {
    console.log(`Secure bridge started on https://${HOST}:${HTTPS_PORT}`);
    console.log(`Use wss://localhost:${HTTPS_PORT}/tts-stream for HTTPS pages`);
  });
} else {
  console.log("HTTPS/WSS is not configured yet. Run: npm run cert:local");
}
