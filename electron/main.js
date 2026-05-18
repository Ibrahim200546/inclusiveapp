import { app, BrowserWindow, dialog, net, protocol, shell } from "electron";
import updater from "electron-updater";
import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const { autoUpdater } = updater;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const appScheme = "edu-corex";
const UPDATE_LOG_PREFIX = "[Edu CoreX Desktop Update]";

protocol.registerSchemesAsPrivileged([
  {
    scheme: appScheme,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

function resolveDistFile(requestUrl) {
  const url = new URL(requestUrl);
  const rawPath = decodeURIComponent(url.pathname || "/");
  const requestedPath = rawPath === "/" ? "/index.html" : rawPath;
  const normalizedPath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.resolve(distDir, `.${path.sep}${normalizedPath}`);

  if (!filePath.startsWith(distDir)) {
    return path.join(distDir, "index.html");
  }

  if (existsSync(filePath)) {
    return filePath;
  }

  if (!path.extname(filePath)) {
    return path.join(distDir, "index.html");
  }

  return filePath;
}

function registerAppProtocol() {
  protocol.handle(appScheme, (request) => {
    const filePath = resolveDistFile(request.url);
    return net.fetch(pathToFileURL(filePath).toString());
  });
}

function formatLogValue(value) {
  if (value instanceof Error) {
    return value.stack || value.message;
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function writeUpdateLog(level, ...values) {
  const line = [
    new Date().toISOString(),
    level.toUpperCase(),
    UPDATE_LOG_PREFIX,
    values.map(formatLogValue).join(" "),
  ].join(" ");

  console[level === "error" ? "error" : level === "warn" ? "warn" : "info"](line);

  if (!app.isReady()) {
    return;
  }

  try {
    const logDir = path.join(app.getPath("userData"), "logs");
    mkdirSync(logDir, { recursive: true });
    appendFileSync(path.join(logDir, "updates.log"), `${line}\n`, "utf8");
  } catch {
    // Console logging is still available if the file log cannot be written.
  }
}

function setupAutoUpdates(mainWindow) {
  if (!app.isPackaged) {
    writeUpdateLog("info", "Skipping auto-update checks outside packaged builds.");
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = {
    info: (...args) => writeUpdateLog("info", ...args),
    warn: (...args) => writeUpdateLog("warn", ...args),
    error: (...args) => writeUpdateLog("error", ...args),
    debug: (...args) => writeUpdateLog("info", ...args),
  };

  autoUpdater.on("checking-for-update", () => {
    writeUpdateLog("info", "Checking for update.");
  });

  autoUpdater.on("update-available", (info) => {
    writeUpdateLog("info", "Update available; download will start automatically.", info);
  });

  autoUpdater.on("update-not-available", (info) => {
    writeUpdateLog("info", "No desktop update available.", info);
  });

  autoUpdater.on("download-progress", (progress) => {
    writeUpdateLog("info", "Download progress.", {
      percent: Math.round(progress.percent || 0),
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    writeUpdateLog("info", "Desktop update downloaded.", info);

    void dialog
      .showMessageBox(mainWindow, {
        type: "info",
        buttons: ["Restart now", "Later"],
        defaultId: 0,
        cancelId: 1,
        title: "Edu CoreX update ready",
        message: "A new Edu CoreX desktop update has been downloaded.",
        detail: "Restart the app to install it now, or choose Later to install when you quit.",
      })
      .then(({ response }) => {
        if (response === 0) {
          writeUpdateLog("info", "User accepted restart for update.");
          autoUpdater.quitAndInstall(false, true);
        } else {
          writeUpdateLog("info", "User postponed desktop update restart.");
        }
      })
      .catch((error) => {
        writeUpdateLog("error", "Unable to show update restart dialog.", error);
      });
  });

  autoUpdater.on("error", (error) => {
    writeUpdateLog("error", "Desktop auto-update failed.", error);
  });

  setTimeout(() => {
    void autoUpdater.checkForUpdatesAndNotify().catch((error) => {
      writeUpdateLog("error", "Desktop update check failed.", error);
    });
  }, 5000);
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 720,
    title: "Edu CoreX",
    backgroundColor: "#ffffff",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(`${appScheme}://`)) {
      return { action: "allow" };
    }

    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(`${appScheme}://`)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  void mainWindow.loadURL(`${appScheme}://app/index.html`);

  setupAutoUpdates(mainWindow);
}

app.whenReady().then(() => {
  registerAppProtocol();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
