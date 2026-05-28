import { useState } from 'react'
import { X } from 'lucide-react'
import { Run } from '../../lib/db'
import { calcPace, parseDuration } from '../../lib/utils'
import { useQueryClient } from '@tanstack/react-query'

const EMPTY = {
  date: new Date().toISOString().split('T')[0],
  distance: '',
  duration: '',
  workout_type: 'Outdoor Run',
  avg_heart_rate_bpm: '',
  max_heart_rate_bpm: '',
  elevation_gain: '',
  temperature_f: '',
  humidity_percent: '',
  step_cadence_spm: '',
  notes: '',
}

export default function RunForm({ run, onClose, prefillDate }) {
  const qc = useQueryClient()
  const [form, setForm] = useState(() => {
    if (run) {
      return {
        date: run.date ?? EMPTY.date,
        distance: run.distance ?? '',
        duration: run.duration_minutes ? (() => {
          const h = Math.floor(run.duration_minutes / 60)
          const m = Math.floor(run.duration_minutes % 60)
          const s = Math.round((run.duration_minutes - Math.floor(run.duration_minutes)) * 60)
          return h > 0
            ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
            : `${m}:${String(s).padStart(2,'0')}`
        })() : '',
        workout_type: run.workout_type ?? 'Outdoor Run',
        avg_heart_rate_bpm: run.avg_heart_rate_bpm ?? '',
        max_heart_rate_bpm: run.max_heart_rate_bpm ?? '',
        elevation_gain: run.elevation_gain ?? '',
        temperature_f: run.temperature_f ?? '',
        humidity_percent: run.humidity_percent ?? '',
        step_cadence_spm: run.step_cadence_spm ?? '',
        notes: run.notes ?? '',
      }
    }
    return { ...EMPTY, date: prefillDate ?? EMPTY.date }
  })

  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const durationMin = parseDuration(form.duration)
    const distMiles = parseFloat(form.distance)
    const payload = {
      date: form.date,
      distance: distMiles || null,
      duration_minutes: durationMin,
      pace: calcPace(distMiles, durationMin),
      workout_type: form.workout_type,
      avg_heart_rate_bpm: form.avg_heart_rate_bpm ? parseInt(form.avg_heart_rate_bpm) : null,
      max_heart_rate_bpm: form.max_heart_rate_bpm ? parseInt(form.max_heart_rate_bpm) : null,
      elevation_gain: form.elevation_gain ? parseFloat(form.elevation_gain) : null,
      temperature_f: form.temperature_f ? parseFloat(form.temperature_f) : null,
      humidity_percent: form.humidity_percent ? parseFloat(form.humidity_percent) : null,
      step_cadence_spm: form.step_cadence_spm ? parseFloat(form.step_cadence_spm) : null,
      notes: form.notes || null,
      source: run?.source ?? 'manual',
    }
    if (run) {
      Run.update(run.id, payload)
    } else {
      Run.create(payload)
    }
    qc.invalidateQueries({ queryKey: ['runs'] })
    setSaving(false)
    onClose?.()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-navy-800 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-white font-semibold">{run ? 'Edit Run' : 'Log Run'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" required>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                className="input" required />
            </Field>
            <Field label="Type">
              <select value={form.workout_type} onChange={e => set('workout_type', e.target.value)}
                className="input">
                {['Outdoor Run','Indoor Run','Trail Run','Treadmill'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Distance (miles)" required>
              <input type="number" step="0.01" min="0" value={form.distance}
                onChange={e => set('distance', e.target.value)}
                placeholder="3.1" className="input" required />
            </Field>
            <Field label="Duration (mm:ss or h:mm:ss)">
              <input type="text" value={form.duration}
                onChange={e => set('duration', e.target.value)}
                placeholder="28:30" className="input" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Avg Heart Rate (bpm)">
              <input type="number" value={form.avg_heart_rate_bpm}
                onChange={e => set('avg_heart_rate_bpm', e.target.value)}
                placeholder="155" className="input" />
            </Field>
            <Field label="Max Heart Rate (bpm)">
              <input type="number" value={form.max_heart_rate_bpm}
                onChange={e => set('max_heart_rate_bpm', e.target.value)}
                placeholder="172" className="input" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Elevation Gain (ft)">
              <input type="number" value={form.elevation_gain}
                onChange={e => set('elevation_gain', e.target.value)}
                placeholder="120" className="input" />
            </Field>
            <Field label="Cadence (spm)">
              <input type="number" value={form.step_cadence_spm}
                onChange={e => set('step_cadence_spm', e.target.value)}
                placeholder="170" className="input" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Temp (°F)">
              <input type="number" value={form.temperature_f}
                onChange={e => set('temperature_f', e.target.value)}
                placeholder="65" className="input" />
            </Field>
            <Field label="Humidity (%)">
              <input type="number" value={form.humidity_percent}
                onChange={e => set('humidity_percent', e.target.value)}
                placeholder="60" className="input" />
            </Field>
          </div>

          <Field label="Notes">
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="How did it feel?" rows={2}
              className="input resize-none" />
          </Field>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-white/10 text-slate-400 hover:text-white text-sm transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white font-medium text-sm transition-colors disabled:opacity-50">
              {saving ? 'Saving…' : run ? 'Save Changes' : 'Log Run'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-slate-400 font-medium">
        {label}{required && <span className="text-orange-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
