import { useQuery } from '@tanstack/react-query'
import { Run } from '../lib/db'
import { formatPace, formatDuration, riegelPredict, RACE_DISTANCES } from '../lib/utils'
import { Trophy, Zap, Route, Mountain, Flame, TrendingUp, Star, Clock } from 'lucide-react'
import { startOfWeek, parseISO, format } from 'date-fns'

function calcStreaks(runs) {
  if (!runs.length) return { current: 0, best: 0 }
  const dates = [...new Set(runs.map(r => r.date).filter(Boolean))].sort()
  let best = 1, streak = 1
  for (let i = 1; i < dates.length; i++) {
    const diff = (new Date(dates[i]) - new Date(dates[i - 1])) / 86400000
    streak = diff === 1 ? streak + 1 : 1
    best = Math.max(best, streak)
  }
  const last = new Date(dates[dates.length - 1])
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const current = (today - last) / 86400000 <= 1 ? streak : 0
  return { current, best }
}

function bestWeekMiles(runs) {
  const byWeek = {}
  runs.forEach(r => {
    if (!r.date) return
    const wk = format(startOfWeek(parseISO(r.date)), 'yyyy-MM-dd')
    byWeek[wk] = (byWeek[wk] || 0) + (r.distance || 0)
  })
  const entries = Object.entries(byWeek)
  if (!entries.length) return null
  return entries.reduce((a, b) => b[1] > a[1] ? b : a)
}

function PRCard({ icon: Icon, iconColor, label, value, sub, date }) {
  return (
    <div className="bg-navy-800 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-slate-400 text-xs">{label}</p>
        <p className="text-white font-bold text-lg leading-tight">{value}</p>
        {sub && <p className="text-slate-500 text-xs">{sub}</p>}
      </div>
      {date && <p className="text-slate-600 text-xs shrink-0">{date}</p>}
    </div>
  )
}

function PredCard({ race, time, pace }) {
  return (
    <div className="bg-navy-800 border border-white/10 rounded-xl p-4">
      <p className="text-slate-400 text-xs mb-1">{race}</p>
      <p className="text-white font-bold">{time ?? '--'}</p>
      {pace && <p className="text-slate-500 text-xs mt-0.5">{pace}/mi</p>}
    </div>
  )
}

