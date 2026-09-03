const folderPathInput =
    document.getElementById("folderPath");

const browseButton =
    document.getElementById("browseButton");

const scanButton =
    document.getElementById("scanButton");

const organizeButton =
    document.getElementById("organizeButton");

const resetButton =
    document.getElementById("resetButton");

const clearLogButton =
    document.getElementById("clearLogButton");

const extensionTable =
    document.getElementById("extensionTable");

const totalFiles =
    document.getElementById("totalFiles");

const totalExtensions =
    document.getElementById("totalExtensions");

const configuredExtensions =
    document.getElementById("configuredExtensions");

const activityLog =
    document.getElementById("activityLog");


let currentFiles = [];
let currentExtensions = [];
let rules = {};


/*
|--------------------------------------------------------------------------
| Initialize
|--------------------------------------------------------------------------
*/

async function initialize() {

    const defaultFolder =
        await window.electronAPI.getDefaultFolder();

    folderPathInput.value = defaultFolder;

    rules =
        await window.electronAPI.getDefaultRules();
}

initialize();


/*
|--------------------------------------------------------------------------
| Browse folder
|--------------------------------------------------------------------------
*/

browseButton.addEventListener("click", async () => {

    const folder =
        await window.electronAPI.selectFolder();

    if (!folder) {
        return;
    }

    folderPathInput.value = folder;

    clearScanResults();

    addLog(
        "Folder selected: " + folder
    );
});


/*
|--------------------------------------------------------------------------
| Scan
|--------------------------------------------------------------------------
*/

scanButton.addEventListener("click", async () => {

    const folderPath =
        folderPathInput.value.trim();

    if (!folderPath) {
        alert("Please select a folder.");

        return;
    }

    scanButton.disabled = true;

    scanButton.textContent = "Scanning...";

    try {

        const response =
            await window.electronAPI.scanFolder(
                folderPath
            );

        if (!response.success) {
            alert(response.error);

            return;
        }

        currentFiles =
            response.files;

        currentExtensions =
            response.extensions;

        renderExtensions();

        addLog(
            `Scanned ${response.totalFiles} files.`
        );

    } catch (error) {

        alert(error.message);

    } finally {

        scanButton.disabled = false;

        scanButton.textContent = "Scan Folder";
    }
});


/*
|--------------------------------------------------------------------------
| Render extension table
|--------------------------------------------------------------------------
*/

function renderExtensions() {

    extensionTable.innerHTML = "";

    if (currentExtensions.length === 0) {

        extensionTable.innerHTML = `
            <tr class="empty-row">
                <td colspan="3">
                    No files found.
                </td>
            </tr>
        `;

        updateSummary();

        organizeButton.disabled = true;

        return;
    }

    currentExtensions.forEach(item => {

        const extension =
            item.extension;

        const defaultDestination =
            rules[extension] || "";

        const row =
            document.createElement("tr");

        row.innerHTML = `
            <td>
                <span class="extension ${getExtClass(extension)}">
                    ${escapeHtml(extension)}
                </span>
            </td>

            <td>
                ${item.count}
            </td>

            <td>
                <input
                    class="destination-input"
                    type="text"
                    data-extension="${escapeAttribute(extension)}"
                    value="${escapeAttribute(defaultDestination)}"
                    placeholder="Example: Documents"
                >
            </td>
        `;

        extensionTable.appendChild(row);
    });

    updateSummary();

    organizeButton.disabled = false;
}


/*
|--------------------------------------------------------------------------
| Get current rules from table
|--------------------------------------------------------------------------
*/

function getCurrentRules() {

    const inputs =
        document.querySelectorAll(
            ".destination-input"
        );

    const result = [];

    inputs.forEach(input => {

        result.push({
            extension:
                input.dataset.extension,

            destination:
                input.value.trim()
        });
    });

    return result;
}


/*
|--------------------------------------------------------------------------
| Organize
|--------------------------------------------------------------------------
*/

