# Railway TTS Service for `facebook/mms-tts-kaz`

This folder is a ready-to-deploy TTS microservice for Railway.

It exposes:

- `GET /healthz`
- `POST /tts`

Request example:

```json
{
  "text": "Сәлем. Мен сізге көмектесуге дайынмын.",
  "lang": "kk-KZ"
}
```

## Deploy on Railway

1. Create a new Railway service from this repo.
2. Set the service Root Directory to:

```text
deploy/railway-mms-tts-kaz
```

3. Railway will detect the `Dockerfile` and build the service.
4. After deploy, copy the public URL, for example:

```text
https://your-railway-service.up.railway.app/tts
```

## Recommended Railway Variables

Optional environment variables:

- `TTS_MODEL_NAME=facebook/mms-tts-kaz`
- `TTS_SEED=555`
- `TTS_MAX_TEXT_LENGTH=700`
- `TORCH_NUM_THREADS=1`

## Test the Service

```bash
curl -X POST "https://your-railway-service.up.railway.app/tts" \
  -H "Content-Type: application/json" \
  --data "{\"text\":\"Сәлем\",\"lang\":\"kk-KZ\"}" \
  --output reply.wav
```

## Connect It to Vercel

In your Vercel project add:

```text
TTS_UPSTREAM_URL=https://your-railway-service.up.railway.app/tts
```

After that redeploy Vercel.

When `TTS_UPSTREAM_URL` is set, Vercel does not need `HF_TOKEN` for TTS anymore.
