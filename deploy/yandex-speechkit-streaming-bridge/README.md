# Yandex SpeechKit Streaming Bridge

Local WebSocket bridge for chatbot voice streaming with Kazakhstan SpeechKit.

## Setup

1. Open [`.env.example`](/C:/Users/user/Desktop/Folders/inclusiveapp/deploy/yandex-speechkit-streaming-bridge/.env.example).
2. Create `.env` рядом с `server.js`.
3. Fill `YANDEX_API_KEY` with your secret API key.

## Run

```bash
cd deploy/yandex-speechkit-streaming-bridge
npm install
npm run cert:local
npm start
```

Health check:

```bash
curl http://127.0.0.1:3001/healthz
```

Secure health check:

```bash
curl https://localhost:3443/healthz
```

Stream test:

```bash
npm run test:stream
```

Or test a custom port in PowerShell:

```bash
$env:TTS_STREAM_URL='ws://127.0.0.1:3011/tts-stream'
npm run test:stream
```

## Frontend connection

The main app reads the bridge URL from `window.__AI_TTS_WS_URL` or `localStorage.aiChatTtsWsUrl`.

Recommended local URL:

```text
ws://127.0.0.1:3001/tts-stream
```

For HTTPS pages, use:

```text
wss://localhost:3443/tts-stream
```

If the main app was previously pinned to an old bridge URL, reset it in the browser console:

```js
window.setChatbotTtsBridgeUrl('')
```
