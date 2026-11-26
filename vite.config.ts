import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createReadStream, readFileSync, statSync } from "node:fs";

function liveExercisePreview() {
  function isPractice(pathname: string) {
    return ["/practice", "/practice/", "/practice/index.html"].includes(pathname);
  }
  return {
    name: "live-exercise-preview",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "practice/index.html",
        source: readFileSync(path.resolve("public/original/index2.html"), "utf8") });
    },
    configurePreviewServer(server: import("vite").PreviewServer) {
      server.middlewares.use((req, _res, next) => {
        const url = new URL(req.url || "/", "http://localhost");
        if (isPractice(url.pathname)) req.url = "/practice/index.html" + url.search;
        next();
      });
    },
    configureServer(server: import("vite").ViteDevServer) {
      const folder = path.join(server.config.publicDir, "original");
      const entry = path.join(folder, "index2.html");
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url || "/", "http://localhost");
        if (url.pathname !== "/original/index2.html" && !isPractice(url.pathname)) return next();
        if (!["GET", "HEAD"].includes(req.method || "")) return next();
        const client = '<script type="module">import { createHotContext } from "/@vite/client"; createHotContext("/original/index2.html").on("exercise-change", () => location.reload());</script>';
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        if (req.method === "HEAD") { res.end(); return; }
        res.end(readFileSync(entry, "utf8").replace("</head>", client + "</head>"));
      });
      server.watcher.on("change", (file) => {
        if (path.resolve(file).startsWith(folder + path.sep)) {
          server.ws.send({ type: "custom", event: "exercise-change" });
        }
      });
    },
  };
}

function localVoiceBinaryPlugin() {
  return {
    name: "local-voice-binaries",
    configureServer(server: import("vite").ViteDevServer) {
      const publicRoot = path.resolve(server.config.root, server.config.publicDir);
      server.middlewares.use((req, res, next) => {
        if (req.method !== "GET" && req.method !== "HEAD") return next();
        let pathname: string;
        try { pathname = decodeURIComponent(new URL(req.url || "/", "http://localhost").pathname); }
        catch { res.statusCode = 400; res.end(); return; }
        if (!/^\/original\/(?:models\/|vendor\/phoneme\/)/.test(pathname)
          || !/\.(?:wasm|onnx)$/i.test(pathname)) return next();
        const file = path.resolve(publicRoot, `.${pathname}`);
        const relative = path.relative(publicRoot, file);
        if (relative.startsWith("..") || path.isAbsolute(relative)) { res.statusCode = 403; res.end(); return; }
        try {
          const info = statSync(file);
          if (!info.isFile()) throw new Error("Not a file");
          res.setHeader("Content-Type", pathname.endsWith(".wasm") ? "application/wasm" : "application/octet-stream");
          res.setHeader("Content-Length", info.size);
          res.setHeader("Cache-Control", "no-cache");
          if (req.method === "HEAD") { res.end(); return; }
          const stream = createReadStream(file);
          stream.on("error", () => res.destroy());
          res.on("close", () => stream.destroy());
          stream.pipe(res);
        } catch { res.statusCode = 404; res.end(); }
      });
    },
  };
}

function noApplicationApi() {
  const deny = (req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse, next: () => void) => {
    if (!/^\/api(?:[/?]|$)/.test(req.url || "")) return next();
    res.statusCode = 404;
    res.end();
  };
  return {
    name: "no-application-api",
    configureServer(server: import("vite").ViteDevServer) { server.middlewares.use(deny); },
    configurePreviewServer(server: import("vite").PreviewServer) { server.middlewares.use(deny); },
  };
}

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
      watch: {
        ignored: ["**/android/**", "**/ios/**", "**/release*/**", "**/docs/experiments/**", "**/test-results*/**", "**/playwright-report/**", "**/docs/trello-verification/**"],
      },
    },
    plugins: [noApplicationApi(), liveExercisePreview(), react(), localVoiceBinaryPlugin()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) {
              return undefined;
            }

            return "vendor";
          },
        },
      },
    },
  };
});