export default function Records() {
  const { data: runs = [] } = useQuery({
    queryKey: ['runs'],
    queryFn: () => Run.list('-date', 500),
  })

  const validRuns = runs.filter(r => r.distance > 0 && r.pace)
  const allRuns = runs.filter(r => r.distance > 0)

  if (!allRuns.length) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Personal Records</h1>
          <p className="text-slate-400 text-sm mt-0.5">Your best performances, auto-calculated</p>
        </div>
        <div className="text-center py-20 text-slate-500 text-sm">
          Log some runs to see your records here.
        </div>
      </div>
    )
  }

  // ── Calculate PRs ───────────────────────────────────────────────────────────
  const bestPaceRun = validRuns.reduce((a, b) => b.pace < a.pace ? b : a, validRuns[0])
  const longestRun = allRuns.reduce((a, b) => b.distance > a.distance ? b : a, allRuns[0])
  const mostElevRun = allRuns.filter(r => r.elevation_gain).reduce((a, b) =>
    b.elevation_gain > a.elevation_gain ? b : a, allRuns.find(r => r.elevation_gain) ?? allRuns[0])
  const streaks = calcStreaks(runs)
  const topWeek = bestWeekMiles(allRuns)
  const totalMiles = allRuns.reduce((s, r) => s + r.distance, 0)
  const longestDuration = allRuns.filter(r => r.duration_minutes)
    .reduce((a, b) => b.duration_minutes > a.duration_minutes ? b : a,
      allRuns.find(r => r.duration_minutes) ?? allRuns[0])

  // ── Race predictions via Riegel ─────────────────────────────────────────────
  // Use best qualifying run ≥ 1 mile with a known pace
  const qualifyingRun = validRuns.filter(r => r.distance >= 1)
    .reduce((a, b) => b.pace < a.pace ? b : a, validRuns.find(r => r.distance >= 1))

  const predictions = qualifyingRun ? [
    { race: '5K', dist: RACE_DISTANCES['5K'] },
    { race: '10K', dist: RACE_DISTANCES['10K'] },
    { race: 'Half Marathon', dist: RACE_DISTANCES['Half Marathon'] },
    { race: 'Marathon', dist: RACE_DISTANCES['Marathon'] },
  ].map(({ race, dist }) => {
    const mins = riegelPredict(qualifyingRun.distance, qualifyingRun.pace * qualifyingRun.distance, dist)
    if (!mins) return { race, time: null, pace: null }
    const pace = mins / dist
    const h = Math.floor(mins / 60)
    const m = Math.floor(mins % 60)
    const s = Math.round((mins - Math.floor(mins)) * 60)
    const time = h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${m}:${String(s).padStart(2, '0')}`
    return { race, time, pace: formatPace(pace) }
  }) : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Personal Records</h1>
        <p className="text-slate-400 text-sm mt-0.5">Your best performances, auto-calculated from {allRuns.length} runs</p>
      </div>

      {/* Lifetime stat strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Lifetime Miles', value: totalMiles.toFixed(0) },
          { label: 'Total Runs', value: allRuns.length },
          { label: 'Best Streak', value: `${streaks.best}d` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gradient-to-br from-orange-500/20 to-rose-500/10 border border-orange-500/20 rounded-2xl p-4 text-center">
            <p className="text-white font-bold text-2xl">{value}</p>
            <p className="text-slate-400 text-xs mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* PRs grid */}
      <div>
        <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Performance PRs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {bestPaceRun && (
            <PRCard
              icon={Zap} iconColor="bg-indigo-500/20 text-indigo-400"
              label="Best Pace"
              value={`${formatPace(bestPaceRun.pace)}/mi`}
              sub={`${bestPaceRun.distance?.toFixed(2)} mi run`}
              date={bestPaceRun.date}
            />
          )}
          {longestRun && (
            <PRCard
              icon={Route} iconColor="bg-emerald-500/20 text-emerald-400"
              label="Longest Run"
              value={`${longestRun.distance?.toFixed(2)} mi`}
              sub={longestRun.duration_minutes ? formatDuration(longestRun.duration_minutes) : undefined}
              date={longestRun.date}
            />
          )}
          {mostElevRun?.elevation_gain && (
            <PRCard
              icon={Mountain} iconColor="bg-teal-500/20 text-teal-400"
              label="Most Elevation"
              value={`${mostElevRun.elevation_gain} ft`}
              sub={`${mostElevRun.distance?.toFixed(2)} mi run`}
              date={mostElevRun.date}
            />
          )}
          {longestDuration?.duration_minutes && (
            <PRCard
              icon={Clock} iconColor="bg-purple-500/20 text-purple-400"
              label="Longest Time on Feet"
              value={formatDuration(longestDuration.duration_minutes)}
              sub={`${longestDuration.distance?.toFixed(2)} mi`}
              date={longestDuration.date}
            />
          )}
          {topWeek && (
            <PRCard
              icon={TrendingUp} iconColor="bg-amber-500/20 text-amber-400"
              label="Best Week"
              value={`${topWeek[1].toFixed(1)} mi`}
              sub={`week of ${topWeek[0]}`}
            />
          )}
          {streaks.current > 0 && (
            <PRCard
              icon={Flame} iconColor="bg-rose-500/20 text-rose-400"
              label="Current Streak"
              value={`${streaks.current} day${streaks.current !== 1 ? 's' : ''}`}
              sub={`best: ${streaks.best} days`}
            />
          )}
        </div>
      </div>

      {/* Race predictions */}
      {predictions.length > 0 && (
        <div>
          <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Predicted Race Times</h2>
          <p className="text-slate-600 text-xs mb-3">
            Projected from your {qualifyingRun?.distance?.toFixed(2)}-mile PR run on {qualifyingRun?.date} using the Riegel formula
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {predictions.map(p => (
              <PredCard key={p.race} race={p.race} time={p.time} pace={p.pace} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
