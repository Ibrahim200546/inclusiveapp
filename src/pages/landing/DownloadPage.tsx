import { useOutletContext } from "react-router-dom";
import { Download, History, MonitorDown, Smartphone, ShieldCheck } from "lucide-react";
import type { Locale } from "@/lib/translations";
import { appReleases, latestAppRelease } from "@/data/appDownloads";

const platformIcon = {
  APK: Smartphone,
  EXE: MonitorDown,
};

export default function DownloadPage() {
  const { locale } = useOutletContext<{ locale: Locale }>();
  const isKk = locale === "kk";

  const text = {
    title: isKk ? "Қолданбаны жүктеу" : "Скачать приложение",
    subtitle: isKk
      ? "Edu CoreX қолданбасының ең жаңа APK және EXE нұсқалары."
      : "Самые свежие APK и EXE версии Edu CoreX.",
    latest: isKk ? "Соңғы нұсқа" : "Свежая версия",
    archive: isKk ? "Басқа нұсқалар" : "Остальные версии",
    changelog: "Changelog",
    verified: isKk ? "GitHub Releases арқылы жүктеледі" : "Скачивание через GitHub Releases",
    openArchive: isKk ? "Архивті ашу" : "Открыть архив",
  };

  return (
    <div className="container mx-auto px-4 py-12 md:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 max-w-3xl">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-red-700">
            <ShieldCheck className="size-4" aria-hidden="true" />
            {text.verified}
          </p>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{text.title}</h1>
          <p className="mt-4 text-lg text-muted-foreground">{text.subtitle}</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,1fr)]">
          <section className="rounded-2xl border bg-card p-5 shadow-sm md:p-6" aria-labelledby="latest-download-title">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-red-600">{text.latest}</p>
                <h2 id="latest-download-title" className="text-2xl font-black">
                  v{latestAppRelease.version}
                </h2>
              </div>
              <Download className="size-9 text-red-600" aria-hidden="true" />
            </div>

            <div className="grid gap-4">
              {latestAppRelease.assets.map((asset) => {
                const Icon = platformIcon[asset.platform];
                return (
                  <a
                    key={asset.platform}
                    href={asset.url}
                    className="group flex min-h-20 items-center justify-between gap-4 rounded-xl border-2 border-red-500 bg-white px-5 py-4 text-red-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-red-50 hover:shadow-lg"
                  >
                    <span className="flex min-w-0 items-center gap-4">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white">
                        <Icon className="size-6" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-lg font-black">{asset.label} v{latestAppRelease.version}</span>
                        <span className="block text-sm font-semibold text-red-500">{asset.fileName} · {asset.size}</span>
                      </span>
                    </span>
                    <Download className="size-5 shrink-0 transition group-hover:translate-y-0.5" aria-hidden="true" />
                  </a>
                );
              })}
            </div>

            <div className="mt-7">
              <p className="mb-3 flex items-center gap-2 text-sm font-bold text-muted-foreground">
                <History className="size-4" aria-hidden="true" />
                {text.archive}
              </p>
              <div className="flex flex-wrap gap-2">
                {appReleases.map((release) => (
                  <a
                    key={release.version}
                    href={`https://github.com/Ibrahim200546/inclusiveapp/releases${release.isLatest ? "/tag/apps-latest" : ""}`}
                    className={`rounded-lg px-4 py-2 text-sm font-black transition ${
                      release.isLatest
                        ? "bg-red-100 text-red-700 hover:bg-red-200"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    v{release.version}
                  </a>
                ))}
              </div>
            </div>
          </section>

          <aside className="rounded-2xl border bg-card p-5 shadow-sm md:p-6" aria-labelledby="download-changelog-title">
            <p className="mb-2 text-sm font-bold uppercase tracking-wide text-red-600">{text.changelog}</p>
            <h2 id="download-changelog-title" className="text-2xl font-black">v{latestAppRelease.version}</h2>
            <div className="mt-5 grid gap-3">
              {latestAppRelease.changelog.map((item) => (
                <div key={item} className="rounded-xl border bg-background px-4 py-3 text-sm font-semibold leading-relaxed text-foreground">
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl bg-muted p-4">
              <p className="text-sm font-bold text-muted-foreground">{text.openArchive}</p>
              <div className="mt-3 grid gap-2">
                {appReleases.map((release) => (
                  <div key={release.version} className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-black">v{release.version}</span>
                    <span className="text-muted-foreground">{release.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

