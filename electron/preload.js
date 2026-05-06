const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Marker so the renderer can detect it's running inside Electron
  isElectron: true,

  // Native file-open dialog
  // filters: [{ name: string; extensions: string[] }]
  // Returns the absolute file path string, or null if cancelled
  openFileDialog: (filters) =>
    ipcRenderer.invoke("dialog:open-file", filters),

  // Window controls
  minimizeWindow: () => ipcRenderer.send("window:minimize"),
  maximizeWindow: () => ipcRenderer.send("window:maximize"),
  closeWindow:    () => ipcRenderer.send("window:close"),
  isMaximized:    () => ipcRenderer.invoke("window:is-maximized"),

  // Native OS notification
  notify: (title, body) => ipcRenderer.send("notify", { title, body }),
});
