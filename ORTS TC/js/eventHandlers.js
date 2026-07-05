/**
 * EVENT HANDLERS
 * All user interaction events
 */

function setupEventHandlers() {
    // ---- DOM refs ----
    const fileInput = document.getElementById('fileInput');
    const statusMsg = document.getElementById('statusMsg');
    const tableHead = document.getElementById('tableHead');
    const tableBody = document.getElementById('tableBody');
    const colSelector = document.getElementById('colSelector');
    const departureInput = document.getElementById('departureTime');
    const arrivalInput = document.getElementById('arrivalTime');
    const defaultSpeedInput = document.getElementById('defaultSpeed');
    const defaultHaltInput = document.getElementById('defaultHalt');
    const defaultBufferInput = document.getElementById('defaultBuffer');
    const driverPerformanceInput = document.getElementById('driverPerformance');
    const perfDisplay = document.getElementById('perfDisplay');
    const recalcBtn = document.getElementById('recalcBtn');
    const previewBtn = document.getElementById('previewBtn');
    const ortsPreviewBtn = document.getElementById('ortsPreviewBtn');
    const previewModal = document.getElementById('previewModal');
    const previewText = document.getElementById('previewText');
    const copyPreviewBtn = document.getElementById('copyPreviewBtn');
    const closePreviewBtn = document.getElementById('closePreviewBtn');
    const modalClose = document.getElementById('modalClose');
    const helpToggle = document.getElementById('helpToggle');
    const helpContent = document.getElementById('helpContent');
    const multiHalt = document.getElementById('multiHalt');
    const multiBuffer = document.getElementById('multiBuffer');
    const applyMultiHalt = document.getElementById('applyMultiHalt');
    const applyMultiBuffer = document.getElementById('applyMultiBuffer');
    const calcModal = document.getElementById('calcModal');
    const calcModalClose = document.getElementById('calcModalClose');
    const calcModalTitle = document.getElementById('calcModalTitle');
    const calcModalBody = document.getElementById('calcModalBody');
    // ORTS modal
    const ortsModal = document.getElementById('ortsModal');
    const ortsModalClose = document.getElementById('ortsModalClose');
    const copyOrts1 = document.getElementById('copyOrts1');
    const copyOrts2 = document.getElementById('copyOrts2');
    const tabBtns = document.querySelectorAll('.tab-btn');
    // Settings
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const settingsModalClose = document.getElementById('settingsModalClose');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const themeSelect = document.getElementById('themeSelect');
    const defaultHaltSetting = document.getElementById('defaultHaltSetting');
    const defaultBufferSetting = document.getElementById('defaultBufferSetting');
    const defaultFolderSetting = document.getElementById('defaultFolderSetting');

    // Get references from global scope
    const { COLUMNS, columnVisibility, userToggled } = window;

    // ---- Helper: trigger recalculate if auto-calc is enabled ----
    function triggerRecalculateIfAuto() {
        const autoCalc = document.getElementById('autoCalculateSetting')?.checked !== false;
        if (autoCalc) {
            const recalcEvent = new CustomEvent('recalculate');
            document.dispatchEvent(recalcEvent);
        } else {
            statusMsg.textContent = 'ℹ️ Auto-calculation is disabled. Click "Recalculate" to update the timetable.';
        }
    }

    // ---- Update performance display ----
    function updatePerfDisplay() {
        const val = parseFloat(driverPerformanceInput.value) || 1.0;
        const clamped = Math.max(0.01, Math.min(1, val));
        perfDisplay.textContent = `${Math.round(clamped * 100)}%`;
        if (val < 0.01 || val > 1) {
            driverPerformanceInput.value = clamped;
        }
    }

    // ---- File load ----
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                let content = ev.target.result;
                content = content.replace(/^\s*\/\/.*$/gm, '');
                content = content.replace(/^var\s+\w+\s*=\s*/, '');
                content = content.trim();
                const firstBrace = content.indexOf('{');
                const lastBrace = content.lastIndexOf('}');
                if (firstBrace === -1 || lastBrace === -1) throw new Error('No JSON object found.');
                const jsonStr = content.substring(firstBrace, lastBrace + 1);
                const data = JSON.parse(jsonStr);
                const points = data?.PathChartPoints?.$values || data?.PathChartPoints || [];
                if (!points.length) throw new Error('No PathChartPoints found.');
                window.rawPoints = points;
                const loadEvent = new CustomEvent('dataLoaded', { detail: { points } });
                document.dispatchEvent(loadEvent);
            } catch (err) {
                statusMsg.textContent = `❌ Error parsing file: ${err.message}`;
                console.error(err);
            }
        };
        reader.readAsText(file);
        fileInput.value = '';
    });

    // ---- Recalculate (always works) ----
    recalcBtn.addEventListener('click', () => {
        if (window.stations.length === 0) {
            statusMsg.textContent = '⚠️ No data loaded. Please load a JSON file first.';
            return;
        }
        const recalcEvent = new CustomEvent('recalculate');
        document.dispatchEvent(recalcEvent);
        statusMsg.textContent = '✅ Timetable recalculated.';
    });

    // ---- Preview ----
    previewBtn.addEventListener('click', () => {
        const previewEvent = new CustomEvent('previewRequested');
        document.dispatchEvent(previewEvent);
    });

    // ---- ORTS Preview ----
    ortsPreviewBtn.addEventListener('click', () => {
        const ortsEvent = new CustomEvent('ortsPreviewRequested');
        document.dispatchEvent(ortsEvent);
        ortsModal.classList.add('active');
        document.querySelector('.tab-btn[data-tab="tab1"]').click();
    });

    // ---- ORTS Tab switching ----
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tabId = btn.dataset.tab;
            document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
        });
    });

    // ---- ORTS Copy (unified) ----
    function copyActiveOrtsText() {
        const activeTextarea = document.querySelector('.tab-content.active textarea');
        if (!activeTextarea) {
            statusMsg.textContent = '⚠️ No ORTS preview active.';
            return;
        }
        const text = activeTextarea.value;
        if (!text) {
            statusMsg.textContent = '⚠️ No data to copy.';
            return;
        }
        navigator.clipboard.writeText(text).then(() => {
            statusMsg.textContent = '✅ Copied to clipboard!';
        }).catch(() => {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            statusMsg.textContent = '✅ Copied to clipboard!';
        });
    }

    copyOrts1.addEventListener('click', copyActiveOrtsText);
    copyOrts2.addEventListener('click', copyActiveOrtsText);

    // ---- Copy Preview ----
    function copyTSV() {
        const tsvEvent = new CustomEvent('copyTSVRequested');
        document.dispatchEvent(tsvEvent);
    }
    copyPreviewBtn.addEventListener('click', copyTSV);

    // ---- Close modals ----
    function closePreviewModal() {
        previewModal.classList.remove('active');
    }
    modalClose.addEventListener('click', closePreviewModal);
    closePreviewBtn.addEventListener('click', closePreviewModal);
    previewModal.addEventListener('click', (e) => {
        if (e.target === previewModal) closePreviewModal();
    });

    function closeOrtsModal() {
        ortsModal.classList.remove('active');
    }
    ortsModalClose.addEventListener('click', closeOrtsModal);
    ortsModal.addEventListener('click', (e) => {
        if (e.target === ortsModal) closeOrtsModal();
    });

    function closeCalcModal() {
        calcModal.classList.remove('active');
    }
    calcModalClose.addEventListener('click', closeCalcModal);
    calcModal.addEventListener('click', (e) => {
        if (e.target === calcModal) closeCalcModal();
    });

    // ---- Help toggle ----
    helpToggle.addEventListener('click', () => {
        helpContent.classList.toggle('open');
        helpToggle.textContent = helpContent.classList.contains('open') ? '❓ Hide Help' : '❓ Help';
    });

    // ---- Auto-update on source/destination time changes ----
    departureInput.addEventListener('change', () => {
        if (departureInput.value) arrivalInput.value = '';
        triggerRecalculateIfAuto();
    });
    arrivalInput.addEventListener('change', () => {
        if (arrivalInput.value) departureInput.value = '';
        triggerRecalculateIfAuto();
    });
    defaultSpeedInput.addEventListener('change', () => {
        triggerRecalculateIfAuto();
    });

    // ---- Driver Performance input ----
    driverPerformanceInput.addEventListener('input', function() {
        updatePerfDisplay();
        const val = parseFloat(this.value);
        if (!isNaN(val) && val >= 0.01 && val <= 1) {
            triggerRecalculateIfAuto();
        }
    });
    driverPerformanceInput.addEventListener('change', function() {
        updatePerfDisplay();
        const val = parseFloat(this.value);
        if (!isNaN(val) && val >= 0.01 && val <= 1) {
            triggerRecalculateIfAuto();
        }
    });

    // ---- Default halt/buffer inputs (top bar) ----
    defaultHaltInput.addEventListener('input', () => {
        const val = parseFloat(defaultHaltInput.value) || 0;
        // Find first stop index to only apply to stations from there onward? Actually, apply to all, but render will disable for skipped.
        window.timetableData.forEach(row => { row.halt = val; });
        defaultHaltSetting.value = val;
        triggerRecalculateIfAuto();
    });
    defaultBufferInput.addEventListener('input', () => {
        const val = parseFloat(defaultBufferInput.value) || 0;
        // Apply buffer to all stations (render will disable for skipped)
        window.timetableData.forEach(row => { if (!row.isFirst) row.buffer = val; });
        defaultBufferSetting.value = val;
        triggerRecalculateIfAuto();
    });

    // ---- Multi-edit ----
    function getSelectedStationIndices() {
        const checks = document.querySelectorAll('.row-check:checked');
        return Array.from(checks).map(cb => parseInt(cb.dataset.idx));
    }

    applyMultiHalt.addEventListener('click', () => {
        const indices = getSelectedStationIndices();
        if (indices.length === 0) {
            statusMsg.textContent = '⚠️ No station rows selected. Check the boxes in the "Multi-edit" column.';
            return;
        }
        const val = parseFloat(multiHalt.value) || 0;
        indices.forEach(idx => {
            if (window.timetableData[idx]) {
                window.timetableData[idx].halt = val;
            }
        });
        const recalcEvent = new CustomEvent('recalculate');
        document.dispatchEvent(recalcEvent);
        statusMsg.textContent = `✅ Halt set to ${val} min for ${indices.length} station(s).`;
    });

    applyMultiBuffer.addEventListener('click', () => {
        const indices = getSelectedStationIndices();
        if (indices.length === 0) {
            statusMsg.textContent = '⚠️ No station rows selected. Check the boxes in the "Multi-edit" column.';
            return;
        }
        const val = parseFloat(multiBuffer.value) || 0;
        // Find first stop index to only apply buffer to stations from there onward
        let firstStopIndex = -1;
        for (let i = 0; i < window.timetableData.length; i++) {
            if (window.timetableData[i].stop === true) {
                firstStopIndex = i;
                break;
            }
        }
        let appliedCount = 0;
        indices.forEach(idx => {
            const row = window.timetableData[idx];
            if (row && !row.isFirst && (firstStopIndex === -1 || idx >= firstStopIndex)) {
                row.buffer = val;
                appliedCount++;
            }
        });
        const recalcEvent = new CustomEvent('recalculate');
        document.dispatchEvent(recalcEvent);
        statusMsg.textContent = `✅ Buffer set to ${val} min for ${appliedCount} segment(s). (skipped rows before first stop)`;
    });

    // ---- Settings modal ----
    settingsBtn.addEventListener('click', () => settingsModal.classList.add('active'));

    function closeSettingsModal() {
        settingsModal.classList.remove('active');
    }
    settingsModalClose.addEventListener('click', closeSettingsModal);
    closeSettingsBtn.addEventListener('click', closeSettingsModal);
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) closeSettingsModal();
    });

    // ---- Theme preview (real-time, no save) ----
    themeSelect.addEventListener('change', function() {
        document.body.className = this.value;
    });

    // ---- Save Settings button ----
    saveSettingsBtn.addEventListener('click', () => {
        const saveEvent = new CustomEvent('saveSettingsRequested');
        document.dispatchEvent(saveEvent);
    });

    // ---- Column selector change events (delegated) ----
    colSelector.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox' && e.target.dataset.key) {
            const key = e.target.dataset.key;
            userToggled[key] = true;
            columnVisibility[key] = e.target.checked;
            const renderEvent = new CustomEvent('renderTable');
            document.dispatchEvent(renderEvent);
        }
    });

    // ---- Table event delegation for dynamic elements ----
    document.addEventListener('click', (e) => {
        const calcBtn = e.target.closest('.calc-btn');
        if (calcBtn) {
            const idx = parseInt(calcBtn.dataset.idx);
            const row = window.timetableData[idx];
            if (row && row.calcDetails) {
                showCalcDetails(row, calcModal, calcModalTitle, calcModalBody);
            }
            return;
        }
    });

    // ---- Stop checkboxes (delegated) ----
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('stop-check')) {
            const idx = parseInt(e.target.dataset.idx);
            const row = window.timetableData[idx];
            if (row) {
                row.stop = e.target.checked;
                if (!row.stop) row.halt = 0;
                // If this was the first stop and now unchecked, first stop will change; updateSchedule will handle it.
                triggerRecalculateIfAuto();
            }
        }
    });

    // ---- Halt and Buffer inputs (delegated) ----
    document.addEventListener('input', (e) => {
        if (e.target.classList.contains('halt-input')) {
            const idx = parseInt(e.target.dataset.idx);
            const row = window.timetableData[idx];
            // If halt is disabled, don't update (but the input is disabled anyway)
            if (!row.stop && !row.isFirst) {
                e.target.value = 0;
                return;
            }
            const val = parseFloat(e.target.value) || 0;
            row.halt = val;
            triggerRecalculateIfAuto();
        }
        if (e.target.classList.contains('buffer-input')) {
            const idx = parseInt(e.target.dataset.idx);
            // Check if this buffer is editable (only if after first stop)
            // But we don't need to check here, because the input is disabled for non-editable ones
            const val = parseFloat(e.target.value) || 0;
            window.timetableData[idx].buffer = val;
            triggerRecalculateIfAuto();
        }
    });

    // ---- Settings inputs (auto-sync) ----
    defaultHaltSetting.addEventListener('change', () => {
        const val = parseFloat(defaultHaltSetting.value) || 0;
        defaultHaltInput.value = val;
        window.timetableData.forEach(row => { row.halt = val; });
        triggerRecalculateIfAuto();
    });
    defaultBufferSetting.addEventListener('change', () => {
        const val = parseFloat(defaultBufferSetting.value) || 0;
        defaultBufferInput.value = val;
        window.timetableData.forEach(row => { if (!row.isFirst) row.buffer = val; });
        triggerRecalculateIfAuto();
    });
}

// Expose globally
window.setupEventHandlers = setupEventHandlers;