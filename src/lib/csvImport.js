// Parse exports from the Auto Export Health App
// Accepts either:
//   - A standalone Workouts-*.csv file (legacy)
//   - A ZIP file (HealthAutoExport_*.zip) containing Workouts-*.csv + Route CSVs

import Papa from 'papaparse'
import JSZip from 'jszip'
import { calcPace, parseDuration, celsiusToF } from './utils'

const METERS_PER_MILE = 1609.344

// ── GPS math ──────────────────────────────────────────────────────────────────

function haversineMeters(p1, p2) {
  const R = 6371000
  const dLat = (p2.lat - p1.lat) * Math.PI / 180
  const dLng = (p2.lng - p1.lng) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Compute mile splits from full-resolution route points [{lat, lng, t}]
// Returns [{mile, pace, elapsed}] where pace = min/mile, elapsed = seconds from start
export function computeMileSplits(points) {
  if (!points || points.length < 2) return []
  const hasTimestamps = points.every(p => p.t != null && !isNaN(p.t))
  if (!hasTimestamps) return []

  const splits = []
  let cumMeters = 0
  let mileMarker = 1
  let mileStartT = points[0].t
  const runStartT = points[0].t

  for (let i = 1; i < points.length; i++) {
    const segMeters = haversineMeters(points[i - 1], points[i])
    const prevCumMiles = cumMeters / METERS_PER_MILE
    cumMeters += segMeters
    const cumMiles = cumMeters / METERS_PER_MILE

    // A single GPS segment may cross multiple mile boundaries (rare but possible)
    while (cumMiles >= mileMarker) {
      const fracInSeg = (mileMarker - prevCumMiles) / (cumMiles - prevCumMiles)
      const segMs = points[i].t - points[i - 1].t
      const crossT = points[i - 1].t + fracInSeg * segMs

      const splitMin = (crossT - mileStartT) / 60000
      splits.push({
        mile: mileMarker,
        pace: Math.round(splitMin * 100) / 100,
        elapsed: Math.round((crossT - runStartT) / 1000),
      })

      mileStartT = crossT
      mileMarker++
    }
  }

  return splits
}

// Sample full points down to ≤maxPoints for map display (strip timestamps)
function sampleRoute(points, maxPoints = 300) {
  const step = points.length <= maxPoints ? 1 : Math.ceil(points.length / maxPoints)
  return points.filter((_, i) => i % step === 0).map(({ lat, lng }) => ({ lat, lng }))
}

// ── Workouts CSV row → run object ─────────────────────────────────────────────
// ZIP format columns: Workout Type, Start, End, Duration, Active Energy (kcal),
//   Max. Heart Rate (count/min), Avg. Heart Rate (count/min), Distance (km),
//   Elevation Ascended (m), Temperature (degC), Humidity (%), Step Count,
//   Step Cadence (spm), ...
function rowToRun(row, routeMap) {
  const distKm = parseFloat(row['Distance (km)']) || 0
  const distMiles = Math.round(distKm * 0.621371 * 100) / 100

  const durationRaw = row['Duration'] || row['Duration (HH:MM:SS)'] || ''
  const durationMin = parseDuration(durationRaw) ?? 0

  const tempC = parseFloat(row['Temperature (degC)'])
  const tempF = isNaN(tempC) ? null : celsiusToF(tempC)

  const elevM = parseFloat(row['Elevation Ascended (m)'])
  const elevFt = isNaN(elevM) ? null : Math.round(elevM * 3.28084)

  // ZIP uses "Start" (e.g. "2026-05-25 16:43"), older CSV used "Date"
  const dateRaw = row['Start'] || row['Date'] || ''
  const date = dateRaw.split(' ')[0] || dateRaw

  // Look up full-resolution route points (include timestamps for split calc)
  const workoutType = row['Workout Type'] || 'Outdoor Run'
  const routeKey = routeMap ? buildRouteKey(workoutType, row['Start']) : null
  const fullPoints = routeKey ? (routeMap[routeKey] ?? null) : null

  const route = fullPoints ? sampleRoute(fullPoints) : null
  const splits = fullPoints ? computeMileSplits(fullPoints) : null

  return {
    date,
    distance: distMiles,
    duration_minutes: Math.round(durationMin * 10) / 10,
    pace: calcPace(distMiles, durationMin),
    workout_type: workoutType,
    max_heart_rate_bpm: parseIntOrNull(row['Max. Heart Rate (count/min)']),
    avg_heart_rate_bpm: parseIntOrNull(row['Avg. Heart Rate (count/min)'] ?? row['Average Heart Rate (count/min)']),
    active_energy_kcal: parseFloatOrNull(row['Active Energy (kcal)']),
    elevation_gain: elevFt,
    temperature_f: tempF,
    humidity_percent: parseFloatOrNull(row['Humidity (%)']),
    step_count: parseIntOrNull(row['Step Count']),
    step_cadence_spm: parseFloatOrNull(row['Step Cadence (spm)'] ?? row['Step Cadence (steps/min)']),
    route,     // [{lat, lng}] sampled GPS track, or null
    splits,    // [{mile, pace, elapsed}] mile splits, or null
    source: 'health_app',
  }
}

// Derive the timestamp key used in route filenames: "Outdoor Run-Route-20260525_164314.csv"
// from Start = "2026-05-25 16:43"
function buildRouteKey(workoutType, startStr) {
  if (!startStr) return null
  const [datePart, timePart] = startStr.split(' ')
  if (!datePart) return null
  const dateCompact = datePart.replace(/-/g, '')
  const timeCompact = (timePart ?? '').replace(/:/g, '').substring(0, 4)
  return `${workoutType}_${dateCompact}_${timeCompact}`
}

// ── Route CSV parser (GPS track) ──────────────────────────────────────────────
// Columns: Timestamp, Latitude, Longitude, Altitude (m), Speed (m/s), ...
function parseRouteCSV(text) {
  const result = Papa.parse(text, { header: true, skipEmptyLines: true })
  return result.data
    .map(r => ({
      lat: parseFloat(r['Latitude']),
      lng: parseFloat(r['Longitude']),
      t: r['Timestamp'] ? new Date(r['Timestamp'].replace(' ', 'T')).getTime() : NaN,
    }))
    .filter(p => !isNaN(p.lat) && !isNaN(p.lng))
}

// ── Public API ─────────────────────────────────────────────────────────────────

// Accept a File that is either .csv or .zip
export async function parseHealthExport(file) {
  if (file.name.endsWith('.zip')) {
    return parseZip(file)
  }
  return parseCsvFile(file)
}

// Legacy: standalone Workouts CSV
function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete({ data, errors }) {
        if (errors.length) return reject(new Error(errors[0].message))
        try {
          const runs = data
            .filter(row => {
              const wt = (row['Workout Type'] || '').toLowerCase()
              return wt.includes('run') || wt.includes('walk')
            })
            .map(row => rowToRun(row, null))
            .filter(r => r.distance > 0)
          resolve(runs)
        } catch (e) {
          reject(e)
        }
      },
      error: reject,
    })
  })
}

