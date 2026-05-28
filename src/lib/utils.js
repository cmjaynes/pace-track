// Pace & distance utilities

export function calcPace(distanceMiles, durationMinutes) {
  if (!distanceMiles || !durationMinutes || distanceMiles === 0) return null
  return durationMinutes / distanceMiles
}

export function formatPace(paceMinPerMile) {
  if (!paceMinPerMile || isNaN(paceMinPerMile)) return '--'
  const mins = Math.floor(paceMinPerMile)
  const secs = Math.round((paceMinPerMile - mins) * 60)
  return `${mins}:${String(secs).padStart(2, '0')}`
}

export function parsePace(str) {
  // "8:30" -> 8.5
  if (!str) return null
  const [m, s] = str.split(':').map(Number)
  if (isNaN(m)) return null
  return m + (s || 0) / 60
}

export function formatDuration(minutes) {
  if (!minutes) return '--'
  const h = Math.floor(minutes / 60)
  const m = Math.floor(minutes % 60)
  const s = Math.round((minutes - Math.floor(minutes)) * 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function parseDuration(str) {
  // "1:30:00" or "45:30" -> minutes
  if (!str) return null
  const parts = str.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 60
  if (parts.length === 2) return parts[0] + parts[1] / 60
  return null
}

// Riegel formula: T2 = T1 * (D2/D1)^1.06
export function riegelPredict(knownDistanceMiles, knownTimeMinutes, targetDistanceMiles) {
  if (!knownDistanceMiles || !knownTimeMinutes || !targetDistanceMiles) return null
  return knownTimeMinutes * Math.pow(targetDistanceMiles / knownDistanceMiles, 1.06)
}

export const RACE_DISTANCES = {
  '1 Mile': 1,
  '5K': 3.107,
  '10K': 6.214,
  '15K': 9.321,
  'Half Marathon': 13.109,
  'Marathon': 26.219,
  '50K': 31.069,
}

export function paceColor(paceMinPerMile) {
  if (!paceMinPerMile) return 'text-slate-400'
  if (paceMinPerMile < 8) return 'text-emerald-400'
  if (paceMinPerMile < 9.5) return 'text-indigo-400'
  if (paceMinPerMile < 11) return 'text-amber-400'
  return 'text-rose-400'
}

export function paceColorBg(paceMinPerMile) {
  if (!paceMinPerMile) return 'bg-slate-700'
  if (paceMinPerMile < 8) return 'bg-emerald-500'
  if (paceMinPerMile < 9.5) return 'bg-indigo-500'
  if (paceMinPerMile < 11) return 'bg-amber-500'
  return 'bg-rose-500'
}

export function weekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function celsiusToF(c) {
  return Math.round(c * 9 / 5 + 32)
}
