# Build & Run

Neuro-Agent dev ve prod akışları. Hem **frontend** (Next.js + Electron) hem **backend** (FastAPI + ChromaDB) tek pakette taşınır.

---

## Önkoşullar

| Araç | Sürüm | Niye |
|------|-------|------|
| **Node.js** | ≥ 18 | Next.js 14, Electron 31 |
| **uv** | son | Python paket yönetimi (https://docs.astral.sh/uv/) |
| **Python** | 3.11+ (uv otomatik kurar) | Backend runtime |

> Kullanıcı tarafında **uv kurulumu yalnızca dev için gerekir**. Prod build PyInstaller ile standalone binary üretir; son kullanıcının makinesinde Python yoktur.

---

## Geliştirme (dev)

```bash
# 1. Backend bağımlılıkları (uv otomatik venv oluşturur)
uv sync

# 2. Frontend bağımlılıkları
npm install

# 3. Hepsini başlat
npm run electron:dev
```

`npm run electron:dev` üç şey yapar:

1. `next dev` → http://localhost:3000
2. `wait-on` ile Next hazır olunca Electron'u başlatır
3. Electron `main.js` `uv run uvicorn main:app` ile FastAPI sidecar'ı 127.0.0.1:8000'de açar
4. **Splash window** ekranda kalır → backend `/health` 200 dönene kadar bekler → `MainWindow`'a geçilir

> Backend log'ları electron stdout'una yönlendirilir (sadece dev). Sorun olursa Electron'un dev tools'unu açın veya `electron:dev` çıktısına bakın.

---

## Production build

### Adım 1: Backend binary

```bash
npm run backend:build
```

Bu komut:

- `uv run --group dev pyinstaller backend/main.spec` çalıştırır
- `dist-backend/neuro-backend/` altına `neuro-backend(.exe)` + `_internal/` üretir
- ChromaDB, langchain, sentence-transformers paketleri için **hidden imports** otomatik toplanır (bkz. `backend/main.spec`)

**Boyut:** ~500–800 MB (sentence-transformers/torch ağır). UPX kapalı çünkü Windows AV false-positive verebiliyor.

> İlk build ~5-10 dk sürebilir. Sonraki build'ler `build-backend/` cache'i sayesinde hızlanır.

### Adım 2: Tam paket

```bash
npm run electron:build
```

Bu sırasıyla:

1. `npm run backend:build` (yukarıdaki)
2. `next build` → `out/` static export
3. `electron-builder --config electron-builder.yml`

Çıktı: `dist-electron/`

| Platform | Hedef | Dosya |
|----------|-------|-------|
| Windows | NSIS installer | `Neuro-Agent Setup x.y.z.exe` |
| macOS | DMG | `Neuro-Agent-x.y.z.dmg` |
| Linux | AppImage | `Neuro-Agent-x.y.z.AppImage` |

Backend binary `<resources>/backend-bin/` altında bulunur (bkz. `electron-builder.yml > extraResources`).

---

## Mimari özeti

```
┌──────────────────────────────────────────────────────┐
│  Electron (main.js)                                  │
│  ├─ Splash window (splash.html)                      │
│  ├─ /health polling (60s timeout, 400ms interval)    │
│  └─ Main window (renderer)                           │
│      ├─ Next.js (dev: localhost:3000, prod: out/)    │
│      └─ preload.js (IPC köprüsü)                     │
│           └─ window.electronAPI                       │
│                                                       │
│  FastAPI Sidecar (127.0.0.1:8000)                    │
│  ├─ Dev:  uv run uvicorn main:app                    │
│  └─ Prod: backend-bin/neuro-backend(.exe)            │
└──────────────────────────────────────────────────────┘
```

---

## Doğrulama

```bash
# Frontend tip kontrolü
npx tsc --noEmit

# Backend sintaks
uv run python -c "import ast; [ast.parse(open(f).read()) for f in ['backend/main.py','backend/schemas.py']]"

# Backend smoke test (port 8000'de bir şey yoksa)
uv run uvicorn backend.main:app --host 127.0.0.1 --port 8000
curl http://127.0.0.1:8000/health
```

---

## Sık karşılaşılan sorunlar

### "uv Bulunamadı" hatası (dev)

Electron startup'ta gösterilir. `uv` PATH'te olmalı:
- Windows: `winget install --id=astral-sh.uv -e` veya https://docs.astral.sh/uv/getting-started/installation/
- macOS/Linux: `curl -LsSf https://astral.sh/uv/install.sh | sh`

### "Backend Başlatılamadı" hatası (prod)

`/health` 60 saniyede yanıt vermedi. Olası nedenler:
- 8000 portu başka bir uygulama tarafından tutulmuş → ileride dinamik port atama yapılacak
- PyInstaller build bozuk → `npm run backend:build` tekrar çalıştırın
- ChromaDB ilk açılışta `<userData>/chroma` veya `backend/storage/chroma` oluşturmaya çalışıyor; izin sorunu varsa loglara bakın

### `dist-electron/` veya `dist-backend/` çok büyük

Beklenen davranış. UPX kapalı, sentence-transformers PyTorch + tokenizers Rust binding getiriyor. İlerideki optimizasyonlar:
- ONNX Runtime'a geçiş + sentence-transformers yerine ONNX modeli
- `excludes` listesini genişletmek (`backend/main.spec`)

---

## Geliştirilebilir alanlar (sonraki turda)

- Auto-updater (`electron-updater` + GitHub Releases)
- Code signing (Windows Authenticode, macOS notarization)
- Native menü (`Menu.buildFromTemplate`) ve klavye kısayolları
- Dinamik port atama (port 8000 dolu ise rastgele aç + renderer'a IPC ile bildir)
- ChromaDB'nin `userData/` altında saklanması (prod'da `resourcesPath` read-only)
