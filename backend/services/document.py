"""
Document processing: PDF / DOCX → chunks → ChromaDB vector store.
Returns a file_id the frontend stores on the DataNode.
Full text is kept only in the vector store, never surfaced to the client.
"""
from __future__ import annotations

import io
import uuid
from pathlib import Path

# ChromaDB
import chromadb
from chromadb.config import Settings

# LangChain splitter
from langchain_text_splitters import RecursiveCharacterTextSplitter

# PDF
from pypdf import PdfReader

# DOCX
from docx import Document as DocxDocument

_CHROMA_DIR = Path(__file__).parent.parent / "storage" / "chroma"
_CHROMA_DIR.mkdir(parents=True, exist_ok=True)

_client = chromadb.PersistentClient(
    path=str(_CHROMA_DIR),
    settings=Settings(anonymized_telemetry=False),
)
_collection = _client.get_or_create_collection(
    name="neuro_docs",
    metadata={"hnsw:space": "cosine"},
)

_splitter = RecursiveCharacterTextSplitter(
    chunk_size=512,
    chunk_overlap=64,
    separators=["\n\n", "\n", ".", " ", ""],
)


def _extract_pdf(raw: bytes) -> str:
    reader = PdfReader(io.BytesIO(raw))
    pages = [p.extract_text() or "" for p in reader.pages]
    return "\n".join(pages)


def _extract_docx(raw: bytes) -> str:
    doc = DocxDocument(io.BytesIO(raw))
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())


def process_document(raw: bytes, filename: str) -> dict:
    ext = Path(filename).suffix.lower()

    if ext == ".pdf":
        text = _extract_pdf(raw)
        file_type = "PDF"
    elif ext in (".docx", ".doc"):
        text = _extract_docx(raw)
        file_type = "DOCX"
    else:
        raise ValueError(f"Desteklenmeyen belge türü: {ext}")

    if not text.strip():
        raise ValueError("Belgeden metin çıkarılamadı veya dosya boş.")

    chunks = _splitter.split_text(text)
    if not chunks:
        raise ValueError("Belge parçalanamadı.")

    file_id = str(uuid.uuid4())

    _collection.add(
        documents=chunks,
        ids=[f"{file_id}_{i}" for i in range(len(chunks))],
        metadatas=[{"file_id": file_id, "filename": filename, "chunk": i} for i in range(len(chunks))],
    )

    # Return only metadata – full text stays in vector store
    return {
        "file_id": file_id,
        "dosya_adi": filename,
        "dosya_turu": file_type,
        "parca_sayisi": len(chunks),
        "mesaj": f"Belge başarıyla işlendi ve {len(chunks)} parçaya bölündü.",
    }


def query_document(file_id: str, query: str, top_k: int = 5) -> list[str]:
    """Retrieve relevant chunks for a given query (used in Step 3)."""
    results = _collection.query(
        query_texts=[query],
        n_results=top_k,
        where={"file_id": file_id},
    )
    return results["documents"][0] if results["documents"] else []
