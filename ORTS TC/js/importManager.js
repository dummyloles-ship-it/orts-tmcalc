/**
 * IMPORT MANAGER
 * Reverse import timings from preview formats with halt and buffer inference
 */

function parseTimeString(timeStr) {
    if (!timeStr || timeStr.trim() === '') return null;

    let cleaned = timeStr.trim();
    let dayOffset = 0;

    const dayMatch = cleaned.match(/\(Day\s*(\d+)\)/);
    if (dayMatch) {
        dayOffset = parseInt(dayMatch[1]) * 1440;
        cleaned = cleaned.replace(/\(Day\s*\d+\)/, '').trim();
    }

    const rangeMatch = cleaned.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
    if (rangeMatch) {
        const arr = parseHHMM(rangeMatch[1]);
        const dep = parseHHMM(rangeMatch[2]);
        if (arr !== null && dep !== null) {
            return { arrival: arr + dayOffset, departure: dep + dayOffset };
        }
    }

    const singleMatch = cleaned.match(/^(\d{1,2}:\d{2})$/);
    if (singleMatch) {
        const time = parseHHMM(singleMatch[1]);
        if (time !== null) {
            return { arrival: time + dayOffset, departure: time + dayOffset };
        }
    }

    return null;
}

function parseHHMM(str) {
    const parts = str.split(':');
    if (parts.length !== 2) return null;
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
}

function parseImportText(text, format, stationNames) {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const results = [];

    const stationMap = {};
    stationNames.forEach((name, idx) => {
        stationMap[name.trim().toLowerCase()] = idx;
    });

    if (format === 'preview') {
        const headerLine = lines[0];
        const headers = headerLine.split('\t').map(h => h.trim().toLowerCase());
        const stationIdx = headers.indexOf('station');
        const arrivalIdx = headers.indexOf('arrival');
        const departureIdx = headers.indexOf('departure');

        if (stationIdx === -1 || (arrivalIdx === -1 && departureIdx === -1)) {
            return { error: 'Preview format: Could not find Station, Arrival, or Departure columns.' };
        }

        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split('\t');
            if (cols.length <= Math.max(stationIdx, arrivalIdx, departureIdx)) continue;
            const stationName = cols[stationIdx]?.trim();
            const arrivalStr = arrivalIdx !== -1 ? cols[arrivalIdx]?.trim() : '';
            const departureStr = departureIdx !== -1 ? cols[departureIdx]?.trim() : '';

            const lowerName = stationName?.toLowerCase();
            if (!lowerName) continue;

            let matchedIdx = -1;
            for (const [key, idx] of Object.entries(stationMap)) {
                if (key === lowerName || key.startsWith(lowerName) || lowerName.startsWith(key)) {
                    matchedIdx = idx;
                    break;
                }
            }
            if (matchedIdx === -1) {
                for (const [key, idx] of Object.entries(stationMap)) {
                    if (key.includes(lowerName) || lowerName.includes(key)) {
                        matchedIdx = idx;
                        break;
                    }
                }
            }
            if (matchedIdx === -1) continue;

            let arrival = null;
            let departure = null;

            if (arrivalStr) {
                const parsed = parseTimeString(arrivalStr);
                if (parsed) {
                    arrival = parsed.arrival;
                    departure = parsed.departure || parsed.arrival;
                }
            }
            if (departureStr && !departure) {
                const parsed = parseTimeString(departureStr);
                if (parsed) {
                    departure = parsed.departure || parsed.arrival;
                }
            }

            if (arrival !== null || departure !== null) {
                results.push({
                    index: matchedIdx,
                    arrival: arrival,
                    departure: departure
                });
            }
        }

        if (results.length === 0) {
            return { error: 'Preview format: No matching stations found. Please check your paste.' };
        }
        return { results };

    } else if (format === 'stations_timings') {
        for (const line of lines) {
            const parts = line.split('\t');
            if (parts.length < 2) continue;
            const stationName = parts[0].trim();
            const timeStr = parts.slice(1).join('\t').trim();

            const lowerName = stationName.toLowerCase();
            let matchedIdx = -1;
            for (const [key, idx] of Object.entries(stationMap)) {
                if (key === lowerName || key.startsWith(lowerName) || lowerName.startsWith(key)) {
                    matchedIdx = idx;
                    break;
                }
            }
            if (matchedIdx === -1) {
                for (const [key, idx] of Object.entries(stationMap)) {
                    if (key.includes(lowerName) || lowerName.includes(key)) {
                        matchedIdx = idx;
                        break;
                    }
                }
            }
            if (matchedIdx === -1) continue;

            const parsed = parseTimeString(timeStr);
            if (parsed) {
                results.push({
                    index: matchedIdx,
                    arrival: parsed.arrival,
                    departure: parsed.departure || parsed.arrival
                });
            }
        }

        if (results.length === 0) {
            return { error: 'Stations+Timings format: No matching stations found. Please check your paste.' };
        }
        return { results };

    } else if (format === 'timings_only') {
        let stationIdx = 0;
        for (const line of lines) {
            const timeStr = line.trim();
            if (!timeStr) continue;

            while (stationIdx < stationNames.length) {
                break;
            }
            if (stationIdx >= stationNames.length) break;

            const parsed = parseTimeString(timeStr);
            if (parsed) {
                results.push({
                    index: stationIdx,
                    arrival: parsed.arrival,
                    departure: parsed.departure || parsed.arrival
                });
                stationIdx++;
            }
        }

        if (results.length === 0) {
            return { error: 'Timings Only: No valid timings found.' };
        }
        return { results };
    }

    return { error: 'Unknown format.' };
}

