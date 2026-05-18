import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "kz.educorex.app",
  appName: "Edu CoreX",
  webDir: "dist",
  server: {
    androidScheme: "https",
    iosScheme: "capacitor",
  },
  plugins: {
    CapacitorUpdater: {
      appId: "kz.educorex.app",
      autoUpdate: true,
      directUpdate: false,
      appReadyTimeout: 10000,
      responseTimeout: 20,
      autoDeleteFailed: true,
      autoDeletePrevious: true,
      resetWhenUpdate: true,
      keepUrlPathAfterReload: true,
      defaultChannel: "production",
      osLogging: true,
    },
  },
};

export default config;
