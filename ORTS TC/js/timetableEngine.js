/**
 * TIMETABLE ENGINE
 * Travel time calculations, schedule generation
 */

function computeTravelTimeWithDetails(dA, dB, defaultSpeed, speedLimits) {
    if (dA >= dB) return { totalMinutes: 0, segments: [] };
    const relevant = speedLimits.filter(s => s.distance > dA && s.distance < dB);
    let currentDist = dA;
    let totalHours = 0;
    let currentSpeed = defaultSpeed;
    if (!currentSpeed || currentSpeed <= 0) {
        const before = speedLimits.filter(s => s.distance <= dA);
        if (before.length > 0) currentSpeed = before[before.length - 1].speed;
        else currentSpeed = 100;
    }
    if (currentSpeed <= 0) return { totalMinutes: 0, segments: [] };

    const segments = [];
    let idx = 0;
    while (currentDist < dB) {
        let nextDist = dB;
        if (idx < relevant.length) {
            const nextLimit = relevant[idx];
            if (nextLimit.distance < nextDist) nextDist = nextLimit.distance;
        }
        const segDist = nextDist - currentDist;
        let segHours = 0;
        if (segDist > 0) {
            segHours = segDist / currentSpeed;
            totalHours += segHours;
        }
        segments.push({
            from: currentDist,
            to: nextDist,
            dist: segDist,
            speed: currentSpeed,
            hours: segHours,
            minutes: segHours * 60
        });
        currentDist = nextDist;
        if (idx < relevant.length && relevant[idx].distance === currentDist) {
            currentSpeed = relevant[idx].speed;
            if (defaultSpeed && defaultSpeed > 0) currentSpeed = defaultSpeed;
            idx++;
        }
    }
    return { totalMinutes: totalHours * 60, segments };
}

function minutesToTime(min) {
    if (min === undefined || isNaN(min)) return '';
    const hrs = Math.floor(min / 60);
    const mins = Math.round(min % 60);
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function updateSchedule(timetableData, departureInput, arrivalInput, defaultSpeedInput, speedLimits, statusMsg) {
    const depStr = departureInput.value;
    const arrStr = arrivalInput.value;
    let startMinutes = null;

    function isValidTime(t) { return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(t); }
    if (depStr && !isValidTime(depStr)) {
        statusMsg.textContent = '⚠️ Invalid arrival at source time. Use HH:mm format.';
        return;
    }
    if (arrStr && !isValidTime(arrStr)) {
        statusMsg.textContent = '⚠️ Invalid arrival at destination time. Use HH:mm format.';
        return;
    }

    if (!depStr && !arrStr) {
        startMinutes = 0;
    } else if (depStr) {
        const parts = depStr.split(':');
        startMinutes = parseInt(parts[0]) * 60 + parseInt(parts[1]);
    } else if (arrStr) {
        const parts = arrStr.split(':');
        const endMinutes = parseInt(parts[0]) * 60 + parseInt(parts[1]);
        let totalMinutes = 0;
        for (let i = 0; i < timetableData.length - 1; i++) {
            const row = timetableData[i];
            const nextRow = timetableData[i + 1];
            const travel = computeTravelTimeWithDetails(row.distOrigin, nextRow.distOrigin, parseFloat(defaultSpeedInput.value) || 0, speedLimits);
            totalMinutes += travel.totalMinutes;
            totalMinutes += nextRow.buffer || 0;
            if (row.stop) totalMinutes += row.halt || 0;
        }
        startMinutes = endMinutes - totalMinutes;
    }

    if (startMinutes === null) {
        timetableData.forEach(row => { row.arrivalStr = ''; row.departureStr = ''; row.calcDetails = null; });
        return;
    }

    let currentTime = startMinutes;
    for (let i = 0; i < timetableData.length; i++) {
        const row = timetableData[i];
        if (i === 0) {
            row.arrival = currentTime;
            row.departure = currentTime + (row.stop ? (row.halt || 0) : 0);
            row.calcDetails = null;
        } else {
            const prevRow = timetableData[i - 1];
            const travelInfo = computeTravelTimeWithDetails(prevRow.distOrigin, row.distOrigin, parseFloat(defaultSpeedInput.value) || 0, speedLimits);
            const travel = travelInfo.totalMinutes;
            const buffer = row.buffer || 0;
            row.arrival = prevRow.departure + travel + buffer;
            row.departure = row.arrival + (row.stop ? (row.halt || 0) : 0);
            row.calcDetails = {
                fromStation: prevRow.station,
                toStation: row.station,
                fromDist: prevRow.distOrigin,
                toDist: row.distOrigin,
                travelMinutes: travel,
                buffer: buffer,
                halt: row.stop ? row.halt : 0,
                segments: travelInfo.segments,
                defaultSpeed: parseFloat(defaultSpeedInput.value) || 0,
                fromPoints: prevRow.stationPoints,
                toPoints: row.stationPoints
            };
        }
        row.arrivalStr = minutesToTime(row.arrival);
        row.departureStr = minutesToTime(row.departure);
    }
}

// Expose globally
window.computeTravelTimeWithDetails = computeTravelTimeWithDetails;
window.minutesToTime = minutesToTime;
window.updateSchedule = updateSchedule;