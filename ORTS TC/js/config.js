/**
 * CONFIGURATION
 * Column definitions, default settings
 */

// ---- Column definitions ----
const COLUMNS = [
    { key: 'select', label: 'Multi-edit' },
    { key: 'stop', label: 'Halt' },
    { key: 'station', label: 'Station' },
    { key: 'distPrev', label: 'Dist from prev (km)' },
    { key: 'distOrigin', label: 'Dist from origin (km)' },
    { key: 'arrival', label: 'Arrival' },
    { key: 'departure', label: 'Departure' },
    { key: 'buffer', label: 'Buffer (min)' },
    { key: 'halt', label: 'Halt (min)' },
    { key: 'calc', label: 'Calc' },
];

// ---- Default settings ----
const DEFAULT_SETTINGS = {
    theme: 'theme-dark',
    defaultHalt: 2,
    defaultBuffer: 0,
    defaultFolder: '',
    defaultHaltEnabled: false
};

// ---- Global state ----
let rawPoints = [];
let stations = [];
let speedLimits = [];
let timetableData = [];
let columnVisibility = {};

// Initialize column visibility
COLUMNS.forEach(col => { columnVisibility[col.key] = true; });

// Expose globally
window.COLUMNS = COLUMNS;
window.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
window.rawPoints = rawPoints;
window.stations = stations;
window.speedLimits = speedLimits;
window.timetableData = timetableData;
window.columnVisibility = columnVisibility;