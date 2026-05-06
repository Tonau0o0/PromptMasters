# 🧠 Neuro-Agent — Dinamik Bilgi Grafiği Platformu
### Mimari Plan & Geliştirme Yol Haritası

> **Bu dosya projenin tek gerçek kaynağıdır (Single Source of Truth).**
> Memory Bank ile senkronize tutulmalı; her adım tamamlandığında `[ ]` → `[x]` işaretlenmeli,
> `Son Güncelleme` ve `Durum` alanları güncellenmelidir.

**Versiyon:** 1.1.0
**Son Güncelleme:** Adım 1 öncesi — Başlangıç
**Durum:** 🔴 Henüz Başlanmadı

---

## 📋 Memory Bank Kaynak Eşlemesi

> Bu plan aşağıdaki Memory Bank dosyalarından türetilmiştir.
> Çelişki durumunda bu dosya geçerlidir.

| Memory Bank Dosyası | Kapsadığı Alan | Bu Plandaki Karşılığı |
|---|---|---|
| `projectbrief.md` | Vizyon, dil kuralı, başarı kriterleri | Bölüm 1, 2, 7 |
| `productContext.md` | Kullanıcı akışı, UX kararları | Bölüm 3, Adım 1 |
| `systemPatterns.md` | Teknik desenler, veri modeli | Bölüm 4, 5, Adım 2-3 |
| `techContext.md` | Teknoloji seçimleri, güvenlik | Bölüm 6, Adım 1-4 |
| `activeContext.md` | Güncel görev, sonraki adım | Adım 1 (aktif) |

---

## ⚠️ Kritik Proje Kuralları (Asla İhlal Edilmez)

```
1. DİL KURALI        → Tüm UI, butonlar, hata mesajları, backend yanıtları TÜRKÇE olmalı.
                        Dokümantasyon İngilizce kalabilir.

2. TOKEN KURALI      → Hiçbir dosyanın tamamı LLM'e gönderilmez.
                        Excel/CSV → Sadece şema. PDF/Word → Sadece ilgili chunk'lar.

3. HIL KURALI        → Kullanıcı prompt göndermeden önce hangi düğümlerin aktif
                        olduğunu MANUEL olarak toggle etmiş olmalıdır.
                        Sistem hiçbir düğümü otomatik aktif edemez.

4. ÇIKTI KURALI      → LLM'den gelen tüm yapısal çıktılar Function Calling ile
                        zorunlu JSON formatında alınır. Serbest metin yanıtına izin verilmez.
```

---

## 1. Proje Vizyonu

Kullanıcıların kod yazmadan görsel bir arayüz üzerinden kendi AI "Beyin Mimarilerini" (Multi-Agent + RAG sistemi) tasarlayabildikleri, **token maliyeti minimize edilmiş**, **insan kontrollü** bir orkestrasyon platformu.

**Temel metafor:** Beyin (Core LLM) + Nöronlar (Veri ve Özellik Düğümleri) + Sinapslar (Kenarlar/Edges)

**Örnek kullanım senaryosu:**
Bir kullanıcı "Muhasebe Beyni" oluşturur:
- 🧠 Merkez LLM ← bağlı → 📊 Aylık Gider Tablosu (Excel)
- 🧠 Merkez LLM ← bağlı → 📄 Vergi Mevzuatı (PDF)
- 🧠 Merkez LLM ← bağlı → ⚙️ Kâr-Zarar Hesaplama (Özellik)

Prompt gönderilmeden önce kullanıcı sadece Excel ve PDF toggle'ını açar. Sistem yalnızca bu iki düğümü bağlam olarak kullanır.

---

## 2. Mimari — Yüksek Seviye Görünüm

