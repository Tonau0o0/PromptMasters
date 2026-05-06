from __future__ import annotations

import os

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import chat, files, upload, upload_path

app = FastAPI(
    title="Neuro-Agent API",
    description="Dinamik Bilgi Grafiği için dosya işleme ve LLM bağlam yönetimi",
    version="1.0.0",
)

# CORS — sadece bilinen origin'lere izin. Electron prod'da `loadFile` kullandığı
# için renderer'dan gelen istek "null" origin döner; geliştirme sunucuları açık.
# DİKKAT: Genel `allow_origin_regex=".*"` veya `allow_origins=["*"]` kullanma —
# yerelde çalışan rastgele tarayıcı sekmelerinin de bu API'ye istek atabilmesine yol açar.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "null",  # Electron file:// protokolü "null" origin gönderir
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

app.include_router(upload.router, prefix="/upload", tags=["Dosya Yükleme (Browser)"])
app.include_router(upload_path.router, prefix="/upload", tags=["Dosya Yükleme (Electron – Yerel Yol)"])
app.include_router(chat.router, prefix="/chat", tags=["Sohbet (Gemini)"])
app.include_router(files.router, prefix="/files", tags=["Üretilen Dosyalar"])


@app.get("/health")
def health():
    return {"durum": "çalışıyor"}


def main() -> None:
    """PyInstaller paketlemesi için entry point.
    Electron sidecar bu binary'yi çağırır; port `NEURO_BACKEND_PORT` ile override edilebilir.
    """
    port = int(os.environ.get("NEURO_BACKEND_PORT", "8000"))
    host = os.environ.get("NEURO_BACKEND_HOST", "127.0.0.1")
    uvicorn.run(app, host=host, port=port, access_log=False, log_config=None)


if __name__ == "__main__":
    main()
