const { app, BrowserWindow, ipcMain, dialog, Notification, net } = require("electron");
const { spawn, execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const IS_DEV = !app.isPackaged;
const FASTAPI_PORT = 8000;
const NEXT_PORT = 3000;
const HEALTH_URL = `http://127.0.0.1:${FASTAPI_PORT}/health`;
const HEALTH_TIMEOUT_MS = 60_000;
const HEALTH_INTERVAL_MS = 400;

let mainWindow = null;
let splashWindow = null;
let fastapiProcess = null;

// Backend'in stderr'ini biriktir; health-check fail olursa son N bayt'ı dialog'da göster.
let backendStderr = "";
const STDERR_BUFFER_LIMIT = 8 * 1024;
let spawnError = null; // 'spawn ENOENT' gibi anlık spawn hataları

// ─── FastAPI Sidecar ──────────────────────────────────────────────────────────

function getProjectRoot() {
  return IS_DEV ? path.join(__dirname, "..") : process.resourcesPath;
}

function getDevBackendDir() {
  return path.join(__dirname, "..", "backend");
}

function getProdBackendBinaryPath() {
  const exeName = process.platform === "win32" ? "neuro-backend.exe" : "neuro-backend";
  return path.join(process.resourcesPath, "backend-bin", exeName);
}

/**
 * Dev: `uv run uvicorn main:app` — pyproject.toml + uv.lock kullanır.
 * Prod: PyInstaller ile paketlenmiş standalone binary (Python kurulumu gerekmez).
 */
function getSpawnConfig() {
  if (IS_DEV) {
    return {
      cmd: "uv",
      args: [
        "run",
        "uvicorn",
        "main:app",
        "--host", "127.0.0.1",
        "--port", String(FASTAPI_PORT),
        "--no-access-log",
      ],
      cwd: getDevBackendDir(),
      env: { ...process.env, UV_PROJECT_ROOT: getProjectRoot() },
    };
  }
  const binPath = getProdBackendBinaryPath();
  return {
    cmd: binPath,
    args: [],
    cwd: path.dirname(binPath),
    env: {
      ...process.env,
      NEURO_BACKEND_PORT: String(FASTAPI_PORT),
      NEURO_BACKEND_HOST: "127.0.0.1",
    },
  };
}

/**
 * Pre-flight cleanup: 127.0.0.1:FASTAPI_PORT'ta dinleyen önceki bir process
 * (zombi uvicorn / önceki Electron oturumundan kalan) varsa ÖLDÜR.
 * Bu olmadan port çakışması yaşanır ve yeni uvicorn 1 saniyede ölür.
 */
function killStalePortListener(port) {
  if (process.platform === "win32") {
    try {
      const out = execFileSync("netstat", ["-ano"], { encoding: "utf-8" });
      const pids = new Set();
      for (const line of out.split("\n")) {
        // TCP    127.0.0.1:8000   ...    LISTENING    1234
        const m = line.match(/TCP\s+127\.0\.0\.1:(\d+)\s+\S+\s+LISTENING\s+(\d+)/);
        if (m && Number(m[1]) === port) pids.add(m[2]);
      }
      for (const pid of pids) {
        try {
          execFileSync("taskkill", ["/F", "/T", "/PID", pid], { stdio: "ignore" });
          console.log(`[Cleanup] Port ${port} dinleyen zombi PID ${pid} öldürüldü`);
        } catch {
          /* zaten öldü */
        }
      }
    } catch {
      /* netstat çıktısı yok = port boş, sorun değil */
    }
  } else {
    try {
      const out = execFileSync("lsof", ["-ti", `:${port}`], { encoding: "utf-8" });
      for (const pid of out.trim().split("\n").filter(Boolean)) {
        try {
          execFileSync("kill", ["-9", pid], { stdio: "ignore" });
          console.log(`[Cleanup] Port ${port} zombi PID ${pid} öldürüldü`);
        } catch { /* */ }
      }
    } catch { /* */ }
  }
}

function startFastAPI() {
  backendStderr = "";
  spawnError = null;

  // Önce port temizle — bir önceki oturumdan zombi varsa öldür
  killStalePortListener(FASTAPI_PORT);

  const { cmd, args, cwd, env } = getSpawnConfig();
  console.log("[FastAPI] Başlatılıyor:", cmd, args.join(" "), "cwd=", cwd);

  fastapiProcess = spawn(cmd, args, {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    env,
    shell: false,
  });

  fastapiProcess.stdout.on("data", (d) => {
    const s = d.toString();
    if (IS_DEV) console.log("[FastAPI]", s.trim());
    backendStderr = (backendStderr + s).slice(-STDERR_BUFFER_LIMIT);
  });

  fastapiProcess.stderr.on("data", (d) => {
    const s = d.toString();
    if (IS_DEV) console.error("[FastAPI]", s.trim());
    backendStderr = (backendStderr + s).slice(-STDERR_BUFFER_LIMIT);
  });

  fastapiProcess.on("error", (err) => {
    spawnError = err;
    console.error("[FastAPI] Spawn hatası:", err.message);
  });

  fastapiProcess.on("exit", (code, signal) => {
    if (code !== 0 && signal !== "SIGTERM") {
      console.error(`[FastAPI] Beklenmedik çıkış: kod=${code} sinyal=${signal}`);
    }
    fastapiProcess = null;
  });
}

function killFastAPI() {
  if (!fastapiProcess) return;
  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(fastapiProcess.pid), "/T", "/F"]);
    } else {
      fastapiProcess.kill("SIGTERM");
    }
  } catch {
    /* already gone */
  }
  fastapiProcess = null;
}

