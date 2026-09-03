const {
    app,
    BrowserWindow,
    dialog,
    ipcMain
} = require("electron");

const path = require("path");
const fs = require("fs/promises");
const fsSync = require("fs");
const os = require("os");

let mainWindow;

// Default extension rules
const DEFAULT_RULES = {
    ".jpg": "Images",
    ".jpeg": "Images",
    ".png": "Images",
    ".webp": "Images",

    ".pdf": "Documents",
    ".doc": "Documents",
    ".docx": "Documents",
    ".txt": "Documents",

    ".mp4": "Videos",
    ".mkv": "Videos",
    ".avi": "Videos",

    ".mp3": "Music",
    ".wav": "Music",

    ".zip": "Documents",
    ".rar": "Documents",
    ".7z": "Documents"
};

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

// default folder
function getDownloadsFolder() {
    return path.join(os.homedir(), "Downloads");
}

// Select folder
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
    return getDownloadsFolder();
});


/*
|--------------------------------------------------------------------------
| Get default rules
|--------------------------------------------------------------------------
*/

ipcMain.handle("get-default-rules", () => {
    return DEFAULT_RULES;
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
            if (!entry.isFile()) {
                continue;
            }

            const fileName = entry.name;

            const extension = path.extname(fileName).toLowerCase();

            // Files without extension
            const normalizedExtension = extension || "[no extension]";

            files.push({
                name: fileName,
                path: path.join(folderPath, fileName),
                extension: normalizedExtension
            });
        }

        // Count extensions
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

        const results = Object.values(extensionMap).sort((a, b) => {
            return a.extension.localeCompare(b.extension);
        });

        return {
            success: true,
            folder: folderPath,
            totalFiles: files.length,
            extensions: results,
            files
        };

    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
});


/*
|--------------------------------------------------------------------------
| Generate unique destination filename
|--------------------------------------------------------------------------
*/

async function getUniqueFilePath(destinationPath) {
    try {
        await fs.access(destinationPath);

        const directory = path.dirname(destinationPath);
        const extension = path.extname(destinationPath);
        const baseName = path.basename(destinationPath, extension);

        let counter = 1;
        let newPath;

        do {
            newPath = path.join(
                directory,
                `${baseName} (${counter})${extension}`
            );

            counter++;

            try {
                await fs.access(newPath);
            } catch {
                return newPath;
            }

        } while (true);

    } catch {
        // File doesn't exist
        return destinationPath;
    }
}


/*
|--------------------------------------------------------------------------
| Organize files
|--------------------------------------------------------------------------
*/

ipcMain.handle("organize-files", async (event, payload) => {
    try {
        const {
            folderPath,
            extensions
        } = payload;

        if (!folderPath) {
            throw new Error("Folder path is required.");
        }

        if (!extensions || !Array.isArray(extensions)) {
            throw new Error("Extension configuration is invalid.");
        }

        const results = [];

        for (const item of extensions) {
            const extension = item.extension;
            const destinationFolder = item.destination;

            if (!destinationFolder || destinationFolder.trim() === "") {
                results.push({
                    extension,
                    success: false,
                    message: "No destination configured."
                });

                continue;
            }

            // Ignore files without extension for now
            if (extension === "[no extension]") {
                results.push({
                    extension,
                    success: false,
                    message: "Files without extensions were skipped."
                });

                continue;
            }

            const sourceDirectory = folderPath;

            // If the destination is an absolute path, use it directly.
            // If it's a relative path (e.g. "Images"), resolve it inside the source folder.
            const destinationPath = path.isAbsolute(destinationFolder)
                ? path.normalize(destinationFolder)
                : path.resolve(sourceDirectory, destinationFolder);

            // Prevent destination from being the source directory itself
            if (destinationPath === path.resolve(sourceDirectory)) {
                results.push({
                    extension,
                    success: false,
                    message: "Destination cannot be the source folder."
                });

                continue;
            }

            await fs.mkdir(destinationPath, {
                recursive: true
            });

            const entries = await fs.readdir(sourceDirectory, {
                withFileTypes: true
            });

            const matchingFiles = entries.filter(entry => {
                if (!entry.isFile()) {
                    return false;
                }

                const fileExtension =
                    path.extname(entry.name).toLowerCase();

                return fileExtension === extension;
            });

            let moved = 0;
            let failed = 0;

            for (const file of matchingFiles) {
                const sourcePath = path.join(
                    sourceDirectory,
                    file.name
                );

                let destinationFilePath = path.join(
                    destinationPath,
                    file.name
                );

                destinationFilePath =
                    await getUniqueFilePath(destinationFilePath);

                try {
                    await fs.rename(
                        sourcePath,
                        destinationFilePath
                    );

                    moved++;

                    results.push({
                        extension,
                        file: file.name,
                        success: true,
                        action: "moved",
                        destination: destinationFilePath
                    });

                } catch (error) {
                    failed++;

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
                results.push({
                    extension,
                    success: true,
                    action: "none",
                    message: "No files found."
                });
            }
        }

        return {
            success: true,
            results
        };

    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
});