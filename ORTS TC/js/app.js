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
    const driverPerformanceInput = document.getElementById('driverPerformance');
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
        const performance = parseFloat(driverPerformanceInput.value) || 1.0;

        // Process data
        const result = processData(points, defaultHaltVal, defaultBufferVal);
        window.stations = result.stations;
        window.speedLimits = result.speedLimits;

        // Build timetable data with defaultHaltEnabled (no special lock for first station)
        window.timetableData = buildTimetableData(window.stations, defaultHaltVal, defaultBufferVal, defaultHaltEnabled);

        // Initial schedule update (with performance)
        updateSchedule(
            window.timetableData,
            departureInput,
            arrivalInput,
            defaultSpeedInput,
            window.speedLimits,
            statusMsg,
            performance
        );

        // Apply responsive visibility before rendering
        applyResponsiveVisibility();

        // Render
        renderTable(window.timetableData, window.columnVisibility, COLUMNS, tableHead, tableBody);

        // Render column selector
        renderColumnSelector(COLUMNS, window.columnVisibility, colSelector);

        // Check auto-calculate status
        const autoCalc = document.getElementById('autoCalculateSetting')?.checked !== false;
        if (!autoCalc) {
            statusMsg.textContent = `✅ Loaded ${points.length} points. Found ${window.stations.length} stations. ℹ️ Auto-calculation is disabled. Click "Recalculate" to update the timetable.`;
        } else {
            statusMsg.textContent = `✅ Loaded ${points.length} points. Found ${window.stations.length} stations.`;
        }
    });

    // ---- Recalculate event ----
    document.addEventListener('recalculate', function() {
        if (window.stations.length === 0) {
            statusMsg.textContent = '⚠️ No data loaded. Please load a JSON file first.';
            return;
        }
        const performance = parseFloat(driverPerformanceInput.value) || 1.0;
        updateSchedule(
            window.timetableData,
            departureInput,
            arrivalInput,
            defaultSpeedInput,
            window.speedLimits,
            statusMsg,
            performance
        );
        applyResponsiveVisibility();
        renderTable(window.timetableData, window.columnVisibility, COLUMNS, tableHead, tableBody);
        const autoCalc = document.getElementById('autoCalculateSetting')?.checked !== false;
        if (!autoCalc) {
            statusMsg.textContent = '✅ Timetable recalculated. ℹ️ Auto-calculation is disabled. Click "Recalculate" to update the timetable.';
        } else {
            statusMsg.textContent = '✅ Timetable recalculated.';
        }
    });

    // ---- Render table event ----
    document.addEventListener('renderTable', function() {
        renderTable(window.timetableData, window.columnVisibility, COLUMNS, tableHead, tableBody);
    });

    // ---- Preview requested (includes summary) ----
    document.addEventListener('previewRequested', function() {
        if (window.timetableData.length === 0) {
            statusMsg.textContent = '⚠️ No data loaded. Please load a JSON file first.';
            return;
        }
        const tsv = getTSVWithHeaders(window.timetableData, window.columnVisibility, COLUMNS, true);
        previewText.value = tsv;
        document.getElementById('previewModal').classList.add('active');
    });

    // ---- Copy TSV requested (includes summary) ----
    document.addEventListener('copyTSVRequested', function() {
        if (window.timetableData.length === 0) {
            statusMsg.textContent = '⚠️ No data loaded. Please load a JSON file first.';
            return;
        }
        const tsv = getTSVWithHeaders(window.timetableData, window.columnVisibility, COLUMNS, true);
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
        // Generate ORTS preview with skip logic (only stops)
        ortsText1.value = getOrtsData(true);
        ortsText2.value = getOrtsData(false);
    });

    // ---- Save Settings requested ----
    document.addEventListener('saveSettingsRequested', function() {
        saveSettings();
    });

    // ---- Responsive visibility function ----
    function applyResponsiveVisibility() {
        const width = window.innerWidth;
        const { columnVisibility, userToggled } = window;

        const thresholds = {
            'calc': 1050,
            'distOrigin': 950,
            'distPrev': 850,
            'select': 750,
            'buffer': 650,
            'halt': 650,
            'stop': 550
        };

        Object.keys(thresholds).forEach(key => {
            if (!userToggled[key]) {
                columnVisibility[key] = width >= thresholds[key];
            }
        });

        columnVisibility.station = true;
        columnVisibility.arrival = true;
        columnVisibility.departure = true;

        const checkboxes = colSelector.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => {
            const key = cb.dataset.key;
            if (key && columnVisibility[key] !== undefined) {
                cb.checked = columnVisibility[key];
            }
        });
    }

    // ---- Window resize listener ----
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (window.timetableData && window.timetableData.length > 0) {
                applyResponsiveVisibility();
                renderTable(window.timetableData, window.columnVisibility, COLUMNS, tableHead, tableBody);
            }
        }, 150);
    });

    // ---- Helper functions for preview ----

    function getVisibleColumnsForCopy() {
        return COLUMNS.filter(col => window.columnVisibility[col.key] !== false);
    }

    function getHeaders() {
        return getVisibleColumnsForCopy().map(col => col.label);
    }

    function getTableData(includeSummary) {
        const visible = getVisibleColumnsForCopy();
        const rows = [];

        // Station rows
        window.timetableData.forEach((row, idx) => {
            const isActive = row.stop;
            const rowData = visible.map(col => {
                if (col.key === 'select') return '☑';
                if (col.key === 'stop') return row.stop ? 'Yes' : 'No';
                if (col.key === 'station') return row.station;
                if (col.key === 'distPrev') return row.distPrev.toFixed(3);
                if (col.key === 'distOrigin') return row.distOrigin.toFixed(3);
                if (col.key === 'arrival') {
                    return isActive ? (row.arrivalStr || '') : '';
                }
                if (col.key === 'departure') {
                    return isActive ? (row.departureStr || '') : '';
                }
                if (col.key === 'buffer') return row.isFirst ? '-' : (row.buffer || 0).toFixed(1);
                if (col.key === 'halt') return (row.stop ? (row.halt || 0) : 0).toFixed(1);
                if (col.key === 'calc') return '📊';
                return '';
            });
            rows.push(rowData);
        });

        // Summary row (only if requested)
        if (includeSummary) {
            const summary = calculateSummary(window.timetableData);
            const rowData = [];
            visible.forEach(col => {
                let value = '';
                switch (col.key) {
                    case 'select':
                        value = '-';
                        break;
                    case 'stop':
                        value = '-';
                        break;
                    case 'station':
                        value = `TOTAL (${summary.totalStations} stations)`;
                        break;
                    case 'distPrev':
                        value = summary.totalDistPrev.toFixed(3);
                        break;
                    case 'distOrigin':
                        value = '-';
                        break;
                    case 'arrival':
                        value = `${(summary.totalTravelTime + summary.totalHalt + summary.totalBuffer).toFixed(1)} min`;
                        break;
                    case 'departure':
                        value = '';
                        break;
                    case 'buffer':
                        value = summary.totalBuffer.toFixed(1);
                        break;
                    case 'halt':
                        value = summary.totalHalt.toFixed(1);
                        break;
                    case 'calc':
                        value = '-';
                        break;
                    default:
                        value = '-';
                }
                rowData.push(value);
            });
            // Remove empty departure column data
            const filteredRowData = [];
            let skipNext = false;
            visible.forEach((col, idx) => {
                if (skipNext) { skipNext = false; return; }
                if (col.key === 'arrival' && visible.some(c => c.key === 'departure')) {
                    filteredRowData.push(rowData[idx]);
                    skipNext = true;
                } else if (col.key === 'departure') {
                    // Skip
                } else {
                    filteredRowData.push(rowData[idx]);
                }
            });
            rows.push(filteredRowData);
        }

        return rows;
    }

    function getTSVWithHeaders(includeSummary) {
        const headers = getHeaders();
        const rows = getTableData(includeSummary);
        const allRows = [headers, ...rows];
        return allRows.map(row => row.join('\t')).join('\n');
    }

    /**
     * Generate ORTS preview data with skip logic:
     * - Stations+Timings: show all stations, but timings empty for skipped (no stop)
     * - Timings Only: only show lines for active stations (with timings)
     */
    function getOrtsData(includeStation) {
        const lines = [];

        window.timetableData.forEach((row, idx) => {
            const isActive = row.stop;
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
                // Always output station name, even if skipped (timings empty)
                lines.push(`${row.station}\t${timeRange}`);
            } else {
                // Timings Only – only output if active and has time range
                if (isActive && timeRange) {
                    lines.push(timeRange);
                }
                // else skip this line entirely
            }
        });

        return lines.join('\n');
    }

    function calculateSummary(timetableData) {
        let totalDistPrev = 0;
        let totalDistOrigin = 0;
        let totalBuffer = 0;
        let totalHalt = 0;
        let totalTravelTime = 0;

        timetableData.forEach((row, idx) => {
            totalDistPrev += row.distPrev || 0;
            if (idx === timetableData.length - 1) {
                totalDistOrigin = row.distOrigin || 0;
            }
            if (!row.isFirst) {
                totalBuffer += row.buffer || 0;
            }
            if (row.stop) {
                totalHalt += row.halt || 0;
            }
            if (row.calcDetails) {
                totalTravelTime += row.calcDetails.travelMinutes || 0;
            }
        });

        return {
            totalDistPrev,
            totalDistOrigin,
            totalBuffer,
            totalHalt,
            totalTravelTime,
            totalStations: timetableData.length
        };
    }

    // Expose helpers for other modules
    window.getTSVWithHeaders = getTSVWithHeaders;
    window.getOrtsData = getOrtsData;
    window.calculateSummary = calculateSummary;

    // ---- Setup event handlers ----
    setupEventHandlers();

    // ---- Initial state ----
    statusMsg.textContent = '📂 Load a JSON or .js file to begin.';

    console.log('🚆 ORTS Timetable Mode Schedule Calculator initialized.');
});