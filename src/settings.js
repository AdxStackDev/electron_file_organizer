/*
|--------------------------------------------------------------------------
| settings.js
|
| Handles settings UI, loading/saving user preferences, and broadcasting
| defaults to Organizer and Duplicates modules.
|--------------------------------------------------------------------------
*/

let settingDefaultRecursive;
let settingAutoSwitchActivity;
let settingDuplicateMethod;
let settingConfirmOrganize;
let settingConfirmDelete;
let btnClearCustomRules;
let btnResetSettings;

window.appSettings = {
    defaultRecursive: false,
    defaultDuplicateMethod: "size",
    confirmBeforeOrganize: true,
    confirmBeforeDelete: true,
    autoSwitchToActivity: true
};

function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

const persistSettings = debounce(async () => {
    if (window.electronAPI && window.electronAPI.saveSettings) {
        await window.electronAPI.saveSettings(window.appSettings);
        if (window.addLog) {
            window.addLog("[Settings] Preferences saved", "info");
        }
    }
}, 500);

async function initializeSettings() {
    settingDefaultRecursive   = document.getElementById("settingDefaultRecursive");
    settingAutoSwitchActivity = document.getElementById("settingAutoSwitchActivity");
    settingDuplicateMethod    = document.getElementById("settingDuplicateMethod");
    settingConfirmOrganize    = document.getElementById("settingConfirmOrganize");
    settingConfirmDelete      = document.getElementById("settingConfirmDelete");
    btnClearCustomRules       = document.getElementById("btnClearCustomRules");
    btnResetSettings          = document.getElementById("btnResetSettings");

    if (!settingDefaultRecursive) return;

    try {
        const res = await window.electronAPI.loadSettings();
        if (res && res.success && res.settings) {
            window.appSettings = res.settings;
        }
    } catch (err) {
        console.error("Failed to load settings:", err);
    }

    // Populate UI
    updateSettingsUI();

    // Propagate defaults to other tabs
    applyDefaultsToApp();

    // Event listeners for inputs
    settingDefaultRecursive.addEventListener("change", (e) => {
        window.appSettings.defaultRecursive = e.target.checked;
        const recursiveScanCheckbox = document.getElementById("recursiveScanCheckbox");
        if (recursiveScanCheckbox) {
            recursiveScanCheckbox.checked = e.target.checked;
        }
        persistSettings();
    });

    settingAutoSwitchActivity.addEventListener("change", (e) => {
        window.appSettings.autoSwitchToActivity = e.target.checked;
        persistSettings();
    });

    settingDuplicateMethod.addEventListener("change", (e) => {
        window.appSettings.defaultDuplicateMethod = e.target.value;
        const methodSize = document.getElementById("methodSize");
        const methodHash = document.getElementById("methodHash");
        if (e.target.value === "hash") {
            if (methodHash) methodHash.checked = true;
        } else {
            if (methodSize) methodSize.checked = true;
        }
        persistSettings();
    });

    settingConfirmOrganize.addEventListener("change", (e) => {
        window.appSettings.confirmBeforeOrganize = e.target.checked;
        persistSettings();
    });

    settingConfirmDelete.addEventListener("change", (e) => {
        window.appSettings.confirmBeforeDelete = e.target.checked;
        persistSettings();
    });

    // Reset Custom Rules Button
    btnClearCustomRules.addEventListener("click", async () => {
        const confirmed = confirm(
            "Are you sure you want to clear all custom rules?\n\nThis will restore default category folders for all file extensions."
        );
        if (!confirmed) return;

        try {
            await window.electronAPI.resetAllRules();
            if (window.addLog) {
                window.addLog("Custom rules cleared. Restored default mappings.", "success");
            }
            alert("All custom rules have been cleared and reset to defaults.");
            // Reload default rules in renderer if function is available
            const resetButton = document.getElementById("resetButton");
            if (resetButton) resetButton.click();
        } catch (err) {
            alert("Failed to reset rules: " + err.message);
        }
    });

    // Reset Settings Button
    btnResetSettings.addEventListener("click", async () => {
        const confirmed = confirm(
            "Restore all preferences to factory defaults?"
        );
        if (!confirmed) return;

        try {
            const res = await window.electronAPI.resetSettings();
            if (res && res.success && res.settings) {
                window.appSettings = res.settings;
                updateSettingsUI();
                applyDefaultsToApp();
                if (window.addLog) {
                    window.addLog("Settings restored to factory defaults.", "success");
                }
                alert("Settings have been restored to defaults.");
            }
        } catch (err) {
            alert("Failed to reset settings: " + err.message);
        }
    });
}

function updateSettingsUI() {
    if (settingDefaultRecursive) {
        settingDefaultRecursive.checked = Boolean(window.appSettings.defaultRecursive);
    }
    if (settingAutoSwitchActivity) {
        settingAutoSwitchActivity.checked = Boolean(window.appSettings.autoSwitchToActivity);
    }
    if (settingDuplicateMethod) {
        settingDuplicateMethod.value = window.appSettings.defaultDuplicateMethod || "size";
    }
    if (settingConfirmOrganize) {
        settingConfirmOrganize.checked = Boolean(window.appSettings.confirmBeforeOrganize);
    }
    if (settingConfirmDelete) {
        settingConfirmDelete.checked = Boolean(window.appSettings.confirmBeforeDelete);
    }
}

function applyDefaultsToApp() {
    // Apply default recursive toggle
    const recursiveScanCheckbox = document.getElementById("recursiveScanCheckbox");
    if (recursiveScanCheckbox) {
        recursiveScanCheckbox.checked = Boolean(window.appSettings.defaultRecursive);
    }

    // Apply default duplicate detection method
    const methodSize = document.getElementById("methodSize");
    const methodHash = document.getElementById("methodHash");
    if (window.appSettings.defaultDuplicateMethod === "hash") {
        if (methodHash) {
            methodHash.checked = true;
            methodHash.dispatchEvent(new Event("change"));
        }
    } else {
        if (methodSize) {
            methodSize.checked = true;
            methodSize.dispatchEvent(new Event("change"));
        }
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeSettings);
} else {
    initializeSettings();
}
