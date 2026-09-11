/*
|--------------------------------------------------------------------------
| DOM References
|--------------------------------------------------------------------------
*/

let duplicateFolderPath;
let browseDuplicatesButton;
let methodSizeRadio;
let methodHashRadio;
let scanDuplicatesButton;
let cancelScanButton;
let scanProgress;
let progressFill;
let progressCurrent;
let progressTotal;
let summaryStats;
let totalGroups;
let totalDuplicates;
let wastedSpace;
let duplicatesSection;
let duplicatesList;
let actionsSection;
let selectAllButton;
let deleteSelectedButton;
let moveToFolderButton;
let keepNewestButton;
let keepLargestButton;

let currentDuplicates = [];
let selectedFiles = new Set();
let isScanning = false;
let scanMethod = "size";


/*
|--------------------------------------------------------------------------
| Initialize - Wait for DOM to be ready
|--------------------------------------------------------------------------
*/

function initializeDuplicates() {
    // Get DOM references
    duplicateFolderPath = document.getElementById("duplicateFolderPath");
    browseDuplicatesButton = document.getElementById("browseDuplicatesButton");
    methodSizeRadio = document.getElementById("methodSize");
    methodHashRadio = document.getElementById("methodHash");
    scanDuplicatesButton = document.getElementById("scanDuplicatesButton");
    cancelScanButton = document.getElementById("cancelScanButton");
    scanProgress = document.getElementById("scanProgress");
    progressFill = document.getElementById("progressFill");
    progressCurrent = document.getElementById("progressCurrent");
    progressTotal = document.getElementById("progressTotal");
    summaryStats = document.getElementById("summaryStats");
    totalGroups = document.getElementById("totalGroups");
    totalDuplicates = document.getElementById("totalDuplicates");
    wastedSpace = document.getElementById("wastedSpace");
    duplicatesSection = document.getElementById("duplicatesSection");
    duplicatesList = document.getElementById("duplicatesList");
    actionsSection = document.getElementById("actionsSection");
    selectAllButton = document.getElementById("selectAllButton");
    deleteSelectedButton = document.getElementById("deleteSelectedButton");
    moveToFolderButton = document.getElementById("moveToFolderButton");
    keepNewestButton = document.getElementById("keepNewestButton");
    keepLargestButton = document.getElementById("keepLargestButton");

    // Verify all elements loaded
    if (!duplicateFolderPath || !browseDuplicatesButton) {
        // console.error("Duplicates elements not found");
        return;
    }

    // Setup event listeners
    browseDuplicatesButton.addEventListener("click", handleBrowse);
    methodSizeRadio.addEventListener("change", () => { scanMethod = "size"; });
    methodHashRadio.addEventListener("change", () => { scanMethod = "hash"; });
    scanDuplicatesButton.addEventListener("click", handleScan);
    cancelScanButton.addEventListener("click", handleCancelScan);
    selectAllButton.addEventListener("click", handleSelectAll);
    deleteSelectedButton.addEventListener("click", handleDelete);
    moveToFolderButton.addEventListener("click", handleMoveToFolder);
    keepNewestButton.addEventListener("click", () => handleKeepOnly("newest"));
    keepLargestButton.addEventListener("click", () => handleKeepOnly("largest"));

    // Listen for progress updates
    window.electronAPI.onDuplicateScanProgress((progress) => {
        updateProgress(progress);
    });

    // Set default folder
    (async () => {
        const defaultFolder = await window.electronAPI.getDefaultFolder();
        if (duplicateFolderPath) {
            duplicateFolderPath.value = defaultFolder;
        }
        addDuplicateLog("Duplicate finder ready", "info");
    })();
}

// Wait for DOM to be ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeDuplicates);
} else {
    initializeDuplicates();
}


/*
|--------------------------------------------------------------------------
| Browse Folder
|--------------------------------------------------------------------------
*/

async function handleBrowse() {
    const folder = await window.electronAPI.selectFolder();
    if (!folder) return;

    duplicateFolderPath.value = folder;
    currentDuplicates = [];
    duplicatesList.innerHTML = "";
    summaryStats.style.display = "none";
    duplicatesSection.style.display = "none";
    actionsSection.style.display = "none";
    selectedFiles.clear();

    // Enable the scan button
    scanDuplicatesButton.disabled = false;

    addDuplicateLog("Folder selected: " + folder, "info");
}


/*
|--------------------------------------------------------------------------
| Scan for Duplicates
|--------------------------------------------------------------------------
*/

