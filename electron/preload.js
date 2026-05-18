import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("eduCoreXDesktop", {
  isDesktop: true,
  platform: process.platform,
});
