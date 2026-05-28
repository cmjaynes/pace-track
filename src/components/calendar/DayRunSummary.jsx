import { X, Edit2, Trash2, Plus } from 'lucide-react'
import { formatPace, formatDuration, formatDate, paceColor } from '../../lib/utils'
import { Run } from '../../lib/db'
import { useQueryClient } from '@tanstack/react-query'

export default function DayRunSummary({ date, runs = [], onClose, onLogNew, onEdit }) {
  const qc = useQueryClient()
  const dateRuns = runs.filter(r => r.date === date)

  const handleDelete = (id) => {
    if (confirm('Delete this run?')) {
      Run.delete(id)
      qc.invalidateQueries({ queryKey: ['runs'] })
    }
  }

  return (
    <div className="bg-navy-800 border border-white/10 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm">{formatDate(date)}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>

      {dateRuns.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-slate-500 text-sm">No run logged</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dateRuns.map(run => (
            <div key={run.id} className="bg-navy-900/50 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white text-sm font-medium">{run.distance?.toFixed(2)} mi</span>
                <div className="flex gap-1.5">
                  <button onClick={() => onEdit(run)}
                    className="p-1 text-slate-400 hover:text-white transition-colors">
                    <Edit2 size={12} />
                  </button>
                  <button onClick={() => handleDelete(run.id)}
                    className="p-1 text-slate-400 hover:text-rose-400 transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <div className="flex gap-3 text-xs">
                <span className={paceColor(run.pace)}>{formatPace(run.pace)}/mi</span>
                <span className="text-slate-400">{formatDuration(run.duration_minutes)}</span>
                {run.avg_heart_rate_bpm && <span className="text-rose-400">{run.avg_heart_rate_bpm} bpm</span>}
                {run.elevation_gain && <span className="text-emerald-400">↑{run.elevation_gain}ft</span>}
              </div>
              {run.notes && <p className="text-slate-400 text-xs italic">"{run.notes}"</p>}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => onLogNew(date)}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-white/20 text-slate-400 hover:text-white hover:border-white/40 text-xs transition-colors"
      >
        <Plus size={12} />
        Log run for this day
      </button>
    </div>
  )
}
