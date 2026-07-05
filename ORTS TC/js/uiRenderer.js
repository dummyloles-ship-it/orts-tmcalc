/**
 * UI RENDERER
 * Clean, dynamic table rendering with responsive column hiding
 */

function renderTable(timetableData, columnVisibility, COLUMNS, tableHead, tableBody) {
    // ---- Build header ----
    let theadHtml = '<tr>';
    COLUMNS.forEach(col => {
        if (columnVisibility[col.key] !== false) {
            theadHtml += `<th class="col-${col.key}" data-col="${col.key}">${col.label}</th>`;
        }
    });
    theadHtml += '</tr>';
    tableHead.innerHTML = theadHtml;

    // ---- Build body ----
    let tbodyHtml = '';
    
    // Station rows
    timetableData.forEach((st, idx) => {
        tbodyHtml += '<tr class="station-row">';
        COLUMNS.forEach(col => {
            if (columnVisibility[col.key] === false) return;
            const colKey = col.key;
            tbodyHtml += `<td class="col-${colKey}" data-col="${colKey}">`;
            switch (colKey) {
                case 'select':
                    tbodyHtml += `<input type="checkbox" class="row-check" data-idx="${idx}" title="Select this station for multi-edit">`;
                    break;
                case 'stop': {
                    const isFirst = idx === 0;
                    tbodyHtml += `<input type="checkbox" class="stop-check" data-idx="${idx}" ${st.stop ? 'checked' : ''} ${isFirst ? 'disabled' : ''} title="${isFirst ? 'First station always has departure time' : 'Enable/disable halt at this station'}">`;
                    break;
                }
                case 'station':
                    tbodyHtml += `<span class="station-name">${st.station}</span>`;
                    break;
                case 'distPrev':
                    tbodyHtml += `${st.distPrev.toFixed(3)}`;
                    break;
                case 'distOrigin':
                    tbodyHtml += `${st.distOrigin.toFixed(3)}`;
                    break;
                case 'arrival': {
                    const isFirst = idx === 0;
                    const displayVal = (isFirst || st.stop) ? (st.arrivalStr || '') : '';
                    tbodyHtml += displayVal;
                    break;
                }
                case 'departure': {
                    const isFirst = idx === 0;
                    const displayVal = (isFirst || st.stop) ? (st.departureStr || '') : '';
                    tbodyHtml += displayVal;
                    break;
                }
                case 'buffer':
                    if (st.isFirst) {
                        tbodyHtml += `<span class="buffer-placeholder" title="No buffer before the first station">-</span>`;
                    } else {
                        const prevStation = timetableData[idx - 1].station;
                        tbodyHtml += `<span class="buffer-prefix" title="Buffer between ${prevStation} → ${st.station}">⬑</span>`;
                        tbodyHtml += `<input type="number" class="editable-input buffer-input" data-idx="${idx}" value="${st.buffer || 0}" step="0.5" min="0" title="Buffer time between ${prevStation} and ${st.station} (minutes)">`;
                    }
                    break;
                case 'halt': {
                    const isDisabled = !st.stop;
                    const displayVal = st.stop ? (st.halt || 0) : 0;
                    tbodyHtml += `<input type="number" class="editable-input halt-input" data-idx="${idx}" value="${displayVal}" ${isDisabled ? 'disabled' : ''} step="0.5" min="0" title="Dwell time at ${st.station} (minutes)">`;
                    break;
                }
                case 'calc':
                    if (idx === 0 || !st.calcDetails) {
                        tbodyHtml += `<span class="calc-placeholder">-</span>`;
                    } else {
                        tbodyHtml += `<button class="btn btn-outline btn-sm calc-btn" data-idx="${idx}" title="Show detailed calculation for segment leading to ${st.station}">📊</button>`;
                    }
                    break;
                default:
                    tbodyHtml += '';
            }
            tbodyHtml += '</td>';
        });
        tbodyHtml += '</tr>';
    });

    // ---- Summary row ----
    const summary = calculateSummary(timetableData);
    const visibleCols = COLUMNS.filter(col => columnVisibility[col.key] !== false);
    const arrivalVisible = columnVisibility.arrival !== false;
    const departureVisible = columnVisibility.departure !== false;

    tbodyHtml += '<tr class="summary-row">';
    
    let colIndex = 0;
    visibleCols.forEach(col => {
        const colKey = col.key;
        const isArrival = colKey === 'arrival';
        const isDeparture = colKey === 'departure';
        const isLastCol = colIndex === visibleCols.length - 1;

        // Skip departure column (handled within arrival)
        if (isDeparture) return;

        // Determine colspan for arrival (merge with departure if both visible)
        let colspan = 1;
        if (isArrival && departureVisible) {
            colspan = 2;
        }

        // Build cell
        let cellContent = '';
        let cellClass = `col-${colKey} summary-${colKey}`;

        if (isArrival) {
            // Merged cell for total travel time (theoretical + adjusted)
            const totalTime = summary.totalTravelTime + summary.totalHalt + summary.totalBuffer;
            cellContent = `${totalTime.toFixed(1)} min`;
            cellClass += ' summary-travel-time';
        } else {
            switch (colKey) {
                case 'select':
                    cellContent = '-';
                    break;
                case 'stop':
                    cellContent = '-';
                    break;
                case 'station':
                    cellContent = `TOTAL (${summary.totalStations} stations)`;
                    cellClass += ' summary-station';
                    break;
                case 'distPrev':
                    cellContent = summary.totalDistPrev.toFixed(3);
                    break;
                case 'distOrigin':
                    cellContent = '-';
                    break;
                case 'departure':
                    // Skip – handled in arrival
                    break;
                case 'buffer':
                    cellContent = summary.totalBuffer.toFixed(1);
                    break;
                case 'halt':
                    cellContent = summary.totalHalt.toFixed(1);
                    break;
                case 'calc':
                    cellContent = '-';
                    break;
                default:
                    cellContent = '-';
            }
        }

        if (!isDeparture) {
            tbodyHtml += `<td class="${cellClass}" data-col="${colKey}"${colspan > 1 ? ` colspan="${colspan}"` : ''}>${cellContent}</td>`;
            colIndex++;
        }
    });

    tbodyHtml += '</tr>';

    tableBody.innerHTML = tbodyHtml;
}