async function handleScan() {
    const folderPath = duplicateFolderPath.value.trim();

    if (!folderPath) {
        alert("Please select a folder.");
        return;
    }

    isScanning = true;
    currentDuplicates = [];
    selectedFiles.clear();
    scanDuplicatesButton.style.display = "none";
    cancelScanButton.style.display = "inline-flex";
    scanProgress.style.display = "block";
    progressFill.style.width = "0%";
    duplicatesSection.style.display = "none";
    actionsSection.style.display = "none";
    summaryStats.style.display = "none";

    addDuplicateLog(`Scanning with ${scanMethod}-based method...`, "info");

    try {
        let response;

        if (scanMethod === "size") {
            // console.log("Starting size-based duplicate scan...");
            response = await window.electronAPI.findDuplicatesBySize(folderPath);
        } else {
            // console.log("Starting hash-based duplicate scan...");
            response = await window.electronAPI.findDuplicatesByHash(folderPath);
        }

        // console.log("Scan response:", response);

        if (!response.success) {
            if (response.cancelled) {
                addDuplicateLog("Scan cancelled by user", "info");
            } else {
                addDuplicateLog(`Scan failed: ${response.error}`, "error");
                alert(`Error: ${response.error}`);
            }
            return;
        }

        currentDuplicates = response.duplicates || [];

        if (currentDuplicates.length === 0) {
            addDuplicateLog("No duplicates found.", "success");
            alert("No duplicate files found in this folder.");
            return;
        }

        renderDuplicates();
        updateSummary();

        addDuplicateLog(
            `Found ${response.totalGroups} duplicate groups with ${response.totalDuplicateFiles} total files`,
            "success"
        );

    } catch (error) {
        // console.error("Scan error:", error);
        addDuplicateLog(`Scan error: ${error.message}`, "error");
        alert(error.message);
    } finally {
        isScanning = false;
        scanProgress.style.display = "none";
        scanDuplicatesButton.style.display = "inline-flex";
        cancelScanButton.style.display = "none";
    }
}


/*
|--------------------------------------------------------------------------
| Cancel Scan
|--------------------------------------------------------------------------
*/

async function handleCancelScan() {
    await window.electronAPI.cancelDuplicateScan();
    isScanning = false;
    scanProgress.style.display = "none";
    scanDuplicatesButton.style.display = "inline-flex";
    cancelScanButton.style.display = "none";
    addDuplicateLog("Scan cancellation requested", "info");
}


/*
|--------------------------------------------------------------------------
| Update Progress Bar
|--------------------------------------------------------------------------
*/

function updateProgress(progress) {
    const { current, total } = progress;
    const percent = total > 0 ? (current / total) * 100 : 0;
    progressFill.style.width = percent + "%";
    progressCurrent.textContent = current;
    progressTotal.textContent = total;
}


/*
|--------------------------------------------------------------------------
| Render Duplicates
|--------------------------------------------------------------------------
*/

function renderDuplicates() {
    duplicatesList.innerHTML = "";
    selectAllButton.style.display = "inline-flex";

    currentDuplicates.forEach((group, groupIdx) => {
        const groupDiv = document.createElement("div");
        groupDiv.className = "duplicate-group";
        groupDiv.dataset.groupId = groupIdx;

        const groupHeader = document.createElement("div");
        groupHeader.className = "duplicate-group-header";

        const groupTitle = document.createElement("div");
        groupTitle.className = "duplicate-group-title";
        groupTitle.innerHTML = `<strong>Duplicate Set ${groupIdx + 1}</strong> — ${group.files.length} files`;

        const groupStats = document.createElement("div");
        groupStats.className = "duplicate-group-stats";

        const totalSize = group.files.reduce((sum, f) => sum + (f.size || 0), 0);
        const singleSize = group.files[0]?.size || 0;
        const wastedSize = totalSize - singleSize;

        groupStats.innerHTML = `
            <span class="stat-item">Total: ${formatFileSize(totalSize)}</span>
            <span class="stat-item">Wasted: ${formatFileSize(wastedSize)}</span>
            <span class="stat-item">Method: ${group.method}</span>
        `;

        groupHeader.appendChild(groupTitle);
        groupHeader.appendChild(groupStats);
        groupDiv.appendChild(groupHeader);

        // Files in group
        const filesList = document.createElement("div");
        filesList.className = "duplicate-files-list";

        group.files.forEach((file, fileIdx) => {
            if (!file) return;

            const fileDiv = document.createElement("div");
            fileDiv.className = "duplicate-file-item";
            fileDiv.dataset.filePath = file.path;

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "file-checkbox";
            checkbox.dataset.filePath = file.path;
            checkbox.addEventListener("change", handleFileSelection);

            const fileInfo = document.createElement("div");
            fileInfo.className = "file-info";

            const fileName = document.createElement("div");
            fileName.className = "file-name";
            fileName.textContent = file.name;

            const fileDetails = document.createElement("div");
            fileDetails.className = "file-details";
            fileDetails.innerHTML = `
                <span class="detail-item">Size: <strong>${file.sizeFormatted}</strong></span>
                <span class="detail-item">Modified: <strong>${file.modifiedFormatted}</strong></span>
                <span class="detail-item">Created: <strong>${file.createdFormatted}</strong></span>
                <span class="detail-item" style="max-width: 400px; overflow: hidden; text-overflow: ellipsis;">Path: <strong>${escapeHtml(file.path)}</strong></span>
            `;

            const filePath = document.createElement("div");
            filePath.className = "file-path";
            filePath.title = file.path;
            filePath.textContent = file.path;

            fileInfo.appendChild(fileName);
            fileInfo.appendChild(fileDetails);

            fileDiv.appendChild(checkbox);
            fileDiv.appendChild(fileInfo);
            filesList.appendChild(fileDiv);
        });

        groupDiv.appendChild(filesList);
        duplicatesList.appendChild(groupDiv);
    });

    duplicatesSection.style.display = "block";
    actionsSection.style.display = "flex";
    summaryStats.style.display = "grid";
}


