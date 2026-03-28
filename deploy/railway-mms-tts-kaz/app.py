import io
import os
import threading
import time
import wave

import numpy as np
import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel
from transformers import AutoTokenizer, VitsModel, set_seed


MODEL_NAME = os.getenv("TTS_MODEL_NAME", "facebook/mms-tts-kaz")
TTS_SEED = int(os.getenv("TTS_SEED", "555"))
MAX_TEXT_LENGTH = int(os.getenv("TTS_MAX_TEXT_LENGTH", "700"))
TORCH_THREADS = int(os.getenv("TORCH_NUM_THREADS", "1"))
MODEL_WAIT_TIMEOUT_SECONDS = float(os.getenv("MODEL_WAIT_TIMEOUT_SECONDS", "8"))

torch.set_num_threads(max(TORCH_THREADS, 1))

app = FastAPI(title="facebook/mms-tts-kaz Railway TTS", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TTSRequest(BaseModel):
    text: str
    lang: str = "kk-KZ"


_model = None
_tokenizer = None
_sampling_rate = 16000
_load_lock = threading.Lock()
_infer_lock = threading.Lock()
_load_event = threading.Event()
_load_started_at = 0.0
_load_error = None
_is_loading = False


def is_model_loaded() -> bool:
    return _model is not None and _tokenizer is not None


def _load_model_worker():
    global _model, _tokenizer, _sampling_rate, _load_error, _is_loading, _load_started_at

    try:
        tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        model = VitsModel.from_pretrained(MODEL_NAME)
        model.eval()

        _tokenizer = tokenizer
        _model = model
        _sampling_rate = int(getattr(model.config, "sampling_rate", 16000))
        _load_error = None
    except Exception as error:
        _load_error = str(error)
        _model = None
        _tokenizer = None
    finally:
        with _load_lock:
            _is_loading = False
        _load_event.set()


def start_model_loading() -> bool:
    global _is_loading, _load_started_at

    if is_model_loaded():
        return False

    with _load_lock:
        if is_model_loaded() or _is_loading:
            return False

        _is_loading = True
        _load_started_at = time.time()
        _load_event.clear()
        thread = threading.Thread(target=_load_model_worker, daemon=True)
        thread.start()
        return True


def ensure_model_loaded(timeout: float | None = None) -> bool:
    if is_model_loaded():
        return True

    start_model_loading()
    _load_event.wait(timeout=timeout)
    return is_model_loaded()


def waveform_to_wav_bytes(waveform: np.ndarray, sample_rate: int) -> bytes:
    clipped = np.clip(np.asarray(waveform, dtype=np.float32), -1.0, 1.0)
    pcm16 = (clipped * 32767.0).astype(np.int16)

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(pcm16.tobytes())

    return buffer.getvalue()


def synthesize(text: str) -> bytes:
    if not ensure_model_loaded(timeout=MODEL_WAIT_TIMEOUT_SECONDS):
        if _load_error:
            raise RuntimeError(_load_error)
        raise TimeoutError("tts model is still warming up")

    with _infer_lock:
        set_seed(TTS_SEED)
        inputs = _tokenizer(text, return_tensors="pt")
        with torch.no_grad():
            output = _model(**inputs).waveform.squeeze().cpu().numpy()

    return waveform_to_wav_bytes(output, _sampling_rate)


@app.get("/")
def root():
    return {
        "service": "facebook/mms-tts-kaz",
        "status": "ok",
        "usage": "POST /tts with JSON { text, lang }",
        "model": MODEL_NAME,
    }


@app.get("/healthz")
def healthz():
    return {
        "status": "ok",
        "model": MODEL_NAME,
        "loaded": is_model_loaded(),
        "loading": _is_loading,
        "load_started_at": _load_started_at,
        "load_error": _load_error,
    }


@app.on_event("startup")
def warmup_model():
    start_model_loading()


@app.post("/warmup")
def warmup():
    start_model_loading()
    return {
        "status": "warming",
        "model": MODEL_NAME,
        "loaded": is_model_loaded(),
        "loading": _is_loading,
        "load_error": _load_error,
    }


@app.post("/tts")
def tts(req: TTSRequest):
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    if len(text) > MAX_TEXT_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"text is too long. maximum length is {MAX_TEXT_LENGTH} characters",
        )

    try:
        wav_bytes = synthesize(text)
    except TimeoutError:
        return JSONResponse(
            status_code=503,
            headers={"Retry-After": "4"},
            content={
                "error": "tts_model_warming_up",
                "details": "The TTS model is still loading. Retry in a few seconds.",
                "model": MODEL_NAME,
                "loaded": is_model_loaded(),
                "loading": _is_loading,
            },
        )
    except Exception as error:
        return JSONResponse(
            status_code=500,
            content={
                "error": "tts_generation_failed",
                "details": str(error),
                "model": MODEL_NAME,
            },
        )

    return Response(content=wav_bytes, media_type="audio/wav")
