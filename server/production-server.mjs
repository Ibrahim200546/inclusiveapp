import { createReadStream, existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import aiChatHandler from "../api/ai-chat.js";
import aiEvaluateHandler from "../api/ai-evaluate.js";
import ttsHandler from "../api/tts.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const rootDir = resolve(__dirname, "..");
const distDir = resolve(rootDir, "dist");
const port = Number(process.env.PORT || 8080);

const apiHandlers = new Map([
  ["/api/ai-chat", aiChatHandler],
  ["/api/ai-evaluate", aiEvaluateHandler],
  ["/api/tts", ttsHandler],
]);

const defaultSupabaseUrl = "https://mmugalgqdapidqqxekqt.supabase.co";
const defaultSupabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tdWdhbGdxZGFwaWRxcXhla3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDQzMTMsImV4cCI6MjA4NjQ4MDMxM30.b96o0Z-24rs2pczsPSDG8jP1UwbCuCCxxQEiZ_6wil8";
const defaultSupabaseStorageKey = "sb-mmugalgqdapidqqxekqt-auth-token";

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".mp3", "audio/mpeg"],
  [".mp4", "video/mp4"],
  [".ogg", "audio/ogg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".wav", "audio/wav"],
  [".webm", "video/webm"],
  [".webp", "image/webp"],
]);

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function sendRuntimeConfig(res) {
  const config = {
    url: process.env.SUPABASE_PUBLIC_URL || process.env.VITE_SUPABASE_URL || defaultSupabaseUrl,
    anonKey: process.env.ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || defaultSupabaseAnonKey,
    storageKey:
      process.env.SUPABASE_AUTH_STORAGE_KEY ||
      process.env.VITE_SUPABASE_AUTH_STORAGE_KEY ||
      defaultSupabaseStorageKey,
  };
  const body = [
    `window.INCLUSIVE_SUPABASE_URL = ${JSON.stringify(config.url)};`,
    `window.INCLUSIVE_SUPABASE_ANON_KEY = ${JSON.stringify(config.anonKey)};`,
    `window.INCLUSIVE_SUPABASE_AUTH_STORAGE_KEY = ${JSON.stringify(config.storageKey)};`,
    "",
  ].join("\n");

  res.writeHead(200, {
    "Content-Type": "text/javascript; charset=utf-8",
    "Cache-Control": "no-store, max-age=0",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks);
  const contentType = String(req.headers["content-type"] || "");
  if (!raw.length) {
    return undefined;
  }

  if (contentType.includes("application/json")) {
    return JSON.parse(raw.toString("utf8"));
  }

  return raw;
}

function createApiResponse(res) {
  return {
    setHeader(name, value) {
      res.setHeader(name, value);
      return this;
    },
    status(code) {
      res.statusCode = code;
      return this;
    },
    json(payload) {
      const body = JSON.stringify(payload);
      if (!res.headersSent) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
      }
      res.end(body);
      return this;
    },
    send(payload) {
      if (Buffer.isBuffer(payload)) {
        res.end(payload);
      } else if (payload instanceof Uint8Array) {
        res.end(Buffer.from(payload));
      } else {
        res.end(String(payload ?? ""));
      }
      return this;
    },
    end(payload) {
      res.end(payload);
      return this;
    },
  };
}

async function handleApi(req, res, pathname) {
  const handler = apiHandlers.get(pathname);
  if (!handler) {
    sendJson(res, 404, { error: "API route not found" });
    return;
  }

  try {
    req.body = await readRequestBody(req);
    await handler(req, createApiResponse(res));
  } catch (error) {
    console.error(`${pathname} failed:`, error);
    if (!res.headersSent) {
      sendJson(res, 500, {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    } else {
      res.end();
    }
  }
}

function getStaticPath(pathname) {
  const decodedPath = decodeURIComponent(pathname);
  const normalizedPath = normalize(decodedPath).replace(/^(\.\.[/\\])+/, "");
  const safePath = normalizedPath === "/" ? "/index.html" : normalizedPath;
  const filePath = resolve(join(distDir, safePath));

  if (!filePath.startsWith(distDir)) {
    return null;
  }

  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    return resolve(filePath, "index.html");
  }

  if (existsSync(filePath)) {
    return filePath;
  }

  if (!extname(filePath)) {
    return resolve(distDir, "index.html");
  }

  return null;
}

async function serveStatic(req, res, pathname) {
  if (pathname === "/healthz") {
    sendJson(res, 200, { ok: true });
    return;
  }

  const filePath = getStaticPath(pathname);
  if (!filePath || !existsSync(filePath)) {
    sendJson(res, 404, { error: "Not found" });
    return;
  }

  const ext = extname(filePath).toLowerCase();
  const stat = statSync(filePath);
  const isHashedAsset = pathname.startsWith("/assets/");
  res.writeHead(200, {
    "Content-Type": mimeTypes.get(ext) || "application/octet-stream",
    "Content-Length": stat.size,
    "Cache-Control": isHashedAsset
      ? "public, max-age=31536000, immutable"
      : "no-cache",
  });
  createReadStream(filePath).pipe(res);
}

createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";

  if (apiHandlers.has(pathname)) {
    await handleApi(req, res, pathname);
    return;
  }

  if (pathname === "/original/runtime-config.js") {
    sendRuntimeConfig(res);
    return;
  }

  try {
    await serveStatic(req, res, pathname);
  } catch (error) {
    console.error("Static handler failed:", error);
    sendJson(res, 500, { error: "Static handler failed" });
  }
}).listen(port, "0.0.0.0", async () => {
  const indexExists = await readFile(resolve(distDir, "index.html"), "utf8")
    .then(() => true)
    .catch(() => false);
  console.log(`inclusiveapp server listening on :${port}; dist=${indexExists ? "ready" : "missing"}`);
});
