/*
|--------------------------------------------------------------------------
| Sidebar & Navigation
|--------------------------------------------------------------------------
*/

const appEl         = document.querySelector(".app");
const sidebarToggle = document.getElementById("sidebarToggle");
const navItems      = document.querySelectorAll(".nav-item[data-view]");
const views         = document.querySelectorAll(".view");

// Add tooltip text from nav-label for collapsed hover tooltips
navItems.forEach(item => {
    const label = item.querySelector(".nav-label");
    if (label) item.dataset.tooltip = label.textContent.trim();
});

// Toggle collapse
sidebarToggle.addEventListener("click", () => {
    appEl.classList.toggle("sidebar-collapsed");
});

// View switching
function switchView(viewId) {
    // Deactivate all views
    views.forEach(v => v.classList.remove("active"));

    // Deactivate all nav items
    navItems.forEach(n => n.classList.remove("active"));

    // Activate target view
    const targetView = document.getElementById("view-" + viewId);
    if (targetView) targetView.classList.add("active");

    // Activate matching nav item
    const targetNav = document.querySelector(`.nav-item[data-view="${viewId}"]`);
    if (targetNav) targetNav.classList.add("active");
}

navItems.forEach(item => {
    item.addEventListener("click", () => {
        switchView(item.dataset.view);
    });
});

// Auto-switch to Activity view after organize completes
function switchToActivity() {
    switchView("activity");
}


/*
|--------------------------------------------------------------------------
| DOM references
|--------------------------------------------------------------------------
*/

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


let currentFiles      = [];
let currentExtensions = [];
let rules             = {};   // { ".jpg": { category, path } }
let categories        = {};   // { Images: { label, path }, ... }


/*
|--------------------------------------------------------------------------
| Initialize
|--------------------------------------------------------------------------
*/

async function initialize() {

    const defaultFolder =
        await window.electronAPI.getDefaultFolder();

    folderPathInput.value = defaultFolder;

    [rules, categories] = await Promise.all([
        window.electronAPI.getDefaultRules(),
        window.electronAPI.getCategories()
    ]);
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

    if (!folder) return;

    folderPathInput.value = folder;

    clearScanResults();

    addLog("Folder selected: " + folder);
});


/*
|--------------------------------------------------------------------------
| Scan
|--------------------------------------------------------------------------
*/

scanButton.addEventListener("click", async () => {

    const folderPath = folderPathInput.value.trim();

    if (!folderPath) {
        alert("Please select a folder.");
        return;
    }

    scanButton.disabled = true;
    scanButton.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
        Scanning...
    `;

    try {

        const response =
            await window.electronAPI.scanFolder(folderPath);

        if (!response.success) {
            alert(response.error);
            return;
        }

        currentFiles      = response.files;
        currentExtensions = response.extensions;

        renderExtensions();

        addLog(`Scanned ${response.totalFiles} files.`);

    } catch (error) {

        alert(error.message);

    } finally {

        scanButton.disabled    = false;
        scanButton.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Scan Folder
        `;
    }
});


/*
|--------------------------------------------------------------------------
| Build custom category dropdown
|--------------------------------------------------------------------------
*/

function buildCategorySelect(activeKey, extension) {

    const wrapper = document.createElement("div");
    wrapper.className = "cat-wrapper";
    wrapper.style.position = "relative";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = `cat-trigger cat-${activeKey}`;
    trigger.dataset.extension = extension;
    trigger.dataset.value = activeKey;

    trigger.innerHTML = `
        <span class="cat-dot dot-${activeKey}"></span>
        <span class="cat-label">${escapeHtml(categories[activeKey]?.label ?? activeKey)}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"/>
        </svg>
    `;

    const panel = document.createElement("div");
    panel.className = "cat-dropdown";

    Object.entries(categories).forEach(([key, cat]) => {
        const option = document.createElement("div");
        option.className = `cat-option cat-${key}${key === activeKey ? " active" : ""}`;
        option.dataset.value = key;
        option.innerHTML = `
            <span class="cat-dot dot-${key}"></span>
            ${escapeHtml(cat.label)}
        `;

        option.addEventListener("click", (e) => {
            e.stopPropagation();
            selectCategory(wrapper, trigger, panel, key, extension);
        });

        panel.appendChild(option);
    });

    // Toggle open/close
    trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = panel.classList.contains("open");
        closeAllDropdowns();
        if (!isOpen) {
            openDropdown(trigger, panel);
        }
    });

    document.body.appendChild(panel);
    wrapper.appendChild(trigger);
    wrapper._panel = panel;

    return wrapper;
}


function openDropdown(trigger, panel) {
    const rect = trigger.getBoundingClientRect();
    panel.style.top    = (rect.bottom + 4) + "px";
    panel.style.left   = rect.left + "px";
    panel.style.width  = Math.max(rect.width, 160) + "px";
    panel.classList.add("open");
    trigger.classList.add("open");
}


