# PromptMasters / Neuro-Agent — Proje Özeti

## Stack
- **Frontend:** Next.js 14 (static export) + React 18 + Zustand + ReactFlow + TailwindCSS
- **Desktop:** Electron 31 (frame:false, contextIsolation:true, nodeIntegration:false, sandbox:false)
- **Backend:** FastAPI 0.111 + pandas + ChromaDB 0.5 + LangChain 0.2 + pypdf + python-docx
- **Sidecar:** Electron `main.js` Python sidecar olarak `python -m uvicorn main:app` spawn ediyor (port 8000, 127.0.0.1).

## Amaç
Kullanıcı görsel olarak "beyin" oluşturuyor: Çekirdek LLM (CoreNode) + Veri (DataNode: CSV/XLSX/PDF/DOCX) + Özellik (FeatureNode). Yalnızca aktif düğümler LLM bağlamına gönderiliyor. Token tasarrufu için tablolardan sadece şema + 5 satır önizleme alınıyor; belgeler ChromaDB'ye chunk'lanıyor.

## Dil Kuralı
UI ve backend response'ları **Türkçe** olmalı (Memory Bank'ta belirtilmiş "STRICT RULE").

## Klasör Yapısı
- `app/` — Next.js app router (layout.tsx, page.tsx)
- `components/` — Sidebar, ChatInput, GraphCanvas, TitleBar; `nodes/` altında CoreNode/DataNode/FeatureNode
- `store/useStore.ts` — Zustand store (BrainNode tipi, addNode("data"|"feature")/toggleActive/removeNode)
- `hooks/useFileUpload.ts` — Electron native dialog + browser fallback upload
- `lib/utils.ts` — `cn` (clsx+twMerge), `uid`
- `types/global.d.ts` — ElectronAPI ve Window augmentation
- `electron/main.js` + `preload.js` — Native window controls + dialog + bildirim
- `backend/main.py` + `routers/` (upload.py, upload_path.py) + `services/` (tabular.py, document.py)
- `Memory Bank/` — proje dokümantasyonu (boşluklu klasör adı)

## Ek Bilgi
- ChromaDB persistent dizin: `backend/storage/chroma` (modül import'unda yaratılıyor)
- Max upload boyutu: browser 20MB / electron-path 200MB
- `next.config.js` static export (`out/`) — production'da Electron `out/index.html` yüklüyor
