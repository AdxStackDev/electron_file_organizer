const fs = require("fs/promises");
const fsSync = require("fs");
const path = require("path");
const crypto = require("crypto");

/**
 * DuplicateFinder
 * Finds duplicate files using two methods:
 * 1. By file size (faster)
 * 2. By file hash (slower but more accurate)
 */

class DuplicateFinder {
    constructor() {
        this.isCancelled = false;
        this.progress = { total: 0, current: 0 };
        this.cache = {}; // Cache scan results by folder path
    }

    /**
     * Reset cancellation flag
     */
    reset() {
        this.isCancelled = false;
        this.progress = { total: 0, current: 0 };
    }

    /**
     * Cancel the current operation
     */
    cancel() {
        this.isCancelled = true;
    }

    /**
     * Get cached results for a folder
     */
    getCachedResults(folderPath) {
        return this.cache[folderPath] || null;
    }

    /**
     * Cache results for a folder
     */
    setCachedResults(folderPath, results) {
        this.cache[folderPath] = {
            results,
            timestamp: Date.now(),
            timestamp_str: new Date().toLocaleString()
        };
    }

    /**
     * Clear cache for a specific folder or entire cache
     */
    clearCache(folderPath = null) {
        if (folderPath) {
            delete this.cache[folderPath];
        } else {
            this.cache = {};
        }
    }

    /**
     * Recursively get all files from a folder
     */
    async getAllFiles(folderPath) {
        const files = [];

        try {
            const entries = await fs.readdir(folderPath, { withFileTypes: true });

            for (const entry of entries) {
                if (this.isCancelled) break;

                const fullPath = path.join(folderPath, entry.name);

                if (entry.isFile()) {
                    files.push(fullPath);
                } else if (entry.isDirectory()) {
                    // Recursively get files from subdirectories
                    const subFiles = await this.getAllFiles(fullPath);
                    files.push(...subFiles);
                }
            }
        } catch (error) {
            console.error(`Error reading folder ${folderPath}:`, error.message);
        }

        return files;
    }

    /**
     * Get file size
     */
    async getFileSize(filePath) {
        try {
            const stat = await fs.stat(filePath);
            return stat.size;
        } catch (error) {
            return null;
        }
    }

    /**
     * Calculate SHA256 hash of a file using streams (memory efficient, reliable)
     */
    calculateFileHash(filePath) {
        return new Promise((resolve) => {
            try {
                const hash = crypto.createHash("sha256");
                const stream = fsSync.createReadStream(filePath);

                stream.on("data", (chunk) => hash.update(chunk));
                stream.on("end", () => resolve(hash.digest("hex")));
                stream.on("error", (err) => {
                    console.error(`Hash error for ${filePath}:`, err.message);
                    resolve(null);
                });
            } catch (error) {
                console.error(`Hash setup error for ${filePath}:`, error.message);
                resolve(null);
            }
        });
    }

    /**
     * Find duplicates by file size (fast method)
     */
    async findDuplicatesBySize(folderPath, onProgress = null) {
        this.reset();

        try {
            const files = await this.getAllFiles(folderPath);
            if (this.isCancelled) return { duplicates: [], method: "size", cancelled: true };

            const sizeMap = {};
            this.progress.total = files.length;

            for (let i = 0; i < files.length; i++) {
                if (this.isCancelled) return { duplicates: [], method: "size", cancelled: true };

                const file = files[i];
                const size = await this.getFileSize(file);

                // Skip files that failed stat or are 0 bytes
                if (size === null || size === 0) {
                    this.progress.current = i + 1;
                    if (onProgress) onProgress({ ...this.progress });
                    continue;
                }

                if (!sizeMap[size]) {
                    sizeMap[size] = [];
                }

                sizeMap[size].push(file);

                this.progress.current = i + 1;
                if (onProgress) onProgress({ ...this.progress });
            }

            // Filter only groups with more than 1 file
            const duplicates = Object.values(sizeMap)
                .filter(group => group.length > 1)
                .map((group, idx) => ({
                    setId: idx,
                    method: "size",
                    files: group.sort()
                }));

            return { duplicates, method: "size", cancelled: false };
        } catch (error) {
            throw new Error(`Size-based duplicate scan failed: ${error.message}`);
        }
    }

