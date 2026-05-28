import { BarChart2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { format, startOfWeek, addDays, parseISO, isSameWeek } from 'date-fns'
import { calcRunLoad, weekLoadLabel, getMaxHR } from '../../lib/utils'

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-navy-800 border border-white/10 rounded-lg px-3 py-2 text-xs">
      <p className="text-slate-300">{payload[0].payload.week}</p>
      <p className="text-emerald-400 font-semibold">{payload[0].value.toFixed(1)} mi</p>
    </div>
  )
}

export default function WeeklyStatsWidget({ runs = [] }) {
  const now = new Date()
  const maxHR = getMaxHR()

  // Build last 8 weeks
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const weekDate = addDays(startOfWeek(now), -7 * (7 - i))
    const label = format(weekDate, 'MMM d')
    const weekRuns = runs.filter(r => r.date && isSameWeek(parseISO(r.date), weekDate))
    const total = weekRuns.reduce((s, r) => s + (r.distance || 0), 0)
    const load = weekRuns.reduce((s, r) => s + calcRunLoad(r, maxHR), 0)
    return { week: label, miles: Math.round(total * 10) / 10, load: Math.round(load * 10) / 10, current: i === 7 }
  })

  const currentWeek = weeks[7]
  const prevWeek = weeks[6]
  const loadInfo = weekLoadLabel(currentWeek.load)
  const loadDelta = currentWeek.load - prevWeek.load

  return (
    <div className="bg-navy-800 border border-white/10 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 size={15} className="text-emerald-400" />
        <h3 className="text-white font-semibold text-sm">Last 8 Weeks</h3>
        <span className="text-slate-500 text-xs ml-auto">Weekly volume</span>
      </div>

      {runs.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-slate-500 text-sm">No data yet</div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={weeks} margin={{ left: -20, right: 8, top: 4, bottom: 0 }}>
              <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="miles" radius={[4, 4, 0, 0]}>
                {weeks.map((entry, i) => (
                  <Cell key={i} fill={entry.current ? '#10b981' : '#10b98144'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Training load indicator */}
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-xs mb-0.5">This week's training load</p>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold px-2 py-0.5 rounded-lg ${loadInfo.bg} ${loadInfo.color}`}>
                  {loadInfo.label}
                </span>
                <span className="text-slate-500 text-xs">score: {currentWeek.load}</span>
              </div>
            </div>
            {prevWeek.load > 0 && (
              <div className="text-right">
                <p className="text-slate-500 text-xs mb-0.5">vs last week</p>
                <p className={`text-sm font-semibold ${loadDelta > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {loadDelta > 0 ? '+' : ''}{loadDelta.toFixed(1)}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
