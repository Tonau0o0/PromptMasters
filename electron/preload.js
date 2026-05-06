const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Marker so the renderer can detect it's running inside Electron
  isElectron: true,

  // Native file-open dialog (data upload) — returns absolute path or null
  openFileDialog: (filters) => ipcRenderer.invoke("dialog:open-file", filters),

  // Brain persistence
  exportBrain: (defaultName, content) =>
    ipcRenderer.invoke("brain:export", { defaultName, content }),
  importBrain: () => ipcRenderer.invoke("brain:import"),

  // Window controls
  minimizeWindow: () => ipcRenderer.send("window:minimize"),
  maximizeWindow: () => ipcRenderer.send("window:maximize"),
  closeWindow:    () => ipcRenderer.send("window:close"),
  isMaximized:    () => ipcRenderer.invoke("window:is-maximized"),

  // Native OS notification
  notify: (title, body) => ipcRenderer.send("notify", { title, body }),
});