/*
|--------------------------------------------------------------------------
| File Selection
|--------------------------------------------------------------------------
*/

function handleFileSelection(e) {
    const checkbox = e.target;
    const filePath = checkbox.dataset.filePath;

    if (checkbox.checked) {
        selectedFiles.add(filePath);
    } else {
        selectedFiles.delete(filePath);
    }

    updateActionButtonStates();
}


/*
|--------------------------------------------------------------------------
| Select All
|--------------------------------------------------------------------------
*/

function handleSelectAll() {
    const checkboxes = document.querySelectorAll(".file-checkbox");
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);

    checkboxes.forEach(cb => {
        cb.checked = !allChecked;
        if (!allChecked) {
            selectedFiles.add(cb.dataset.filePath);
        } else {
            selectedFiles.delete(cb.dataset.filePath);
        }
    });

    updateActionButtonStates();
}


/*
|--------------------------------------------------------------------------
| Update Action Button States
|--------------------------------------------------------------------------
*/

function updateActionButtonStates() {
    const hasSelection = selectedFiles.size > 0;
    deleteSelectedButton.disabled = !hasSelection;
    moveToFolderButton.disabled = !hasSelection;
    keepNewestButton.disabled = !hasSelection;
    keepLargestButton.disabled = !hasSelection;
}


/*
|--------------------------------------------------------------------------
| Delete Selected Files
|--------------------------------------------------------------------------
*/

