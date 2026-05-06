"""
Browser upload endpoints — multipart/form-data ile gelen dosyaları işler.
"""
from fastapi import APIRouter, File, HTTPException, UploadFile

from schemas import DocumentUploadResponse, TabularUploadResponse
from services.upload_pipeline import handle_document, handle_tabular

router = APIRouter()

_MAX_BYTES = 20 * 1024 * 1024  # 20 MB


def _guard_size(raw: bytes, filename: str) -> None:
    if len(raw) > _MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"'{filename}' dosyası çok büyük (maks. 20 MB).",
        )


@router.post("/tabular", response_model=TabularUploadResponse)
async def upload_tabular(file: UploadFile = File(...)):
    """CSV/XLSX yükle → şema + ilk 5 satır önizleme. Tam veri asla döndürülmez."""
    raw = await file.read()
    _guard_size(raw, file.filename or "dosya")
    return handle_tabular(raw, file.filename or "dosya")


@router.post("/document", response_model=DocumentUploadResponse)
async def upload_document(file: UploadFile = File(...)):
    """PDF/DOCX yükle → ChromaDB'ye gömülür. Yanıt: file_id + parça sayısı."""
    raw = await file.read()
    _guard_size(raw, file.filename or "dosya")
    return handle_document(raw, file.filename or "belge")
