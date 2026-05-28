import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart2, Wind, Mountain, Thermometer, Timer } from 'lucide-react'
import { Run } from '../lib/db'
import { formatPace, formatDate, paceColor } from '../lib/utils'
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, BarChart, Bar, Cell, ReferenceLine,
} from 'recharts'

function ImpactBadge({ label, value, impact }) {
  const color = impact === 'positive' ? 'text-emerald-400 bg-emerald-500/10'
    : impact === 'negative' ? 'text-rose-400 bg-rose-500/10'
    : 'text-slate-400 bg-white/5'
  return (
    <div className={`rounded-lg px-3 py-2 ${color}`}>
      <p className="text-xs opacity-70">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  )
}

export default function RunBreakdown() {
  const [selectedRun, setSelectedRun] = useState(null)

  const { data: runs = [] } = useQuery({
    queryKey: ['runs'],
    queryFn: () => Run.list('-date', 500),
  })

  const runsWithData = runs.filter(r => r.pace && r.distance)
  const selected = selectedRun ? runs.find(r => r.id === selectedRun) : runs[0]

  // Elevation vs pace scatter data
  const elevPaceData = runsWithData
    .filter(r => r.elevation_gain != null)
    .map(r => ({ elevation: r.elevation_gain, pace: r.pace, dist: r.distance }))

  // Temp vs pace scatter data
  const tempPaceData = runsWithData
    .filter(r => r.temperature_f != null)
    .map(r => ({ temp: r.temperature_f, pace: r.pace }))

  // Determine weather impact for selected run
  function getImpact(run) {
    if (!run) return []
    const impacts = []

    if (run.elevation_gain != null) {
      const gainPer10K = (run.elevation_gain / (run.distance || 1)) * 6.214
      impacts.push({
        label: 'Elevation',
        icon: Mountain,
        value: `${run.elevation_gain} ft gain`,
        impact: gainPer10K > 300 ? 'negative' : gainPer10K > 100 ? 'neutral' : 'positive',
        note: gainPer10K > 300 ? 'Heavy climbing — pace impact significant'
          : gainPer10K > 100 ? 'Moderate hills'
          : 'Mostly flat',
      })
    }
    if (run.temperature_f != null) {
      impacts.push({
        label: 'Temperature',
        icon: Thermometer,
        value: `${run.temperature_f}°F`,
        impact: run.temperature_f > 80 ? 'negative' : run.temperature_f < 30 ? 'negative' : 'positive',
        note: run.temperature_f > 80 ? 'Hot — expect 2–3% pace slowdown per 10°F above 60'
          : run.temperature_f < 30 ? 'Cold — harder breathing, gear weight'
          : 'Ideal conditions',
      })
    }
    if (run.humidity_percent != null) {
      impacts.push({
        label: 'Humidity',
        icon: Wind,
        value: `${run.humidity_percent}%`,
        impact: run.humidity_percent > 75 ? 'negative' : 'positive',
        note: run.humidity_percent > 75 ? 'High humidity reduces sweat efficiency'
          : 'Comfortable humidity',
      })
    }
    return impacts
  }

  const impacts = selected ? getImpact(selected) : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Analysis</h1>
        <p className="text-slate-400 text-sm mt-0.5">Elevation, weather, and pace correlations</p>
      </div>

      {/* Run selector */}
      {runs.length > 0 && (
        <div className="bg-navy-800 border border-white/10 rounded-2xl p-5 space-y-3">
          <h3 className="text-white font-semibold text-sm">Run Impact Analysis</h3>
          <select
            value={selectedRun ?? runs[0]?.id ?? ''}
            onChange={e => setSelectedRun(e.target.value)}
            className="input"
          >
            {runs.slice(0, 30).map(r => (
              <option key={r.id} value={r.id}>
                {formatDate(r.date)} — {r.distance?.toFixed(2)} mi @ {formatPace(r.pace)}/mi
              </option>
            ))}
          </select>

          {selected && (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                <div className="bg-navy-900/50 rounded-xl p-3">
                  <p className="text-slate-500 text-xs">Pace</p>
                  <p className={`font-semibold ${paceColor(selected.pace)}`}>{formatPace(selected.pace)}/mi</p>
                </div>
                <div className="bg-navy-900/50 rounded-xl p-3">
                  <p className="text-slate-500 text-xs">Distance</p>
                  <p className="text-white font-semibold">{selected.distance?.toFixed(2)} mi</p>
                </div>
                <div className="bg-navy-900/50 rounded-xl p-3">
                  <p className="text-slate-500 text-xs">Elevation</p>
                  <p className="text-emerald-400 font-semibold">{selected.elevation_gain ?? '--'} ft</p>
                </div>
                <div className="bg-navy-900/50 rounded-xl p-3">
                  <p className="text-slate-500 text-xs">Temp / Humidity</p>
                  <p className="text-amber-400 font-semibold">
                    {selected.temperature_f != null ? `${selected.temperature_f}°F` : '--'}
                    {selected.humidity_percent != null ? ` · ${selected.humidity_percent}%` : ''}
                  </p>
                </div>
              </div>

              {impacts.length > 0 && (
                <div className="space-y-2 mt-4">
                  {impacts.map(({ label, icon: Icon, value, impact, note }) => (
                    <div key={label} className="flex items-start gap-3 bg-navy-900/50 rounded-xl p-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        impact === 'positive' ? 'bg-emerald-500/20'
                          : impact === 'negative' ? 'bg-rose-500/20'
                          : 'bg-white/5'
                      }`}>
                        <Icon size={14} className={
                          impact === 'positive' ? 'text-emerald-400'
                            : impact === 'negative' ? 'text-rose-400'
                            : 'text-slate-400'
                        } />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{label}: {value}</p>
                        <p className="text-slate-400 text-xs mt-0.5">{note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Scatter charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {elevPaceData.length >= 3 && (
          <div className="bg-navy-800 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Mountain size={14} className="text-emerald-400" />
              <h3 className="text-white font-semibold text-sm">Elevation vs Pace</h3>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <ScatterChart margin={{ left: -10, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="elevation" name="Elevation" unit=" ft"
                  tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="pace" name="Pace" reversed
                  tickFormatter={v => formatPace(v)}
                  tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ background: '#1A2B3C', border: '1px solid #2E3F55', borderRadius: 8, fontSize: 11 }}
                  formatter={(val, name) => [name === 'Pace' ? formatPace(val) + '/mi' : val + ' ft', name]}
                />
                <Scatter data={elevPaceData} fill="#10b981" opacity={0.7} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}

        {tempPaceData.length >= 3 && (
          <div className="bg-navy-800 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Thermometer size={14} className="text-amber-400" />
              <h3 className="text-white font-semibold text-sm">Temperature vs Pace</h3>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <ScatterChart margin={{ left: -10, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="temp" name="Temp" unit="°F"
                  tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="pace" name="Pace" reversed
                  tickFormatter={v => formatPace(v)}
                  tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ background: '#1A2B3C', border: '1px solid #2E3F55', borderRadius: 8, fontSize: 11 }}
                  formatter={(val, name) => [name === 'Pace' ? formatPace(val) + '/mi' : val, name]}
                />
                <Scatter data={tempPaceData} fill="#f59e0b" opacity={0.7} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {runsWithData.length < 3 && (
        <div className="text-center py-12 text-slate-500 text-sm">
          Log more runs with weather data to see correlations
        </div>
      )}

      {/* Mile splits */}
      {selected?.splits?.length > 0 && (
        <SplitsCard splits={selected.splits} avgPace={selected.pace} />
      )}
    </div>
  )
}

function formatElapsed(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function SplitsCard({ splits, avgPace }) {
  const avg = avgPace ?? splits.reduce((s, sp) => s + sp.pace, 0) / splits.length

  return (
    <div className="bg-navy-800 border border-white/10 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Timer size={14} className="text-indigo-400" />
        <h3 className="text-white font-semibold text-sm">Mile Splits</h3>
        <span className="text-slate-500 text-xs ml-auto">avg {formatPace(avg)}/mi</span>
      </div>

      {/* Bar chart — pace per mile, lower = faster */}
      <ResponsiveContainer width="100%" height={80}>
        <BarChart data={splits} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
          <ReferenceLine y={avg} stroke="#6366f1" strokeDasharray="3 3" strokeOpacity={0.5} />
          <Tooltip
            contentStyle={{ background: '#0D1B2A', border: '1px solid #2E3F55', borderRadius: 6, fontSize: 10 }}
            formatter={(val) => [formatPace(val) + '/mi', 'Pace']}
            labelFormatter={(label) => `Mile ${label}`}
          />
          <Bar dataKey="pace" radius={[3, 3, 0, 0]}>
            {splits.map((sp, i) => (
              <Cell key={i} fill={sp.pace <= avg ? '#10b981' : '#f59e0b'} opacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Table */}
      <div className="space-y-0.5">
        <div className="grid grid-cols-4 text-xs text-slate-500 px-2 pb-1">
          <span>Mile</span>
          <span className="text-right">Pace</span>
          <span className="text-right">Elapsed</span>
          <span className="text-right">vs avg</span>
        </div>
        {splits.map((sp) => {
          const delta = sp.pace - avg
          const faster = delta < 0
          return (
            <div key={sp.mile} className="grid grid-cols-4 items-center text-xs px-2 py-1.5 rounded-lg hover:bg-white/5">
              <span className="text-slate-400 font-medium">{sp.mile}</span>
              <span className={`text-right font-semibold ${faster ? 'text-emerald-400' : sp.pace > avg * 1.05 ? 'text-amber-400' : 'text-white'}`}>
                {formatPace(sp.pace)}/mi
              </span>
              <span className="text-right text-slate-400">{formatElapsed(sp.elapsed)}</span>
              <span className={`text-right font-medium ${faster ? 'text-emerald-400' : 'text-amber-400'}`}>
                {faster ? '−' : '+'}{formatPace(Math.abs(delta))}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
