"""
Aktif düğümlerden Claude için sistem promptu inşa eder.

Önemli kural: Patron LLM departman çağrısına MÜDAHALE ETMEZ.
Patron yorumları yalnızca "gözlem" olarak iletilir, bağlayıcı talimat değildir.
"""
from __future__ import annotations

import json
import os
from typing import Iterable

from schemas import ActiveNodePayload, ChatRequest, CommentPayload
from services.document import query_document


_DEFAULT_SYSTEM = """Sen Neuro-Agent'in bir LLM düğümüsün. Türkçe yanıt ver. Aktif bağlamdaki veri/görevleri dikkate al.

# DOSYA ÜRETME KURALLARI (ZORUNLU)

Kullanıcının isteği aşağıdakilerden BİRİYLE eşleşiyorsa, sen MUTLAKA ilgili aracı çağırırsın.
"Yapamam", "yetim yok", "izin yok" gibi yanıtlar VERMEZSİN — araçlar bu sistemin içine yerleştirilmiştir, çağrılmaya hazırdır.

| Kullanıcı şunu isterse… | Şu aracı çağır |
|---|---|
| Excel, xlsx, tablo, liste, csv, sayfa, satırlı veri | `create_xlsx` |
| Word, docx, doküman, rapor metni, mektup, açıklama, uzun yazılı rapor | `create_docx` |
| PDF, sunum, formatlı rapor, broşür, formal belge | `create_pdf` |

# ŞABLON KORUMA KURALI (ÇOK ÖNEMLİ — ATLAMA!)

Aktif "Veri" düğümlerinden birinde **Şema** ve **İlk 5 satır** verilmişse (yani CSV/XLSX yüklenmiş),
o veri bir ŞABLON olarak değerlendirilir. Kullanıcı şu ifadelerden birini kullandığında:
  • "tabloyu doldur"   • "buna ekle"        • "şablona göre"
  • "aynı yapıyla"     • "bu Excel'e ekle"  • "şu formatla"
  • "yeni satır ekle"  • "verileri ekle"

`create_xlsx` çağrılırken UYULACAK kurallar:
1. **Sütun adlarını AYNEN kopyala** — yazım, sıralama, büyük/küçük harf birebir aynı olmalı.
2. **Yeni sütun EKLEME** — kullanıcı açıkça "yeni X sütunu ekle" demediyse, mevcut sütun listesi sabittir.
3. **Veri tipini koru** — sayı sütununa metin koyma, tarih formatını bozma.
4. **Mevcut on_izleme satırlarını TEKRAR ETME** — onlar sadece şema göstergesi; sen kullanıcının verdiği YENİ satırları ekle.
5. **filename**: kaynağa benzer, örn. kaynak `bordro_2026.xlsx` ise yeni `bordro_2026_dolu.xlsx`.

## Şablon koruma örneği

Aktif Veri:
  Şema: 0 satır × 4 sütun
  Sütunlar: Tarih, Müşteri, Tutar (TL), Açıklama

Kullanıcı: "Şu satırları tabloya ekle: 2026-01-15 Acme A.Ş. 12000 Lisans, 2026-01-20 Beta Ltd. 8500 Danışmanlık"

DOĞRU çağrı:
  create_xlsx(
    filename="kaynak_dosya_dolu",
    sheets=[{
      "name": "Veriler",
      "headers": ["Tarih", "Müşteri", "Tutar (TL)", "Açıklama"],   ← AYNEN
      "rows": [
        ["2026-01-15", "Acme A.Ş.", "12000", "Lisans"],
        ["2026-01-20", "Beta Ltd.", "8500", "Danışmanlık"]
      ]
    }]
  )

YANLIŞ (sütun uydurmak): headers=["Müşteri", "Para", "Konu"]  ← KESİNLİKLE YAPMA

# Tool çağrısı genel örneği — TAKLİT ET

Kullanıcı: "Bana bir gelir raporu Excel'i hazırla" (ŞABLON YOK, yeni tablo)
Sen: (önce metin değil, ARACI ÇAĞIR)
  create_xlsx(
    filename="gelir_raporu_2026",
    sheets=[
      {"name": "Aylık Gelir", "headers": ["Ay", "Gelir (TL)"], "rows": [["Ocak", "120000"]]},
    ]
  )
Sonra metin: "Gelir raporu Excel olarak hazırlandı, indirebilirsin."

# Kurallar
1. `filename` ASCII (Türkçe karakter YOK): "maaş_raporu" değil, "maas_raporu".
2. Excel'de sayılar string olarak gönderilse bile Excel hücresi otomatik formatlar.
3. Tool çağrısından SONRA kısa bir Türkçe özet metni yaz (1-2 cümle).
4. ASLA "ben dosya üretemem" deme. Aracı çağır."""

