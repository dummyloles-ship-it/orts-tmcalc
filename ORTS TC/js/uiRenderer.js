/**
 * UI RENDERER
 * Table rendering, column selector, modals
 */

function renderTable(timetableData, columnVisibility, COLUMNS, tableHead, tableBody) {
    // Header
    let theadHtml = '<tr>';
    COLUMNS.forEach(col => {
        if (columnVisibility[col.key] !== false) {
            theadHtml += `<th>${col.label}</th>`;
        }
    });
    theadHtml += '</tr>';
    tableHead.innerHTML = theadHtml;

    // Body
    let tbodyHtml = '';
    timetableData.forEach((st, idx) => {
        tbodyHtml += '<tr class="station-row">';
        COLUMNS.forEach(col => {
            if (columnVisibility[col.key] === false) return;
            if (col.key === 'select') {
                tbodyHtml += `<td><input type="checkbox" class="row-check" data-idx="${idx}" data-type="station" title="Select this station for multi-edit"></td>`;
            } else if (col.key === 'stop') {
                const isFirst = idx === 0;
                tbodyHtml += `<td><input type="checkbox" class="stop-check" data-idx="${idx}" ${st.stop ? 'checked' : ''} ${isFirst ? 'disabled' : ''} title="${isFirst ? 'First station always has departure time' : 'Enable/disable halt at this station'}"></td>`;
            } else if (col.key === 'station') {
                tbodyHtml += `<td class="station-name">${st.station}</td>`;
            } else if (col.key === 'distPrev') {
                tbodyHtml += `<td>${st.distPrev.toFixed(3)}</td>`;
            } else if (col.key === 'distOrigin') {
                tbodyHtml += `<td>${st.distOrigin.toFixed(3)}</td>`;
            } else if (col.key === 'arrival') {
                const isFirst = idx === 0;
                const displayVal = (isFirst || st.stop) ? (st.arrivalStr || '') : '';
                tbodyHtml += `<td>${displayVal}</td>`;
            } else if (col.key === 'departure') {
                const isFirst = idx === 0;
                const displayVal = (isFirst || st.stop) ? (st.departureStr || '') : '';
                tbodyHtml += `<td>${displayVal}</td>`;
            } else if (col.key === 'buffer') {
                if (st.isFirst) {
                    tbodyHtml += `<td title="No buffer before the first station">-</td>`;
                } else {
                    const prevStation = timetableData[idx - 1].station;
                    tbodyHtml += `<td title="Buffer added before arriving at ${st.station} (between ${prevStation} → ${st.station})">
                        <span class="buffer-prefix">⬅</span>
                        <input type="number" class="editable-input buffer-input" data-idx="${idx}" value="${st.buffer || 0}" step="0.5" min="0" title="Buffer time between ${prevStation} and ${st.station} (minutes)">
                    </td>`;
                }
            } else if (col.key === 'halt') {
                const isDisabled = !st.stop;
                const displayVal = st.stop ? (st.halt || 0) : 0;
                tbodyHtml += `<td><input type="number" class="editable-input halt-input" data-idx="${idx}" value="${displayVal}" ${isDisabled ? 'disabled' : ''} step="0.5" min="0" title="Dwell time at ${st.station} (minutes)"></td>`;
            } else if (col.key === 'calc') {
                if (idx === 0 || !st.calcDetails) {
                    tbodyHtml += `<td>-</td>`;
                } else {
                    tbodyHtml += `<td><button class="btn btn-outline btn-sm calc-btn" data-idx="${idx}" title="Show detailed calculation for segment leading to ${st.station}">📊</button></td>`;
                }
            }
        });
        tbodyHtml += '</tr>';
    });
    tableBody.innerHTML = tbodyHtml;
}

function renderColumnSelector(COLUMNS, columnVisibility, colSelector) {
    colSelector.innerHTML = '';
    COLUMNS.forEach(col => {
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

    html += `<p><strong>Distance:</strong> ${d.fromDist.toFixed(3)} km → ${d.toDist.toFixed(3)} km (${(d.toDist - d.fromDist).toFixed(3)} km)</p>`;
    html += `<p><strong>Default speed used:</strong> ${d.defaultSpeed || 'none (speed limits only)'}</p>`;
    html += `<p><strong>Buffer applied before arrival:</strong> ${d.buffer} min</p>`;

    if (d.segments && d.segments.length > 0) {
        html += `<table><thead><tr><th>From (km)</th><th>To (km)</th><th>Distance (km)</th><th>Speed (km/h)</th><th>Time (min)</th></tr></thead><tbody>`;
        d.segments.forEach(seg => {
            html += `<tr><td>${seg.from.toFixed(3)}</td><td>${seg.to.toFixed(3)}</td><td>${seg.dist.toFixed(3)}</td><td>${seg.speed}</td><td>${seg.minutes.toFixed(2)}</td></tr>`;
        });
        html += `</tbody></table>`;
        html += `<p><strong>Total travel time:</strong> ${d.travelMinutes.toFixed(2)} min</p>`;
    } else {
        html += `<p>No speed limits encountered; used constant speed.</p>`;
        html += `<p><strong>Total travel time:</strong> ${d.travelMinutes.toFixed(2)} min</p>`;
    }

    html += `<p><strong>Halt at destination:</strong> ${d.halt} min</p>`;
    html += `<p><strong>Arrival time:</strong> ${row.arrivalStr}  |  <strong>Departure:</strong> ${row.departureStr}</p>`;

    calcModalBody.innerHTML = html;
    calcModal.classList.add('active');
}

// Expose globally
window.renderTable = renderTable;
window.renderColumnSelector = renderColumnSelector;
window.showCalcDetails = showCalcDetails;