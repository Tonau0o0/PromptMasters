from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import upload, upload_path

app = FastAPI(
    title="Neuro-Agent API",
    description="Dinamik Bilgi Grafiği için dosya işleme ve LLM bağlam yönetimi",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    # Allow both Next.js dev server and Electron's file:// renderer
    allow_origins=["http://localhost:3000", "http://localhost:3001", "file://"],
    allow_origin_regex=r".*",   # Electron uses file:// which varies by OS
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router,      prefix="/upload", tags=["Dosya Yükleme (Browser)"])
app.include_router(upload_path.router, prefix="/upload", tags=["Dosya Yükleme (Electron – Yerel Yol)"])


@app.get("/health")
def health():
    return {"durum": "çalışıyor"}
