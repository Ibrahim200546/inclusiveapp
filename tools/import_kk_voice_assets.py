#!/usr/bin/env python
"""Import recorded Kazakh voice assets into the app audio folders."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except AttributeError:
    pass


@dataclass(frozen=True)
class VoiceAsset:
    source_name: str
    word: str
    letter: str | None = None
    is_primary_letter: bool = False


VOICE_ASSETS = [
    VoiceAsset("а Алма.mp3", "Алма", "а", True),
    VoiceAsset("а Ана.mp3", "Ана"),
    VoiceAsset("а Ата.mp3", "Ата"),
    VoiceAsset("ә Әтеш.mp3", "Әтеш", "ә", True),
    VoiceAsset("ә Әже.mp3", "Әже"),
    VoiceAsset("ә Ән.mp3", "Ән"),
    VoiceAsset("б Бақа.mp3", "Бақа", "б", True),
    VoiceAsset("б Бал.mp3", "Бал"),
    VoiceAsset("б Балық.mp3", "Балық"),
    VoiceAsset("в Вагон.mp3", "Вагон", "в", True),
    VoiceAsset("В велосипед.mp4", "Велосипед"),
    VoiceAsset("В вертолет.mp4", "Вертолёт"),
    VoiceAsset("Г гүл.mp4", "Гүл", "г", True),
    VoiceAsset("Г гитара.mp4", "Гитара"),
    VoiceAsset("Г галстуг.mp4", "Галстук"),
    VoiceAsset("Ғ ғарыш.mp4", "Ғарыш", "ғ", True),
    VoiceAsset("Ғ ғалым.mp4", "Ғалым"),
    VoiceAsset("Ғ ғаламтор.mp4", "Ғаламтор"),
    VoiceAsset("Д доп.mp4", "Доп", "д", True),
    VoiceAsset("Д достық.mp4", "Достық"),
    VoiceAsset("Д дала.mp4", "Дала"),
    VoiceAsset("Е есік.mp4", "Есік", "е", True),
    VoiceAsset("Е етік.mp4", "Етік"),
    VoiceAsset("Е ешкі.mp4", "Ешкі"),
    VoiceAsset("Ё шахтёр.mp4", "Шахтёр", "ё", True),
    VoiceAsset("Ё ёлка.mp4", "Ёлка"),
    VoiceAsset("Ё ёжик.mp4", "Ёжик"),
    VoiceAsset("Ж жүзім.mp4", "Жүзім", "ж", True),
    VoiceAsset("Ж жол.mp4", "Жол"),
    VoiceAsset("Ж жалау.mp4", "Жалау"),
    VoiceAsset("З зебра.mp4", "Зебра", "з", True),
    VoiceAsset("З зымыран.mp4", "Зымыран"),
    VoiceAsset("З заң.mp4", "Заң"),
    VoiceAsset("И ит.mp4", "Ит", "и", True),
    VoiceAsset("И ине.mp4", "Ине"),
    VoiceAsset("И игілік.mp4", "Игілік"),
    VoiceAsset("Й ай.mp4", "Ай", "й", True),
    VoiceAsset("Й тай.mp4", "Тай"),
    VoiceAsset("Й май.mp4", "Май"),
    VoiceAsset("К күн.mp4", "Күн", "к", True),
    VoiceAsset("К кітап.mp4", "Кітап"),
    VoiceAsset("К кеңе.mp4", "Кеме"),
    VoiceAsset("Қ қоян.mp4", "Қоян", "қ", True),
    VoiceAsset("Қ қалам.mp4", "Қалам"),
    VoiceAsset("Қ қасық.mp4", "Қасық"),
    VoiceAsset("Л лақ.mp4", "Лақ", "л", True),
    VoiceAsset("Л лимон.mp4", "Лимон"),
    VoiceAsset("Л лента.mp4", "Лента"),
    VoiceAsset("М мысық.mp4", "Мысық", "м", True),
    VoiceAsset("М машина.mp4", "Машина"),
    VoiceAsset("М мектеп.mp4", "Мектеп"),
    VoiceAsset("Н нан.mp4", "Нан", "н", True),
    VoiceAsset("Н найза.mp4", "Найза"),
    VoiceAsset("Н наурыз.mp4", "Наурыз"),
    VoiceAsset("Ң қоңыз.mp4", "Қоңыз", "ң", True),
    VoiceAsset("Ң таң.mp4", "Таң"),
    VoiceAsset("Ң шаң.mp4", "Шаң"),
    VoiceAsset("О орыңдық.mp4", "Орындық", "о", True),
    VoiceAsset("О ойыншық.mp4", "Ойыншық"),
    VoiceAsset("О оқушы.mp4", "Оқушы"),
    VoiceAsset("Ө өрік.mp4", "Өрік", "ө", True),
    VoiceAsset("Ө өзен.mp4", "Өзен"),
    VoiceAsset("Ө өрмекші.mp4", "Өрмекші"),
    VoiceAsset("П піл.mp4", "Піл", "п", True),
    VoiceAsset("П парта.mp4", "Парта"),
    VoiceAsset("П поезд.mp4", "Поезд"),
    VoiceAsset("Р робот.mp4", "Робот", "р", True),
    VoiceAsset("Р раушан.mp4", "Раушан"),
    VoiceAsset("Р радио.mp4", "Радио"),
    VoiceAsset("С сәбіз.mp4", "Сәбіз", "с", True),
    VoiceAsset("С сабын.mp4", "Сабын"),
    VoiceAsset("С сағат.mp4", "Сағат"),
    VoiceAsset("Т тышқан.mp4", "Тышқан", "т", True),
    VoiceAsset("Т терезе.mp4", "Терезе"),
    VoiceAsset("Т тау.mp4", "Тау"),
    VoiceAsset("У аққу.mp4", "Аққу", "у", True),
    VoiceAsset("У уық.mp4", "Уық"),
    VoiceAsset("У уақыт.mp4", "Уақыт"),
    VoiceAsset("Ұ ұшақ.mp4", "Ұшақ", "ұ", True),
    VoiceAsset("Ұ ұлт.mp4", "Ұлт"),
    VoiceAsset("Ұ ұстаз.mp4", "Ұстаз"),
    VoiceAsset("Ү үкі.mp4", "Үкі", "ү", True),
    VoiceAsset("Ү үй.mp4", "Үй"),
    VoiceAsset("Ү үтік.mp4", "Үтік"),
    VoiceAsset("Ф фонтан.mp4", "Фонтан", "ф", True),
    VoiceAsset("Ф футбол.mp4", "Футбол"),
    VoiceAsset("Ф фишка.mp4", "Фишка"),
    VoiceAsset("Х хабар.mp4", "Хабар", "х", True),
    VoiceAsset("Х хат.mp4", "Хат"),
    VoiceAsset("Х хан.mp4", "Хан"),
]


TARGET_SOUND_ROOTS = [
    Path("public/original/sounds"),
    Path("public/sounds"),
    Path("sounds"),
]


def resolve_ffmpeg(app_root: Path, explicit: Path | None) -> Path:
    candidates = [
        explicit,
        app_root / "node_modules" / "ffmpeg-static" / "ffmpeg.exe",
        shutil.which("ffmpeg"),
    ]
    for candidate in candidates:
        if not candidate:
            continue
        path = Path(candidate)
        if path.exists():
            return path
    raise FileNotFoundError("ffmpeg not found. Install ffmpeg or run npm install to restore ffmpeg-static.")


def convert_or_copy(source: Path, target: Path, ffmpeg: Path, force: bool) -> str:
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists() and not force:
        return "skipped"

    if source.suffix.lower() == ".mp3":
        shutil.copy2(source, target)
        return "copied"

    subprocess.run(
        [
            str(ffmpeg),
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(source),
            "-vn",
            "-ac",
            "1",
            "-ar",
            "44100",
            "-b:a",
            "128k",
            str(target),
        ],
        check=True,
    )
    return "converted"


def import_assets(args: argparse.Namespace) -> list[dict[str, str]]:
    app_root = args.app_root.resolve()
    source_dir = args.source_dir.resolve()
    ffmpeg = resolve_ffmpeg(app_root, args.ffmpeg)
    target_roots = [(app_root / root).resolve() for root in TARGET_SOUND_ROOTS]
    manifest: list[dict[str, str]] = []

    for asset in VOICE_ASSETS:
        source = source_dir / asset.source_name
        if not source.exists():
            raise FileNotFoundError(f"Missing source voice file: {source}")

        target_relatives = [Path("Alippe") / "words" / f"{asset.word}.mp3"]
        if asset.is_primary_letter and asset.letter:
            target_relatives.append(Path("Alippe") / f"Alippe_{asset.letter}.mp3")

        for root in target_roots:
            for target_relative in target_relatives:
                target = root / target_relative
                action = convert_or_copy(source, target, ffmpeg, args.force)
                manifest.append({
                    "source": str(source),
                    "target": str(target),
                    "action": action,
                })
                print(f"{action}: {source.name!r} -> {target}")

    manifest_path = (app_root / args.manifest_out).resolve()
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Manifest: {manifest_path}")
    return manifest


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import Kazakh recorded voice assets.")
    parser.add_argument("--app-root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--source-dir", type=Path, default=Path(r"C:\Users\user\Desktop\Folders\voices"))
    parser.add_argument("--ffmpeg", type=Path)
    parser.add_argument("--manifest-out", type=Path, default=Path("tools/kk_voice_import_manifest.json"))
    parser.add_argument("--force", action="store_true")
    return parser.parse_args()


if __name__ == "__main__":
    import_assets(parse_args())
