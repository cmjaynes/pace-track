import { Link } from 'react-router-dom'
import { Target, ChevronRight, CheckCircle2 } from 'lucide-react'
import { formatPace, parsePace } from '../../lib/utils'
import { startOfWeek, startOfMonth, parseISO, isAfter } from 'date-fns'

function MiniRing({ pct, color = '#6366f1', size = 44, stroke = 5 }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const filled = circ * Math.min(1, pct / 100)
  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1A2B3C" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }} />
    </svg>
  )
}

export default function GoalProgressWidget({ goals = [], runs = [] }) {
  const active = goals.filter(g => g.current_status === 'active')
  const now = new Date()

  return (
    <div className="bg-navy-800 border border-white/10 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target size={15} className="text-orange-400" />
          <h3 className="text-white font-semibold text-sm">Active Goals</h3>
        </div>
        <Link to="/goals" className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-0.5 transition-colors">
          Manage <ChevronRight size={12} />
        </Link>
      </div>

      {active.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-slate-500 text-sm">No active goals yet</p>
          <Link to="/goals" className="text-orange-400 text-xs hover:text-orange-300 mt-1 inline-block">
            Create a goal →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {active.slice(0, 4).map(goal => {
            let progress = 0
            let label = ''
            let ringColor = '#6366f1'

            if (goal.type === 'distance' && goal.target_distance) {
              const windowStart = goal.period === 'weekly' ? startOfWeek(now) : startOfMonth(now)
              const actual = runs
                .filter(r => r.date && isAfter(parseISO(r.date), windowStart))
                .reduce((s, r) => s + (r.distance || 0), 0)
              progress = Math.min(100, (actual / goal.target_distance) * 100)
              label = `${actual.toFixed(1)} / ${goal.target_distance} mi`
              ringColor = progress >= 100 ? '#10b981' : '#6366f1'
            } else if (goal.type === 'race') {
              const targetPace = goal.target_pace ? parsePace(goal.target_pace) : null
              const recent = runs.filter(r => r.pace).slice(0, 10)
              const avgPace = recent.length ? recent.reduce((s, r) => s + r.pace, 0) / recent.length : null
              if (targetPace && avgPace) {
                const gap = avgPace - targetPace
                progress = gap <= 0 ? 100 : Math.max(0, Math.min(100, (1 - gap / (avgPace * 0.15)) * 100))
                label = gap <= 0 ? 'Goal achieved!' : `${formatPace(avgPace)} → ${goal.target_pace}`
                ringColor = gap <= 0 ? '#10b981' : '#6366f1'
              } else if (goal.race_date) {
                const days = Math.ceil((new Date(goal.race_date) - now) / 86400000)
                progress = days <= 0 ? 100 : Math.max(0, 100 - (days / 180) * 100)
                label = days > 0 ? `${days}d to race` : 'Race day!'
                ringColor = '#f59e0b'
              }
            }

            const isComplete = progress >= 100
            const title = goal.type === 'race'
              ? `${goal.race_type}${goal.target_time ? ` (${goal.target_time})` : ''}`
              : `${goal.period === 'weekly' ? 'Weekly' : 'Monthly'} ${goal.target_distance} mi`

            return (
              <div key={goal.id} className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <MiniRing pct={progress} color={ringColor} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    {isComplete
                      ? <CheckCircle2 size={13} className="text-emerald-400" />
                      : <span className="font-bold text-white" style={{ fontSize: 9 }}>{Math.round(progress)}%</span>
                    }
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-300 text-xs font-medium truncate">{title}</p>
                  {label && <p className="text-slate-500 text-xs truncate">{label}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
