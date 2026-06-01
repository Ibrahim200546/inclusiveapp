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
  versionLabel: string;
  date: string;
  isLatest: boolean;
  url: string;
  assets: AppDownloadAsset[];
  changelog: string[];
}

interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface GitHubRelease {
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  published_at: string | null;
  draft: boolean;
  prerelease: boolean;
  assets: GitHubReleaseAsset[];
}

const repoApiBase = "https://api.github.com/repos/Ibrahim200546/inclusiveapp/releases";
const releaseBase = "https://github.com/Ibrahim200546/inclusiveapp/releases";

export const latestReleaseUrl = `${releaseBase}/tag/apps-latest`;
export const allReleasesUrl = releaseBase;

export const appReleases: AppReleaseInfo[] = [
  {
    version: "0.1.0",
    versionLabel: "v0.1.0",
    date: "2026-05-28",
    isLatest: true,
    url: latestReleaseUrl,
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
    versionLabel: "v0.0.0",
    date: "2026-05-28",
    isLatest: false,
    url: releaseBase,
    assets: [],
    changelog: [
      "Начальная точка архива версий приложения.",
      "APK/EXE файлы публикуются через GitHub Releases.",
    ],
  },
];

export const latestAppRelease = appReleases.find((release) => release.isLatest) ?? appReleases[0];
export const fallbackArchiveReleases = appReleases.filter((release) => !release.isLatest);

export async function loadAppDownloads(signal?: AbortSignal): Promise<{
  latest: AppReleaseInfo;
  archive: AppReleaseInfo[];
}> {
  const [latestResponse, releasesResponse] = await Promise.all([
    fetch(`${repoApiBase}/tags/apps-latest`, { signal }),
    fetch(repoApiBase, { signal }),
  ]);

  if (!latestResponse.ok || !releasesResponse.ok) {
    throw new Error("GitHub releases are not available");
  }

  const latestGithubRelease = (await latestResponse.json()) as GitHubRelease;
  const githubReleases = (await releasesResponse.json()) as GitHubRelease[];

  return {
    latest: toLatestRelease(latestGithubRelease),
    archive: toArchiveReleases(githubReleases),
  };
}

function toLatestRelease(release: GitHubRelease): AppReleaseInfo {
  return {
    ...latestAppRelease,
    version: normalizeVersion(release.tag_name, latestAppRelease.version),
    versionLabel: releaseTitle(release, latestAppRelease.versionLabel),
    date: formatReleaseDate(release.published_at, latestAppRelease.date),
    url: release.html_url || latestReleaseUrl,
    assets: latestAppRelease.assets.map((fallbackAsset) => {
      const githubAsset = findAssetForPlatform(release.assets, fallbackAsset.platform);

      return {
        ...fallbackAsset,
        fileName: githubAsset?.name ?? fallbackAsset.fileName,
        url: githubAsset?.browser_download_url ?? fallbackAsset.url,
        size: githubAsset ? formatBytes(githubAsset.size) : fallbackAsset.size,
      };
    }),
    changelog: parseReleaseNotes(release.body, latestAppRelease.changelog),
  };
}

function toArchiveReleases(releases: GitHubRelease[]): AppReleaseInfo[] {
  const archive = releases
    .filter((release) => !release.draft && !release.prerelease && release.tag_name !== "apps-latest")
    .map((release) => ({
      version: normalizeVersion(release.tag_name, release.tag_name),
      versionLabel: releaseTitle(release, release.tag_name),
      date: formatReleaseDate(release.published_at, "GitHub"),
      isLatest: false,
      url: release.html_url || releaseBase,
      assets: [],
      changelog: parseReleaseNotes(release.body, []),
    }));

  return archive.length > 0 ? archive : fallbackArchiveReleases;
}

function findAssetForPlatform(assets: GitHubReleaseAsset[], platform: AppDownloadPlatform) {
  return assets.find((asset) => {
    if (platform === "APK") return /\.apk$/i.test(asset.name);
    return /\.exe$/i.test(asset.name);
  });
}

function releaseTitle(release: GitHubRelease, fallback: string) {
  const title = release.name?.trim();
  if (title) return title;

  const bodyVersion = release.body?.match(/v?\d+\.\d+\.\d+/i)?.[0];
  if (bodyVersion) return bodyVersion.startsWith("v") ? bodyVersion : `v${bodyVersion}`;

  return release.tag_name || fallback;
}

function normalizeVersion(value: string, fallback: string) {
  const match = value.match(/\d+\.\d+\.\d+/);
  return match?.[0] ?? fallback.replace(/^v/i, "");
}

function formatReleaseDate(value: string | null, fallback: string) {
  return value ? value.slice(0, 10) : fallback;
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  const megabytes = bytes / 1024 / 1024;
  return `${Math.round(megabytes)} MB`;
}

function parseReleaseNotes(body: string | null, fallback: string[]) {
  const notes = body
    ?.split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter((line) => line && !line.startsWith("#"))
    .slice(0, 8);

  return notes && notes.length > 0 ? notes : fallback;
}
