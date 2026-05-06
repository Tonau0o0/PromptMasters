"""
Path-based upload endpoints — Electron desktop modunda kullanılır.
Renderer mutlak dosya yolunu gönderir, backend diskten okur.

GÜVENLİK:
- Path normalize edilir; sembolik link'ler çözülür.
- Yalnızca kullanıcı home dizini altındaki dosyalara izin verilir.
- Sistem dizinleri (Windows, Program Files, /etc, /usr…) blok'lanır.
- Uzantı kontrolü ek savunma katmanıdır; tek başına yeterli değildir.
"""
from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException

from schemas import DocumentUploadResponse, FilePathRequest, TabularUploadResponse
from services.upload_pipeline import (
    DOCUMENT_EXTS,
    TABULAR_EXTS,
    ext_of,
    handle_document,
    handle_tabular,
)

router = APIRouter()

_MAX_BYTES = 200 * 1024 * 1024  # 200 MB

# Yasak ön-ekler (case-insensitive, normalize edilmiş Path string'i ile karşılaştırılır)
_FORBIDDEN_PREFIXES_WIN = (
    "c:\\windows",
    "c:\\program files",
    "c:\\program files (x86)",
    "c:\\programdata",
)
_FORBIDDEN_PREFIXES_POSIX = (
    "/etc",
    "/usr",
    "/bin",
    "/sbin",
    "/var",
    "/proc",
    "/sys",
    "/root",
    "/boot",
)


def _is_inside_user_home(p: Path) -> bool:
    try:
        p.relative_to(Path.home().resolve())
    except ValueError:
        return False
    return True


def _is_forbidden(p: Path) -> bool:
    s = str(p).lower().replace("/", "\\") if p.drive else str(p)
    if p.drive:
        return any(s.startswith(prefix) for prefix in _FORBIDDEN_PREFIXES_WIN)
    return any(str(p).startswith(prefix) for prefix in _FORBIDDEN_PREFIXES_POSIX)


def _resolve(raw_path: str) -> Path:
    if not raw_path or not raw_path.strip():
        raise HTTPException(status_code=400, detail="Dosya yolu boş olamaz.")

    try:
        # strict=False: dosya henüz var olmayabilir, alttaki .exists() kontrol eder
        p = Path(raw_path).resolve(strict=False)
    except (OSError, RuntimeError) as exc:
        raise HTTPException(status_code=400, detail=f"Geçersiz dosya yolu: {exc}") from exc

    if _is_forbidden(p):
        raise HTTPException(status_code=403, detail="Bu konuma erişim izni yok.")

    if not _is_inside_user_home(p):
        raise HTTPException(
            status_code=403,
            detail="Yalnızca kullanıcı dizini altındaki dosyalar yüklenebilir.",
        )

    if not p.exists():
        raise HTTPException(status_code=404, detail=f"Dosya bulunamadı: {p.name}")
    if not p.is_file():
        raise HTTPException(status_code=400, detail=f"Belirtilen yol bir dosya değil: {p.name}")
    if p.stat().st_size > _MAX_BYTES:
        raise HTTPException(status_code=413, detail=f"Dosya çok büyük (maks. 200 MB): {p.name}")

    return p


@router.post("/tabular-path", response_model=TabularUploadResponse)
async def upload_tabular_path(body: FilePathRequest):
    """Yerel CSV/XLSX dosyasını oku → şema + ilk 5 satır önizleme."""
    p = _resolve(body.file_path)
    ext = ext_of(p.name)
    if ext not in TABULAR_EXTS:
        raise HTTPException(
            status_code=415,
            detail=f"Desteklenmeyen tablo türü: .{ext}. CSV veya XLSX bekleniyor.",
        )
    return handle_tabular(p.read_bytes(), p.name)


@router.post("/document-path", response_model=DocumentUploadResponse)
async def upload_document_path(body: FilePathRequest):
    """Yerel PDF/DOCX dosyasını oku → ChromaDB'ye gömülür."""
    p = _resolve(body.file_path)
    ext = ext_of(p.name)
    if ext not in DOCUMENT_EXTS:
        raise HTTPException(
            status_code=415,
            detail=f"Desteklenmeyen belge türü: .{ext}. PDF veya DOCX bekleniyor.",
        )
    return handle_document(p.read_bytes(), p.name)
