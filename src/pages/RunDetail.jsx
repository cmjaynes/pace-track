import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Run } from '../lib/db'
import { formatPace, formatDuration, formatDate, paceColor } from '../lib/utils'
import { ArrowLeft, MapPin, Activity, Mountain, Heart, Thermometer, Timer } from 'lucide-react'
import { getHRZone, getMaxHR } from '../lib/utils'
import { MapContainer, TileLayer, Polyline } from 'react-leaflet'
import { BarChart, Bar, Cell, ReferenceLine, Tooltip, ResponsiveContainer } from 'recharts'

function StatBox({ icon: Icon, label, value, color = 'text-white' }) {
  return (
    <div className="bg-navy-900/60 rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={11} className="text-slate-500" />
        <p className="text-slate-500 text-xs">{label}</p>
      </div>
      <p className={`font-semibold text-sm ${color}`}>{value ?? '--'}</p>
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

function RouteMap({ route }) {
  const positions = route.map(p => [p.lat, p.lng])
  const lats = route.map(p => p.lat)
  const lngs = route.map(p => p.lng)
  const bounds = [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ]

  return (
    <MapContainer
      bounds={bounds}
      boundsOptions={{ padding: [20, 20] }}
      scrollWheelZoom={false}
      style={{ height: '280px', borderRadius: '12px' }}
      className="z-0"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
      />
      <Polyline positions={positions} color="#FF6B35" weight={3} opacity={0.9} />
    </MapContainer>
  )
}

function SplitsSection({ splits, avgPace }) {
  const avg = avgPace ?? splits.reduce((s, sp) => s + sp.pace, 0) / splits.length
  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={72}>
        <BarChart data={splits} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
          <ReferenceLine y={avg} stroke="#6366f1" strokeDasharray="3 3" strokeOpacity={0.5} />
          <Tooltip
            contentStyle={{ background: '#0D1B2A', border: '1px solid #2E3F55', borderRadius: 6, fontSize: 10 }}
            formatter={val => [formatPace(val) + '/mi', 'Pace']}
            labelFormatter={l => `Mile ${l}`}
          />
          <Bar dataKey="pace" radius={[3, 3, 0, 0]}>
            {splits.map((sp, i) => (
              <Cell key={i} fill={sp.pace <= avg ? '#10b981' : '#f59e0b'} opacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="space-y-0.5">
        <div className="grid grid-cols-4 text-xs text-slate-500 px-2 pb-1">
          <span>Mile</span><span className="text-right">Pace</span>
          <span className="text-right">Elapsed</span><span className="text-right">vs avg</span>
        </div>
        {splits.map(sp => {
          const delta = sp.pace - avg
          return (
            <div key={sp.mile} className="grid grid-cols-4 items-center text-xs px-2 py-1.5 rounded-lg hover:bg-white/5">
              <span className="text-slate-400 font-medium">{sp.mile}</span>
              <span className={`text-right font-semibold ${delta < 0 ? 'text-emerald-400' : sp.pace > avg * 1.05 ? 'text-amber-400' : 'text-white'}`}>
                {formatPace(sp.pace)}/mi
              </span>
              <span className="text-right text-slate-400">{formatElapsed(sp.elapsed)}</span>
              <span className={`text-right font-medium ${delta < 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {delta < 0 ? '−' : '+'}{formatPace(Math.abs(delta))}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function RunDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: runs = [] } = useQuery({
    queryKey: ['runs'],
    queryFn: () => Run.list('-date', 500),
  })

  const run = runs.find(r => r.id === id)

  if (!run) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/runs')} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors">
          <ArrowLeft size={14} /> Back to runs
        </button>
        <p className="text-slate-500 text-sm">Run not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Back button */}
      <button onClick={() => navigate('/runs')} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors">
        <ArrowLeft size={14} /> Back to runs
      </button>

      {/* Header */}
      <div className="bg-navy-800 border border-white/10 rounded-2xl p-5">
        <p className="text-slate-400 text-xs mb-1">{formatDate(run.date)}</p>
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <p className="text-white text-4xl font-bold">{run.distance?.toFixed(2)}</p>
            <p className="text-slate-400 text-sm">miles</p>
          </div>
          <div>
            <p className={`text-2xl font-bold ${paceColor(run.pace)}`}>{formatPace(run.pace)}</p>
            <p className="text-slate-400 text-sm">min/mile</p>
          </div>
          {run.duration_minutes && (
            <div>
              <p className="text-white text-2xl font-bold">{formatDuration(run.duration_minutes)}</p>
              <p className="text-slate-400 text-sm">time</p>
            </div>
          )}
        </div>
        {run.source && (
          <span className={`mt-3 inline-block text-xs px-2 py-0.5 rounded-full ${
            run.source === 'strava' ? 'bg-orange-500/10 text-orange-400'
            : run.source === 'health_app' ? 'bg-sky-500/10 text-sky-400'
            : 'bg-white/5 text-slate-400'
          }`}>
            {run.source === 'health_app' ? 'Health App' : run.source === 'strava' ? 'Strava' : 'Manual'}
          </span>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {run.elevation_gain != null && (
          <StatBox icon={Mountain} label="Elevation Gain" value={`${run.elevation_gain} ft`} color="text-teal-400" />
        )}
        {run.avg_heart_rate_bpm && (() => {
          const zone = getHRZone(run.avg_heart_rate_bpm, getMaxHR())
          return (
            <div className="bg-navy-900/60 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Heart size={11} className="text-slate-500" />
                <p className="text-slate-500 text-xs">Avg Heart Rate</p>
              </div>
              <p className="font-semibold text-sm text-rose-400">{run.avg_heart_rate_bpm} bpm</p>
              {zone && (
                <span className={`mt-1 inline-block text-xs px-1.5 py-0.5 rounded-md font-medium ${zone.bgLight} ${zone.text}`}>
                  Z{zone.zone} {zone.name}
                </span>
              )}
            </div>
          )
        })()}
        {run.max_heart_rate_bpm && (
          <StatBox icon={Heart} label="Max Heart Rate" value={`${run.max_heart_rate_bpm} bpm`} color="text-rose-300" />
        )}
        {run.temperature_f != null && (
          <StatBox icon={Thermometer} label="Temperature" value={`${run.temperature_f}°F`} color="text-amber-400" />
        )}
        {run.humidity_percent != null && (
          <StatBox icon={Activity} label="Humidity" value={`${run.humidity_percent}%`} />
        )}
        {run.step_cadence_spm != null && (
          <StatBox icon={Activity} label="Cadence" value={`${Math.round(run.step_cadence_spm)} spm`} />
        )}
        {run.active_energy_kcal != null && (
          <StatBox icon={Activity} label="Calories" value={`${Math.round(run.active_energy_kcal)} kcal`} color="text-orange-400" />
        )}
        {run.step_count != null && (
          <StatBox icon={Activity} label="Steps" value={run.step_count.toLocaleString()} />
        )}
      </div>

      {/* GPS map */}
      {run.route?.length > 2 && (
        <div className="bg-navy-800 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={13} className="text-orange-400" />
            <h3 className="text-white text-sm font-semibold">Route</h3>
            <span className="text-slate-500 text-xs ml-auto">{run.route.length} GPS points</span>
          </div>
          <RouteMap route={run.route} />
        </div>
      )}

      {/* Mile splits */}
      {run.splits?.length > 0 && (
        <div className="bg-navy-800 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Timer size={13} className="text-indigo-400" />
            <h3 className="text-white text-sm font-semibold">Mile Splits</h3>
            <span className="text-slate-500 text-xs ml-auto">avg {formatPace(run.pace)}/mi</span>
          </div>
          <SplitsSection splits={run.splits} avgPace={run.pace} />
        </div>
      )}

      {run.notes && (
        <div className="bg-navy-800 border border-white/10 rounded-2xl p-4">
          <p className="text-slate-400 text-xs mb-1">Notes</p>
          <p className="text-slate-300 text-sm">{run.notes}</p>
        </div>
      )}
    </div>
  )
}
