require("dotenv").config();

const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const express = require("express");
const cors = require("cors");
const WebSocket = require("ws");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const PORT = Number(process.env.PORT || 3001);
const HTTPS_PORT = Number(process.env.HTTPS_PORT || 3443);
const YANDEX_API_KEY = (process.env.YANDEX_API_KEY || "").trim();
const YANDEX_TTS_ENDPOINT = (process.env.YANDEX_TTS_ENDPOINT || "tts.api.ml.yandexcloud.kz:443").trim();
const HTTPS_PFX_PATH = (process.env.HTTPS_PFX_PATH || "./certs/localhost.pfx").trim();
const HTTPS_PFX_PASSPHRASE = process.env.HTTPS_PFX_PASSPHRASE || "";

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

app.get("/", (_req, res) => {
  const httpsConfig = getHttpsConfig();
  const secureStreamUrl = httpsConfig ? `wss://localhost:${HTTPS_PORT}/tts-stream` : "not configured";
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
          <li>HTTP port: <code>${PORT}</code></li>
          <li>HTTPS port: <code>${HTTPS_PORT}</code></li>
        </ul>
        <p>For local HTTP pages use:</p>
        <p><code>ws://127.0.0.1:${PORT}/tts-stream</code></p>
        <p>For HTTPS pages use:</p>
        <p><code>${secureStreamUrl}</code></p>
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
  res.json({
    ok: true,
    service: "yandex-speechkit-streaming-bridge",
    endpoint: YANDEX_TTS_ENDPOINT,
    wsUrl: `ws://127.0.0.1:${PORT}/tts-stream`,
    wssUrl: httpsConfig ? `wss://localhost:${HTTPS_PORT}/tts-stream` : null,
  });
});

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

  return wss;
}

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

httpServer.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
  console.log(`SpeechKit endpoint: ${YANDEX_TTS_ENDPOINT}`);
});

if (httpsServer) {
  httpsServer.listen(HTTPS_PORT, () => {
    console.log(`Secure bridge started on https://localhost:${HTTPS_PORT}`);
    console.log(`Use wss://localhost:${HTTPS_PORT}/tts-stream for HTTPS pages`);
  });
} else {
  console.log("HTTPS/WSS is not configured yet. Run: npm run cert:local");
}