```
╔══════════════════════════════════════════════════════════════════════╗
║                        KULLANICI TARAYICISI                          ║
║                                                                      ║
║  ┌──────────────────────────────────────────────────────────────┐   ║
║  │  React Flow — Görsel Beyin Editörü                            │   ║
║  │                                                               │   ║
║  │   [📊 Veri Düğümü] ──sinaps──►  [🧠 Çekirdek LLM]           │   ║
║  │   [📄 Veri Düğümü] ──sinaps──►  (silinemeyen merkez)         │   ║
║  │   [⚙️ Özellik Düğümü] ─────►   [Beyin Mimarisi: "Muhasebe"] │   ║
║  │                                                               │   ║
║  │   ▼ Human-in-the-Loop Toggle Paneli ▼                        │   ║
║  │   [✓ Excel Aktif] [✓ PDF Aktif] [ ] Özellik Kapalı           │   ║
║  └──────────────────────────────────────────────────────────────┘   ║
║  ┌──────────────────────────────────────────────────────────────┐   ║
║  │  Chat Paneli                                                  │   ║
║  │  Aktif Düğümler: [Excel] [PDF]  ░░░ Prompt gönder ►          │   ║
║  └──────────────────────────────────────────────────────────────┘   ║
╚══════════════════════════════════════════════════════════════════════╝
                          │ REST API (JSON)
                          │ WebSocket (streaming, opsiyonel)
                          ▼
╔══════════════════════════════════════════════════════════════════════╗
║                         FASTAPI BACKEND                              ║
║                                                                      ║
║  ┌─────────────┐   ┌──────────────────┐   ┌──────────────────────┐ ║
║  │ /api/upload │   │  /api/chat       │   │  /api/brains         │ ║
║  │ Şema Çıkar  │   │  Ajan Orkestra   │   │  CRUD                │ ║
║  └──────┬──────┘   └────────┬─────────┘   └──────────────────────┘ ║
║         │                   │                                        ║
║  ┌──────▼───────────────────▼────────────────────────────────────┐  ║
║  │                  Önbellek Katmanı (In-Memory / Redis)          │  ║
║  └───────────────────────────────────────────────────────────────┘  ║
║                                                                      ║
║  ┌──────────────┐  ┌───────────────┐  ┌────────────────────────┐   ║
║  │  ChromaDB    │  │    SQLite     │  │  Python Sandbox        │   ║
║  │  Vektör Store│  │  Beyin + Log  │  │  (pandas kod çalıştır) │   ║
║  └──────────────┘  └───────────────┘  └────────────────────────┘   ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## 3. Kullanıcı Akışı (Human-in-the-Loop)

```
[1] Kullanıcı uygulamayı açar
     └─► Merkez 🧠 LLM düğümü ekranda hazır (silinemez)

[2] "Veri Ekle" veya "Özellik Ekle" butonuna tıklar
     └─► Yeni düğüm canvas'a düşer, merkeze sinaps çekebilir

[3] Sinaps (kenar) çekerek LLM'e bağlar
     └─► Bağlantı state'e (graphStore) kaydedilir

[4] ⚠️ KRİTİK — Prompt göndermeden önce:
     └─► NodeToggleBar'da hangi düğümlerin BU SORU için aktif
         olacağını manuel toggle eder
     └─► Aktif olmayan düğümler LLM'e hiç gönderilmez

[5] Prompt yazar ve gönderir
     └─► Request içinde: { prompt, active_node_ids: ["node_2", "node_3"] }

[6] Sonuç gelir, token sayısı ve cache durumu gösterilir