// New: ZIP export from Auto Export Health App
async function parseZip(file) {
  const zip = await JSZip.loadAsync(file)

  // 1. Find and parse the Workouts summary CSV
  const workoutsFile = Object.keys(zip.files).find(
    name => name.startsWith('Workouts-') && name.endsWith('.csv')
  )
  if (!workoutsFile) throw new Error('No Workouts-*.csv found in ZIP')

  const workoutsText = await zip.files[workoutsFile].async('string')

  // 2. Parse all Route CSVs — full resolution including timestamps for split calc
  const routeMap = {}
  for (const [name, entry] of Object.entries(zip.files)) {
    // e.g. "Outdoor Run-Route-20260525_164314.csv"
    const match = name.match(/^(.+)-Route-(\d{8}_\d{4})\d*\.csv$/)
    if (!match) continue
    const workoutType = match[1]
    const ts = match[2]
    const key = `${workoutType}_${ts}`
    try {
      const text = await entry.async('string')
      routeMap[key] = parseRouteCSV(text)
    } catch {
      // skip unparseable route files
    }
  }

  // 3. Parse workout rows
  const result = Papa.parse(workoutsText, { header: true, skipEmptyLines: true })
  const runs = result.data
    .filter(row => {
      const wt = (row['Workout Type'] || '').toLowerCase()
      return wt.includes('run') || wt.includes('walk')
    })
    .map(row => rowToRun(row, routeMap))
    .filter(r => r.distance > 0)

  return runs
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseIntOrNull(v) {
  const n = parseInt(v)
  return isNaN(n) ? null : n
}
function parseFloatOrNull(v) {
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}