    /**
     * Find duplicates by file hash (accurate method)
     * Optimized: First groups by size, then only hashes files with size duplicates
     */
    async findDuplicatesByHash(folderPath, onProgress = null) {
        this.reset();

        try {
            const files = await this.getAllFiles(folderPath);
            if (this.isCancelled) return { duplicates: [], method: "hash", cancelled: true };

            // Phase 1: Group files by size (fast pre-filter)
            const sizeMap = {};
            this.progress.total = files.length;

            // console.log(`[DuplicateFinder] Phase 1: Grouping ${files.length} files by size`);

            for (let i = 0; i < files.length; i++) {
                if (this.isCancelled) return { duplicates: [], method: "hash", cancelled: true };

                const file = files[i];
                const size = await this.getFileSize(file);

                // Skip files that failed stat or are 0 bytes
                if (size === null || size === 0) {
                    this.progress.current = i + 1;
                    if (onProgress) onProgress({ ...this.progress });
                    continue;
                }

                if (!sizeMap[size]) {
                    sizeMap[size] = [];
                }

                sizeMap[size].push(file);

                this.progress.current = i + 1;
                if (onProgress) onProgress({ ...this.progress });
            }

            // Phase 2: Only hash files that have size duplicates
            const filesToHash = [];
            for (const [size, fileList] of Object.entries(sizeMap)) {
                if (fileList.length > 1) {
                    filesToHash.push(...fileList);
                }
            }

            // console.log(`[DuplicateFinder] Phase 2: Hashing ${filesToHash.length} files (skipped ${files.length - filesToHash.length} unique-sized files)`);

            const hashMap = {};
            this.progress.total = files.length; // Keep total as original file count
            this.progress.current = files.length - filesToHash.length; // Account for skipped files

            for (let i = 0; i < filesToHash.length; i++) {
                if (this.isCancelled) return { duplicates: [], method: "hash", cancelled: true };

                const file = filesToHash[i];
                const hash = await this.calculateFileHash(file);

                // Log hash result for debugging
                // console.log(`[DuplicateFinder] File: ${path.basename(file)}, Hash: ${hash ? hash.substring(0, 16) + '...' : 'NULL'}`);

                // Skip files that failed to hash — never group nulls together
                if (hash === null) {
                    // console.warn(`[DuplicateFinder] Skipping file with null hash: ${file}`);
                    this.progress.current++;
                    if (onProgress) onProgress({ ...this.progress });
                    continue;
                }

                if (!hashMap[hash]) {
                    hashMap[hash] = [];
                }

                hashMap[hash].push(file);

                this.progress.current++;
                if (onProgress) onProgress({ ...this.progress });
            }

            // Log hash groups
            // console.log(`[DuplicateFinder] Total unique hashes: ${Object.keys(hashMap).length}`);
            Object.entries(hashMap).forEach(([hash, fileList]) => {
                if (fileList.length > 1) {
                    // console.log(`[DuplicateFinder] Hash ${hash.substring(0, 16)}... has ${fileList.length} files:`, fileList.map(f => path.basename(f)));
                }
            });

            // Filter only groups with more than 1 file
            const duplicates = Object.values(hashMap)
                .filter(group => group.length > 1)
                .map((group, idx) => ({
                    setId: idx,
                    method: "hash",
                    files: group.sort()
                }));

            // console.log(`[DuplicateFinder] Found ${duplicates.length} duplicate groups`);

            return { duplicates, method: "hash", cancelled: false };
        } catch (error) {
            // console.error(`[DuplicateFinder] Hash scan error:`, error);
            throw new Error(`Hash-based duplicate scan failed: ${error.message}`);
        }
    }

    /**
     * Get file metadata (size, created date, modified date)
     */
    async getFileMetadata(filePath) {
        try {
            const stat = await fs.stat(filePath);
            return {
                path: filePath,
                name: path.basename(filePath),
                size: stat.size,
                sizeFormatted: this.formatFileSize(stat.size),
                created: stat.birthtime || stat.ctime,
                createdFormatted: (stat.birthtime || stat.ctime).toLocaleString(),
                modified: stat.mtime,
                modifiedFormatted: stat.mtime.toLocaleString()
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Format file size for display (B, KB, MB, GB)
     */
    formatFileSize(bytes) {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
    }

    /**
     * Delete files
     */
    async deleteFiles(filePaths) {
        const results = [];

        for (const filePath of filePaths) {
            try {
                await fs.unlink(filePath);
                results.push({ path: filePath, success: true, message: "Deleted" });
            } catch (error) {
                results.push({
                    path: filePath,
                    success: false,
                    message: error.message
                });
            }
        }

        return results;
    }

    /**
     * Move files to a destination folder
     */
    async moveFiles(filePaths, destFolder) {
        await fs.mkdir(destFolder, { recursive: true });
        const results = [];

        for (const filePath of filePaths) {
            try {
                const fileName = path.basename(filePath);
                let destPath = path.join(destFolder, fileName);

                // Avoid overwriting — append (copy #n) if file exists
                let counter = 1;
                const ext = path.extname(fileName);
                const base = path.basename(fileName, ext);

                while (true) {
                    try {
                        await fs.access(destPath);
                        destPath = path.join(destFolder, `${base} (${counter})${ext}`);
                        counter++;
                    } catch {
                        break;
                    }
                }

                await fs.rename(filePath, destPath);
                results.push({
                    path: filePath,
                    success: true,
                    message: "Moved",
                    destination: destPath
                });
            } catch (error) {
                results.push({
                    path: filePath,
                    success: false,
                    message: error.message
                });
            }
        }

        return results;
    }

    /**
     * Keep only the newest or largest file and delete others in a duplicate set
     */
    async keepOnlyBest(filePaths, keepBy = "newest") {
        const metadataList = [];

        for (const filePath of filePaths) {
            const metadata = await this.getFileMetadata(filePath);
            if (metadata) metadataList.push(metadata);
        }

        if (metadataList.length === 0) {
            return [];
        }

        // Sort by criteria
        let bestFile;
        if (keepBy === "newest") {
            metadataList.sort((a, b) => b.modified - a.modified);
            bestFile = metadataList[0];
        } else if (keepBy === "largest") {
            metadataList.sort((a, b) => b.size - a.size);
            bestFile = metadataList[0];
        } else {
            bestFile = metadataList[0];
        }

        // Delete all others
        const toDelete = metadataList
            .filter(m => m.path !== bestFile.path)
            .map(m => m.path);

        const results = await this.deleteFiles(toDelete);

        return {
            kept: bestFile,
            deleted: results
        };
    }
}

module.exports = new DuplicateFinder();