/**
 * Compute base running time between two stations (no halt, no buffer)
 */
function computeBaseRunningTime(fromDist, toDist, defaultSpeed, speedLimits) {
    if (fromDist >= toDist) return 0;

    let perf = 1.0;
    const relevant = speedLimits.filter(s => s.distance > fromDist && s.distance < toDist);
    let currentDist = fromDist;
    let totalHours = 0;
    let currentSpeed = defaultSpeed;
    if (!currentSpeed || currentSpeed <= 0) {
        const before = speedLimits.filter(s => s.distance <= fromDist);
        if (before.length > 0) currentSpeed = before[before.length - 1].speed;
        else currentSpeed = 100;
    }
    if (currentSpeed <= 0) return 0;

    let idx = 0;
    while (currentDist < toDist) {
        let nextDist = toDist;
        if (idx < relevant.length) {
            const nextLimit = relevant[idx];
            if (nextLimit.distance < nextDist) nextDist = nextLimit.distance;
        }
        const segDist = nextDist - currentDist;
        if (segDist > 0) {
            totalHours += segDist / currentSpeed;
        }
        currentDist = nextDist;
        if (idx < relevant.length && relevant[idx].distance === currentDist) {
            currentSpeed = relevant[idx].speed;
            if (defaultSpeed && defaultSpeed > 0) currentSpeed = defaultSpeed;
            idx++;
        }
    }
    return totalHours * 60; // minutes
}

/**
 * Apply imported times with correct halt and buffer inference
 */
function applyImportedTimesWithBuffer(timetableData, importResults, speedLimits, defaultSpeed, stations) {
    let appliedCount = 0;
    let skippedCount = 0;
    let firstActiveIdx = -1;
    let lastActiveIdx = -1;

    // Step 1: Apply imported arrival/departure times
    importResults.forEach(result => {
        const idx = result.index;
        if (idx < 0 || idx >= timetableData.length) {
            skippedCount++;
            return;
        }
        const row = timetableData[idx];
        if (result.arrival !== null && result.arrival !== undefined) {
            row.arrival = result.arrival;
            if (result.departure !== null && result.departure !== undefined) {
                row.departure = result.departure;
            } else {
                row.departure = row.arrival + (row.stop ? row.halt : 0);
            }
            appliedCount++;
            if (firstActiveIdx === -1) firstActiveIdx = idx;
            lastActiveIdx = idx;
        } else if (result.departure !== null && result.departure !== undefined) {
            row.departure = result.departure;
            if (row.stop) {
                row.arrival = row.departure - (row.halt || 0);
            } else {
                row.arrival = row.departure;
            }
            appliedCount++;
            if (firstActiveIdx === -1) firstActiveIdx = idx;
            lastActiveIdx = idx;
        }
        row._imported = true;
    });

    if (firstActiveIdx === -1) {
        return { appliedCount, skippedCount, bufferCount: 0 };
    }

    // Step 2: Compute halt for each station (departure - arrival) if stop is enabled
    let haltCount = 0;
    for (let i = 0; i < timetableData.length; i++) {
        const row = timetableData[i];
        if (row.stop && row.arrival !== undefined && row.departure !== undefined) {
            const halt = Math.max(0, row.departure - row.arrival);
            if (halt > 0.1) {
                row.halt = halt;
                haltCount++;
            } else {
                row.halt = 0;
            }
        }
    }

    // Step 3: Infer buffers by comparing imported segment times to base running times
    let bufferCount = 0;
    for (let i = firstActiveIdx; i < timetableData.length - 1; i++) {
        const fromRow = timetableData[i];
        const toRow = timetableData[i + 1];

        // Only compute if both stations have valid times and from station has departure
        if (fromRow.departure === undefined || fromRow.departure === null) continue;
        if (toRow.arrival === undefined || toRow.arrival === null) continue;

        // Imported segment time = arrival of next - departure of current
        const importedSegmentTime = toRow.arrival - fromRow.departure;

        // Base running time from speed limits (no halt, no buffer)
        const baseRunningTime = computeBaseRunningTime(
            fromRow.distOrigin,
            toRow.distOrigin,
            defaultSpeed || 0,
            speedLimits || []
        );

        // Buffer = imported segment time - base running time
        const buffer = Math.max(0, importedSegmentTime - baseRunningTime);
        if (buffer > 0.1) {
            toRow.buffer = buffer;
            bufferCount++;
        } else {
            toRow.buffer = 0;
        }
    }

    // Step 4: Convert imported times to strings using global minutesToTime
    if (window.minutesToTime) {
        timetableData.forEach(row => {
            if (row._imported) {
                if (row.arrival !== undefined && row.arrival !== null) {
                    row.arrivalStr = window.minutesToTime(row.arrival);
                } else {
                    row.arrivalStr = '';
                }
                if (row.departure !== undefined && row.departure !== null) {
                    row.departureStr = window.minutesToTime(row.departure);
                } else {
                    row.departureStr = '';
                }
            }
        });
    }

    return { appliedCount, skippedCount, bufferCount, haltCount };
}

// Expose globally
window.parseImportText = parseImportText;
window.applyImportedTimesWithBuffer = applyImportedTimesWithBuffer;
window.parseTimeString = parseTimeString;
window.computeBaseRunningTime = computeBaseRunningTime;