[7] Beyin kombinasyonunu "Muhasebe Beyni" adıyla kaydeder
```

---

## 4. Veri Akışı — Prompt Yaşam Döngüsü

```
Kullanıcı Prompt Gönderir
         │
         ▼
 ┌───────────────────┐
 │ [1] Aktif Düğüm   │  ← Zustand sessionStore'dan active_node_ids alınır
 │     Listesi Topla │
 └────────┬──────────┘
          │
          ▼
 ┌───────────────────┐      CACHE HIT
 │ [2] Cache Kontrol │ ─────────────────► Direkt Yanıt Döndür
 │  hash(prompt +    │                    (LLM'e GİDİLMEZ ✓)
 │  active_node_ids) │
 └────────┬──────────┘
          │ CACHE MISS
          ▼
 ┌───────────────────────────────────────────────┐
 │ [3] Düğüm Tipine Göre Context Hazırla          │
 │                                               │
 │  Excel/CSV  ──► Sadece ŞEMA + 5 satır sample  │
 │  PDF/Word   ──► Vektör DB'den Top-5 chunk      │
 │  Özellik    ──► Tool definition JSON           │
 │                                               │
 │  ⚠️ Context sınırı: max 8.000 token           │
 └────────────────────┬──────────────────────────┘
                      │
                      ▼
          ┌───────────────────────┐
          │ [4] Dinamik System    │
          │     Prompt Oluştur   │
          └──────────┬────────────┘
                     │
                     ▼
          ┌───────────────────────┐
          │ [5] LLM'e Gönder      │
          │ Function Calling ON   │
          │ Temperature: 0.1      │
          │ Strict JSON: ON       │
          └──────────┬────────────┘
                     │
                     ▼
            Tool Call Var mı?
           /              \
         EVET             HAYIR
          │                 │
          ▼                 ▼
   Python Kodu Üret    Doğrudan Yanıt
   Sandbox'ta Çalıştır
   Sonuç Al
          │
          └────────────┬───┘
                       │
                       ▼
              ┌─────────────────┐
              │ [6] Cache'e Yaz │
              └────────┬────────┘
                       │
                       ▼
              Frontend'e Döndür
              { message, tokens_used,
                cached: false, tool_calls_made }
```

---

## 5. Token Optimizasyonu Stratejileri

### 5.1 Code Interpreter Pattern (Excel / CSV)

```
❌ YAPILMAYAN: Tüm Excel dosyasını LLM'e göndermek

✅ YAPILAN:
   Adım 1 → pandas ile şema çıkar (SADECE bu gönderilir):
   {
     "dosya": "satis_2024.xlsx",
     "sutunlar": ["Tarih", "Ürün", "Miktar", "Fiyat", "Bölge"],
     "tipler":   ["datetime64", "object", "int64", "float64", "object"],
     "boyut":    [15420, 5],
     "ornek":    [ ...ilk 5 satır... ],
     "null_oran": {"Fiyat": 0.02, "Bölge": 0.0}
   }

   Adım 2 → LLM bu şemaya bakarak kod üretir:
   df.groupby('Bölge')['Fiyat'].sum().sort_values(ascending=False)

   Adım 3 → Backend kodu güvenli sandbox'ta çalıştırır
   Adım 4 → Sonuç JSON olarak döner

   Token Tasarrufu: ~%95
   (15.000 satır × 5 sütun = 75.000 hücre yerine ~200 token şema)
```

### 5.2 Semantik RAG (PDF / Word)

```
Yükleme anında:
  pdfplumber → metin çıkar
  unstructured → semantik chunking (chunk: 512 token, overlap: 64)
  sentence-transformers → embedding
  ChromaDB → düğüm_id koleksiyonuna kaydet

Soru anında:
  Soruyu embed et → cosine similarity → Top-5 chunk
  Sadece bu 5 chunk LLM'e gider

  200 sayfalık PDF (~150.000 token) → ~2.500 token gönderilir
  Token Tasarrufu: ~%98
```

### 5.3 Önbellekleme Katmanları

| Cache Türü | Anahtar | TTL | Etki |
|---|---|---|---|
| **Prompt Cache** | `sha256(prompt + sorted(active_node_ids))` | 60 dk | Aynı sorgu tekrar edilirse LLM'e gidilmez |
| **Şema Cache** | `sha256(dosya_adı + mtime)` | Kalıcı | Her yüklemede şema yeniden çıkarılmaz |
| **Kod Cache** | `sha256(şema + görev_tipi)` | 24 saat | Aynı şema + görev için kod yeniden üretilmez |
| **Chunk Cache** | `sha256(dosya_adı + mtime)` | Kalıcı | Her sorguda vektörizasyon tekrarlanmaz |

### 5.4 Katı JSON Çıktı Kontrolü

```python
# Tüm Feature düğümlerinin tool tanımı bu kalıpla yazılır
{
  "name": "kar_zarar_hesapla",
  "description": "Verilen veri şemasına göre kâr/zarar raporu üret",
  "parameters": {
    "type": "object",
    "properties": {
      "sonuc_tablosu": { "type": "array", "items": { "$ref": "#/$defs/SatirItem" } },
      "ozet":          { "type": "string", "maxLength": 300 },
      "toplam_kar":    { "type": "number" }
    },
    "required": ["sonuc_tablosu", "ozet", "toplam_kar"],
    "additionalProperties": false   # ← Chain-of-Thought gevezeliği engellenir
  }
}
```

---

## 6. Teknoloji Yığını

| Katman | Teknoloji | Versiyon | Amaç |
|---|---|---|---|
| **Frontend** | Next.js (App Router) | 14.x | Ana uygulama |
| **Görsel Editör** | React Flow | 11.x | Düğüm/kenar arayüzü |
| **State** | Zustand | 4.x | Graf + aktif düğüm + chat state |
| **Stil** | Tailwind CSS | 3.x | Utility-first CSS |
| **UI Bileşenleri** | Shadcn/UI + Radix UI | latest | Erişilebilir bileşenler |
| **Backend** | FastAPI | 0.110+ | REST API |
| **AI Framework** | LangChain | 0.2+ | Ajan, RAG, Tool Calling |
| **Vektör DB** | ChromaDB | 0.5+ | PDF/Word semantik arama |
| **İlişkisel DB** | SQLite + SQLAlchemy | — | Beyin mimarileri, log |
| **Excel/CSV** | pandas + openpyxl | — | Şema çıkarma |
| **PDF** | pdfplumber / PyPDF2 | — | Metin çıkarma |
| **Word** | python-docx | — | .docx işleme |
| **Chunking** | Unstructured | — | Semantik parçalama |
| **Embedding** | sentence-transformers | — | Vektör üretimi |
| **Önbellek** | Python dict (→ Redis) | — | Response cache |

---

## 7. Veri Modeli

### 7.1 SQLite Şeması

```sql
-- Kayıtlı Beyin Mimarileri
CREATE TABLE brains (
    id          TEXT PRIMARY KEY,       -- UUID v4
    name        TEXT NOT NULL,          -- "Muhasebe Beyni"
    description TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Düğümler (Nöronlar)
CREATE TABLE nodes (
    id           TEXT PRIMARY KEY,
    brain_id     TEXT NOT NULL REFERENCES brains(id) ON DELETE CASCADE,
    type         TEXT NOT NULL CHECK(type IN ('core_llm','data','feature')),
    label        TEXT NOT NULL,         -- Türkçe: "Aylık Gider Tablosu"
    data_type    TEXT CHECK(data_type IN ('excel','csv','pdf','word',NULL)),
    file_path    TEXT,                  -- /uploads/{node_id}/{dosya_adi}
    config       TEXT,                  -- JSON: şema | tool_definition
    is_deletable BOOLEAN DEFAULT TRUE,  -- core_llm için FALSE
    position_x   REAL DEFAULT 0,
    position_y   REAL DEFAULT 0
);

-- Bağlantılar (Sinapslar)
CREATE TABLE edges (
    id        TEXT PRIMARY KEY,
    brain_id  TEXT NOT NULL REFERENCES brains(id) ON DELETE CASCADE,
    source_id TEXT NOT NULL REFERENCES nodes(id),
    target_id TEXT NOT NULL REFERENCES nodes(id),
    UNIQUE(source_id, target_id)
);

-- Sohbet Geçmişi & Token Logu
CREATE TABLE chat_history (
    id              TEXT PRIMARY KEY,
    brain_id        TEXT REFERENCES brains(id),
    role            TEXT NOT NULL CHECK(role IN ('user','assistant')),
    content         TEXT NOT NULL,
    active_node_ids TEXT,               -- JSON: ["node_2","node_3"]
    tokens_used     INTEGER DEFAULT 0,
    cached          BOOLEAN DEFAULT FALSE,
    tool_calls_made TEXT,               -- JSON: ["pandas_code_tool"]
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Cache Tablosu (Redis yoksa)
CREATE TABLE response_cache (
    cache_key  TEXT PRIMARY KEY,        -- sha256 hash
    response   TEXT NOT NULL,           -- JSON yanıt
    expires_at DATETIME NOT NULL,
    hit_count  INTEGER DEFAULT 0
);
```

### 7.2 Frontend Veri Modeli (TypeScript)

```typescript
// store/graphStore.ts — Zustand state şekli
type NodeType  = 'core_llm' | 'data' | 'feature';
type DataType  = 'excel' | 'csv' | 'pdf' | 'word' | null;

interface NeuroNode {
  id:          string;
  type:        NodeType;
  label:       string;               // Türkçe etiket
  dataType:    DataType;
  filePath?:   string;
  config?:     Record<string, unknown>; // şema veya tool tanımı
  isDeletable: boolean;
  position:    { x: number; y: number };
}

interface NeuroEdge {
  id:     string;
  source: string;
  target: string;
}

interface Brain {
  id:           string;
  name:         string;              // "Muhasebe Beyni"
  description?: string;
  nodes:        NeuroNode[];
  edges:        NeuroEdge[];
}

// store/sessionStore.ts — Human-in-the-Loop state
interface SessionState {
  activeNodeIds: Set<string>;
  toggleNode:    (id: string) => void;
  clearActive:   () => void;
  isActive:      (id: string) => boolean;
}
```

---

## 8. Proje Dizin Yapısı

```
neuro-agent/
│
├── ARCHITECTURE.md                    ← Bu dosya (tek gerçek kaynak)
├── memory-bank/
│   ├── activeContext.md
│   ├── productContext.md
│   ├── projectbrief.md
│   ├── systemPatterns.md
│   └── techContext.md
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx                   ← Ana sayfa (canvas + chat)
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── BrainCanvas.tsx        ← React Flow wrapper
│   │   │   ├── nodes/
│   │   │   │   ├── CoreLLMNode.tsx    ← Silinemeyen merkez beyin
│   │   │   │   ├── DataNode.tsx       ← Excel/PDF/CSV düğümü
│   │   │   │   └── FeatureNode.tsx    ← Araç/özellik düğümü
│   │   │   └── edges/
│   │   │       └── SynapseEdge.tsx    ← Özel sinaps görünümü
│   │   ├── chat/
│   │   │   ├── ChatPanel.tsx          ← Sohbet arayüzü
│   │   │   ├── NodeToggleBar.tsx      ← HiL: aktif düğüm seçici
│   │   │   └── MessageBubble.tsx
│   │   ├── sidebar/
│   │   │   ├── Sidebar.tsx            ← Kayıtlı beyin listesi
│   │   │   └── SaveBrainModal.tsx
│   │   └── ui/                        ← Shadcn bileşenleri
│   ├── store/
│   │   ├── graphStore.ts              ← Düğümler + kenarlar
│   │   ├── sessionStore.ts            ← Aktif düğüm ID'leri (HiL)
│   │   └── chatStore.ts               ← Mesajlar + yükleme durumu
│   ├── lib/
│   │   ├── api.ts                     ← Backend API çağrıları
│   │   └── utils.ts
│   └── package.json
│
├── backend/
│   ├── main.py                        ← CORS, router kayıtları
│   ├── routers/
│   │   ├── chat.py                    ← POST /api/chat
│   │   ├── upload.py                  ← POST /api/upload
│   │   └── brains.py                  ← CRUD /api/brains
│   ├── services/
│   │   ├── llm_orchestrator.py        ← Dinamik prompt + ajan
│   │   ├── rag_service.py             ← PDF/Word vektörizasyon
│   │   ├── schema_extractor.py        ← Excel/CSV şema çıkarma
│   │   ├── code_executor.py           ← Güvenli Python sandbox
│   │   └── cache_service.py           ← Cache CRUD
│   ├── models/
│   │   ├── database.py                ← SQLAlchemy + SQLite
│   │   └── schemas.py                 ← Pydantic modelleri
│   ├── vector_store/                  ← ChromaDB kalıcı dizin
│   ├── uploads/                       ← Yüklenen dosyalar
│   ├── .env.example
│   └── requirements.txt
│
└── docker-compose.yml                 ← (Opsiyonel) Geliştirme ortamı
```

---

## 9. API Sözleşmesi

```
POST /api/chat
  İstek:  { brain_id, prompt, active_node_ids: string[] }
  Yanıt:  { mesaj, kullanilan_token, onbellekten, cagirilan_araclar: string[] }

POST /api/upload
  İstek:  multipart/form-data (file, node_id, brain_id)
  Yanıt:  { node_id, dosya_yolu, sema? }       ← Excel/CSV'de şema döner

POST /api/upload/vectorize
  İstek:  { node_id }
  Yanıt:  { durum: "isleniyor" | "tamamlandi" | "hata", parca_sayisi? }

GET  /api/nodes/{node_id}/status
  Yanıt:  { vektorlendi: bool, parca_sayisi: int, sema: object | null }

GET  /api/brains
  Yanıt:  Brain[]

POST /api/brains
  İstek:  { isim, aciklama, dugumler, kenarlar }
  Yanıt:  Brain

PUT  /api/brains/{id}
  İstek:  Partial<Brain>
  Yanıt:  Brain

DELETE /api/brains/{id}
  Yanıt:  { silindi: true }

GET  /api/stats
  Yanıt:  { toplam_token, onbellek_isabet_orani, dugum_basi_maliyet }
```

---

## 10. Güvenlik Gereksinimleri

| Kural | Detay |
|---|---|
| **Dosya boyutu** | Maksimum 50MB per yükleme |
| **İzin verilen uzantılar** | .xlsx, .csv, .pdf, .docx |
| **Sandbox ağ erişimi** | Kapalı (network isolation) |
| **Sandbox modülleri** | Sadece: pandas, numpy, json, datetime |
| **Sandbox zaman aşımı** | 30 saniye |
| **Sandbox bellek limiti** | 256MB |
| **API anahtarları** | `.env` dosyasında, frontend'e asla gönderilmez |
| **Dosya ismi** | UUID ile yeniden adlandırılır (path traversal koruması) |

---

## 11. Başarı Metrikleri

| Metrik | Hedef | Ölçüm Yöntemi |
|---|---|---|
| Excel/CSV token tasarrufu | ≥ %90 | şema_token / dosya_token karşılaştırması |
| PDF chunk gönderimi | ≤ 5 chunk / istek | chat_history.tool_calls_made logu |
| Cache hit oranı | ≥ %70 (tekrarlayan sorgu) | response_cache.hit_count / toplam |
| Ortalama yanıt süresi | ≤ 3 saniye | Backend response time log |
| Cache'li yanıt süresi | ≤ 200ms | Backend response time log |
| HiL kural ihlali | 0 | Aktif olmayan düğüm asla context'e girmemeli |

---

## 12. Geliştirme Adımları ve Alt Görevler

> **Ajan Kullanım Talimatı:**
> Her adım başında `activeContext.md` güncellenir.
> Alt görevler `[ ]` ile işaretlidir; tamamlananlar `[x]` yapılır.
> Adımlar sıralıdır — önceki tamamlanmadan sonrakine geçilmez.

---

### 🟡 ADIM 1 — Frontend: Görsel Beyin Editörü
**Hedef:** Çalışan React Flow canvas + toggle mekanizması + yerel kayıt
**Aktif Context:** `activeContext.md` → "Active Task (Step 1)"
**Bağımlılık:** Yok (başlangıç adımı)

#### 1.1 — Proje Kurulumu
- [ ] `create-next-app@14` ile Next.js projesi oluştur (TypeScript, App Router, Tailwind)
- [ ] Bağımlılıkları kur: `reactflow@11`, `zustand@4`, `shadcn/ui`, `@radix-ui/react-*`, `lucide-react`, `uuid`
- [ ] Tailwind konfigürasyonu, font ve global CSS
- [ ] `.env.local` ve `.env.example` dosyaları (`NEXT_PUBLIC_API_URL`)

#### 1.2 — Zustand Store Katmanı
- [ ] `store/graphStore.ts` → nodes[], edges[], addNode, removeNode, updateNodeConfig, connectNodes, loadBrain, saveBrain
- [ ] `store/sessionStore.ts` → activeNodeIds: Set\<string\>, toggleNode, clearActive, isActive
- [ ] `store/chatStore.ts` → messages[], isLoading, error, addMessage, clearChat

#### 1.3 — Özel Düğüm Bileşenleri
- [ ] `nodes/CoreLLMNode.tsx` → 🧠 Merkez beyin; tutamaçlar her yönde; silinemez (isDeletable: false)
- [ ] `nodes/DataNode.tsx` → Dosya tipi ikonu (📊 Excel, 📄 PDF, 📋 CSV); "Veri Yüklenmedi" durumu; toggle durumu renk göstergesi
- [ ] `nodes/FeatureNode.tsx` → ⚙️ ikonu; tool açıklaması; aktif/pasif görsel feedback
- [ ] `edges/SynapseEdge.tsx` → Animasyonlu, renkli sinaps görünümü

#### 1.4 — Canvas ve Çalışma Alanı
- [ ] `canvas/BrainCanvas.tsx` → React Flow wrapper; custom node tipleri kayıtlı; minimap; kontroller
- [ ] "Veri Ekle" butonu → DataNode oluştur, canvas'a ekle
- [ ] "Özellik Ekle" butonu → FeatureNode oluştur, canvas'a ekle
- [ ] Düğüm silme → core_llm silinemez; diğerleri onay ile silinebilir
- [ ] Kenar çizme → düğümden merkeze veya serbest bağlantı

#### 1.5 — Human-in-the-Loop Toggle Paneli
- [ ] `chat/NodeToggleBar.tsx` → Bağlı her düğüm için toggle buton; aktif = yeşil; pasif = gri
- [ ] Hiç aktif düğüm yoksa "Gönder" butonu disabled + Türkçe uyarı: *"Lütfen en az bir düğümü etkinleştirin"*
- [ ] Aktif düğüm sayısı badge göstergesi

#### 1.6 — Chat Paneli
- [ ] `chat/ChatPanel.tsx` → Mesaj listesi; kullanıcı/asistan balonları; input + gönder
- [ ] `chat/MessageBubble.tsx` → token_used ve cache durumu küçük badge olarak gösterilir
- [ ] Yükleme durumu (iskelet animasyonu)

#### 1.7 — Sidebar ve Beyin Kaydetme
- [ ] `sidebar/Sidebar.tsx` → Kayıtlı beyin listesi; tıklayınca yükle
- [ ] `sidebar/SaveBrainModal.tsx` → İsim + açıklama input; kaydet → localStorage (Adım 4'te API'ye taşınır)
- [ ] Beyin yüklenince canvas ve chat sıfırlanır

**✅ Adım 1 Tamamlanma Kriteri:**
Canvas'ta düğüm oluşturulabiliyor → sinaps çekilebiliyor → toggle edilebiliyor → aktif düğüm yokken "Gönder" disabled → beyin localStorage'a kaydedilip yüklenebiliyor.

---

### ⬜ ADIM 2 — Backend: İskelet ve Veri İşleme
**Hedef:** FastAPI çalışıyor; şema çıkarma ve RAG pipeline hazır
**Bağımlılık:** Adım 1 tamamlanmış olmalı

#### 2.1 — FastAPI Kurulumu
- [ ] `backend/` dizini; `requirements.txt` (fastapi, uvicorn, langchain, chromadb, pandas, pdfplumber, python-docx, unstructured, sentence-transformers, sqlalchemy)
- [ ] `main.py` → CORS (localhost:3000), router kayıtları, lifespan eventi
- [ ] `GET /health` → `{ "durum": "çalışıyor" }`
- [ ] `.env.example` → OPENAI_API_KEY (veya tercih edilen LLM sağlayıcısı)

#### 2.2 — Şema Çıkarma (Excel / CSV)
- [ ] `services/schema_extractor.py`
  - [ ] `extract_excel_schema(file_path)` → sütunlar, tipler, boyut, ilk 5 satır, null oranları
  - [ ] `extract_csv_schema(file_path)` → aynı çıktı formatı
- [ ] `POST /api/upload` → dosyayı UUID ile kaydet → tipi belirle → şema çıkar → node_id ile ilişkilendir
- [ ] Şemayı SQLite `nodes.config` alanına yaz

#### 2.3 — RAG Pipeline (PDF / Word)
- [ ] `services/rag_service.py`
  - [ ] `extract_text_from_pdf(file_path)` → pdfplumber
  - [ ] `extract_text_from_docx(file_path)` → python-docx
  - [ ] `chunk_text(text, chunk_size=512, overlap=64)` → semantik bölümleme
  - [ ] `vectorize_and_store(chunks, collection_name=node_id)` → ChromaDB
  - [ ] `similarity_search(query, collection_name, top_k=5)` → ilgili chunk'ları döndür
- [ ] `POST /api/upload/vectorize` → arka planda vektörizasyon başlat
- [ ] `GET /api/nodes/{node_id}/status` → vektörizasyon durumunu döndür

#### 2.4 — Pydantic Şemaları
- [ ] `models/schemas.py` → UploadResponse, NodeStatus, ChatRequest, ChatResponse, BrainCreate, BrainUpdate
- [ ] Tüm hata mesajları Türkçe

#### 2.5 — Kod Çalıştırma Sandbox
- [ ] `services/code_executor.py`
  - [ ] İzin verilen import listesi (whitelist)
  - [ ] `exec()` kısıtlı globals ile güvenli çalıştırma
  - [ ] 30 saniye timeout (threading.Timer)
  - [ ] Sonucu JSON'a serialize et
  - [ ] Hata: *"Kod çalıştırma hatası: ..."*

**✅ Adım 2 Tamamlanma Kriteri:**
`/health` çalışıyor → Excel yüklenince şema dönüyor → PDF yüklenince vektörizasyon başlıyor → status endpoint durumu bildiriyor.

---

### ⬜ ADIM 3 — LLM: Ajan ve Orkestrasyon
**Hedef:** Aktif düğümlere göre dinamik prompt + tool calling + cache
**Bağımlılık:** Adım 2 tamamlanmış olmalı

#### 3.1 — LLM Orkestratörü
- [ ] `services/llm_orchestrator.py`
  - [ ] `build_system_prompt(active_nodes)` → düğüm tiplerine göre dinamik prompt
  - [ ] `build_tools(active_nodes)` → sadece aktif feature düğümlerinin tool tanımları
  - [ ] `build_context(active_nodes, user_query)` → Excel şemaları + PDF chunk'ları birleştir; max 8.000 token
  - [ ] `run(brain_id, prompt, active_node_ids)` → tam orkestrasyon döngüsü

#### 3.2 — Standart Tool Tanımları
- [ ] `pandas_code_tool` → Excel şemasına bakarak pandas kodu üret, sandbox'ta çalıştır
- [ ] `document_search_tool` → ChromaDB'den similarity search yap
- [ ] `json_report_tool` → Katı JSON rapor çıktısı (şablon doldurma)

#### 3.3 — Cache Servisi
- [ ] `services/cache_service.py`
  - [ ] `get(prompt_hash)` → cache tablosundan al; yoksa None
  - [ ] `set(prompt_hash, response, ttl_seconds)` → yaz + hit_count başlat
  - [ ] `invalidate_node(node_id)` → düğüm değişince ilgili cache'leri temizle
  - [ ] `cleanup_expired()` → süresi dolmuş kayıtları sil

#### 3.4 — Chat Endpoint
- [ ] `routers/chat.py` → `POST /api/chat`
  - [ ] Cache kontrolü (önce bak, varsa direkt dön)
  - [ ] Context hazırlama (düğüm tiplerine göre)
  - [ ] LLM çağrısı (temperature: 0.1, function_calling: required)
  - [ ] Tool call varsa sandbox çalıştır
  - [ ] Yanıtı cache'e yaz
  - [ ] chat_history tablosuna token + cache logu yaz
  - [ ] Response: `{ mesaj, kullanilan_token, onbellekten, cagirilan_araclar }`

#### 3.5 — Frontend Entegrasyonu
- [ ] `lib/api.ts` → `sendChat(payload)` fonksiyonu; NEXT_PUBLIC_API_URL env'den alınsın
- [ ] ChatPanel'i gerçek API'ye bağla; mock data kaldır
- [ ] MessageBubble'da token sayısı ve cache badge'i göster

**✅ Adım 3 Tamamlanma Kriteri:**
Gerçek prompt gönderilebiliyor → Excel aktifse sadece şema gidiyor → PDF aktifse Top-5 chunk gidiyor → aynı prompt ikinci kez gönderildiğinde *"önbellekten"* etiketi geliyor.

---

### ⬜ ADIM 4 — Kalıcı Depolama ve Canlıya Alma
**Hedef:** Tüm veriler SQLite'ta; beyin mimarileri API üzerinden yönetiliyor
**Bağımlılık:** Adım 3 tamamlanmış olmalı

#### 4.1 — SQLite / SQLAlchemy Kurulumu
- [ ] `models/database.py` → SQLAlchemy engine, session factory, Base
- [ ] ORM modelleri: Brain, Node, Edge, ChatHistory, ResponseCache
- [ ] Alembic ile migration → ilk migration dosyası oluştur, çalıştır

#### 4.2 — Beyin CRUD API
- [ ] `GET  /api/brains` → tüm kayıtlı beyin listesi
- [ ] `POST /api/brains` → yeni beyin (nodes + edges ile birlikte)
- [ ] `PUT  /api/brains/{id}` → güncelle
- [ ] `DELETE /api/brains/{id}` → sil + bağlı dosyalar + ChromaDB koleksiyonları temizle

#### 4.3 — Frontend'i API'ye Taşı
- [ ] `store/graphStore.ts` → localStorage yerine `GET/PUT /api/brains` kullan
- [ ] Auto-save: canvas değiştikten 2 saniye sonra `PUT /api/brains/{id}` (debounce)
- [ ] İlk yüklemede `GET /api/brains` ile sidebar doldur
- [ ] Yükleme / kaydetme toast bildirimi (Türkçe)

#### 4.4 — Operasyonel İyileştirmeler
- [ ] Süresi dolmuş cache girişlerini temizleyen startup event
- [ ] `GET /api/stats` → toplam token, cache hit oranı, düğüm başına maliyet
- [ ] Frontend'de header istatistik widget'ı

**✅ Adım 4 Tamamlanma Kriteri:**
Uygulama yeniden başlatılınca tüm beyin mimarileri + sohbet geçmişi + yüklü dosyalar korunuyor. Cache hit oranı loglanıyor ve ekranda görünüyor.

---

## 13. Memory Bank Karşılaştırma Kaydı

> Önceki ARCHITECTURE.md ile Memory Bank dosyaları karşılaştırılarak yapılan eklemeler.

| Alan | Önceki Durum | Bu Versiyonda |
|---|---|---|
| **Dil kuralı** | Yalnızca projectbrief.md'de | Bölüm 0 Kritik Kurallar'a alındı |
| **HiL zorlaması** | Kavramsal tanım | Adım 1.5'te somut UI görevi olarak yazıldı |
| **TypeScript veri modeli** | Yoktu | Bölüm 7.2 eklendi |
| **API sözleşmesi** | Dağınık endpoint listesi | Bölüm 9'da konsolide edildi, Türkçe yanıt isimleri |
| **Silme cascade** | Yoktu | DB şemasına `ON DELETE CASCADE` eklendi |
| **Dosya güvenliği** | Boyut sınırı | UUID yeniden adlandırma + whitelist eklendi |
| **Adım bağımlılıkları** | Yoktu | Her adım başına "Bağımlılık" satırı eklendi |
| **Tamamlanma kriterleri** | Yoktu | Her adım sonuna eklendi |
| **Memory Bank eşlemesi** | Yoktu | Bölüm "Kaynak Eşlemesi" tablosu eklendi |
| **Cache tablosu** | Sadece servis | SQLite şemasına `response_cache` tablosu eklendi |
| **Null değer oranı** | Yoktu | Şema çıkarma görevine eklendi |
| **Stats endpoint** | Yoktu | `GET /api/stats` + Adım 4.4'e eklendi |

---

*Son Güncelleme: Adım 1 başlangıcı — tüm görevler açık*
*Aktif Adım: 1 — Frontend*
*Memory Bank Sync: ✅ v1.1.0*