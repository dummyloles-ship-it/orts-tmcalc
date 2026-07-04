/**
 * APP - Main Application Initialization
 */

document.addEventListener('DOMContentLoaded', function() {
    // ---- Get refs ----
    const statusMsg = document.getElementById('statusMsg');
    const tableHead = document.getElementById('tableHead');
    const tableBody = document.getElementById('tableBody');
    const colSelector = document.getElementById('colSelector');
    const departureInput = document.getElementById('departureTime');
    const arrivalInput = document.getElementById('arrivalTime');
    const defaultSpeedInput = document.getElementById('defaultSpeed');
    const defaultHaltInput = document.getElementById('defaultHalt');
    const defaultBufferInput = document.getElementById('defaultBuffer');
    const previewText = document.getElementById('previewText');
    const ortsText1 = document.getElementById('ortsText1');
    const ortsText2 = document.getElementById('ortsText2');

    // ---- Load settings ----
    const loadedSettings = loadSettings();
    if (loadedSettings) {
        // Settings already applied by loadSettings
    }

    // ---- Data loaded event ----
    document.addEventListener('dataLoaded', function(e) {
        const points = e.detail.points;
        const defaultHaltVal = parseFloat(defaultHaltInput.value) || 0;
        const defaultBufferVal = parseFloat(defaultBufferInput.value) || 0;
        const defaultHaltEnabled = document.getElementById('defaultHaltEnabledSetting')?.checked || false;

        // Process data
        const result = processData(points, defaultHaltVal, defaultBufferVal);
        window.stations = result.stations;
        window.speedLimits = result.speedLimits;

        // Build timetable data with defaultHaltEnabled
        window.timetableData = buildTimetableData(window.stations, defaultHaltVal, defaultBufferVal, defaultHaltEnabled);

        // Initial schedule update
        updateSchedule(
            window.timetableData,
            departureInput,
            arrivalInput,
            defaultSpeedInput,
            window.speedLimits,
            statusMsg
        );

        // Render
        renderTable(window.timetableData, window.columnVisibility, COLUMNS, tableHead, tableBody);

        // Render column selector
        renderColumnSelector(COLUMNS, window.columnVisibility, colSelector);

        statusMsg.textContent = `✅ Loaded ${points.length} points. Found ${window.stations.length} stations.`;
    });

    // ---- Recalculate event ----
    document.addEventListener('recalculate', function() {
        if (window.stations.length === 0) {
            statusMsg.textContent = '⚠️ No data loaded. Please load a JSON file first.';
            return;
        }
        updateSchedule(
            window.timetableData,
            departureInput,
            arrivalInput,
            defaultSpeedInput,
            window.speedLimits,
            statusMsg
        );
        renderTable(window.timetableData, window.columnVisibility, COLUMNS, tableHead, tableBody);
    });

    // ---- Render table event ----
    document.addEventListener('renderTable', function() {
        renderTable(window.timetableData, window.columnVisibility, COLUMNS, tableHead, tableBody);
    });

    // ---- Preview requested ----
    document.addEventListener('previewRequested', function() {
        if (window.timetableData.length === 0) {
            statusMsg.textContent = '⚠️ No data loaded. Please load a JSON file first.';
            return;
        }
        const tsv = getTSVWithHeaders(window.timetableData, window.columnVisibility, COLUMNS);
        previewText.value = tsv;
        document.getElementById('previewModal').classList.add('active');
    });

    // ---- Copy TSV requested ----
    document.addEventListener('copyTSVRequested', function() {
        if (window.timetableData.length === 0) {
            statusMsg.textContent = '⚠️ No data loaded. Please load a JSON file first.';
            return;
        }
        const tsv = getTSVWithHeaders(window.timetableData, window.columnVisibility, COLUMNS);
        navigator.clipboard.writeText(tsv).then(() => {
            statusMsg.textContent = '✅ Copied to clipboard!';
        }).catch(() => {
            const textarea = document.createElement('textarea');
            textarea.value = tsv;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            statusMsg.textContent = '✅ Copied to clipboard!';
        });
    });

    // ---- ORTS Preview requested ----
    document.addEventListener('ortsPreviewRequested', function() {
        if (window.timetableData.length === 0) {
            statusMsg.textContent = '⚠️ No data loaded. Please load a JSON file first.';
            return;
        }
        ortsText1.value = getOrtsData(true);
        ortsText2.value = getOrtsData(false);
    });

    // ---- Save Settings requested ----
    document.addEventListener('saveSettingsRequested', function() {
        saveSettings();
    });

    // ---- Helper functions for preview ----
    function getVisibleColumnsForCopy() {
        return COLUMNS.filter(col => window.columnVisibility[col.key] !== false);
    }

    function getHeaders() {
        return getVisibleColumnsForCopy().map(col => col.label);
    }

    function getTableData() {
        const visible = getVisibleColumnsForCopy();
        return window.timetableData.map((row, idx) => {
            const isFirst = idx === 0;
            return visible.map(col => {
                if (col.key === 'select') return '☑';
                if (col.key === 'stop') return row.stop ? 'Yes' : 'No';
                if (col.key === 'station') return row.station;
                if (col.key === 'distPrev') return row.distPrev.toFixed(3);
                if (col.key === 'distOrigin') return row.distOrigin.toFixed(3);
                if (col.key === 'arrival') {
                    return (isFirst || row.stop) ? (row.arrivalStr || '') : '';
                }
                if (col.key === 'departure') {
                    return (isFirst || row.stop) ? (row.departureStr || '') : '';
                }
                if (col.key === 'buffer') return row.isFirst ? '-' : (row.buffer || 0).toFixed(1);
                if (col.key === 'halt') return (row.stop ? (row.halt || 0) : 0).toFixed(1);
                if (col.key === 'calc') return '📊';
                return '';
            });
        });
    }

    function getTSVWithHeaders() {
        const headers = getHeaders();
        const rows = getTableData();
        const allRows = [headers, ...rows];
        return allRows.map(row => row.join('\t')).join('\n');
    }

    function getOrtsData(includeStation) {
        const lines = window.timetableData.map((row, idx) => {
            const isFirst = idx === 0;

            if (!isFirst && !row.stop) {
                return '';
            }

            const arr = row.arrivalStr || '';
            const dep = row.departureStr || '';
            let timeRange = '';
            if (arr && dep) {
                timeRange = `${arr}-${dep}`;
            } else if (arr) {
                timeRange = arr;
            } else if (dep) {
                timeRange = dep;
            }

            if (includeStation) {
                return `${row.station}\t${timeRange}`;
            } else {
                return timeRange;
            }
        });
        return lines.join('\n');
    }

    // Expose helpers for other modules
    window.getTSVWithHeaders = getTSVWithHeaders;
    window.getOrtsData = getOrtsData;

    // ---- Setup event handlers ----
    setupEventHandlers();

    // ---- Initial state ----
    statusMsg.textContent = '📂 Load a JSON or .js file to begin.';

    console.log('🚆 ORTS Timetable Mode Schedule Calculator initialized.');
});