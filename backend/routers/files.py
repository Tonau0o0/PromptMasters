"""LLM-üretilmiş dosyaları indirir."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from services.tools import get_file_info, get_file_path

router = APIRouter()


@router.get("/{file_id}")
def download_file(file_id: str):
    info = get_file_info(file_id)
    if not info:
        raise HTTPException(status_code=404, detail="Dosya bulunamadı veya süresi dolmuş.")
    path = get_file_path(file_id)
    if not path or not path.exists():
        raise HTTPException(status_code=410, detail="Dosya diskte bulunamadı.")
    return FileResponse(
        path,
        media_type=info["mime"],
        filename=info["filename"],
    )
