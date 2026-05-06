const { app, BrowserWindow, ipcMain, dialog, Notification } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const net = require("net");

const IS_DEV = !app.isPackaged;
const FASTAPI_PORT = 8000;
const NEXT_PORT = 3000;

let mainWindow = null;
let fastapiProcess = null;

// ─── FastAPI Sidecar ──────────────────────────────────────────────────────────

function getPythonCmd() {
  return process.platform === "win32" ? "python" : "python3";
}

function getBackendDir() {
  return IS_DEV
    ? path.join(__dirname, "..", "backend")
    : path.join(process.resourcesPath, "backend");
}

function startFastAPI() {
  const cwd = getBackendDir();
  const cmd = getPythonCmd();

  fastapiProcess = spawn(
    cmd,
    ["-m", "uvicorn", "main:app",
      "--host", "127.0.0.1",
      "--port", String(FASTAPI_PORT),
      "--no-access-log",
    ],
    { cwd, stdio: ["ignore", "pipe", "pipe"] },
  );

  fastapiProcess.stdout.on("data", (d) => {
    if (IS_DEV) console.log("[FastAPI]", d.toString().trim());
  });

  fastapiProcess.stderr.on("data", (d) => {
    if (IS_DEV) console.error("[FastAPI]", d.toString().trim());
  });

  fastapiProcess.on("error", (err) => {
    console.error("[FastAPI] Başlatılamadı:", err.message);
    dialog.showErrorBox(
      "Python Bulunamadı",
      "Lütfen Python'u yükleyin ve PATH değişkenine ekleyin, ardından uygulamayı yeniden başlatın.",
    );
  });

  fastapiProcess.on("exit", (code, signal) => {
    if (code !== 0 && signal !== "SIGTERM") {
      console.error(`[FastAPI] Beklenmedik çıkış: kod=${code}`);
    }
    fastapiProcess = null;
  });
}

function killFastAPI() {
  if (!fastapiProcess) return;
  try {
    // On Windows SIGTERM isn't forwarded to Python; use taskkill for the tree
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

// ─── Window ───────────────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    frame: false,          // custom title bar
    titleBarStyle: "hidden",
    backgroundColor: "#070709",
    show: false,           // show after ready-to-show to avoid white flash
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (IS_DEV) {
    mainWindow.loadURL(`http://localhost:${NEXT_PORT}`);
    // mainWindow.webContents.openDevTools(); // uncomment to debug
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "out", "index.html"));
  }

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("closed", () => { mainWindow = null; });
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

function registerIPC() {
  // Native file-open dialog – returns absolute path or null if cancelled
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

  // Window controls
  ipcMain.on("window:minimize",  () => mainWindow?.minimize());
  ipcMain.on("window:maximize",  () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.on("window:close", () => mainWindow?.close());

  // Maximized state query (for toggle icon)
  ipcMain.handle("window:is-maximized", () => mainWindow?.isMaximized() ?? false);

  // Native notification
  ipcMain.on("notify", (_event, { title, body }) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
  });
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  startFastAPI();
  registerIPC();
  createWindow();
});

app.on("window-all-closed", () => {
  killFastAPI();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", killFastAPI);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
