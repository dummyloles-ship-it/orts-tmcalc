/**
 * SETTINGS MANAGER
 * localStorage management for settings
 */

function loadSettings() {
    try {
        const settings = JSON.parse(localStorage.getItem('timetableSettings'));
        if (settings) {
            if (settings.theme) {
                document.body.className = settings.theme;
                document.getElementById('themeSelect').value = settings.theme;
            }
            if (settings.defaultHalt !== undefined) {
                document.getElementById('defaultHaltSetting').value = settings.defaultHalt;
                document.getElementById('defaultHalt').value = settings.defaultHalt;
            }
            if (settings.defaultBuffer !== undefined) {
                document.getElementById('defaultBufferSetting').value = settings.defaultBuffer;
                document.getElementById('defaultBuffer').value = settings.defaultBuffer;
            }
            if (settings.defaultFolder) {
                document.getElementById('defaultFolderSetting').value = settings.defaultFolder;
            }
            if (settings.defaultHaltEnabled !== undefined) {
                document.getElementById('defaultHaltEnabledSetting').checked = settings.defaultHaltEnabled;
            }
            if (settings.autoCalculate !== undefined) {
                document.getElementById('autoCalculateSetting').checked = settings.autoCalculate;
            }
            if (settings.defaultPerformance !== undefined) {
                document.getElementById('defaultPerformanceSetting').value = settings.defaultPerformance;
                document.getElementById('driverPerformance').value = settings.defaultPerformance;
                // Update display
                const perfDisplay = document.getElementById('perfDisplay');
                if (perfDisplay) {
                    perfDisplay.textContent = `${Math.round(settings.defaultPerformance * 100)}%`;
                }
            }
            return settings;
        }
    } catch (e) { /* ignore */ }
    return null;
}

function saveSettings() {
    const settings = {
        theme: document.getElementById('themeSelect').value,
        defaultHalt: parseFloat(document.getElementById('defaultHaltSetting').value) || 0,
        defaultBuffer: parseFloat(document.getElementById('defaultBufferSetting').value) || 0,
        defaultFolder: document.getElementById('defaultFolderSetting').value || '',
        defaultHaltEnabled: document.getElementById('defaultHaltEnabledSetting').checked,
        autoCalculate: document.getElementById('autoCalculateSetting').checked,
        defaultPerformance: parseFloat(document.getElementById('defaultPerformanceSetting').value) || 1.0
    };
    localStorage.setItem('timetableSettings', JSON.stringify(settings));
    // Apply theme
    document.body.className = settings.theme;
    // Update top-bar inputs
    document.getElementById('defaultHalt').value = settings.defaultHalt;
    document.getElementById('defaultBuffer').value = settings.defaultBuffer;
    document.getElementById('driverPerformance').value = settings.defaultPerformance;
    const perfDisplay = document.getElementById('perfDisplay');
    if (perfDisplay) {
        perfDisplay.textContent = `${Math.round(settings.defaultPerformance * 100)}%`;
    }
    // If data loaded, apply new defaults
    if (window.timetableData && window.timetableData.length > 0) {
        window.timetableData.forEach((row, idx) => {
            if (idx === 0) {
                row.stop = true;
            } else {
                row.stop = settings.defaultHaltEnabled;
            }
            row.halt = settings.defaultHalt;
            if (!row.isFirst) row.buffer = settings.defaultBuffer;
        });
        const recalcEvent = new CustomEvent('recalculate');
        document.dispatchEvent(recalcEvent);
    }
    document.getElementById('statusMsg').textContent = '✅ Settings saved.';
    return settings;
}

function isAutoCalculateEnabled() {
    const checkbox = document.getElementById('autoCalculateSetting');
    return checkbox ? checkbox.checked : true;
}

// Expose globally
window.loadSettings = loadSettings;
window.saveSettings = saveSettings;
window.isAutoCalculateEnabled = isAutoCalculateEnabled;