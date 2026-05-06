"""
Metadata-First tabular file processing.
STRICT RULE: full file content is NEVER returned – only schema + first-5-row preview.
"""
from __future__ import annotations

import io
from typing import Any

import pandas as pd

# Maps pandas dtypes to human-readable Turkish type labels
_DTYPE_TR: dict[str, str] = {
    "int64": "Tamsayı",
    "int32": "Tamsayı",
    "float64": "Ondalık",
    "float32": "Ondalık",
    "object": "Metin",
    "bool": "Mantıksal",
    "datetime64[ns]": "Tarih",
    "category": "Kategori",
}


def _dtype_label(dtype: Any) -> str:
    return _DTYPE_TR.get(str(dtype), str(dtype))


def _safe_preview(df: pd.DataFrame) -> list[dict]:
    """Return first 5 rows as JSON-serialisable records (NaN → None)."""
    return df.head(5).where(pd.notnull(df), None).to_dict(orient="records")


def process_csv(raw: bytes) -> dict:
    try:
        df = pd.read_csv(io.BytesIO(raw))
    except Exception as exc:
        raise ValueError(f"CSV dosyası okunamadı: {exc}") from exc

    return _build_metadata(df)


def process_xlsx(raw: bytes) -> dict:
    try:
        df = pd.read_excel(io.BytesIO(raw), engine="openpyxl")
    except Exception as exc:
        raise ValueError(f"Excel dosyası okunamadı: {exc}") from exc

    return _build_metadata(df)


def _build_metadata(df: pd.DataFrame) -> dict:
    columns = [
        {
            "ad": col,
            "tur": _dtype_label(df[col].dtype),
            "bos_deger": int(df[col].isna().sum()),
        }
        for col in df.columns
    ]

    return {
        "toplam_satir": len(df),
        "toplam_sutun": len(df.columns),
        "sutunlar": columns,
        # Summarised column names for quick display in the node UI
        "sutun_adlari": df.columns.tolist(),
        # Only the first 5 rows – NEVER the full dataset
        "on_izleme": _safe_preview(df),
    }
