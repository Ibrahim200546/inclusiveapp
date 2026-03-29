# Yandex SpeechKit Streaming Bridge

Local WebSocket bridge for chatbot voice streaming, STT, and pronunciation checks with Kazakhstan SpeechKit.

## Setup

1. Open [`.env.example`](/C:/Users/user/Desktop/Folders/inclusiveapp/deploy/yandex-speechkit-streaming-bridge/.env.example).
2. Create `.env` рядом с `server.js`.
3. Fill `YANDEX_API_KEY` with your secret API key.
4. Fill `YANDEX_FOLDER_ID` with your Yandex Cloud folder ID.
5. If other devices must reach the bridge, set:
   - `HOST=0.0.0.0`
   - `PUBLIC_HOST=<your PC LAN IP>`

## Run

```bash
cd deploy/yandex-speechkit-streaming-bridge
npm install
npm run cert:local
npm start
```

If you changed the LAN IP or want the certificate to include network names, regenerate the cert before `npm start`.

Health check:

```bash
curl http://127.0.0.1:3001/healthz
```

Secure health check:

```bash
curl https://localhost:3443/healthz
```

Speech check smoke test:

```bash
npm run test:speech-check
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

The main app reads the bridge URL from:

- `?bridgeHost=<LAN-IP-or-hostname>`
- `window.__AI_BRIDGE_HOST`
- `localStorage.aiBridgeHost`
- `window.__AI_TTS_WS_URL` and `window.__AI_SPEECH_API_URL`

Recommended local URL:

```text
ws://127.0.0.1:3001/tts-stream
```

For HTTPS pages, use:

```text
wss://localhost:3443/tts-stream
```

For another device on the same network, open:

```text
https://inclusiveapp.vercel.app/original/index2.html?bridgeHost=192.168.0.10
```

Replace `192.168.0.10` with the host shown in `http://<your-pc-ip>:3001/healthz`.

If the main app was previously pinned to an old bridge URL, reset it in the browser console:

```js
window.setChatbotTtsBridgeUrl('')
```

To pin one shared bridge host for both chatbot TTS and speech practice:

```js
window.setAIBridgeHost('192.168.0.10')
```
