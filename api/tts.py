import io
import json
import os
import tempfile
import threading
import wave
from http.server import BaseHTTPRequestHandler

import numpy as np
import torch
from transformers import AutoTokenizer, VitsModel, set_seed


HF_CACHE_DIR = os.path.join(tempfile.gettempdir(), "huggingface")
os.makedirs(HF_CACHE_DIR, exist_ok=True)

os.environ.setdefault("HF_HOME", HF_CACHE_DIR)
os.environ.setdefault("TRANSFORMERS_CACHE", HF_CACHE_DIR)
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

MODEL_NAME = os.environ.get("TTS_MODEL_NAME", "facebook/mms-tts-kaz")
TTS_SEED = int(os.environ.get("TTS_SEED", "555"))
MAX_TEXT_LENGTH = int(os.environ.get("TTS_MAX_TEXT_LENGTH", "700"))

_model = None
_tokenizer = None
_sampling_rate = 16000
_load_lock = threading.Lock()
_infer_lock = threading.Lock()


def _json_response(handler, status_code, payload):
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status_code)
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Cache-Control", "no-store, max-age=0")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def _ensure_model_loaded():
    global _model, _tokenizer, _sampling_rate

    if _model is not None and _tokenizer is not None:
        return

    with _load_lock:
        if _model is not None and _tokenizer is not None:
            return

        torch.set_num_threads(1)
        _tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        _model = VitsModel.from_pretrained(MODEL_NAME)
        _model.eval()
        _sampling_rate = int(getattr(_model.config, "sampling_rate", 16000))


def _waveform_to_wav_bytes(waveform, sample_rate):
    clipped = np.clip(np.asarray(waveform, dtype=np.float32), -1.0, 1.0)
    pcm16 = (clipped * 32767.0).astype(np.int16)

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(pcm16.tobytes())

    return buffer.getvalue()


def _synthesize_wav_bytes(text):
    _ensure_model_loaded()

    with _infer_lock:
        set_seed(TTS_SEED)
        inputs = _tokenizer(text, return_tensors="pt")
        with torch.no_grad():
            waveform = _model(**inputs).waveform.squeeze().cpu().numpy()

    return _waveform_to_wav_bytes(waveform, _sampling_rate)


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        if self.path.split("?", 1)[0] != "/api/tts":
            return _json_response(self, 404, {"error": "Not found"})

        try:
            content_length = int(self.headers.get("content-length", "0"))
        except ValueError:
            content_length = 0

        if content_length <= 0:
            return _json_response(self, 400, {"error": "Invalid request: body is required."})

        raw_body = self.rfile.read(content_length)

        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except json.JSONDecodeError:
            return _json_response(self, 400, {"error": "Invalid request: JSON body is required."})

        text = str((payload or {}).get("text", "")).strip()
        if not text:
            return _json_response(self, 400, {"error": "Invalid request: text is required."})

        if len(text) > MAX_TEXT_LENGTH:
            return _json_response(
                self,
                400,
                {
                    "error": f"Text is too long. Maximum length is {MAX_TEXT_LENGTH} characters."
                },
            )

        try:
            wav_bytes = _synthesize_wav_bytes(text)
        except Exception as error:
            return _json_response(
                self,
                500,
                {
                    "error": "TTS generation failed.",
                    "details": str(error),
                    "model": MODEL_NAME,
                },
            )

        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Type", "audio/wav")
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("Content-Length", str(len(wav_bytes)))
        self.end_headers()
        self.wfile.write(wav_bytes)
