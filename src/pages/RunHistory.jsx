import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Trash2, Edit2, Search, ChevronRight } from 'lucide-react'
import { Run } from '../lib/db'
import { formatPace, formatDuration, formatDate, paceColor } from '../lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import RunForm from '../components/runs/RunForm'

export default function RunHistory() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [editRun, setEditRun] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const { data: runs = [] } = useQuery({
    queryKey: ['runs'],
    queryFn: () => Run.list('-date', 500),
  })

  const filtered = runs.filter(r => {
    if (filter !== 'all' && r.source !== filter) return false
    if (search && !r.date?.includes(search) && !(r.notes ?? '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleDelete = (id) => {
    if (confirm('Delete this run?')) {
      Run.delete(id)
      qc.invalidateQueries({ queryKey: ['runs'] })
    }
  }

  const totalDist = filtered.reduce((s, r) => s + (r.distance || 0), 0)
  const paceRuns = filtered.filter(r => r.pace)
  const avgPace = paceRuns.length ? paceRuns.reduce((s, r) => s + r.pace, 0) / paceRuns.length : null

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Run History</h1>
          <p className="text-slate-400 text-sm mt-0.5">{runs.length} runs logged</p>
        </div>
        <button onClick={() => { setEditRun(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium transition-colors">
          <Plus size={14} />
          Log Run
        </button>
      </div>

      {/* Summary bar */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Runs', value: filtered.length },
            { label: 'Total Miles', value: totalDist.toFixed(1) },
            { label: 'Avg Pace', value: `${formatPace(avgPace)}/mi` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-navy-800 border border-white/10 rounded-xl p-3 text-center">
              <p className="text-white font-bold text-lg">{value}</p>
              <p className="text-slate-400 text-xs">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search runs…"
            className="input pl-8 text-sm w-48"
          />
        </div>
        <div className="flex gap-1 bg-navy-800 rounded-lg p-1">
          {[['all', 'All'], ['manual', 'Manual'], ['health_app', 'Health App'], ['strava', 'Strava']].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                filter === v ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
              }`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Run list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-sm">No runs found.</p>
          <button onClick={() => setShowForm(true)} className="text-orange-400 text-xs hover:text-orange-300 mt-2">
            Log your first run →
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(run => (
            <div key={run.id}
              onClick={() => navigate(`/runs/${run.id}`)}
              className="bg-navy-800 border border-white/10 rounded-xl p-4 flex items-center gap-4 hover:border-white/20 hover:bg-navy-800/80 transition-colors cursor-pointer">
              {/* Date */}
              <div className="w-20 shrink-0">
                <p className="text-white text-sm font-medium">{run.date ? run.date.slice(5) : '--'}</p>
                <p className="text-slate-500 text-xs">{run.date ? run.date.slice(0, 4) : ''}</p>
              </div>

              {/* Distance */}
              <div className="w-20 shrink-0">
                <p className="text-white font-bold">{run.distance?.toFixed(2) ?? '--'}</p>
                <p className="text-slate-400 text-xs">miles</p>
              </div>

              {/* Pace */}
              <div className="w-20 shrink-0">
                <p className={`font-semibold ${paceColor(run.pace)}`}>{formatPace(run.pace)}</p>
                <p className="text-slate-400 text-xs">/mile</p>
              </div>

              {/* Duration */}
              <div className="w-20 shrink-0 hidden sm:block">
                <p className="text-slate-300 text-sm">{formatDuration(run.duration_minutes)}</p>
                <p className="text-slate-500 text-xs">time</p>
              </div>

              {/* Extra metrics */}
              <div className="flex-1 flex gap-3 flex-wrap">
                {run.elevation_gain != null && (
                  <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">↑ {run.elevation_gain}ft</span>
                )}
                {run.avg_heart_rate_bpm && (
                  <span className="text-xs bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full">♥ {run.avg_heart_rate_bpm}</span>
                )}
                {run.temperature_f != null && (
                  <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full">{run.temperature_f}°F</span>
                )}
                {run.source === 'strava' && (
                  <span className="text-xs bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full">Strava</span>
                )}
                {run.source === 'health_app' && (
                  <span className="text-xs bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded-full">Health</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                <button onClick={() => { setEditRun(run); setShowForm(true) }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                  <Edit2 size={13} />
                </button>
                <button onClick={() => handleDelete(run.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
              <ChevronRight size={14} className="text-slate-600 shrink-0" />
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <RunForm run={editRun} onClose={() => { setShowForm(false); setEditRun(null) }} />
      )}
    </div>
  )
}