/**
 * Calculate summary totals from timetableData.
 * Returns object with totals.
 */
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

function renderColumnSelector(COLUMNS, columnVisibility, colSelector) {
    colSelector.innerHTML = '';
    COLUMNS.forEach(col => {
        // Skip columns that are always visible (station, arrival, departure)
        const alwaysVisible = ['station', 'arrival', 'departure'];
        if (alwaysVisible.includes(col.key)) return;

        const label = document.createElement('label');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = columnVisibility[col.key] !== false;
        cb.dataset.key = col.key;
        cb.addEventListener('change', (e) => {
            columnVisibility[col.key] = e.target.checked;
            // Re-render will be triggered by event handler
        });
        label.appendChild(cb);
        label.appendChild(document.createTextNode(col.label));
        label.title = `Toggle visibility of the "${col.label}" column`;
        colSelector.appendChild(label);
    });
}

function showCalcDetails(row, calcModal, calcModalTitle, calcModalBody) {
    const d = row.calcDetails;
    calcModalTitle.textContent = `Calculation: ${d.fromStation} → ${d.toStation}`;

    let html = '';

    // ---- Station averaging info ----
    if (d.fromPoints && d.fromPoints.length > 1) {
        html += `<div class="calc-avg-note">
            <strong>📌 Origin station "${d.fromStation}"</strong> was averaged from ${d.fromPoints.length} points: 
            ${d.fromPoints.map(p => p.toFixed(3)).join(', ')} → 
            <strong>${(d.fromPoints.reduce((a, b) => a + b, 0) / d.fromPoints.length).toFixed(3)} km</strong>
        </div>`;
    }

    if (d.toPoints && d.toPoints.length > 1) {
        html += `<div class="calc-avg-note">
            <strong>📌 Destination station "${d.toStation}"</strong> was averaged from ${d.toPoints.length} points: 
            ${d.toPoints.map(p => p.toFixed(3)).join(', ')} → 
            <strong>${(d.toPoints.reduce((a, b) => a + b, 0) / d.toPoints.length).toFixed(3)} km</strong>
        </div>`;
    }

    // ---- Distance info ----
    html += `<p><strong>Distance:</strong> ${d.fromDist.toFixed(3)} km → ${d.toDist.toFixed(3)} km (${(d.toDist - d.fromDist).toFixed(3)} km)</p>`;
    html += `<p><strong>Default speed used:</strong> ${d.defaultSpeed || 'none (speed limits only)'}</p>`;

    // ---- Driver Performance ----
    const perf = d.performance || 1.0;
    const adjFactor = d.adjustmentFactor || 1;
    html += `<p><strong>Driver Performance:</strong> ${perf.toFixed(3)} (${(perf * 100).toFixed(1)}%)</p>`;
    if (perf !== 1.0) {
        html += `<p><strong>Time Multiplier:</strong> ${adjFactor.toFixed(3)}×</p>`;
        html += `<p><strong>Theoretical Running Time:</strong> ${(d.theoreticalMinutes || d.travelMinutes).toFixed(2)} min</p>`;
        html += `<p><strong>Adjusted Running Time:</strong> ${d.travelMinutes.toFixed(2)} min</p>`;
    } else {
        html += `<p><strong>Running Time:</strong> ${d.travelMinutes.toFixed(2)} min</p>`;
    }

    // ---- Buffer and Halt ----
    html += `<p><strong>Buffer applied before arrival:</strong> ${d.buffer} min</p>`;
    html += `<p><strong>Halt at destination:</strong> ${d.halt} min</p>`;

    // ---- Speed limit segments ----
    if (d.segments && d.segments.length > 0) {
        html += `<table><thead><tr><th>From (km)</th><th>To (km)</th><th>Distance (km)</th><th>Speed (km/h)</th><th>Time (min)</th>`;
        if (perf !== 1.0) html += `<th>Adjusted (min)</th>`;
        html += `</tr></thead><tbody>`;
        d.segments.forEach(seg => {
            const segTime = seg.minutes.toFixed(2);
            html += `<tr><td>${seg.from.toFixed(3)}</td><td>${seg.to.toFixed(3)}</td><td>${seg.dist.toFixed(3)}</td><td>${seg.speed}</td><td>${segTime}</td>`;
            if (perf !== 1.0) {
                const adjSegTime = (seg.minutes * adjFactor).toFixed(2);
                html += `<td>${adjSegTime}</td>`;
            }
            html += `</tr>`;
        });
        html += `</tbody></table>`;
    } else {
        html += `<p>No speed limits encountered; used constant speed.</p>`;
    }

    html += `<p><strong>Arrival time:</strong> ${row.arrivalStr}  |  <strong>Departure:</strong> ${row.departureStr}</p>`;

    calcModalBody.innerHTML = html;
    calcModal.classList.add('active');
}

// Expose globally
window.renderTable = renderTable;
window.renderColumnSelector = renderColumnSelector;
window.showCalcDetails = showCalcDetails;