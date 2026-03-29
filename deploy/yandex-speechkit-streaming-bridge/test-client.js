const WebSocket = require("ws");

const streamUrl = (process.env.TTS_STREAM_URL || "ws://127.0.0.1:3001/tts-stream").trim();
const ws = new WebSocket(streamUrl);
let binaryChunks = 0;
let totalBytes = 0;
let acceptedTextChunks = 0;
let sawStarted = false;

function fail(message) {
  console.error(message);
  process.exit(1);
}

const timeout = setTimeout(() => {
  fail(`Timed out. url=${streamUrl} started=${sawStarted} binaryChunks=${binaryChunks} totalBytes=${totalBytes}`);
}, 30000);

ws.on("open", () => {
  ws.send(JSON.stringify({ type: "start", voice: "zhanar", role: "friendly" }));
  setTimeout(() => ws.send(JSON.stringify({ type: "text", text: "Сәлем. " })), 150);
  setTimeout(() => ws.send(JSON.stringify({ type: "text", text: "Бұл автоматты тест. " })), 450);
  setTimeout(() => ws.send(JSON.stringify({ type: "text", text: "Дыбыс бөлшекпен келуі керек." })), 750);
  setTimeout(() => ws.send(JSON.stringify({ type: "end" })), 1300);
});

ws.on("message", (data, isBinary) => {
  if (isBinary) {
    binaryChunks += 1;
    totalBytes += data.length;
    return;
  }

  const msg = JSON.parse(data.toString());

  if (msg.type === "started") {
    sawStarted = true;
  }

  if (msg.type === "text-chunk-accepted") {
    acceptedTextChunks += 1;
  }

  if (msg.type === "error") {
    fail(`Upstream error: ${msg.message}\n${msg.stack || ""}`);
  }

  if (msg.type === "done") {
    clearTimeout(timeout);
    if (!sawStarted) {
      fail("Stream never reached started state.");
    }
    if (binaryChunks < 1 || totalBytes < 1) {
      fail(`No audio received. binaryChunks=${binaryChunks} totalBytes=${totalBytes} accepted=${acceptedTextChunks}`);
    }
    console.log(JSON.stringify({ ok: true, binaryChunks, totalBytes, acceptedTextChunks }, null, 2));
    process.exit(0);
  }
});

ws.on("error", (err) => fail(err.stack || err.message));
