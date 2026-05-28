import { Target, Calendar, Trash2, Edit2, TrendingUp, Zap, CheckCircle2, Clock } from 'lucide-react'
import { formatDate, formatPace, parsePace } from '../../lib/utils'
import { TrainingGoal } from '../../lib/db'
import { useQueryClient } from '@tanstack/react-query'
import { startOfWeek, startOfMonth, parseISO, isAfter, format, subWeeks } from 'date-fns'
import { BarChart, Bar, ResponsiveContainer, Cell, Tooltip } from 'recharts'

// SVG circular progress ring
function Ring({ pct, size = 80, stroke = 7, color = '#FF6B35', bg = '#1A2B3C' }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const filled = circ * Math.min(1, pct / 100)
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={bg} strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  )
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = new Date(dateStr) - new Date()
  return Math.ceil(diff / 864e5)
}

export default function GoalCard({ goal, runs = [], onEdit }) {
  const qc = useQueryClient()

  const handleDelete = () => {
    if (confirm('Delete this goal?')) {
      TrainingGoal.delete(goal.id)
      qc.invalidateQueries({ queryKey: ['goals'] })
    }
  }

  const days = daysUntil(goal.race_date)
  const now = new Date()

  // ── Progress & stats by goal type ─────────────────────────────────────────
  let progress = 0
  let progressLabel = ''
  let ringColor = '#FF6B35'
  let statRows = []
  let weeklyBars = []

  if (goal.type === 'distance' && goal.target_distance) {
    const windowStart = goal.period === 'weekly'
      ? startOfWeek(now)
      : startOfMonth(now)
    const periodRuns = runs.filter(r => r.date && isAfter(parseISO(r.date), windowStart))
    const actual = periodRuns.reduce((s, r) => s + (r.distance || 0), 0)
    progress = Math.min(100, (actual / goal.target_distance) * 100)
    progressLabel = `${actual.toFixed(1)} / ${goal.target_distance} mi`
    ringColor = progress >= 100 ? '#10b981' : '#6366f1'

    statRows = [
      { label: 'Runs this period', value: periodRuns.length },
      { label: 'Remaining', value: `${Math.max(0, goal.target_distance - actual).toFixed(1)} mi` },
      { label: 'Period', value: goal.period === 'weekly' ? 'This week' : 'This month' },
    ]

    // Last 8 weeks mini bar chart
    weeklyBars = Array.from({ length: 8 }, (_, i) => {
      const wk = subWeeks(startOfWeek(now), 7 - i)
      const wkEnd = new Date(wk); wkEnd.setDate(wkEnd.getDate() + 7)
      const dist = runs
        .filter(r => r.date && parseISO(r.date) >= wk && parseISO(r.date) < wkEnd)
        .reduce((s, r) => s + (r.distance || 0), 0)
      return { week: format(wk, 'M/d'), miles: Math.round(dist * 10) / 10, isCurrent: i === 7 }
    })

  } else if (goal.type === 'race') {
    const targetPace = goal.target_pace ? parsePace(goal.target_pace) : null
    const recent = runs.filter(r => r.pace).slice(0, 10)
    const avgPace = recent.length ? recent.reduce((s, r) => s + r.pace, 0) / recent.length : null
    const bestPace = recent.length ? Math.min(...recent.map(r => r.pace)) : null

    if (targetPace && avgPace) {
      // Progress = how much of the gap from starting pace to target we've closed
      // Using best pace as proxy for "where we started getting close"
      const gap = avgPace - targetPace
      progress = gap <= 0 ? 100 : Math.max(0, Math.min(100, (1 - gap / (avgPace * 0.15)) * 100))
      progressLabel = gap <= 0 ? 'Goal achieved! 🎉' : `${formatPace(avgPace)} avg → ${goal.target_pace} target`
      ringColor = gap <= 0 ? '#10b981' : '#6366f1'
    } else if (days !== null && goal.race_date) {
      // No pace data — show countdown progress
      const totalDays = daysUntil(goal.race_date) ?? 0
      progress = totalDays <= 0 ? 100 : Math.max(0, 100 - (totalDays / 180) * 100)
      progressLabel = totalDays > 0 ? `${totalDays} days to race` : 'Race day!'
      ringColor = '#f59e0b'
    }

    statRows = [
      targetPace && { label: 'Target pace', value: `${goal.target_pace} /mi` },
      goal.target_time && { label: 'Target time', value: goal.target_time },
      avgPace && { label: 'Current avg pace', value: `${formatPace(avgPace)} /mi` },
      bestPace && { label: 'Best pace', value: `${formatPace(bestPace)} /mi` },
    ].filter(Boolean)

    // Last 8 weeks pace trend
    weeklyBars = Array.from({ length: 8 }, (_, i) => {
      const wk = subWeeks(startOfWeek(now), 7 - i)
      const wkEnd = new Date(wk); wkEnd.setDate(wkEnd.getDate() + 7)
      const wkRuns = runs.filter(r => r.date && r.pace && parseISO(r.date) >= wk && parseISO(r.date) < wkEnd)
      const pace = wkRuns.length ? wkRuns.reduce((s, r) => s + r.pace, 0) / wkRuns.length : null
      return { week: format(wk, 'M/d'), pace, paceStr: pace ? formatPace(pace) : '--', isCurrent: i === 7 }
    })
  }

  // Recent runs counting toward goal
  const recentRuns = runs.slice(0, 3)

  const isComplete = progress >= 100

  return (
    <div className="bg-navy-800 border border-white/10 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className={`p-5 bg-gradient-to-br ${
        goal.type === 'race'
          ? 'from-indigo-600/20 to-purple-600/10'
          : 'from-emerald-600/20 to-teal-600/10'
      } border-b border-white/5`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {isComplete
                ? <CheckCircle2 size={14} className="text-emerald-400" />
                : <Target size={14} className={goal.type === 'race' ? 'text-indigo-400' : 'text-emerald-400'} />
              }
              <span className={`text-xs font-semibold uppercase tracking-wider ${
                goal.type === 'race' ? 'text-indigo-400' : 'text-emerald-400'
              }`}>
                {goal.type === 'race' ? 'Race Goal' : `${goal.period === 'weekly' ? 'Weekly' : 'Monthly'} Distance`}
              </span>
            </div>
            <h3 className="text-white font-bold text-lg leading-tight">
              {goal.type === 'race' ? goal.race_type : `${goal.target_distance} miles`}
            </h3>
            {goal.notes && <p className="text-slate-400 text-xs mt-1">{goal.notes}</p>}
          </div>

          {/* Circular ring + pct */}
          <div className="relative shrink-0">
            <Ring pct={progress} color={ringColor} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-sm font-bold ${isComplete ? 'text-emerald-400' : 'text-white'}`}>
                {Math.round(progress)}%
              </span>
            </div>
          </div>
        </div>

        {/* Progress label */}
        <p className="text-slate-300 text-xs mt-3 font-medium">{progressLabel}</p>
        <div className="h-1.5 bg-black/30 rounded-full mt-2 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${progress}%`, background: ringColor }}
          />
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {/* Action buttons */}
        <div className="flex items-center justify-between">
          <div className="flex gap-3 flex-wrap">
            {days !== null && days > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-full">
                <Clock size={10} />
                {days}d to race
              </div>
            )}
            {days === 0 && (
              <div className="flex items-center gap-1.5 text-xs text-orange-300 bg-orange-500/10 px-2.5 py-1 rounded-full">
                🏁 Race day!
              </div>
            )}
            {goal.race_date && days !== null && days < 0 && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-white/5 px-2.5 py-1 rounded-full">
                <Calendar size={10} />
                {formatDate(goal.race_date)}
              </div>
            )}
            {goal.target_pace && goal.type === 'race' && (
              <div className="flex items-center gap-1.5 text-xs text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-full">
                <Zap size={10} />
                {goal.target_pace} /mi
              </div>
            )}
          </div>
          <div className="flex gap-1">
            <button onClick={() => onEdit(goal)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors">
              <Edit2 size={12} />
            </button>
            <button onClick={handleDelete}
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-white/5 transition-colors">
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Stats grid */}
        {statRows.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {statRows.slice(0, 4).map(({ label, value }) => (
              <div key={label} className="bg-navy-900/60 rounded-xl px-3 py-2">
                <p className="text-slate-500 text-xs">{label}</p>
                <p className="text-white text-sm font-semibold mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Mini chart */}
        {weeklyBars.some(w => (w.miles ?? w.pace) != null) && (
          <div>
            <p className="text-slate-500 text-xs mb-2">
              {goal.type === 'distance' ? 'Weekly miles (last 8 weeks)' : 'Avg pace by week'}
            </p>
            <ResponsiveContainer width="100%" height={56}>
              <BarChart data={weeklyBars} margin={{ left: 0, right: 0, top: 2, bottom: 0 }}>
                <Tooltip
                  contentStyle={{ background: '#0D1B2A', border: '1px solid #2E3F55', borderRadius: 6, fontSize: 10 }}
                  formatter={(val, name) => [
                    goal.type === 'distance' ? `${val} mi` : formatPace(val) + '/mi',
                    goal.type === 'distance' ? 'Miles' : 'Pace'
                  ]}
                  labelStyle={{ color: '#64748b', fontSize: 10 }}
                />
                <Bar dataKey={goal.type === 'distance' ? 'miles' : 'pace'} radius={[3, 3, 0, 0]}>
                  {weeklyBars.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.isCurrent
                        ? ringColor
                        : goal.type === 'distance' ? '#6366f144' : '#f59e0b44'}
                      opacity={entry.miles === 0 || entry.pace == null ? 0.2 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent runs */}
        {recentRuns.length > 0 && (
          <div>
            <p className="text-slate-500 text-xs mb-2">Recent runs</p>
            <div className="space-y-1">
              {recentRuns.map(r => (
                <div key={r.id} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0">
                  <span className="text-slate-400">{r.date}</span>
                  <span className="text-white font-medium">{r.distance?.toFixed(2)} mi</span>
                  <span className="text-indigo-300">{formatPace(r.pace)}/mi</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
