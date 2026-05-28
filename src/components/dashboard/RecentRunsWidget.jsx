import { Link } from 'react-router-dom'
import { Activity, ChevronRight } from 'lucide-react'
import { formatPace, formatDate, paceColor } from '../../lib/utils'

export default function RecentRunsWidget({ runs = [] }) {
  const recent = runs.slice(0, 5)

  return (
    <div className="bg-navy-800 border border-white/10 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity size={15} className="text-orange-400" />
          <h3 className="text-white font-semibold text-sm">Recent Runs</h3>
        </div>
        <Link to="/runs" className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-0.5 transition-colors">
          View all <ChevronRight size={12} />
        </Link>
      </div>

      {recent.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-slate-500 text-sm">No runs yet.</p>
          <p className="text-slate-600 text-xs mt-1">Log your first run to get started!</p>
        </div>
      ) : (
        <div className="space-y-1">
          {recent.map(run => (
            <div key={run.id} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
              <div>
                <p className="text-white text-sm font-medium">{run.distance?.toFixed(2) ?? '--'} mi</p>
                <p className="text-slate-500 text-xs">{formatDate(run.date)}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-medium ${paceColor(run.pace)}`}>
                  {formatPace(run.pace)}<span className="text-slate-500 text-xs"> /mi</span>
                </p>
                {run.elevation_gain && (
                  <p className="text-slate-500 text-xs">↑ {run.elevation_gain} ft</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
