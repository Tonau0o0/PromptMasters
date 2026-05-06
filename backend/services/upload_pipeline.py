"""
Shared upload pipeline used by both /upload (browser multipart) and
/upload-path (Electron native path) routers.

Tek sorumluluk: byte içeriği + dosya adı verildiğinde, uzantıya göre
ilgili `services` fonksiyonunu çağır ve standart bir response sözlüğü döndür.

Güvenlik: Uzantıya ek olarak dosya içerik imzası (magic bytes) doğrulanır.
Saldırgan `.pdf` adıyla bambaşka bir binary yükleyemez.
"""
from __future__ import annotations

from fastapi import HTTPException

from services.document import process_document
from services.tabular import process_csv, process_xlsx

TABULAR_EXTS = {"csv", "xlsx", "xls"}
DOCUMENT_EXTS = {"pdf", "docx", "doc"}

# Uzantı → kabul edilebilir baş imzaların listesi.
# CSV metin tabanlıdır → magic byte yok; pandas parser zaten uyumsuzluğu yakalar.
# DOCX/XLSX = ZIP konteyner (PK\x03\x04). DOC/XLS = OLE2 compound document.
_SIGNATURES: dict[str, tuple[bytes, ...]] = {
    "pdf": (b"%PDF-",),
    "docx": (b"PK\x03\x04",),
    "xlsx": (b"PK\x03\x04",),
    "doc": (b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1",),
    "xls": (b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1",),
}


def ext_of(filename: str) -> str:
    return (filename or "").rsplit(".", 1)[-1].lower() if "." in (filename or "") else ""


def _validate_signature(raw: bytes, ext: str) -> None:
    """Dosya içeriğinin uzantısıyla uyuştuğunu doğrula. CSV için bypass."""
    sigs = _SIGNATURES.get(ext)
    if not sigs:
        return  # CSV veya bilinmeyen — uzantı kontrolü ayrıca yapılır
    if not raw:
        raise HTTPException(status_code=422, detail="Dosya içeriği boş.")
    if not any(raw.startswith(s) for s in sigs):
        raise HTTPException(
            status_code=415,
            detail=(
                f"Dosya içeriği .{ext} ile uyuşmuyor. "
                "Uzantısı değiştirilmiş veya bozuk bir dosya yüklemiş olabilirsiniz."
            ),
        )


def handle_tabular(raw: bytes, filename: str) -> dict:
    ext = ext_of(filename)
    if ext not in TABULAR_EXTS:
        raise HTTPException(
            status_code=415,
            detail=f"Desteklenmeyen tablo türü: .{ext}. CSV veya XLSX bekleniyor.",
        )
    _validate_signature(raw, ext)
    try:
        if ext == "csv":
            meta = process_csv(raw)
        else:  # xlsx / xls
            meta = process_xlsx(raw)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return {
        "basari": True,
        "dosya_adi": filename,
        "dosya_turu": ext.upper(),
        "meta": meta,
    }


def handle_document(raw: bytes, filename: str) -> dict:
    ext = ext_of(filename)
    if ext not in DOCUMENT_EXTS:
        raise HTTPException(
            status_code=415,
            detail=f"Desteklenmeyen belge türü: .{ext}. PDF veya DOCX bekleniyor.",
        )
    _validate_signature(raw, ext)
    try:
        result = process_document(raw, filename)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return {"basari": True, **result}
