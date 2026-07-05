/**
 * DATA PROCESSOR
 * JSON parsing, station averaging, speed limit extraction
 */

function processData(rawPoints, defaultHaltVal, defaultBufferVal) {
    // ---- Stations: collect all points per name ----
    const stationPoints = rawPoints.filter(p => p.TrackItemType === 1);
    const stationMap = new Map();
    stationPoints.forEach(p => {
        const name = p.TrackItemText.trim();
        if (!name) return;
        const dist = p.DistanceAlongPath / 1000;
        if (!stationMap.has(name)) stationMap.set(name, []);
        stationMap.get(name).push(dist);
    });
    const stations = Array.from(stationMap.entries()).map(([name, dists]) => ({
        name,
        distance: dists.reduce((a, b) => a + b, 0) / dists.length,
        points: dists.slice().sort((a, b) => a - b)
    })).sort((a, b) => a.distance - b.distance);

    // ---- Speed limits ----
    const speedPoints = rawPoints.filter(p => {
        const type = p.TrackItemType;
        if (type !== 3 && type !== 4) return false;
        const val = parseFloat(p.TrackItemText);
        return !isNaN(val) && val > 0;
    });
    const speedLimits = speedPoints.map(p => ({
        distance: p.DistanceAlongPath / 1000,
        speed: parseFloat(p.TrackItemText)
    })).sort((a, b) => a.distance - b.distance);

    return { stations, speedLimits };
}

function buildTimetableData(stations, defaultHaltVal, defaultBufferVal, defaultHaltEnabled) {
    return stations.map((st, idx) => {
        const isFirst = idx === 0;
        // First station is now treated the same as others – no special lock
        return {
            station: st.name,
            distOrigin: st.distance,
            distPrev: idx === 0 ? 0 : st.distance - stations[idx - 1].distance,
            arrival: 0,
            departure: 0,
            arrivalStr: '',
            departureStr: '',
            stop: defaultHaltEnabled, // all stations follow the setting
            halt: defaultHaltVal,
            buffer: defaultBufferVal,
            isLast: idx === stations.length - 1,
            isFirst: isFirst, // still track origin for distance calculations
            stationPoints: st.points,
            originPoints: idx === 0 ? null : stations[idx - 1].points,
            calcDetails: null
        };
    });
}

// Expose globally
window.processData = processData;
window.buildTimetableData = buildTimetableData;