const {
    app,
    BrowserWindow,
    dialog,
    ipcMain
} = require("electron");

const path = require("path");
const fs   = require("fs/promises");
const os   = require("os");

// All category + extension data lives in src/data — no hardcoded rules here
const { CATEGORIES, DEFAULT_RULES } = require("./data/categories");

// Duplicate finder module
const duplicateFinder = require("./duplicateFinder");

let mainWindow;


/*
|--------------------------------------------------------------------------
| Window
|--------------------------------------------------------------------------
*/

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 650,
        backgroundColor: "#0f172a",
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    });

    mainWindow.loadFile(path.join(__dirname, "index.html"));
}

app.whenReady().then(() => {
    createWindow();
    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});


/*
|--------------------------------------------------------------------------
| Select folder dialog
|--------------------------------------------------------------------------
*/

ipcMain.handle("select-folder", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ["openDirectory"]
    });

    if (result.canceled || result.filePaths.length === 0) {
        return null;
    }

    return result.filePaths[0];
});


/*
|--------------------------------------------------------------------------
| Get default folder
|--------------------------------------------------------------------------
*/

ipcMain.handle("get-default-folder", () => {
    return path.join(os.homedir(), "Downloads");
});


/*
|--------------------------------------------------------------------------
| Get categories
| Returns { Images: { label, path }, Videos: { ... }, ... }
|--------------------------------------------------------------------------
*/

ipcMain.handle("get-categories", () => {
    return CATEGORIES;
});


/*
|--------------------------------------------------------------------------
| Get default rules
| Returns { ".jpg": { category: "Images", path: "..." }, ... }
| DEFAULT_RULES from categories.js already has this exact shape.
|--------------------------------------------------------------------------
*/

ipcMain.handle("get-default-rules", () => {
    return DEFAULT_RULES;
});


/*
|--------------------------------------------------------------------------
| User rules — persistent override layer
|
| Stored at: {userData}/user-rules.json
| Shape: { ".pdf": { path: "C:\...\pdf", category: "Documents" }, ... }
|
| Only extensions the user has customised are stored here.
| On load, these are merged over DEFAULT_RULES in the renderer.
|--------------------------------------------------------------------------
*/

function getUserRulesPath() {
    return path.join(app.getPath("userData"), "user-rules.json");
}

ipcMain.handle("load-user-rules", async () => {
    try {
        const data = await fs.readFile(getUserRulesPath(), "utf8");
        return JSON.parse(data);
    } catch {
        // File doesn't exist yet — return empty object
        return {};
    }
});