async function handleDelete() {
    if (selectedFiles.size === 0) {
        alert("Please select files to delete.");
        return;
    }

    const confirmed = confirm(
        `Are you sure you want to delete ${selectedFiles.size} file(s)?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    deleteSelectedButton.disabled = true;
    addDuplicateLog(`Deleting ${selectedFiles.size} file(s)...`, "info");

    try {
        const response = await window.electronAPI.deleteFiles(Array.from(selectedFiles));

        if (!response.success) {
            addDuplicateLog(`Deletion failed: ${response.error}`, "error");
            alert(`Error: ${response.error}`);
            return;
        }

        addDuplicateLog(
            `Deleted ${response.successCount} file(s), ${response.failCount} failed.`,
            response.failCount === 0 ? "success" : "error"
        );

        response.results.forEach(result => {
            if (result.success) {
                addDuplicateLog(`✓ Deleted: ${result.path}`, "success");
            } else {
                addDuplicateLog(`✕ Failed to delete: ${result.path} - ${result.message}`, "error");
            }
        });

        // Remove deleted files from UI
        selectedFiles.forEach(filePath => {
            document.querySelector(`input[data-file-path="${escapeAttribute(filePath)}"]`)?.closest(".duplicate-file-item")?.remove();
        });

        selectedFiles.clear();
        updateSummary();
        updateActionButtonStates();

    } catch (error) {
        addDuplicateLog(`Deletion error: ${error.message}`, "error");
        alert(error.message);
    } finally {
        deleteSelectedButton.disabled = false;
    }
}


/*
|--------------------------------------------------------------------------
| Move to Duplicates Folder
|--------------------------------------------------------------------------
*/

async function handleMoveToFolder() {
    if (selectedFiles.size === 0) {
        alert("Please select files to move.");
        return;
    }

    const confirmed = confirm(
        `Move ${selectedFiles.size} file(s) to "Duplicates" folder in the scanned directory?`
    );

    if (!confirmed) return;

    moveToFolderButton.disabled = true;
    const folderPath = duplicateFolderPath.value.trim();

    addDuplicateLog(`Moving ${selectedFiles.size} file(s) to Duplicates folder...`, "info");

    try {
        const response = await window.electronAPI.moveFilesToDuplicatesFolder({
            filePaths: Array.from(selectedFiles),
            folderPath
        });

        if (!response.success) {
            addDuplicateLog(`Move failed: ${response.error}`, "error");
            alert(`Error: ${response.error}`);
            return;
        }

        addDuplicateLog(
            `Moved ${response.successCount} file(s) to ${response.duplicatesFolder}, ${response.failCount} failed.`,
            response.failCount === 0 ? "success" : "error"
        );

        response.results.forEach(result => {
            if (result.success) {
                addDuplicateLog(`✓ Moved: ${result.path}`, "success");
            } else {
                addDuplicateLog(`✕ Failed to move: ${result.path} - ${result.message}`, "error");
            }
        });

        // Remove moved files from UI
        selectedFiles.forEach(filePath => {
            document.querySelector(`input[data-file-path="${escapeAttribute(filePath)}"]`)?.closest(".duplicate-file-item")?.remove();
        });

        selectedFiles.clear();
        updateSummary();
        updateActionButtonStates();

    } catch (error) {
        addDuplicateLog(`Move error: ${error.message}`, "error");
        alert(error.message);
    } finally {
        moveToFolderButton.disabled = false;
    }
}


/*
|--------------------------------------------------------------------------
| Keep Only Best (Newest or Largest)
|--------------------------------------------------------------------------
*/

async function handleKeepOnly(keepBy) {
    if (selectedFiles.size < 2) {
        alert("Please select at least 2 files to compare.");
        return;
    }

    const actionName = keepBy === "newest" ? "Keep Newest" : "Keep Largest";
    const confirmed = confirm(
        `${actionName}?\n\nThis will delete all but the ${keepBy} file from your selection.`
    );

    if (!confirmed) return;

    const button = keepBy === "newest" ? keepNewestButton : keepLargestButton;
    button.disabled = true;

    addDuplicateLog(`Keeping only the ${keepBy} file(s)...`, "info");

    try {
        const response = await window.electronAPI.keepOnlyBest({
            filePaths: Array.from(selectedFiles),
            keepBy
        });

        if (!response.success) {
            addDuplicateLog(`Operation failed: ${response.error}`, "error");
            alert(`Error: ${response.error}`);
            return;
        }

        addDuplicateLog(
            `Kept: ${response.kept.name} | Deleted ${response.deletedCount} file(s)`,
            "success"
        );

        addDuplicateLog(`Kept file: ${response.kept.path}`, "info");

        response.deletionResults.forEach(result => {
            if (result.success) {
                addDuplicateLog(`✓ Deleted: ${result.path}`, "success");
            } else {
                addDuplicateLog(`✕ Failed to delete: ${result.path} - ${result.message}`, "error");
            }
        });

        // Remove deleted files from UI
        selectedFiles.delete(response.kept.path);
        selectedFiles.forEach(filePath => {
            document.querySelector(`input[data-file-path="${escapeAttribute(filePath)}"]`)?.closest(".duplicate-file-item")?.remove();
        });

        selectedFiles.clear();
        updateSummary();
        updateActionButtonStates();

    } catch (error) {
        addDuplicateLog(`Operation error: ${error.message}`, "error");
        alert(error.message);
    } finally {
        button.disabled = false;
    }
}


/*
|--------------------------------------------------------------------------
| Update Summary Stats
|--------------------------------------------------------------------------
*/

function updateSummary() {
    if (currentDuplicates.length === 0) {
        summaryStats.style.display = "none";
        return;
    }

    let totalGroups = currentDuplicates.length;
    let totalFiles = 0;
    let totalWasted = 0;

    currentDuplicates.forEach(group => {
        totalFiles += group.files.length;

        // Calculate wasted space (all but the first copy)
        const singleSize = group.files[0]?.size || 0;
        group.files.forEach((file, idx) => {
            if (idx > 0) {
                totalWasted += file.size || 0;
            }
        });
    });

    document.getElementById("totalGroups").textContent = totalGroups;
    document.getElementById("totalDuplicates").textContent = totalFiles;
    document.getElementById("wastedSpace").textContent = formatFileSize(totalWasted);
}


/*
|--------------------------------------------------------------------------
| Activity Log (Shared with Organizer)
|--------------------------------------------------------------------------
*/

function addDuplicateLog(message, type = "info") {
    // Format message with Duplicates prefix
    const prefixedMessage = `[Duplicates] ${message}`;
    
    // Call the shared addLog function from renderer.js
    // This will display in the activity log on the Activity page
    if (window.addLog) {
        window.addLog(prefixedMessage, type);
    } else {
        // console.log(prefixedMessage, type);
    }
}


/*
|--------------------------------------------------------------------------
| Utility Functions
|--------------------------------------------------------------------------
*/

function formatFileSize(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
    return escapeHtml(value);
}
