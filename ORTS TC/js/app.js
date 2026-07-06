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
    const autoCalculateMain = document.getElementById('autoCalculateMain');
    const prioritizedColumnDisappearanceMain = document.getElementById('prioritizedColumnDisappearanceMain');
    const usePassingTimesMain = document.getElementById('usePassingTimesMain');

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

        // Build timetable data with defaultHaltEnabled
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

        const prioritizedEnabled = document.getElementById('prioritizedColumnDisappearanceMain')?.checked !== false;

        if (!prioritizedEnabled) {
            COLUMNS.forEach(col => { columnVisibility[col.key] = true; });
            const checkboxes = colSelector.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => {
                const key = cb.dataset.key;
                if (key && columnVisibility[key] !== undefined) {
                    cb.checked = true;
                }
            });
            return;
        }

        const thresholds = {
            'calc': 1100,
            'distOrigin': 1000,
            'distPrev': 900,
            'select': 800,
            'halt': 700,
            'buffer': 600,
            'stop': 500
        };

        Object.keys(thresholds).forEach(key => {
            if (width >= thresholds[key] && columnVisibility[key] === true) {
                userToggled[key] = false;
            }
        });

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

    // ---- Main toggle events ----
    autoCalculateMain.addEventListener('change', function() {
        document.getElementById('autoCalculateSetting').checked = this.checked;
        saveSettings();
    });

    prioritizedColumnDisappearanceMain.addEventListener('change', function() {
        document.getElementById('prioritizedColumnDisappearanceSetting').checked = this.checked;
        applyResponsiveVisibility();
        renderTable(window.timetableData, window.columnVisibility, COLUMNS, tableHead, tableBody);
        saveSettings();
    });

    usePassingTimesMain.addEventListener('change', function() {
        document.getElementById('usePassingTimesSetting').checked = this.checked;
        renderTable(window.timetableData, window.columnVisibility, COLUMNS, tableHead, tableBody);
        saveSettings();
    });

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
        const usePassingTimes = window.isUsePassingTimesEnabled ? window.isUsePassingTimesEnabled() : false;

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
                    if (isActive) {
                        return row.arrivalStr || '';
                    } else if (usePassingTimes && row.departureStr) {
                        return `Pass at ${row.departureStr}`;
                    }
                    return '';
                }
                if (col.key === 'departure') {
                    if (isActive) {
                        return row.departureStr || '';
                    }
                    return '';
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
     * Generate ORTS preview data with passing times support.
     * Blank lines are always preserved for skipped stations.
     */
    function getOrtsData(includeStation) {
        const lines = [];
        const usePassingTimes = window.isUsePassingTimesEnabled ? window.isUsePassingTimesEnabled() : false;

        window.timetableData.forEach((row) => {
            const isActive = row.stop;
            const arr = row.arrivalStr || '';
            const dep = row.departureStr || '';
            let timeRange = '';
            let isPassing = false;

            if (isActive && arr && dep) {
                timeRange = `${arr}-${dep}`;
            } else if (!isActive && usePassingTimes && dep) {
                // Passing time: format as XXPXX
                const cleanTime = dep.replace(/ \(Day \d+\)/, '');
                timeRange = cleanTime.replace(':', 'P');
                isPassing = true;
            }

            if (includeStation) {
                // Stations + Timings: always output a line
                if (isPassing) {
                    lines.push(`${row.station}\t${timeRange}`);
                } else if (isActive && timeRange) {
                    lines.push(`${row.station}\t${timeRange}`);
                } else {
                    // Skipped station with no passing times -> blank line
                    lines.push('');
                }
            } else {
                // Timings Only: always output a line (blank for skipped without passing)
                if (isPassing) {
                    lines.push(timeRange);
                } else if (isActive && timeRange) {
                    lines.push(timeRange);
                } else {
                    lines.push(''); // blank line for skipped stations
                }
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

        let firstStopIndex = -1;
        for (let i = 0; i < timetableData.length; i++) {
            if (timetableData[i].stop === true) {
                firstStopIndex = i;
                break;
            }
        }

        timetableData.forEach((row, idx) => {
            totalDistPrev += row.distPrev || 0;
            if (idx === timetableData.length - 1) {
                totalDistOrigin = row.distOrigin || 0;
            }
            if (!row.isFirst && (firstStopIndex === -1 || idx >= firstStopIndex)) {
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

    // ---- Ensure renderTable and renderColumnSelector are globally available ----
    window.renderTable = renderTable;
    window.renderColumnSelector = renderColumnSelector;

    // ---- Setup event handlers ----
    setupEventHandlers();

    // ---- Initial state ----
    statusMsg.textContent = '📂 Load a JSON or .js file to begin.';

    console.log('🚆 Open Rails Timetable Schedule Calculator initialized.');
});