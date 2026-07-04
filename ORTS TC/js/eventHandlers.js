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
    const { COLUMNS, columnVisibility, timetableData, speedLimits } = window;

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

    // ---- Recalculate ----
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
        // Activate the first tab by default
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

    // ---- ORTS Copy (single unified function) ----
    function copyActiveOrtsText() {
        // Find the currently visible ORTS textarea
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
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            statusMsg.textContent = '✅ Copied to clipboard!';
        });
    }

    // Attach copy to both ORTS copy buttons
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
        const recalcEvent = new CustomEvent('recalculate');
        document.dispatchEvent(recalcEvent);
    });
    arrivalInput.addEventListener('change', () => {
        if (arrivalInput.value) departureInput.value = '';
        const recalcEvent = new CustomEvent('recalculate');
        document.dispatchEvent(recalcEvent);
    });
    defaultSpeedInput.addEventListener('change', () => {
        const recalcEvent = new CustomEvent('recalculate');
        document.dispatchEvent(recalcEvent);
    });

    // ---- Default halt/buffer inputs (top bar) ----
    defaultHaltInput.addEventListener('input', () => {
        const val = parseFloat(defaultHaltInput.value) || 0;
        window.timetableData.forEach(row => { row.halt = val; });
        defaultHaltSetting.value = val;
        const recalcEvent = new CustomEvent('recalculate');
        document.dispatchEvent(recalcEvent);
    });
    defaultBufferInput.addEventListener('input', () => {
        const val = parseFloat(defaultBufferInput.value) || 0;
        window.timetableData.forEach(row => { if (!row.isFirst) row.buffer = val; });
        defaultBufferSetting.value = val;
        const recalcEvent = new CustomEvent('recalculate');
        document.dispatchEvent(recalcEvent);
    });

    // ---- Multi-edit ----
    function getSelectedStationIndices() {
        const checks = document.querySelectorAll('.row-check:checked');
        return Array.from(checks).map(cb => parseInt(cb.dataset.idx));
    }

    applyMultiHalt.addEventListener('click', () => {
        const indices = getSelectedStationIndices();
        if (indices.length === 0) {
            statusMsg.textContent = '⚠️ No station rows selected. Check the boxes in the "Apply edits for" column.';
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
            statusMsg.textContent = '⚠️ No station rows selected. Check the boxes in the "Apply edits for" column.';
            return;
        }
        const val = parseFloat(multiBuffer.value) || 0;
        indices.forEach(idx => {
            const row = window.timetableData[idx];
            if (row && !row.isFirst) {
                row.buffer = val;
            } else if (row && row.isFirst) {
                statusMsg.textContent = `⚠️ Station "${row.station}" is the origin - no buffer before it.`;
            }
        });
        const recalcEvent = new CustomEvent('recalculate');
        document.dispatchEvent(recalcEvent);
        statusMsg.textContent = `✅ Buffer set to ${val} min for ${indices.length} segment(s).`;
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
            columnVisibility[e.target.dataset.key] = e.target.checked;
            const renderEvent = new CustomEvent('renderTable');
            document.dispatchEvent(renderEvent);
        }
    });

    // ---- Table event delegation for dynamic elements ----
    document.addEventListener('click', (e) => {
        // Calc buttons
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
                const recalcEvent = new CustomEvent('recalculate');
                document.dispatchEvent(recalcEvent);
            }
        }
    });

    // ---- Halt and Buffer inputs (delegated) ----
    document.addEventListener('input', (e) => {
        if (e.target.classList.contains('halt-input')) {
            const idx = parseInt(e.target.dataset.idx);
            const row = window.timetableData[idx];
            if (!row.stop) {
                e.target.value = 0;
                return;
            }
            const val = parseFloat(e.target.value) || 0;
            row.halt = val;
            const recalcEvent = new CustomEvent('recalculate');
            document.dispatchEvent(recalcEvent);
        }
        if (e.target.classList.contains('buffer-input')) {
            const idx = parseInt(e.target.dataset.idx);
            const val = parseFloat(e.target.value) || 0;
            window.timetableData[idx].buffer = val;
            const recalcEvent = new CustomEvent('recalculate');
            document.dispatchEvent(recalcEvent);
        }
    });

    // ---- Settings inputs (auto-sync) ----
    defaultHaltSetting.addEventListener('change', () => {
        const val = parseFloat(defaultHaltSetting.value) || 0;
        defaultHaltInput.value = val;
        window.timetableData.forEach(row => { row.halt = val; });
        const recalcEvent = new CustomEvent('recalculate');
        document.dispatchEvent(recalcEvent);
    });
    defaultBufferSetting.addEventListener('change', () => {
        const val = parseFloat(defaultBufferSetting.value) || 0;
        defaultBufferInput.value = val;
        window.timetableData.forEach(row => { if (!row.isFirst) row.buffer = val; });
        const recalcEvent = new CustomEvent('recalculate');
        document.dispatchEvent(recalcEvent);
    });
}

// Expose globally
window.setupEventHandlers = setupEventHandlers;