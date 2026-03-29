const WebSocket = require("ws");

const streamUrl = (process.env.TTS_STREAM_URL || "ws://127.0.0.1:3001/tts-stream").trim();
const apiBaseUrl = (process.env.SPEECH_API_BASE_URL || "http://127.0.0.1:3001").trim().replace(/\/$/, "");
const targetWord = process.env.SPEECH_TEST_WORD || "Қала";
const sampleRate = 22050;

function encodePcm16ToWav(pcmBuffer, audioSampleRate, channelCount) {
  const byteRate = audioSampleRate * channelCount * 2;
  const blockAlign = channelCount * 2;
  const wavBuffer = Buffer.alloc(44 + pcmBuffer.length);
  const view = new DataView(wavBuffer.buffer, wavBuffer.byteOffset, wavBuffer.byteLength);

  function writeString(offset, value) {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + pcmBuffer.length, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, audioSampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, pcmBuffer.length, true);
  Buffer.from(wavBuffer).set(Buffer.from(pcmBuffer), 44);

  return wavBuffer;
}

function synthesizeWordToWav(word) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(streamUrl);
    const chunks = [];
    let started = false;
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out while synthesizing test word. streamUrl=${streamUrl}`));
      try {
        ws.close();
      } catch {}
    }, 20000);

    ws.on("open", () => {
      ws.send(JSON.stringify({ type: "start", voice: "zhanar", role: "friendly" }));
      setTimeout(() => ws.send(JSON.stringify({ type: "text", text: word })), 100);
      setTimeout(() => ws.send(JSON.stringify({ type: "end" })), 300);
    });

    ws.on("message", (data, isBinary) => {
      if (isBinary) {
        chunks.push(Buffer.from(data));
        return;
      }

      const message = JSON.parse(data.toString());
      if (message.type === "started") {
        started = true;
      }
      if (message.type === "error") {
        clearTimeout(timeout);
        reject(new Error(message.message));
        ws.close();
      }
      if (message.type === "done") {
        clearTimeout(timeout);
        if (!started || !chunks.length) {
          reject(new Error("No audio was produced by the TTS stream."));
        } else {
          resolve(encodePcm16ToWav(Buffer.concat(chunks), sampleRate, 1));
        }
        ws.close();
      }
    });

    ws.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

async function postAudio(route, wavBuffer) {
  const response = await fetch(`${apiBaseUrl}${route}`, {
    method: "POST",
    headers: {
      "Content-Type": "audio/wav",
    },
    body: wavBuffer,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

async function main() {
  const wavBuffer = await synthesizeWordToWav(targetWord);
  const stt = await postAudio("/stt?lang=kk-KZ", wavBuffer);
  const pronunciation = await postAudio(`/pronunciation-check?word=${encodeURIComponent(targetWord)}`, wavBuffer);

  if (!(stt.text || stt.normalizedText || stt.rawText)) {
    throw new Error("STT did not return text.");
  }
  if (typeof pronunciation.pronunciationScore !== "number") {
    throw new Error("Pronunciation endpoint did not return a score.");
  }

  console.log(JSON.stringify({
    ok: true,
    targetWord,
    recognizedText: stt.text || stt.normalizedText || stt.rawText,
    pronunciationScore: pronunciation.pronunciationScore,
    pronunciation: pronunciation.pronunciation,
    method: pronunciation.method,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