// ─── Health-check polling ─────────────────────────────────────────────────────

function pingHealth() {
  return new Promise((resolve) => {
    const req = net.request({ method: "GET", url: HEALTH_URL });
    req.on("response", (res) => {
      res.on("data", () => {});
      res.on("end", () => resolve(res.statusCode === 200));
    });
    req.on("error", () => resolve(false));
    req.end();
  });
}

async function waitForBackendReady() {
  const start = Date.now();
  while (Date.now() - start < HEALTH_TIMEOUT_MS) {
    // Spawn fail oldu (uv yok, binary yok) — beklemeye gerek yok
    if (spawnError) return false;
    // Process erkenden öldüyse — bekleme bitsin
    if (!fastapiProcess) return false;
    if (await pingHealth()) return true;
    await new Promise((r) => setTimeout(r, HEALTH_INTERVAL_MS));
  }
  return false;
}

function buildBackendErrorMessage() {
  const lines = [
    `Backend ${HEALTH_TIMEOUT_MS / 1000} saniyede yanıt vermedi.`,
    "",
    "Olası nedenler:",
  ];

  if (IS_DEV) {
    lines.push(
      "  • Proje dizininde 'uv sync' çalıştırılmadı.",
      "  • 'uv' PATH'te değil → https://docs.astral.sh/uv/",
      "  • Port 8000 başka bir uygulama tarafından tutuluyor.",
      "  • Backend bir Python hatasıyla başladıktan hemen sonra öldü.",
    );
  } else {
    lines.push(
      "  • Paketlenmiş backend binary'si bozuk olabilir.",
      "  • Port 8000 başka bir uygulama tarafından tutuluyor.",
      "  • Antivirüs PyInstaller binary'sini bloke etmiş olabilir.",
    );
  }

  if (spawnError) {
    lines.push("", `Spawn hatası: ${spawnError.message}`);
  }

  const tail = backendStderr.trim();
  if (tail) {
    const snippet = tail.length > 1500 ? "…" + tail.slice(-1500) : tail;
    lines.push("", "Backend çıktısı (son satırlar):", snippet);
  } else {
    lines.push("", "Backend hiç çıktı üretmedi (process başlamadan öldü olabilir).");
  }

  return lines.join("\n");
}

// ─── Splash ───────────────────────────────────────────────────────────────────

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 360,
    height: 360,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: true,
    backgroundColor: "#00000000",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  splashWindow.loadFile(path.join(__dirname, "splash.html"));
  splashWindow.once("closed", () => {
    splashWindow = null;
  });
}

// ─── Main window ──────────────────────────────────────────────────────────────

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    frame: false,
    titleBarStyle: "hidden",
    backgroundColor: "#070709",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (IS_DEV) {
    mainWindow.loadURL(`http://localhost:${NEXT_PORT}`);
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "out", "index.html"));
  }

  mainWindow.once("ready-to-show", () => {
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
    mainWindow.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

function registerIPC() {
  // ── File-open dialog (data upload)
  ipcMain.handle("dialog:open-file", async (_event, filters) => {
    if (!mainWindow) return null;
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: "Dosya Seç",
      properties: ["openFile"],
      filters: filters ?? [
        {
          name: "Desteklenen Dosyalar",
          extensions: ["csv", "xlsx", "xls", "pdf", "docx", "doc"],
        },
      ],
    });
    return canceled ? null : filePaths[0];
  });

  // ── Brain export (atomic: dialog + write)
  ipcMain.handle("brain:export", async (_event, payload) => {
    if (!mainWindow) return { ok: false, reason: "no-window" };
    const defaultName = (payload?.defaultName ?? "yeni-beyin").replace(/[^\w\-.]+/g, "_");
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: "Beyni Kaydet",
      defaultPath: `${defaultName}.brain.json`,
      filters: [{ name: "Beyin Dosyası", extensions: ["json"] }],
    });
    if (canceled || !filePath) return { ok: false, reason: "cancelled" };
    try {
      await fs.promises.writeFile(filePath, payload?.content ?? "", "utf-8");
      return { ok: true, filePath };
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : "write-error" };
    }
  });

  // ── Brain import (atomic: dialog + read)
  ipcMain.handle("brain:import", async () => {
    if (!mainWindow) return { ok: false, reason: "no-window" };
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: "Beyin Yükle",
      properties: ["openFile"],
      filters: [{ name: "Beyin Dosyası", extensions: ["json"] }],
    });
    if (canceled || !filePaths[0]) return { ok: false, reason: "cancelled" };
    try {
      const content = await fs.promises.readFile(filePaths[0], "utf-8");
      return { ok: true, content, filePath: filePaths[0] };
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : "read-error" };
    }
  });

  // ── Window controls
  ipcMain.on("window:minimize", () => mainWindow?.minimize());
  ipcMain.on("window:maximize", () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.on("window:close", () => mainWindow?.close());
  ipcMain.handle("window:is-maximized", () => mainWindow?.isMaximized() ?? false);

  // ── Native notification
  ipcMain.on("notify", (_event, { title, body }) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
  });
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

async function bootstrap() {
  registerIPC();
  createSplashWindow();
  startFastAPI();

  const ready = await waitForBackendReady();
  if (!ready) {
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
    dialog.showErrorBox("Backend Başlatılamadı", buildBackendErrorMessage());
    app.quit();
    return;
  }

  createMainWindow();
}

app.whenReady().then(bootstrap);

app.on("window-all-closed", () => {
  killFastAPI();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", killFastAPI);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) bootstrap();
});
