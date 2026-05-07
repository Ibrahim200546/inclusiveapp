#!/usr/bin/env python
r"""Generate Russian voiceover assets with CorentinJ/Real-Time-Voice-Cloning.

Run this script from the Real-Time-Voice-Cloning uv environment, for example:

  cd C:\path\Real-Time-Voice-Cloning
  uv run --extra cpu python C:\path\inclusiveapp\tools\rtvc_generate_ru_voiceover.py ^
    --rtvc-dir . ^
    --app-root C:\path\inclusiveapp ^
    --voice-sample C:\path\authorized_voice.wav ^
    --dry-run

The default CorentinJ models are English-focused. For production Russian audio,
pass Russian-trained synthesizer/vocoder checkpoints with --syn-model and
--voc-model, or check the generated clips carefully before committing them.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
import unicodedata
from dataclasses import dataclass
from pathlib import Path


CYRILLIC_RE = re.compile(r"[\u0400-\u04FF]")
JS_STRING_RE = re.compile(r"'((?:\\'|[^'])*)'")


@dataclass(frozen=True)
class VoiceoverItem:
    text: str
    target: str
    kind: str


def decode_js_string(value: str) -> str:
    return value.replace("\\'", "'").replace("\\n", "\n").replace("\\\\", "\\")


def strip_emoji_and_symbols(text: str) -> str:
    kept: list[str] = []
    for char in text:
        category = unicodedata.category(char)
        if category.startswith("S") and char not in {"-", "+", "=", "<", ">"}:
            kept.append(" ")
        else:
            kept.append(char)
    return re.sub(r"\s+", " ", "".join(kept)).strip()


def is_speakable_ru(text: str) -> bool:
    cleaned = strip_emoji_and_symbols(text)
    return bool(cleaned and CYRILLIC_RE.search(cleaned))


def extract_balanced(source: str, marker: str, open_char: str, close_char: str) -> str:
    start = source.find(marker)
    if start < 0:
        raise ValueError(f"Cannot find marker: {marker}")
    start = source.find(open_char, start)
    if start < 0:
        raise ValueError(f"Cannot find opening {open_char!r} after marker: {marker}")

    depth = 0
    in_string = False
    escape = False
    for index in range(start, len(source)):
        char = source[index]
        if in_string:
            if escape:
                escape = False
            elif char == "\\":
                escape = True
            elif char == "'":
                in_string = False
            continue

        if char == "'":
            in_string = True
        elif char == open_char:
            depth += 1
        elif char == close_char:
            depth -= 1
            if depth == 0:
                return source[start + 1:index]

    raise ValueError(f"Cannot find closing {close_char!r} for marker: {marker}")


def safe_audio_name(text: str) -> str:
    return "".join(char for char in text if char not in '<>:"/\\|?*').strip()


def unique_items(items: list[VoiceoverItem]) -> list[VoiceoverItem]:
    seen: set[str] = set()
    result: list[VoiceoverItem] = []
    for item in items:
        key = item.target.lower().replace("\\", "/")
        if key in seen:
            continue
        seen.add(key)
        result.append(item)
    return result


def extract_ru_voiceover_items(app_root: Path) -> list[VoiceoverItem]:
    profile_path = app_root / "public" / "original" / "i18n-profile.js"
    source = profile_path.read_text(encoding="utf-8")
    items: list[VoiceoverItem] = []

    alippe_block = extract_balanced(source, "const ruAlippeData", "[", "]")
    for match in re.finditer(r"\{.*?letter:\s*'((?:\\'|[^'])*)'.*?words:\s*\[([^\]]*)\]", alippe_block, re.S):
        letter = decode_js_string(match.group(1))
        letter_lower = letter.lower()
        items.append(VoiceoverItem(letter, f"Alippe/Alippe_{safe_audio_name(letter_lower)}.wav", "letter"))
        items.append(VoiceoverItem(letter, f"letters/letter_{safe_audio_name(letter_lower)}.wav", "letter"))

        for raw_word in JS_STRING_RE.findall(match.group(2)):
            word = decode_js_string(raw_word)
            if is_speakable_ru(word):
                items.append(VoiceoverItem(word, f"Alippe/words/{safe_audio_name(word)}.wav", "alippe-word"))

    ru_text_block = extract_balanced(source, "const ruText", "{", "}")
    for raw_value in re.findall(r":\s*'((?:\\'|[^'])*)'", ru_text_block):
        text = strip_emoji_and_symbols(decode_js_string(raw_value))
        if not is_speakable_ru(text):
            continue
        digest = hashlib.sha1(text.encode("utf-8")).hexdigest()[:12]
        items.append(VoiceoverItem(text, f"ui/{digest}.wav", "ui"))

    return unique_items(items)


def write_manifest(items: list[VoiceoverItem], manifest_path: Path) -> None:
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    payload = [
        {"text": item.text, "target": item.target, "kind": item.kind}
        for item in items
    ]
    manifest_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


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
    raise FileNotFoundError("ffmpeg not found. Install ffmpeg or restore node_modules/ffmpeg-static.")


def prepare_voice_sample_from_dir(args: argparse.Namespace, temp_dir: Path) -> Path:
    source_dir = args.voice_source_dir.resolve()
    if not source_dir.exists():
        raise FileNotFoundError(f"Voice source directory not found: {source_dir}")

    ffmpeg = resolve_ffmpeg(args.app_root.resolve(), args.ffmpeg)
    sources = [
        path for path in sorted(source_dir.iterdir(), key=lambda item: item.name.lower())
        if path.suffix.lower() in {".mp3", ".mp4", ".wav", ".m4a", ".flac", ".ogg"}
    ][:args.sample_max_files]

    if not sources:
        raise FileNotFoundError(f"No audio/video files found in voice source directory: {source_dir}")

    converted_paths: list[Path] = []
    for index, source in enumerate(sources):
        target = temp_dir / f"sample_{index:03d}.wav"
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
                "16000",
                str(target),
            ],
            check=True,
        )
        converted_paths.append(target)

    concat_list = temp_dir / "concat.txt"
    concat_list.write_text(
        "".join(f"file '{path.as_posix()}'\n" for path in converted_paths),
        encoding="utf-8",
    )

    prepared_sample = temp_dir / "rtvc_reference_voice.wav"
    subprocess.run(
        [
            str(ffmpeg),
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(concat_list),
            "-c",
            "copy",
            str(prepared_sample),
        ],
        check=True,
    )
    return prepared_sample


def load_rtvc(rtvc_dir: Path, cpu: bool):
    sys.path.insert(0, str(rtvc_dir))
    if cpu:
        import os
        os.environ["CUDA_VISIBLE_DEVICES"] = "-1"

    import librosa
    import numpy as np
    import soundfile as sf
    import torch
    from encoder import inference as encoder
    from synthesizer.inference import Synthesizer
    from utils.default_models import ensure_default_models
    from vocoder import inference as vocoder

    return {
        "encoder": encoder,
        "Synthesizer": Synthesizer,
        "ensure_default_models": ensure_default_models,
        "librosa": librosa,
        "np": np,
        "sf": sf,
        "torch": torch,
        "vocoder": vocoder,
    }


def synthesize_items(args: argparse.Namespace, items: list[VoiceoverItem]) -> None:
    rtvc_dir = args.rtvc_dir.resolve()
    if not rtvc_dir.exists():
        raise FileNotFoundError(f"RTVC directory not found: {rtvc_dir}")
    if not args.voice_sample or not args.voice_sample.exists():
        raise FileNotFoundError(f"Voice sample not found: {args.voice_sample}")

    modules = load_rtvc(rtvc_dir, args.cpu)
    encoder = modules["encoder"]
    Synthesizer = modules["Synthesizer"]
    ensure_default_models = modules["ensure_default_models"]
    librosa = modules["librosa"]
    np = modules["np"]
    sf = modules["sf"]
    torch = modules["torch"]
    vocoder = modules["vocoder"]

    if args.seed is not None:
        torch.manual_seed(args.seed)

    saved_models_dir = rtvc_dir / "saved_models"
    ensure_default_models(saved_models_dir)

    enc_model = args.enc_model or saved_models_dir / "default" / "encoder.pt"
    syn_model = args.syn_model or saved_models_dir / "default" / "synthesizer.pt"
    voc_model = args.voc_model or saved_models_dir / "default" / "vocoder.pt"

    encoder.load_model(enc_model)
    synthesizer = Synthesizer(syn_model)
    vocoder.load_model(voc_model)

    original_wav, sampling_rate = librosa.load(str(args.voice_sample))
    preprocessed_wav = encoder.preprocess_wav(original_wav, sampling_rate)
    embed = encoder.embed_utterance(preprocessed_wav)

    output_root = args.output_root.resolve()
    mirror_root = args.mirror_root.resolve() if args.mirror_root else None
    output_root.mkdir(parents=True, exist_ok=True)
    if mirror_root:
        mirror_root.mkdir(parents=True, exist_ok=True)

    for index, item in enumerate(items, start=1):
        target = output_root / item.target
        if target.exists() and not args.force:
            print(f"[{index}/{len(items)}] skip existing {target}")
            continue

        target.parent.mkdir(parents=True, exist_ok=True)
        print(f"[{index}/{len(items)}] {item.kind}: {item.text!r} -> {target}")
        specs = synthesizer.synthesize_spectrograms([item.text], [embed])
        generated_wav = vocoder.infer_waveform(specs[0])
        generated_wav = np.pad(generated_wav, (0, synthesizer.sample_rate), mode="constant")
        generated_wav = encoder.preprocess_wav(generated_wav)
        sf.write(target, generated_wav.astype(np.float32), synthesizer.sample_rate)

        if mirror_root:
            mirror_target = mirror_root / item.target
            mirror_target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(target, mirror_target)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate inclusiveapp Russian voiceover assets via Real-Time-Voice-Cloning.")
    parser.add_argument("--app-root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--rtvc-dir", type=Path, required=True, help="Local CorentinJ/Real-Time-Voice-Cloning checkout.")
    parser.add_argument("--voice-sample", type=Path, help="Authorized reference voice file, 5-30 seconds is enough.")
    parser.add_argument("--voice-source-dir", type=Path, default=Path(r"C:\Users\user\Desktop\Folders\voices"), help="Folder with authorized voice clips. Used when --voice-sample is omitted.")
    parser.add_argument("--ffmpeg", type=Path)
    parser.add_argument("--sample-max-files", type=int, default=24)
    parser.add_argument("--output-root", type=Path, default=Path("public/original/sounds/ru"))
    parser.add_argument("--mirror-root", type=Path, default=Path("public/sounds/ru"))
    parser.add_argument("--manifest-out", type=Path, default=Path("tools/ru_voiceover_manifest.json"))
    parser.add_argument("--only", choices=["all", "alippe", "ui"], default="all")
    parser.add_argument("--limit", type=int, help="Limit item count for smoke tests.")
    parser.add_argument("--enc-model", type=Path)
    parser.add_argument("--syn-model", type=Path)
    parser.add_argument("--voc-model", type=Path)
    parser.add_argument("--cpu", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--seed", type=int)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    app_root = args.app_root.resolve()
    args.app_root = app_root
    items = extract_ru_voiceover_items(app_root)
    if args.only == "alippe":
        items = [item for item in items if item.kind in {"letter", "alippe-word"}]
    elif args.only == "ui":
        items = [item for item in items if item.kind == "ui"]
    if args.limit is not None:
        items = items[:max(args.limit, 0)]

    manifest_path = (app_root / args.manifest_out).resolve() if not args.manifest_out.is_absolute() else args.manifest_out
    write_manifest(items, manifest_path)
    print(f"Manifest: {manifest_path}")
    print(f"Items: {len(items)}")

    if args.dry_run:
        for item in items[:20]:
            print(f"- {item.kind}: {item.text!r} -> {item.target}")
        if len(items) > 20:
            print(f"... and {len(items) - 20} more")
        return 0

    args.output_root = (app_root / args.output_root).resolve() if not args.output_root.is_absolute() else args.output_root
    args.mirror_root = (app_root / args.mirror_root).resolve() if args.mirror_root and not args.mirror_root.is_absolute() else args.mirror_root
    if args.voice_sample:
        args.voice_sample = args.voice_sample.resolve()
        synthesize_items(args, items)
    else:
        with tempfile.TemporaryDirectory(prefix="inclusiveapp-rtvc-") as temp_name:
            args.voice_sample = prepare_voice_sample_from_dir(args, Path(temp_name))
            synthesize_items(args, items)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
