"""
Path-based upload endpoints for Electron desktop mode.
Electron passes the absolute local file path; the backend reads directly from disk.
No file copy/move — zero extra memory overhead.
"""
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from services.tabular import process_csv, process_xlsx
from services.document import process_document

router = APIRouter()

_MAX_BYTES = 200 * 1024 * 1024  # 200 MB – local files can be larger


class FilePathRequest(BaseModel):
    file_path: str


def _resolve(raw_path: str) -> Path:
    p = Path(raw_path)
    if not p.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Dosya bulunamadı: {raw_path}",
        )
    if not p.is_file():
        raise HTTPException(
            status_code=400,
            detail=f"Belirtilen yol bir dosya değil: {raw_path}",
        )
    if p.stat().st_size > _MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Dosya çok büyük (maks. 200 MB): {p.name}",
        )
    return p


@router.post("/tabular-path")
async def upload_tabular_path(body: FilePathRequest):
    """
    CSV veya XLSX dosyasını yerel diskten oku.
    Yanıt: şema + ilk 5 satır önizleme (tam veri asla döndürülmez).
    """
    p = _resolve(body.file_path)
    ext = p.suffix.lower().lstrip(".")

    try:
        raw = p.read_bytes()
        if ext == "csv":
            meta = process_csv(raw)
        elif ext in ("xlsx", "xls"):
            meta = process_xlsx(raw)
        else:
            raise HTTPException(
                status_code=415,
                detail=f"Desteklenmeyen tablo türü: .{ext}. CSV veya XLSX bekleniyor.",
            )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return JSONResponse(
        content={
            "basari": True,
            "dosya_adi": p.name,
            "dosya_turu": ext.upper(),
            "meta": meta,
        }
    )


@router.post("/document-path")
async def upload_document_path(body: FilePathRequest):
    """
    PDF veya DOCX dosyasını yerel diskten oku → ChromaDB'ye gömülür.
    Yanıt: file_id + parça sayısı (tam içerik asla döndürülmez).
    """
    p = _resolve(body.file_path)
    ext = p.suffix.lower().lstrip(".")

    if ext not in ("pdf", "docx", "doc"):
        raise HTTPException(
            status_code=415,
            detail=f"Desteklenmeyen belge türü: .{ext}. PDF veya DOCX bekleniyor.",
        )

    try:
        raw = p.read_bytes()
        result = process_document(raw, p.name)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return JSONResponse(content={"basari": True, **result})
