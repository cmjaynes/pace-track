import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { TrainingGoal } from '../../lib/db'
import { useQueryClient } from '@tanstack/react-query'
import DatePicker from '../ui/DatePicker'
import { parseDuration, formatPace, RACE_DISTANCES } from '../../lib/utils'

const EMPTY = {
  type: 'race',
  race_type: '5K',
  target_time: '',
  target_pace: '',
  target_distance: '',
  period: 'weekly',
  race_date: '',
  notes: '',
}

export default function GoalForm({ goal, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState(goal ? {
    type: goal.type ?? 'race',
    race_type: goal.race_type ?? '5K',
    target_time: goal.target_time ?? '',
    target_pace: goal.target_pace ?? '',
    target_distance: goal.target_distance ?? '',
    period: goal.period ?? 'weekly',
    race_date: goal.race_date ?? '',
    notes: goal.notes ?? '',
  } : { ...EMPTY })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Auto-fill pace from finish time + race distance
  useEffect(() => {
    if (form.type !== 'race' || !form.target_time) return
    const minutes = parseDuration(form.target_time)
    if (!minutes) return
    const distKey = form.race_type === 'Full Marathon' ? 'Marathon' : form.race_type
    const dist = RACE_DISTANCES[distKey]
    if (!dist) return
    const pace = minutes / dist
    setForm(f => ({ ...f, target_pace: formatPace(pace) }))
  }, [form.target_time, form.race_type])

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      current_status: 'active',
      target_distance: form.target_distance ? parseFloat(form.target_distance) : null,
    }
    if (goal) {
      TrainingGoal.update(goal.id, payload)
    } else {
      TrainingGoal.create(payload)
    }
    qc.invalidateQueries({ queryKey: ['goals'] })
    onClose?.()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-navy-800 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-white font-semibold">{goal ? 'Edit Goal' : 'New Goal'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Goal type toggle */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-medium">Goal Type</label>
            <div className="flex gap-2">
              {[['race', '🏁  Race Goal'], ['distance', '📏  Distance Goal']].map(([v, l]) => (
                <button key={v} type="button"
                  onClick={() => set('type', v)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    form.type === v
                      ? 'bg-orange-500/20 border-orange-500/40 text-orange-400'
                      : 'border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                  }`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {form.type === 'race' && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Race Distance</label>
                <div className="grid grid-cols-4 gap-2">
                  {['5K', '10K', 'Half Marathon', 'Full Marathon'].map(r => (
                    <button key={r} type="button"
                      onClick={() => set('race_type', r)}
                      className={`py-2 rounded-xl text-xs font-medium border transition-all ${
                        form.race_type === r
                          ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                          : 'border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                      }`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Target Finish Time</label>
                  <input type="text" value={form.target_time} onChange={e => set('target_time', e.target.value)}
                    placeholder="e.g. 25:00" className="input" />
                  <p className="text-slate-600 text-xs">h:mm:ss or mm:ss</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Target Pace</label>
                  <input type="text" value={form.target_pace} onChange={e => set('target_pace', e.target.value)}
                    placeholder="e.g. 8:00" className="input" />
                  <p className="text-slate-600 text-xs">min/mile</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Race Date</label>
                <DatePicker
                  value={form.race_date}
                  onChange={v => set('race_date', v)}
                  placeholder="Select race date"
                  minDate={new Date().toISOString().split('T')[0]}
                />
              </div>
            </>
          )}

          {form.type === 'distance' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Target Distance</label>
                  <div className="relative">
                    <input type="number" step="0.1" min="0" value={form.target_distance}
                      onChange={e => set('target_distance', e.target.value)}
                      placeholder="20" className="input pr-10" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">mi</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Period</label>
                  <div className="flex gap-2">
                    {[['weekly', 'Weekly'], ['monthly', 'Monthly']].map(([v, l]) => (
                      <button key={v} type="button"
                        onClick={() => set('period', v)}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${
                          form.period === v
                            ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                            : 'border-white/10 text-slate-400 hover:text-white'
                        }`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Target Pace (optional)</label>
                <input type="text" value={form.target_pace} onChange={e => set('target_pace', e.target.value)}
                  placeholder="e.g. 9:00 min/mile" className="input" />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-medium">Notes <span className="text-slate-600">(optional)</span></label>
            <input type="text" value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="e.g. Spring race season goal" className="input" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-sm transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-medium text-sm transition-colors">
              {goal ? 'Save Changes' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
