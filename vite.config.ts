import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const DEV_TTS_DEFAULT_TIMEOUT_MS = 4500;
const DEV_TTS_DEFAULT_URL = "https://tts.api.ml.yandexcloud.kz/tts/v3/utteranceSynthesis";
const DEV_TTS_DEFAULT_FORMAT = "mp3";
const DEV_TTS_DEFAULT_SPEED = 0.9;
const DEV_TTS_DEFAULT_VOICE_KK = "amira";
const DEV_TTS_DEFAULT_VOICE_RU = "alena";

function parsePositiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeSecret(value: string | undefined) {
  const trimmed = String(value || "").trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function normalizeCredentialSecret(value: string | undefined) {
  const normalized = normalizeSecret(value);
  return normalized.replace(/^(api-key|bearer)\s+/i, "").trim();
}

function normalizeYandexLanguageCode(lang: string | undefined) {
  const value = String(lang || "").trim().toLowerCase();
  if (value.startsWith("ru")) return "ru-RU";
  return "kk-KZ";
}

function pickYandexVoice(env: Record<string, string>, lang: string, explicitVoice?: string) {
  const explicit = String(explicitVoice || "").trim();
  if (explicit) {
    return explicit;
  }

  return normalizeYandexLanguageCode(lang) === "ru-RU"
    ? (normalizeSecret(env.YANDEX_TTS_VOICE_RU) || DEV_TTS_DEFAULT_VOICE_RU)
    : (normalizeSecret(env.YANDEX_TTS_VOICE_KK) || DEV_TTS_DEFAULT_VOICE_KK);
}

function readRequestBody(req: NodeJS.ReadableStream) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function readResponseError(response: Response) {
  try {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const payload = await response.json() as Record<string, unknown>;
      return [payload?.error, payload?.message, payload?.details].filter(Boolean).join(" ");
    }
    return await response.text();
  } catch {
    return "";
  }
}

function sendJson(res: import("http").ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function localTtsApiPlugin(env: Record<string, string>) {
  return {
    name: "local-tts-api",
    configureServer(server: import("vite").ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith("/api/tts")) {
          next();
          return;
        }

        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");

        if (req.method === "OPTIONS") {
          res.statusCode = 200;
          res.end();
          return;
        }

        if (req.method !== "POST") {
          sendJson(res, 405, { error: "Method not allowed" });
          return;
        }

        try {
          const rawBody = await readRequestBody(req);
          const body = rawBody ? JSON.parse(rawBody) : {};
          const text = String(body?.text || "").trim();
          const lang = String(body?.lang || "kk-KZ").trim() || "kk-KZ";
          const preferredProvider = String(body?.provider || body?.preferredProvider || "").trim().toLowerCase();
          const voice = String(body?.voice || "").trim();

          if (preferredProvider && preferredProvider !== "yandex") {
            sendJson(res, 501, { error: `Local dev /api/tts currently supports only Yandex provider, got: ${preferredProvider}` });
            return;
          }

          if (!text) {
            sendJson(res, 400, { error: "Invalid request: text is required." });
            return;
          }

          const apiKey = normalizeCredentialSecret(env.YANDEX_API_KEY);
          const iamToken = normalizeCredentialSecret(env.YANDEX_IAM_TOKEN);
          const folderId = normalizeSecret(env.YANDEX_FOLDER_ID);
          const authHeader = apiKey ? `Api-Key ${apiKey}` : (iamToken ? `Bearer ${iamToken}` : "");

          if (!authHeader) {
            sendJson(res, 500, {
              error: "Yandex TTS is not configured for local dev.",
              details: "Set YANDEX_API_KEY or YANDEX_IAM_TOKEN in .env.",
            });
            return;
          }

          const normalizedLang = normalizeYandexLanguageCode(lang);
          const requestBody = {
            text,
            hints: [
              {
                voice: pickYandexVoice(env, normalizedLang, voice),
              },
              {
                speed: parsePositiveNumber(normalizeSecret(env.YANDEX_TTS_SPEED), DEV_TTS_DEFAULT_SPEED),
              },
            ],
            unsafeMode: true,
            outputAudioSpec: {
              containerAudio: {
                containerAudioType: "MP3",
              },
            },
          };

          const timeoutMs = Math.round(parsePositiveNumber(env.TTS_PROVIDER_TIMEOUT_MS, DEV_TTS_DEFAULT_TIMEOUT_MS));
          const headers: Record<string, string> = {
            Authorization: authHeader,
            "Content-Type": "application/json",
            Accept: "application/json",
          };

          if (!apiKey && folderId) {
            headers["x-folder-id"] = folderId;
          }

          const response = await fetch(DEV_TTS_DEFAULT_URL, {
            method: "POST",
            headers,
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(timeoutMs),
          });

          if (!response.ok) {
            const details = await readResponseError(response);
            sendJson(res, response.status, {
              error: "Yandex TTS request failed.",
              details: details || `Status ${response.status}`,
            });
            return;
          }

          const payload = await response.json() as Record<string, any>;
          const base64Audio = payload?.result?.audioChunk?.data || payload?.audioChunk?.data || "";
          if (!base64Audio) {
            sendJson(res, 502, {
              error: "Yandex TTS request succeeded but returned no audio data.",
            });
            return;
          }

          const audioBuffer = Buffer.from(base64Audio, "base64");
          res.statusCode = 200;
          res.setHeader("Content-Type", "audio/mpeg");
          res.setHeader("Cache-Control", "no-store, max-age=0");
          res.setHeader("X-TTS-Provider", "yandex");
          res.end(audioBuffer);
        } catch (error) {
          sendJson(res, 500, {
            error: "Local Yandex TTS route failed.",
            details: error instanceof Error ? error.message : "Unknown error",
          });
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), localTtsApiPlugin(env), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