organizeButton.addEventListener("click", async () => {

    const folderPath =
        folderPathInput.value.trim();

    if (!folderPath) {
        alert("Please select a folder.");

        return;
    }

    const extensionRules =
        getCurrentRules();

    if (extensionRules.length === 0) {
        alert("There are no files to organize.");

        return;
    }


    const hasEmptyDestination =
        extensionRules.some(rule =>
            !rule.destination
        );

    if (hasEmptyDestination) {

        const confirmed =
            confirm(
                "Some extensions do not have a destination. " +
                "Those files will be skipped.\n\n" +
                "Continue?"
            );

        if (!confirmed) {
            return;
        }
    }


    const confirmed =
        confirm(
            "Are you sure you want to organize these files?"
        );

    if (!confirmed) {
        return;
    }


    organizeButton.disabled = true;

    organizeButton.textContent =
        "Organizing...";


    try {

        const response =
            await window.electronAPI.organizeFiles({
                folderPath,
                extensions: extensionRules
            });


        if (!response.success) {

            alert(response.error);

            return;
        }


        let movedCount = 0;
        let failedCount = 0;

        response.results.forEach(result => {

            if (result.action === "moved") {

                movedCount++;

                addLog(
                    `${result.file} → ${result.destination}`
                );

            }

            if (result.action === "failed") {

                failedCount++;

                addLog(
                    `Failed: ${result.file} - ${result.message}`
                );
            }
        });


        addLog(
            `Finished. ${movedCount} files moved, ${failedCount} failed.`
        );


        alert(
            `Organization completed.\n\n` +
            `Moved: ${movedCount}\n` +
            `Failed: ${failedCount}`
        );


        // Scan again
        const scanResponse =
            await window.electronAPI.scanFolder(
                folderPath
            );

        if (scanResponse.success) {

            currentFiles =
                scanResponse.files;

            currentExtensions =
                scanResponse.extensions;

            renderExtensions();
        }


    } catch (error) {

        alert(error.message);

    } finally {

        organizeButton.disabled = false;

        organizeButton.textContent =
            "Organize Files";
    }
});


/*
|--------------------------------------------------------------------------
| Reset rules
|--------------------------------------------------------------------------
*/

resetButton.addEventListener("click", async () => {

    rules =
        await window.electronAPI.getDefaultRules();

    renderExtensions();

    addLog("Rules reset to defaults.");
});


/*
|--------------------------------------------------------------------------
| Clear activity
|--------------------------------------------------------------------------
*/

clearLogButton.addEventListener("click", () => {

    activityLog.innerHTML = `
        <div class="log-empty">
            No activity yet.
        </div>
    `;
});


/*
|--------------------------------------------------------------------------
| Summary
|--------------------------------------------------------------------------
*/

function updateSummary() {

    totalFiles.textContent =
        currentFiles.length;

    totalExtensions.textContent =
        currentExtensions.length;


    const inputs =
        document.querySelectorAll(
            ".destination-input"
        );

    let configured = 0;

    inputs.forEach(input => {

        if (input.value.trim()) {
            configured++;
        }
    });

    configuredExtensions.textContent =
        configured;
}


/*
|--------------------------------------------------------------------------
| Update configured count when destinations change
|--------------------------------------------------------------------------
*/

extensionTable.addEventListener(
    "input",
    () => {
        updateSummary();
    }
);


/*
|--------------------------------------------------------------------------
| Clear scan results
|--------------------------------------------------------------------------
*/

function clearScanResults() {

    currentFiles = [];

    currentExtensions = [];

    extensionTable.innerHTML = `
        <tr class="empty-row">
            <td colspan="3">
                Scan a folder to see files.
            </td>
        </tr>
    `;

    updateSummary();

    organizeButton.disabled = true;
}


/*
|--------------------------------------------------------------------------
| Activity log
|--------------------------------------------------------------------------
*/

function addLog(message, type = "info") {

    const empty =
        activityLog.querySelector(".log-empty");

    if (empty) {
        empty.remove();
    }

    const entry =
        document.createElement("div");

    entry.className = "log-entry";

    const now =
        new Date().toLocaleTimeString();

    const icons = { success: "✓", error: "✕", info: "→" };
    const iconChar = icons[type] || "→";
    const isFailed = message.toLowerCase().startsWith("failed");
    const logType = isFailed ? "error" : (message.toLowerCase().includes("finish") ? "success" : "info");

    entry.innerHTML = `
        <div class="log-icon ${logType}">
            ${icons[logType]}
        </div>

        <div class="log-text">
            ${escapeHtml(message)}
        </div>

        <div class="log-time">
            ${now}
        </div>
    `;

    activityLog.prepend(entry);
}


/*
|--------------------------------------------------------------------------
| Extension color class
|--------------------------------------------------------------------------
*/

function getExtClass(ext) {
    const e = ext.toLowerCase().replace('.', '');
    const images   = ['png','jpg','jpeg','gif','bmp','webp','svg','ico','tiff','heic'];
    const videos   = ['mp4','mkv','avi','mov','wmv','flv','webm','m4v'];
    const audio    = ['mp3','wav','flac','aac','ogg','wma','m4a','opus'];
    const docs     = ['pdf','doc','docx','xls','xlsx','ppt','pptx','txt','md','csv','rtf','odt'];
    const code     = ['js','ts','py','java','cpp','c','cs','html','css','json','xml','php','rb','go','rs','sh','bat'];
    const archives = ['zip','rar','7z','tar','gz','bz2','xz','iso'];
    if (images.includes(e))   return 'ext-image';
    if (videos.includes(e))   return 'ext-video';
    if (audio.includes(e))    return 'ext-audio';
    if (docs.includes(e))     return 'ext-doc';
    if (code.includes(e))     return 'ext-code';
    if (archives.includes(e)) return 'ext-archive';
    return 'ext-other';
}


/*
|--------------------------------------------------------------------------
| Security helpers
|--------------------------------------------------------------------------
*/

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