ipcMain.handle("save-user-rules", async (event, userRules) => {
    try {
        await fs.writeFile(
            getUserRulesPath(),
            JSON.stringify(userRules, null, 2),
            "utf8"
        );
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});


/*
|--------------------------------------------------------------------------
| Scan folder
|--------------------------------------------------------------------------
*/

ipcMain.handle("scan-folder", async (event, folderPath) => {
    try {
        if (!folderPath) {
            throw new Error("Folder path is required.");
        }

        const stats = await fs.stat(folderPath);

        if (!stats.isDirectory()) {
            throw new Error("Selected path is not a directory.");
        }

        const entries = await fs.readdir(folderPath, {
            withFileTypes: true
        });

        const files = [];

        for (const entry of entries) {
            if (!entry.isFile()) continue;

            const ext = path.extname(entry.name).toLowerCase();

            files.push({
                name:      entry.name,
                path:      path.join(folderPath, entry.name),
                extension: ext || "[no extension]"
            });
        }

        // Count per extension
        const extensionMap = {};

        for (const file of files) {
            if (!extensionMap[file.extension]) {
                extensionMap[file.extension] = {
                    extension: file.extension,
                    count: 0
                };
            }
            extensionMap[file.extension].count++;
        }

        const extensions = Object.values(extensionMap).sort((a, b) =>
            a.extension.localeCompare(b.extension)
        );

        return {
            success: true,
            folder: folderPath,
            totalFiles: files.length,
            extensions,
            files
        };

    } catch (error) {
        return { success: false, error: error.message };
    }
});


/*
|--------------------------------------------------------------------------
| Generate unique destination file path (avoid overwriting)
|--------------------------------------------------------------------------
*/

async function getUniqueFilePath(destPath) {
    try {
        await fs.access(destPath);

        const dir  = path.dirname(destPath);
        const ext  = path.extname(destPath);
        const base = path.basename(destPath, ext);
        let counter = 1;

        while (true) {
            const candidate = path.join(dir, `${base} (${counter})${ext}`);
            counter++;
            try {
                await fs.access(candidate);
            } catch {
                return candidate;
            }
        }

    } catch {
        return destPath;
    }
}


/*
|--------------------------------------------------------------------------
| Organize files
|--------------------------------------------------------------------------
*/

ipcMain.handle("organize-files", async (event, payload) => {
    try {
        const { folderPath, extensions } = payload;

        if (!folderPath) {
            throw new Error("Folder path is required.");
        }

        if (!extensions || !Array.isArray(extensions)) {
            throw new Error("Extension configuration is invalid.");
        }

        const results = [];

        for (const item of extensions) {
            const { extension, destination: destinationFolder } = item;

            if (!destinationFolder || destinationFolder.trim() === "") {
                results.push({ extension, success: false, message: "No destination configured." });
                continue;
            }

            if (extension === "[no extension]") {
                results.push({ extension, success: false, message: "Files without extensions were skipped." });
                continue;
            }

            // Absolute path → use directly. Relative → resolve inside source folder.
            const destinationPath = path.isAbsolute(destinationFolder)
                ? path.normalize(destinationFolder)
                : path.resolve(folderPath, destinationFolder);

            if (destinationPath === path.resolve(folderPath)) {
                results.push({ extension, success: false, message: "Destination cannot be the source folder." });
                continue;
            }

            await fs.mkdir(destinationPath, { recursive: true });

            const entries = await fs.readdir(folderPath, { withFileTypes: true });

            const matchingFiles = entries.filter(entry =>
                entry.isFile() &&
                path.extname(entry.name).toLowerCase() === extension
            );

            for (const file of matchingFiles) {
                const sourcePath = path.join(folderPath, file.name);
                let destFilePath = path.join(destinationPath, file.name);
                destFilePath     = await getUniqueFilePath(destFilePath);

                try {
                    await fs.rename(sourcePath, destFilePath);
                    results.push({
                        extension,
                        file: file.name,
                        success: true,
                        action: "moved",
                        destination: destFilePath
                    });
                } catch (error) {
                    results.push({
                        extension,
                        file: file.name,
                        success: false,
                        action: "failed",
                        message: error.message
                    });
                }
            }

            if (matchingFiles.length === 0) {
                results.push({ extension, success: true, action: "none", message: "No files found." });
            }
        }

        return { success: true, results };

    } catch (error) {
        return { success: false, error: error.message };
    }
});


/*
|--------------------------------------------------------------------------
| Duplicate Finder IPC Handlers
|--------------------------------------------------------------------------
*/

/**
 * Find duplicates by size (fast method)
 */
ipcMain.handle("find-duplicates-by-size", async (event, folderPath) => {
    try {
        duplicateFinder.reset();

        const result = await duplicateFinder.findDuplicatesBySize(
            folderPath,
            (progress) => {
                event.sender.send("duplicate-scan-progress", progress);
            }
        );

        if (result.cancelled) {
            return { success: false, error: "Scan was cancelled.", cancelled: true };
        }

        // Enrich duplicates with file metadata
        const enrichedDuplicates = await Promise.all(
            result.duplicates.map(async (group) => ({
                ...group,
                files: await Promise.all(
                    group.files.map(filePath => duplicateFinder.getFileMetadata(filePath))
                )
            }))
        );

        duplicateFinder.setCachedResults(folderPath, enrichedDuplicates);

        return {
            success: true,
            method: "size",
            folderPath,
            duplicates: enrichedDuplicates,
            totalGroups: enrichedDuplicates.length,
            totalDuplicateFiles: enrichedDuplicates.reduce((sum, g) => sum + g.files.length, 0)
        };
    } catch (error) {
        return { success: false, error: error.message, method: "size" };
    }
});

/**
 * Find duplicates by hash (accurate method)
 */
ipcMain.handle("find-duplicates-by-hash", async (event, folderPath) => {
    try {
        duplicateFinder.reset();

        const result = await duplicateFinder.findDuplicatesByHash(
            folderPath,
            (progress) => {
                event.sender.send("duplicate-scan-progress", progress);
            }
        );

        if (result.cancelled) {
            return { success: false, error: "Scan was cancelled.", cancelled: true };
        }

        // Enrich duplicates with file metadata
        const enrichedDuplicates = await Promise.all(
            result.duplicates.map(async (group) => ({
                ...group,
                files: await Promise.all(
                    group.files.map(filePath => duplicateFinder.getFileMetadata(filePath))
                )
            }))
        );

        duplicateFinder.setCachedResults(folderPath, enrichedDuplicates);

        return {
            success: true,
            method: "hash",
            folderPath,
            duplicates: enrichedDuplicates,
            totalGroups: enrichedDuplicates.length,
            totalDuplicateFiles: enrichedDuplicates.reduce((sum, g) => sum + g.files.length, 0)
        };
    } catch (error) {
        return { success: false, error: error.message, method: "hash" };
    }
});

/**
 * Cancel ongoing duplicate scan
 */
ipcMain.handle("cancel-duplicate-scan", async (event) => {
    duplicateFinder.cancel();
    return { success: true, message: "Scan cancelled." };
});

/**
 * Get cached duplicate results for a folder
 */
ipcMain.handle("get-cached-duplicates", async (event, folderPath) => {
    const cached = duplicateFinder.getCachedResults(folderPath);
    if (!cached) {
        return { success: false, error: "No cached results." };
    }
    return { success: true, ...cached };
});

/**
 * Clear duplicate cache
 */
ipcMain.handle("clear-duplicate-cache", async (event, folderPath = null) => {
    duplicateFinder.clearCache(folderPath);
    return { success: true, message: "Cache cleared." };
});

/**
 * Delete selected files
 */
ipcMain.handle("delete-files", async (event, filePaths) => {
    try {
        if (!Array.isArray(filePaths) || filePaths.length === 0) {
            throw new Error("No files specified for deletion.");
        }

        const results = await duplicateFinder.deleteFiles(filePaths);
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        return {
            success: true,
            results,
            successCount,
            failCount
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

/**
 * Move files to a duplicates folder
 */
ipcMain.handle("move-files-to-duplicates-folder", async (event, payload) => {
    try {
        const { filePaths, folderPath } = payload;

        if (!Array.isArray(filePaths) || filePaths.length === 0) {
            throw new Error("No files specified for move.");
        }

        if (!folderPath) {
            throw new Error("Folder path is required.");
        }

        // Create "Duplicates" folder in the current path
        const duplicatesFolder = path.join(folderPath, "Duplicates");

        const results = await duplicateFinder.moveFiles(filePaths, duplicatesFolder);
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        return {
            success: true,
            duplicatesFolder,
            results,
            successCount,
            failCount
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

/**
 * Keep only the newest/largest file in a duplicate set, delete the rest
 */
ipcMain.handle("keep-only-best", async (event, payload) => {
    try {
        const { filePaths, keepBy } = payload;

        if (!Array.isArray(filePaths) || filePaths.length < 2) {
            throw new Error("At least 2 files are required.");
        }

        const result = await duplicateFinder.keepOnlyBest(filePaths, keepBy);

        return {
            success: true,
            kept: result.kept,
            deletedCount: result.deleted.length,
            deletionResults: result.deleted
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});
