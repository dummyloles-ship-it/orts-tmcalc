/**
 * TIMETABLE ENGINE
 * Travel time calculations, schedule generation with top-skip logic
 */

function computeTravelTimeWithDetails(dA, dB, defaultSpeed, speedLimits, performance) {
    if (dA >= dB) return { totalMinutes: 0, segments: [] };
    
    let perf = parseFloat(performance) || 1.0;
    if (perf < 0.01) perf = 0.01;
    if (perf > 1.0) perf = 1.0;
    
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
    
    let totalMinutes = totalHours * 60;
    
    if (perf !== 1.0) {
        const adjustedTotal = totalMinutes / perf;
        const adjustmentFactor = 1 / perf;
        segments.forEach(seg => {
            seg.originalMinutes = seg.minutes;
            seg.minutes = seg.minutes * adjustmentFactor;
            seg.hours = seg.hours * adjustmentFactor;
        });
        return { 
            totalMinutes: adjustedTotal, 
            segments: segments,
            theoreticalMinutes: totalMinutes,
            adjustmentFactor: adjustmentFactor,
            performance: perf
        };
    }
    
    return { totalMinutes: totalMinutes, segments: segments, theoreticalMinutes: totalMinutes, adjustmentFactor: 1, performance: 1 };
}

function minutesToTime(min) {
    if (min === undefined || isNaN(min) || !isFinite(min)) return '';
    
    const extendsBeyondDay = window.scheduleExtendsBeyondDay || false;
    const day = Math.floor(min / 1440);
    const rem = min % 1440;
    const hrs = Math.floor(rem / 60);
    const mins = Math.round(rem % 60);
    const timeStr = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    
    if (extendsBeyondDay) {
        return `${timeStr} (Day ${day})`;
    } else {
        return timeStr;
    }
}

function updateSchedule(timetableData, departureInput, arrivalInput, defaultSpeedInput, speedLimits, statusMsg, performance) {
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

    let perf = parseFloat(performance) || 1.0;
    if (perf < 0.01) perf = 0.01;
    if (perf > 1.0) perf = 1.0;

    // ---- Find first station with halt enabled ----
    let firstStopIndex = -1;
    for (let i = 0; i < timetableData.length; i++) {
        if (timetableData[i].stop === true) {
            firstStopIndex = i;
            break;
        }
    }

    // If no station has halt enabled, clear all times and return
    if (firstStopIndex === -1) {
        timetableData.forEach(row => {
            row.arrival = undefined;
            row.departure = undefined;
            row.arrivalStr = '';
            row.departureStr = '';
            row.calcDetails = null;
        });
        window.scheduleExtendsBeyondDay = false;
        return;
    }

    // ---- Compute total travel time from firstStopIndex to end ----
    let totalMinutes = 0;
    for (let i = firstStopIndex; i < timetableData.length - 1; i++) {
        const fromRow = timetableData[i];
        const toRow = timetableData[i + 1];
        const travel = computeTravelTimeWithDetails(fromRow.distOrigin, toRow.distOrigin, parseFloat(defaultSpeedInput.value) || 0, speedLimits, perf);
        totalMinutes += travel.totalMinutes;
        // Buffer is always applied for all stations after firstStopIndex, regardless of stop status
        totalMinutes += toRow.buffer || 0;
    }

    // Determine start time
    if (!depStr && !arrStr) {
        startMinutes = 0;
    } else if (depStr) {
        const parts = depStr.split(':');
        startMinutes = parseInt(parts[0]) * 60 + parseInt(parts[1]);
    } else if (arrStr) {
        const parts = arrStr.split(':');
        const endMinutes = parseInt(parts[0]) * 60 + parseInt(parts[1]);
        startMinutes = endMinutes - totalMinutes;
    }

    if (startMinutes === null) {
        timetableData.forEach(row => { row.arrivalStr = ''; row.departureStr = ''; row.calcDetails = null; });
        window.scheduleExtendsBeyondDay = false;
        return;
    }

    // ---- Compute schedule starting from firstStopIndex ----
    let currentTime = startMinutes;
    let maxTime = 0;

    // For stations before firstStopIndex, clear times and force buffer/halt to 0
    for (let i = 0; i < firstStopIndex; i++) {
        const row = timetableData[i];
        row.arrival = undefined;
        row.departure = undefined;
        row.arrivalStr = '';
        row.departureStr = '';
        row.calcDetails = null;
        row.buffer = 0;
        row.halt = 0;
        // Ensure stop is false (they shouldn't have stop anyway, but just in case)
        row.stop = false;
    }

    // For stations from firstStopIndex onward, compute schedule
    for (let i = firstStopIndex; i < timetableData.length; i++) {
        const row = timetableData[i];
        if (i === firstStopIndex) {
            row.arrival = currentTime;
            // Departure includes halt only if stop is true
            row.departure = currentTime + (row.stop ? (row.halt || 0) : 0);
            row.calcDetails = null;
        } else {
            const prevRow = timetableData[i - 1];
            const travelInfo = computeTravelTimeWithDetails(prevRow.distOrigin, row.distOrigin, parseFloat(defaultSpeedInput.value) || 0, speedLimits, perf);
            const travel = travelInfo.totalMinutes;
            // Buffer is always applied after firstStopIndex, regardless of stop
            const buffer = row.buffer || 0;
            row.arrival = prevRow.departure + travel + buffer;
            row.departure = row.arrival + (row.stop ? (row.halt || 0) : 0);
            row.calcDetails = {
                fromStation: prevRow.station,
                toStation: row.station,
                fromDist: prevRow.distOrigin,
                toDist: row.distOrigin,
                travelMinutes: travel,
                theoreticalMinutes: travelInfo.theoreticalMinutes || travel,
                adjustmentFactor: travelInfo.adjustmentFactor || 1,
                performance: perf,
                buffer: buffer,
                halt: row.stop ? row.halt : 0,
                segments: travelInfo.segments || [],
                defaultSpeed: parseFloat(defaultSpeedInput.value) || 0,
                fromPoints: prevRow.stationPoints,
                toPoints: row.stationPoints
            };
        }
        if (row.arrival > maxTime) maxTime = row.arrival;
        if (row.departure > maxTime) maxTime = row.departure;
    }

    window.scheduleExtendsBeyondDay = maxTime >= 1440;

    // Convert times to strings
    for (let i = 0; i < timetableData.length; i++) {
        const row = timetableData[i];
        if (i >= firstStopIndex) {
            row.arrivalStr = minutesToTime(row.arrival);
            row.departureStr = minutesToTime(row.departure);
        } else {
            row.arrivalStr = '';
            row.departureStr = '';
        }
    }
}

// Expose globally
window.computeTravelTimeWithDetails = computeTravelTimeWithDetails;
window.minutesToTime = minutesToTime;
window.updateSchedule = updateSchedule;