const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    selectFolder: () => ipcRenderer.invoke("select-folder"),

    getDefaultFolder: () => ipcRenderer.invoke("get-default-folder"),

    getDefaultRules: () => ipcRenderer.invoke("get-default-rules"),

    getCategories: () => ipcRenderer.invoke("get-categories"),

    loadUserRules: () => ipcRenderer.invoke("load-user-rules"),

    saveUserRules: (userRules) => ipcRenderer.invoke("save-user-rules", userRules),

    scanFolder: (folderPath) => ipcRenderer.invoke("scan-folder", folderPath),

    organizeFiles: (payload) => ipcRenderer.invoke("organize-files", payload),

    // Duplicate Finder IPC
    findDuplicatesBySize: (folderPath) => ipcRenderer.invoke("find-duplicates-by-size", folderPath),

    findDuplicatesByHash: (folderPath) => ipcRenderer.invoke("find-duplicates-by-hash", folderPath),

    cancelDuplicateScan: () => ipcRenderer.invoke("cancel-duplicate-scan"),

    getCachedDuplicates: (folderPath) => ipcRenderer.invoke("get-cached-duplicates", folderPath),

    clearDuplicateCache: (folderPath = null) => ipcRenderer.invoke("clear-duplicate-cache", folderPath),

    deleteFiles: (filePaths) => ipcRenderer.invoke("delete-files", filePaths),

    moveFilesToDuplicatesFolder: (payload) => ipcRenderer.invoke("move-files-to-duplicates-folder", payload),

    keepOnlyBest: (payload) => ipcRenderer.invoke("keep-only-best", payload),

    // Progress listener
    onDuplicateScanProgress: (callback) => ipcRenderer.on("duplicate-scan-progress", (event, progress) => callback(progress))
});