function closeAllDropdowns() {
    document.querySelectorAll(".cat-dropdown.open").forEach(p => p.classList.remove("open"));
    document.querySelectorAll(".cat-trigger.open").forEach(t => t.classList.remove("open"));
}


// Close on outside click
document.addEventListener("click", closeAllDropdowns);


function selectCategory(wrapper, trigger, panel, key, extension) {

    // Update trigger
    trigger.dataset.value = key;
    trigger.className = `cat-trigger cat-${key}`;
    trigger.dataset.extension = extension;
    trigger.innerHTML = `
        <span class="cat-dot dot-${key}"></span>
        <span class="cat-label">${escapeHtml(categories[key]?.label ?? key)}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"/>
        </svg>
    `;
    // Re-attach toggle listener since innerHTML was replaced
    trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = panel.classList.contains("open");
        closeAllDropdowns();
        if (!isOpen) openDropdown(trigger, panel);
    });

    // Update active option
    panel.querySelectorAll(".cat-option").forEach(opt => {
        opt.classList.toggle("active", opt.dataset.value === key);
    });

    closeAllDropdowns();

    // Sync destination input in same row
    const row   = wrapper.closest("tr");
    const input = row?.querySelector(".destination-input");
    if (input) {
        const cat = categories[key];
        if (key === "Unknown") {
            input.value       = "";
            input.placeholder = "Enter path or leave blank to skip";
        } else {
            input.value       = cat?.path ?? "";
            input.placeholder = "Destination path";
        }
    }

    updateSummary();
}


/*
|--------------------------------------------------------------------------
| Derive category from a destination path
| Returns category key if path matches a known category default, else "Unknown"
|--------------------------------------------------------------------------
*/

function getCategoryFromPath(destPath) {

    if (!destPath || destPath.trim() === "") return "Unknown";

    const norm = destPath.trim().toLowerCase().replace(/[/\\]+$/, "");

    for (const [key, cat] of Object.entries(categories)) {
        if (key === "Unknown") continue;
        const catNorm = cat.path.toLowerCase().replace(/[/\\]+$/, "");
        if (norm === catNorm) return key;
    }

    return "Unknown";
}


/*
|--------------------------------------------------------------------------
| Render extension table
|--------------------------------------------------------------------------
*/

