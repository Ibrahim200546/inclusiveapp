require("dotenv").config();

const path = require("path");
const http = require("http");
const express = require("express");
const cors = require("cors");
const WebSocket = require("ws");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const PORT = Number(process.env.PORT || 3001);
const YANDEX_API_KEY = (process.env.YANDEX_API_KEY || "").trim();
const YANDEX_TTS_ENDPOINT = (process.env.YANDEX_TTS_ENDPOINT || "tts.api.ml.yandexcloud.kz:443").trim();

if (!YANDEX_API_KEY) {
  throw new Error("YANDEX_API_KEY is missing");
}

const CLOUDAPI_ROOT = path.join(__dirname, "cloudapi");
const PROTO_PATH = path.join(
  CLOUDAPI_ROOT,
  "yandex",
  "cloud",
  "ai",
  "tts",
  "v3",
  "tts_service.proto"
);

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
  includeDirs: [
    CLOUDAPI_ROOT,
    path.join(CLOUDAPI_ROOT, "third_party", "googleapis"),
  ],
});

const proto = grpc.loadPackageDefinition(packageDefinition);
const Synthesizer = proto.speechkit.tts.v3.Synthesizer;

const synthClient = new Synthesizer(
  YANDEX_TTS_ENDPOINT,
  grpc.credentials.createSsl()
);

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Yandex TTS Bridge</title>
    <style>
      body {
        margin: 0;
        font-family: Arial, sans-serif;
        background: #0f172a;
        color: #e2e8f0;
      }
      main {
        max-width: 760px;
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
        <h1>Yandex SpeechKit Streaming Bridge</h1>
        <p class="ok">Bridge server is running.</p>
        <ul>
          <li>Health check: <code>/healthz</code></li>
          <li>WebSocket stream: <code>/tts-stream</code></li>
          <li>SpeechKit endpoint: <code>${YANDEX_TTS_ENDPOINT}</code></li>
          <li>Port: <code>${PORT}</code></li>
        </ul>
        <p>For the main app use this WebSocket URL:</p>
        <p><code>ws://127.0.0.1:${PORT}/tts-stream</code></p>
      </div>
    </main>
  </body>
</html>`);
});

app.get("/favicon.ico", (_req, res) => {
  res.status(204).end();
});

app.get("/healthz", (_req, res) => {
  res.json({
    ok: true,
    service: "yandex-speechkit-streaming-bridge",
    endpoint: YANDEX_TTS_ENDPOINT,
  });
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: "/tts-stream" });

function createMetadata() {
  const md = new grpc.Metadata();
  md.set("authorization", `Api-Key ${YANDEX_API_KEY}`);
  return md;
}

function ensureTrailingSpace(text) {
  return /\s$/.test(text) ? text : `${text} `;
}

function createStream(ws, startMessage = {}) {
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

  call.on("error", (err) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "error",
        message: err.message,
        stack: err.stack,
        code: err.code,
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
        call = createStream(ws, msg);
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
    } catch (err) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "error",
          message: err.message,
          stack: err.stack,
        }));
      }
    }
  });

  ws.on("close", closeStream);
  ws.on("error", closeStream);
});

server.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
  console.log(`SpeechKit endpoint: ${YANDEX_TTS_ENDPOINT}`);
});
