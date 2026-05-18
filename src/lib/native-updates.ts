import { Capacitor } from "@capacitor/core";
import { CapacitorUpdater } from "@capgo/capacitor-updater";

type NativeUpdateStatus = {
  phase: string;
  updatedAt: string;
  detail?: unknown;
};

declare global {
  interface Window {
    eduCoreXNativeUpdateStatus?: NativeUpdateStatus;
  }
}

const LOG_PREFIX = "[Edu CoreX OTA]";
let initialized = false;
let checkInFlight = false;

function setStatus(phase: string, detail?: unknown) {
  const status = {
    phase,
    detail,
    updatedAt: new Date().toISOString(),
  };

  window.eduCoreXNativeUpdateStatus = status;
  console.info(LOG_PREFIX, phase, detail ?? "");
}

function setError(phase: string, error: unknown) {
  const detail = error instanceof Error ? error.message : error;
  setStatus(phase, detail);
  console.warn(LOG_PREFIX, phase, detail);
}

async function triggerUpdateCheck() {
  if (checkInFlight || typeof navigator !== "undefined" && navigator.onLine === false) {
    return;
  }

  checkInFlight = true;

  try {
    const availability = await CapacitorUpdater.isAutoUpdateAvailable();
    if (!availability.available) {
      setStatus("native-auto-update-unavailable");
      return;
    }

    const result = await CapacitorUpdater.triggerUpdateCheck();
    setStatus("native-update-check-queued", result);
  } catch (error) {
    setError("native-update-check-failed", error);
  } finally {
    checkInFlight = false;
  }
}

function registerUpdaterListeners() {
  void CapacitorUpdater.addListener("updateCheckResult", (event) => {
    setStatus("native-update-check-result", event);
  });

  void CapacitorUpdater.addListener("updateAvailable", (event) => {
    setStatus("native-update-available", event.bundle);
  });

  void CapacitorUpdater.addListener("download", (event) => {
    setStatus("native-update-download-progress", {
      bundle: event.bundle,
      percent: event.percent,
    });
  });

  void CapacitorUpdater.addListener("downloadComplete", (event) => {
    setStatus("native-update-downloaded-for-next-restart", event.bundle);
  });

  void CapacitorUpdater.addListener("downloadFailed", (event) => {
    setStatus("native-update-download-failed", event);
  });

  void CapacitorUpdater.addListener("updateFailed", (event) => {
    setStatus("native-update-rollback-or-install-failed", event.bundle);
  });

  void CapacitorUpdater.addListener("set", (event) => {
    setStatus("native-update-applied", event.bundle);
  });

  void CapacitorUpdater.addListener("setNext", (event) => {
    setStatus("native-update-queued-for-next-restart", event.bundle);
  });

  void CapacitorUpdater.addListener("appReady", (event) => {
    setStatus("native-update-app-ready", event);
  });
}

export async function initializeNativeUpdates() {
  if (initialized) {
    return;
  }

  initialized = true;

  if (!Capacitor.isNativePlatform()) {
    setStatus("web-runtime-no-native-updater");
    return;
  }

  registerUpdaterListeners();

  try {
    const ready = await CapacitorUpdater.notifyAppReady();
    setStatus("native-update-ready-notified", ready.bundle);
  } catch (error) {
    setError("native-update-ready-notify-failed", error);
  }

  try {
    await CapacitorUpdater.setMultiDelay({
      delayConditions: [{ kind: "kill" }],
    });
    setStatus("native-update-delay-set", "Updates apply after app restart.");
  } catch (error) {
    setError("native-update-delay-failed", error);
  }

  if (typeof window !== "undefined") {
    window.addEventListener("online", () => {
      void triggerUpdateCheck();
    });
  }

  window.setTimeout(() => {
    void triggerUpdateCheck();
  }, 2000);
}