function renderExtensions() {

    // Remove any orphaned dropdown panels from previous render
    document.querySelectorAll(".cat-dropdown").forEach(p => p.remove());

    extensionTable.innerHTML = "";

    if (currentExtensions.length === 0) {

        extensionTable.innerHTML = `
            <tr class="empty-row">
                <td colspan="4">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
                         style="margin-bottom:10px;opacity:0.3">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                    </svg>
                    <br>No files found.
                </td>
            </tr>
        `;

        updateSummary();
        organizeButton.disabled = true;
        return;
    }

    currentExtensions.forEach(item => {

        const extension = item.extension;

        // Determine default category + path for this extension
        const rule            = rules[extension];
        const defaultCatKey   = rule ? rule.category    : "Unknown";
        const defaultDestPath = rule ? rule.path        : "";

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>
                <span class="extension ${getExtClass(extension)}">
                    ${escapeHtml(extension)}
                </span>
            </td>

            <td class="count-cell">
                ${item.count}
            </td>

            <td class="category-cell"></td>

            <td>
                <input
                    class="destination-input"
                    type="text"
                    data-extension="${escapeAttribute(extension)}"
                    value="${escapeAttribute(defaultDestPath)}"
                    placeholder="${defaultCatKey === 'Unknown' ? 'Enter path or leave blank to skip' : 'Destination path'}"
                >
            </td>
        `;

        // Inject custom dropdown into the category cell
        const catCell = row.querySelector(".category-cell");
        catCell.appendChild(buildCategorySelect(defaultCatKey, extension));

        extensionTable.appendChild(row);
    });

    updateSummary();
    organizeButton.disabled = false;
}


/*
|--------------------------------------------------------------------------
| React to destination input change
| → if path no longer matches any category default → set dropdown to Unknown
| → if path matches a category default → update dropdown to that category
|--------------------------------------------------------------------------
*/

extensionTable.addEventListener("input", (e) => {

    if (!e.target.classList.contains("destination-input")) return;

    const input  = e.target;
    const row    = input.closest("tr");
    const trigger = row?.querySelector(".cat-trigger");
    const wrapper = row?.querySelector(".cat-wrapper");

    if (trigger && wrapper) {
        const derivedKey = getCategoryFromPath(input.value);
        const panel      = wrapper._panel;
        if (panel) {
            selectCategory(wrapper, trigger, panel, derivedKey, trigger.dataset.extension);
            // Restore the typed value since selectCategory overwrites it for non-Unknown
            if (derivedKey === "Unknown") {
                input.value = e.target.value;
            }
        }
    }

    updateSummary();
});


/*
|--------------------------------------------------------------------------
| Get current rules from table
|--------------------------------------------------------------------------
*/

function getCurrentRules() {

    const inputs = document.querySelectorAll(".destination-input");
    const result = [];

    inputs.forEach(input => {
        result.push({
            extension:   input.dataset.extension,
            destination: input.value.trim()
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

    const folderPath = folderPathInput.value.trim();

    if (!folderPath) {
        alert("Please select a folder.");
        return;
    }

    const extensionRules = getCurrentRules();

    if (extensionRules.length === 0) {
        alert("There are no files to organize.");
        return;
    }

    const hasEmptyDestination = extensionRules.some(rule => !rule.destination);

    if (hasEmptyDestination) {
        const confirmed = confirm(
            "Some extensions do not have a destination. " +
            "Those files will be skipped.\n\nContinue?"
        );
        if (!confirmed) return;
    }

    const confirmed = confirm("Are you sure you want to organize these files?");
    if (!confirmed) return;

    organizeButton.disabled  = true;
    organizeButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        Organizing...
    `;

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

        let movedCount  = 0;
        let failedCount = 0;

        response.results.forEach(result => {

            if (result.action === "moved") {
                movedCount++;
                addLog(`${result.file} → ${result.destination}`);
            }

            if (result.action === "failed") {
                failedCount++;
                addLog(`Failed: ${result.file} - ${result.message}`, "error");
            }
        });

        addLog(`Finished. ${movedCount} files moved, ${failedCount} failed.`, "success");

        alert(
            `Organization completed.\n\nMoved: ${movedCount}\nFailed: ${failedCount}`
        );

        // Switch to Activity view so user sees results
        switchToActivity();

        // Re-scan
        const scanResponse =
            await window.electronAPI.scanFolder(folderPath);

        if (scanResponse.success) {
            currentFiles      = scanResponse.files;
            currentExtensions = scanResponse.extensions;
            renderExtensions();
        }

    } catch (error) {

        alert(error.message);

    } finally {

        organizeButton.disabled  = false;
        organizeButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            Organize Files
        `;
    }
});


/*
|--------------------------------------------------------------------------
| Reset rules
|--------------------------------------------------------------------------
*/

resetButton.addEventListener("click", async () => {

    rules = await window.electronAPI.getDefaultRules();
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
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
                 style="margin-bottom:8px;opacity:0.3">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            <br>No activity yet.
        </div>
    `;
});


/*
|--------------------------------------------------------------------------
| Summary
|--------------------------------------------------------------------------
*/

function updateSummary() {

    totalFiles.textContent      = currentFiles.length;
    totalExtensions.textContent = currentExtensions.length;

    const inputs = document.querySelectorAll(".destination-input");
    let configured = 0;

    inputs.forEach(input => {
        if (input.value.trim()) configured++;
    });

    configuredExtensions.textContent = configured;
}


/*
|--------------------------------------------------------------------------
| Clear scan results
|--------------------------------------------------------------------------
*/

function clearScanResults() {

    document.querySelectorAll(".cat-dropdown").forEach(p => p.remove());

    currentFiles      = [];
    currentExtensions = [];

    extensionTable.innerHTML = `
        <tr class="empty-row">
            <td colspan="4">Scan a folder to see files.</td>
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

    const empty = activityLog.querySelector(".log-empty");
    if (empty) empty.remove();

    const entry = document.createElement("div");
    entry.className = "log-entry";

    const now   = new Date().toLocaleTimeString();
    const icons = { success: "✓", error: "✕", info: "→" };

    const isFailed  = message.toLowerCase().startsWith("failed");
    const isFinished = message.toLowerCase().startsWith("finished");
    const logType   = type !== "info" ? type : isFailed ? "error" : isFinished ? "success" : "info";

    entry.innerHTML = `
        <div class="log-icon ${logType}">${icons[logType]}</div>
        <div class="log-text">${escapeHtml(message)}</div>
        <div class="log-time">${now}</div>
    `;

    activityLog.prepend(entry);
}


/*
|--------------------------------------------------------------------------
| Extension color class
| Derived from the category already assigned in DEFAULT_RULES.
| No need to maintain a separate extension list here.
|--------------------------------------------------------------------------
*/

function getExtClass(ext) {
    const categoryColorMap = {
        Images:    "ext-image",
        Videos:    "ext-video",
        Music:     "ext-audio",
        Documents: "ext-doc",
        Code:      "ext-code",
        Archives:  "ext-archive",
        Fonts:     "ext-other",
        Unknown:   "ext-other"
    };

    const rule = rules[ext];
    if (rule && categoryColorMap[rule.category]) {
        return categoryColorMap[rule.category];
    }

    return "ext-other";
}


/*
|--------------------------------------------------------------------------
| Security helpers
|--------------------------------------------------------------------------
*/

function escapeHtml(value) {
    return String(value)
        .replaceAll("&",  "&amp;")
        .replaceAll("<",  "&lt;")
        .replaceAll(">",  "&gt;")
        .replaceAll('"',  "&quot;")
        .replaceAll("'",  "&#039;");
}

function escapeAttribute(value) {
    return escapeHtml(value);
}
