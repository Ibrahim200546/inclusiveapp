export type AppDownloadPlatform = "APK" | "EXE";

export interface AppDownloadAsset {
  platform: AppDownloadPlatform;
  label: string;
  fileName: string;
  url: string;
  size: string;
}

export interface AppReleaseInfo {
  version: string;
  date: string;
  isLatest: boolean;
  assets: AppDownloadAsset[];
  changelog: string[];
}

const releaseBase = "https://github.com/Ibrahim200546/inclusiveapp/releases";

export const appReleases: AppReleaseInfo[] = [
  {
    version: "0.1.0",
    date: "2026-05-28",
    isLatest: true,
    assets: [
      {
        platform: "APK",
        label: "Android APK",
        fileName: "Edu-CoreX-Android.apk",
        url: `${releaseBase}/download/apps-latest/Edu-CoreX-Android.apk`,
        size: "74 MB",
      },
      {
        platform: "EXE",
        label: "Windows EXE",
        fileName: "Edu-CoreX-Setup.exe",
        url: `${releaseBase}/download/apps-latest/Edu-CoreX-Setup.exe`,
        size: "169 MB",
      },
    ],
    changelog: [
      "Свободный вход без обязательной авторизации.",
      "Новый режим большой буквы в Әліппе.",
      "Исправлены карточки бытовых, транспортных и технических звуков.",
      "Обновлены иконки приложения и native-сборки.",
    ],
  },
  {
    version: "0.0.0",
    date: "2026-05-28",
    isLatest: false,
    assets: [],
    changelog: [
      "Начальная точка архива версий приложения.",
      "APK/EXE файлы публикуются через GitHub Releases.",
    ],
  },
];

export const latestAppRelease = appReleases.find((release) => release.isLatest) ?? appReleases[0];

