"""
Public response schemas — kontrat netleşsin diye.
Frontend bu shape'e güvenir; değişirse hem burada hem `useFileUpload.ts`'te güncellenmeli.
"""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class ColumnMeta(BaseModel):
    ad: str
    tur: str
    bos_deger: int


class TabularMeta(BaseModel):
    toplam_satir: int
    toplam_sutun: int
    sutunlar: list[ColumnMeta]
    sutun_adlari: list[str]
    on_izleme: list[dict[str, Any]]


class TabularUploadResponse(BaseModel):
    basari: bool
    dosya_adi: str
    dosya_turu: str
    meta: TabularMeta


class DocumentUploadResponse(BaseModel):
    basari: bool
    file_id: str
    dosya_adi: str
    dosya_turu: str
    parca_sayisi: int
    mesaj: str


class FilePathRequest(BaseModel):
    file_path: str


# ─── Chat ────────────────────────────────────────────────────────────────────


class ActiveNodePayload(BaseModel):
    """Frontend'den gelen aktif düğüm bilgisi — context inşası için."""

    id: str
    kind: str  # "data" | "feature" | "department"
    label: str
    description: str | None = None
    instruction: str | None = None
    taskType: str | None = None
    # Data alanları (frontend store'undaki BrainNodeData'dan kopyalanır)
    fileName: str | None = None
    fileType: str | None = None
    tabularMeta: TabularMeta | None = None
    documentFileId: str | None = None


class CommentPayload(BaseModel):
    id: str
    author: str
    text: str
    createdAt: str | None = None


class ViewPayload(BaseModel):
    kind: str  # "company" | "department"
    id: str | None = None


class ChatRequest(BaseModel):
    prompt: str
    view: ViewPayload
    systemInstruction: str | None = None
    contextLabel: str | None = None
    activeNodes: list[ActiveNodePayload] = []
    observerComments: list[CommentPayload] = []


class GeneratedFile(BaseModel):
    file_id: str
    filename: str
    mime: str


class ChatResponse(BaseModel):
    content: str
    model: str
    inputTokens: int
    outputTokens: int
    generatedFiles: list[GeneratedFile] = []