_TOOL_REMINDER_SUFFIX = (
    "\n\n## Son Hatırlatma\n"
    "Kullanıcı dosya/tablo/rapor istediyse, METNE BAŞLAMADAN ÖNCE create_xlsx / "
    "create_docx / create_pdf araçlarından uygun olanı ÇAĞIR. Bu kural her şeyden önceliklidir."
)


def _format_node(node: ActiveNodePayload, query: str) -> str:
    parts: list[str] = []

    if node.kind == "data":
        header = f"### Veri: {node.label}"
        if node.fileName:
            header += f"  ·  Dosya: {node.fileName}"
            if node.fileType:
                header += f" ({node.fileType})"
        parts.append(header)
        if node.description:
            parts.append(node.description)

        if node.tabularMeta:
            meta = node.tabularMeta
            parts.append(
                f"**ŞABLON** — bu veri bir tablo şablonudur, kullanıcı 'doldur/ekle' isterse "
                f"sütun adları AYNEN korunmalı."
            )
            parts.append(
                f"Şema: {meta.toplam_satir} satır × {meta.toplam_sutun} sütun. "
                f"Sütunlar (BU SIRAYLA): {', '.join(meta.sutun_adlari)}"
            )
            if meta.sutunlar:
                type_lines = ", ".join(
                    f"{c.ad} → {c.tur}" for c in meta.sutunlar
                )
                parts.append(f"Sütun tipleri: {type_lines}")
            if meta.on_izleme:
                preview = json.dumps(meta.on_izleme, ensure_ascii=False, indent=2)
                parts.append(
                    f"Mevcut ilk 5 satır (sadece şema göstergesi — TEKRAR ETME):\n"
                    f"```json\n{preview}\n```"
                )

        if node.documentFileId:
            try:
                top_k = int(os.environ.get("RAG_TOP_K", "8"))
                chunks = query_document(node.documentFileId, query, top_k=top_k)
            except Exception as exc:  # pragma: no cover — RAG hatası kullanıcıyı bloklamasın
                chunks = []
                parts.append(f"_Belge sorgusunda hata oluştu: {exc}_")
            if chunks:
                parts.append("İlgili pasajlar (semantik arama):")
                for i, chunk in enumerate(chunks, 1):
                    parts.append(f"[{i}] {chunk}")
            else:
                parts.append("_Belgeden ilgili pasaj bulunamadı._")

    elif node.kind == "feature":
        task = node.taskType or "prompt"
        parts.append(f"### Görev: {node.label}  ·  Tür: {task}")
        if node.description:
            parts.append(node.description)
        if node.instruction:
            parts.append(node.instruction)

    elif node.kind == "department":
        parts.append(f"### Departman: {node.label}")
        if node.description:
            parts.append(node.description)

    return "\n".join(parts)


def _format_comments(comments: Iterable[CommentPayload]) -> str:
    rows = [f"- **{c.author}:** {c.text}" for c in comments]
    if not rows:
        return ""
    return "## Patron'dan Gözlem Notları (bağlayıcı değil)\n" + "\n".join(rows)


def build_system_prompt(req: ChatRequest) -> str:
    """Aktif bağlam + departman talimatı + (opsiyonel) Patron yorumları."""
    blocks: list[str] = [_DEFAULT_SYSTEM]

    if req.contextLabel:
        view_kind = "Şirket" if req.view.kind == "company" else "Departman"
        blocks.append(f"## Bağlam\n{view_kind}: {req.contextLabel}")

    if req.systemInstruction and req.systemInstruction.strip():
        blocks.append(f"## Sistem Talimatı\n{req.systemInstruction.strip()}")

    if req.activeNodes:
        node_blocks = [_format_node(n, req.prompt) for n in req.activeNodes]
        node_blocks = [b for b in node_blocks if b]
        if node_blocks:
            blocks.append("## Aktif Düğümler\n\n" + "\n\n".join(node_blocks))

    comments = _format_comments(req.observerComments)
    if comments:
        blocks.append(comments)

    # Reminder her zaman EN SONDA — LLM'in en taze gördüğü talimat
    blocks.append(_TOOL_REMINDER_SUFFIX)

    return "\n\n".join(blocks)
