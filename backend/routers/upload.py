from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse

from services.tabular import process_csv, process_xlsx
from services.document import process_document

router = APIRouter()

_MAX_BYTES = 20 * 1024 * 1024  # 20 MB hard limit


def _guard_size(raw: bytes, filename: str) -> None:
    if len(raw) > _MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"'{filename}' dosyası çok büyük (maks. 20 MB).",
        )


@router.post("/tabular")
async def upload_tabular(file: UploadFile = File(...)):
    """
    CSV veya XLSX yükle.
    Yanıt: şema + ilk 5 satır önizleme.
    KURAL: Tam veri asla döndürülmez.
    """
    raw = await file.read()
    _guard_size(raw, file.filename or "dosya")

    ext = (file.filename or "").rsplit(".", 1)[-1].lower()

    try:
        if ext == "csv":
            meta = process_csv(raw)
        elif ext in ("xlsx", "xls"):
            meta = process_xlsx(raw)
        else:
            raise HTTPException(
                status_code=415,
                detail=f"Desteklenmeyen dosya türü: .{ext}. Lütfen CSV veya XLSX yükleyin.",
            )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return JSONResponse(
        content={
            "basari": True,
            "dosya_adi": file.filename,
            "dosya_turu": ext.upper(),
            "meta": meta,
        }
    )


@router.post("/document")
async def upload_document(file: UploadFile = File(...)):
    """
    PDF veya DOCX yükle → ChromaDB'ye gömülür.
    Yanıt: file_id + parça sayısı. Tam içerik asla döndürülmez.
    """
    raw = await file.read()
    _guard_size(raw, file.filename or "dosya")

    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ("pdf", "docx", "doc"):
        raise HTTPException(
            status_code=415,
            detail=f"Desteklenmeyen dosya türü: .{ext}. Lütfen PDF veya DOCX yükleyin.",
        )

    try:
        result = process_document(raw, file.filename or "belge")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return JSONResponse(content={"basari": True, **result})
