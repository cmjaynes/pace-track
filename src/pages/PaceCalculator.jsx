import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Calculator, Zap, TrendingUp } from 'lucide-react'
import { Run } from '../lib/db'
import { riegelPredict, formatPace, formatDuration, RACE_DISTANCES, parsePace } from '../lib/utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function PaceCalculator() {
  const [pace, setPace] = useState('')
  const [distance, setDistance] = useState('5K')

  const { data: runs = [] } = useQuery({
    queryKey: ['runs'],
    queryFn: () => Run.list('-date', 500),
  })

  const recentRuns = runs.filter(r => r.pace).slice(0, 7)
  const avgPace = recentRuns.length
    ? recentRuns.reduce((s, r) => s + r.pace, 0) / recentRuns.length
    : null
  const topPace = recentRuns.length ? Math.min(...recentRuns.map(r => r.pace)) : null

  const knownPace = parsePace(pace)
  const knownDist = RACE_DISTANCES[distance]

  const predictions = useMemo(() => {
    if (!knownPace || !knownDist) return []
    const knownTime = knownPace * knownDist
    return Object.entries(RACE_DISTANCES).map(([name, dist]) => {
      const time = riegelPredict(knownDist, knownTime, dist)
      return {
        name,
        dist,
        time,
        pace: time / dist,
        timeStr: formatDuration(time),
        paceStr: formatPace(time / dist),
      }
    })
  }, [knownPace, knownDist])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Pace Calculator</h1>
        <p className="text-slate-400 text-sm mt-0.5">Riegel formula — predict race times at any distance</p>
      </div>

      {/* Input card */}
      <div className="bg-navy-800 border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Calculator size={15} className="text-orange-400" />
          <h3 className="text-white font-semibold text-sm">Known Effort</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-medium">Pace (min/mile)</label>
            <input
              type="text"
              value={pace}
              onChange={e => setPace(e.target.value)}
              placeholder="8:30"
              className="input text-lg font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-medium">At Distance</label>
            <select value={distance} onChange={e => setDistance(e.target.value)} className="input">
              {Object.keys(RACE_DISTANCES).map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick fill from runs */}
        {(avgPace || topPace) && (
          <div className="flex gap-2 flex-wrap">
            {avgPace && (
              <button
                onClick={() => setPace(formatPace(avgPace))}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-colors"
              >
                <TrendingUp size={10} />
                Avg last 7: {formatPace(avgPace)}
              </button>
            )}
            {topPace && (
              <button
                onClick={() => setPace(formatPace(topPace))}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
              >
                <Zap size={10} />
                Top pace: {formatPace(topPace)}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Predictions */}
      {predictions.length > 0 && (
        <>
          <div className="bg-navy-800 border border-white/10 rounded-2xl p-5 space-y-3">
            <h3 className="text-white font-semibold text-sm">Predicted Times</h3>
            <div className="space-y-1">
              {predictions.map(p => (
                <div key={p.name} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <span className="text-slate-300 text-sm font-medium w-32">{p.name}</span>
                  <span className="text-white font-mono font-semibold">{p.timeStr}</span>
                  <span className="text-slate-400 text-sm font-mono">{p.paceStr}/mi</span>
                  <span className="text-slate-500 text-xs">{p.dist.toFixed(2)} mi</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div className="bg-navy-800 border border-white/10 rounded-2xl p-5">
            <h3 className="text-white font-semibold text-sm mb-4">Projected Pace by Distance</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={predictions} margin={{ left: -10, right: 8, top: 4, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis
                  reversed
                  tickFormatter={v => formatPace(v)}
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ background: '#1A2B3C', border: '1px solid #2E3F55', borderRadius: 8 }}
                  formatter={(val) => [formatPace(val) + '/mi', 'Predicted Pace']}
                  labelStyle={{ color: '#94a3b8', fontSize: 11 }}
                />
                <Bar dataKey="pace" radius={[4, 4, 0, 0]}>
                  {predictions.map((_, i) => (
                    <Cell key={i} fill={`hsl(${220 + i * 15}, 70%, 60%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {!pace && (
        <div className="text-center py-8 text-slate-500 text-sm">
          Enter a pace above to see predictions for all distances
        </div>
      )}
    </div>
  )
}
