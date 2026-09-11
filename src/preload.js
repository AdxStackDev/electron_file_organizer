const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    selectFolder: () => ipcRenderer.invoke("select-folder"),

    getDefaultFolder: () => ipcRenderer.invoke("get-default-folder"),

    getDefaultRules: () => ipcRenderer.invoke("get-default-rules"),

    getCategories: () => ipcRenderer.invoke("get-categories"),

    scanFolder: (folderPath) => ipcRenderer.invoke("scan-folder", folderPath),

    organizeFiles: (payload) => ipcRenderer.invoke("organize-files", payload)
});