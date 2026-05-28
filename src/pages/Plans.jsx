import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Download, Calendar } from 'lucide-react'
import { TrainingPlan } from '../lib/db'
import { formatDate } from '../lib/utils'
import { useQueryClient } from '@tanstack/react-query'

function exportICS(plan) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PaceTrack//Training Plan//EN',
    `X-WR-CALNAME:${plan.race_type} Training Plan`,
  ]

  const raceDate = new Date(plan.race_date)
  const weeks = plan.weeks || []

  weeks.forEach((week, wi) => {
    const workouts = week.workouts || []
    workouts.forEach(w => {
      if (w.type === 'Rest') return
      const d = new Date(raceDate)
      d.setDate(d.getDate() - (weeks.length - wi) * 7 + (w.day ?? 0))
      const dateStr = d.toISOString().split('T')[0].replace(/-/g, '')
      lines.push('BEGIN:VEVENT')
      lines.push(`DTSTART;VALUE=DATE:${dateStr}`)
      lines.push(`DTEND;VALUE=DATE:${dateStr}`)
      lines.push(`SUMMARY:${w.type} — ${w.distance ?? ''}mi`)
      lines.push(`DESCRIPTION:Target pace: ${w.target_pace ?? 'easy'}\\n${w.notes ?? ''}`)
      lines.push(`CATEGORIES:Running,Training`)
      lines.push('END:VEVENT')
    })
  })

  lines.push('END:VCALENDAR')
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${plan.race_type.replace(/\s/g, '_')}_plan.ics`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Plans() {
  const qc = useQueryClient()
  const navigate = useNavigate()

  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: () => TrainingPlan.list(),
  })

  const handleDelete = (id) => {
    if (confirm('Delete this training plan?')) {
      TrainingPlan.delete(id)
      qc.invalidateQueries({ queryKey: ['plans'] })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Training Plans</h1>
          <p className="text-slate-400 text-sm mt-0.5">AI-generated weekly plans for your race</p>
        </div>
        <button onClick={() => navigate('/plans/create')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium transition-colors">
          <Plus size={14} />
          New Plan
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-500 text-sm">No training plans yet.</p>
          <button onClick={() => navigate('/plans/create')} className="text-orange-400 text-xs hover:text-orange-300 mt-2">
            Generate your first plan →
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map(plan => (
            <div key={plan.id} className="bg-navy-800 border border-white/10 rounded-2xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-white font-semibold">{plan.race_type} Training Plan</h3>
                  <div className="flex gap-3 mt-1 text-xs text-slate-400">
                    {plan.race_date && <span className="flex items-center gap-1"><Calendar size={10} /> {formatDate(plan.race_date)}</span>}
                    {plan.target_time && <span>Goal: {plan.target_time}</span>}
                    {plan.weeks && <span>{plan.weeks.length} weeks</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => exportICS(plan)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition-colors">
                    <Download size={11} />
                    Export .ics
                  </button>
                  <button onClick={() => handleDelete(plan.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Week summary */}
              {plan.weeks && (
                <div className="space-y-2">
                  {plan.weeks.slice(0, 4).map((week, wi) => (
                    <div key={wi} className="bg-navy-900/50 rounded-xl p-3">
                      <p className="text-slate-400 text-xs font-medium mb-2">Week {week.week_number ?? wi + 1}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(week.workouts ?? []).map((w, di) => (
                          <span key={di} className={`text-xs px-2 py-0.5 rounded-full ${
                            w.type === 'Rest' ? 'bg-white/5 text-slate-500'
                            : w.type === 'Long Run' ? 'bg-orange-500/20 text-orange-300'
                            : w.type === 'Tempo' ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-indigo-500/20 text-indigo-300'
                          }`}>
                            {w.type}{w.distance ? ` ${w.distance}mi` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {plan.weeks.length > 4 && (
                    <p className="text-slate-500 text-xs text-center">+ {plan.weeks.length - 4} more weeks</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
