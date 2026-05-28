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

// ── Heart Rate Zones ──────────────────────────────────────────────────────────
export const HR_ZONES = [
  { zone: 1, name: 'Recovery',  pctMin: 0.00, pctMax: 0.60, color: '#60a5fa', text: 'text-blue-400',   bg: 'bg-blue-500',   bgLight: 'bg-blue-500/20'   },
  { zone: 2, name: 'Aerobic',   pctMin: 0.60, pctMax: 0.70, color: '#34d399', text: 'text-emerald-400', bg: 'bg-emerald-500', bgLight: 'bg-emerald-500/20' },
  { zone: 3, name: 'Tempo',     pctMin: 0.70, pctMax: 0.80, color: '#fbbf24', text: 'text-amber-400',  bg: 'bg-amber-500',  bgLight: 'bg-amber-500/20'  },
  { zone: 4, name: 'Threshold', pctMin: 0.80, pctMax: 0.90, color: '#f97316', text: 'text-orange-400', bg: 'bg-orange-500', bgLight: 'bg-orange-500/20' },
  { zone: 5, name: 'VO₂ Max',   pctMin: 0.90, pctMax: 1.00, color: '#f43f5e', text: 'text-rose-400',   bg: 'bg-rose-500',   bgLight: 'bg-rose-500/20'   },
]

export function getMaxHR() {
  return parseInt(localStorage.getItem('pt_max_hr') || '190')
}

export function getHRZone(hr, maxHR) {
  if (!hr || !maxHR) return null
  const pct = hr / maxHR
  return [...HR_ZONES].reverse().find(z => pct >= z.pctMin) ?? HR_ZONES[0]
}

// Training load = distance × intensity multiplier (zone-based or pace-based fallback)
export function calcRunLoad(run, maxHR) {
  if (!run.distance) return 0
  const mhr = maxHR ?? getMaxHR()
  const zone = run.avg_heart_rate_bpm ? getHRZone(run.avg_heart_rate_bpm, mhr) : null
  const zoneMult = zone ? [1.0, 1.5, 2.0, 2.5, 3.0][zone.zone - 1]
    : run.pace ? (run.pace < 9 ? 2.0 : run.pace < 10.5 ? 1.5 : 1.0) : 1.0
  return Math.round(run.distance * zoneMult * 10) / 10
}

export function weekLoadLabel(score) {
  if (score === 0) return { label: 'Rest', color: 'text-slate-400', bg: 'bg-slate-500/20' }
  if (score < 15)  return { label: 'Easy',      color: 'text-blue-400',   bg: 'bg-blue-500/20'   }
  if (score < 30)  return { label: 'Moderate',  color: 'text-emerald-400', bg: 'bg-emerald-500/20' }
  if (score < 45)  return { label: 'Hard',      color: 'text-amber-400',  bg: 'bg-amber-500/20'  }
  return               { label: 'Very Hard', color: 'text-rose-400',   bg: 'bg-rose-500/20'   }
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
