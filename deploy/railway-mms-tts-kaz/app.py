import io
import os
import threading
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


def ensure_model_loaded():
    global _model, _tokenizer, _sampling_rate

    if _model is not None and _tokenizer is not None:
        return

    with _load_lock:
        if _model is not None and _tokenizer is not None:
            return

        _tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        _model = VitsModel.from_pretrained(MODEL_NAME)
        _model.eval()
        _sampling_rate = int(getattr(_model.config, "sampling_rate", 16000))


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
    ensure_model_loaded()

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
        "loaded": _model is not None and _tokenizer is not None,
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
