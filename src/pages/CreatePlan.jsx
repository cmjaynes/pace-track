import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, ArrowLeft } from 'lucide-react'
import { TrainingPlan } from '../lib/db'
import { useQueryClient } from '@tanstack/react-query'

export default function CreatePlan() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [form, setForm] = useState({
    race_type: '5K',
    race_date: '',
    target_time: '',
    weekly_miles: '',
    days_per_week: '4',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const generate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const apiKey = localStorage.getItem('pt_anthropic_key')
      if (!apiKey) {
        setError('Add your Anthropic API key in Settings to generate AI plans.')
        return
      }

      const weeksUntilRace = form.race_date
        ? Math.max(4, Math.ceil((new Date(form.race_date) - new Date()) / (7 * 24 * 60 * 60 * 1000)))
        : 12

      const prompt = `Create a ${form.race_type} training plan for an intermediate runner.
Details:
- Race: ${form.race_type} on ${form.race_date || 'TBD'}
- Target finish time: ${form.target_time || 'comfortable finish'}
- Current weekly mileage: ${form.weekly_miles || '15'} miles
- Training days per week: ${form.days_per_week}
- Weeks available: ${weeksUntilRace}

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "weeks": [
    {
      "week_number": 1,
      "focus": "Base building",
      "workouts": [
        { "day": 0, "type": "Rest", "distance": null, "target_pace": null, "notes": "Rest day" },
        { "day": 1, "type": "Easy Run", "distance": 3, "target_pace": "9:30", "notes": "Easy effort" },
        { "day": 2, "type": "Rest", "distance": null, "target_pace": null, "notes": "Rest or cross-train" },
        { "day": 3, "type": "Tempo", "distance": 4, "target_pace": "8:00", "notes": "Comfortably hard" },
        { "day": 4, "type": "Rest", "distance": null, "target_pace": null, "notes": "Rest day" },
        { "day": 5, "type": "Easy Run", "distance": 3, "target_pace": "9:30", "notes": "Easy effort" },
        { "day": 6, "type": "Long Run", "distance": 5, "target_pace": "10:00", "notes": "Slow and steady" }
      ]
    }
  ]
}

Use day 0=Sun, 1=Mon, ..., 6=Sat. Include ${weeksUntilRace} weeks total. Workout types: Easy Run, Tempo, Long Run, Intervals, Rest, Cross-Train. Taper in last 1-2 weeks.`

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      const data = await res.json()
      const text = data.content?.[0]?.text ?? ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Invalid AI response')
      const planData = JSON.parse(jsonMatch[0])

      TrainingPlan.create({
        race_type: form.race_type,
        race_date: form.race_date || null,
        target_time: form.target_time || null,
        weeks: planData.weeks,
      })

      qc.invalidateQueries({ queryKey: ['plans'] })
      navigate('/plans')
    } catch (e) {
      setError(e.message || 'Failed to generate plan. Check your API key in Settings.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/plans')}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Generate Training Plan</h1>
          <p className="text-slate-400 text-sm mt-0.5">AI-powered plan tailored to your race</p>
        </div>
      </div>

      <form onSubmit={generate} className="bg-navy-800 border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="space-y-1">
          <label className="text-xs text-slate-400 font-medium">Race Distance</label>
          <select value={form.race_type} onChange={e => set('race_type', e.target.value)} className="input">
            {['5K', '10K', 'Half Marathon', 'Full Marathon'].map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-medium">Race Date</label>
            <input type="date" value={form.race_date} onChange={e => set('race_date', e.target.value)}
              className="input" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-medium">Target Finish Time</label>
            <input type="text" value={form.target_time} onChange={e => set('target_time', e.target.value)}
              placeholder="25:00" className="input" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-medium">Current Weekly Miles</label>
            <input type="number" value={form.weekly_miles} onChange={e => set('weekly_miles', e.target.value)}
              placeholder="15" className="input" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-medium">Training Days / Week</label>
            <select value={form.days_per_week} onChange={e => set('days_per_week', e.target.value)} className="input">
              {['3', '4', '5', '6'].map(d => <option key={d} value={d}>{d} days</option>)}
            </select>
          </div>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-rose-400 text-sm">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-400 hover:to-rose-400 text-white font-medium transition-all disabled:opacity-50">
          <Sparkles size={15} />
          {loading ? 'Generating plan…' : 'Generate Plan with AI'}
        </button>

        <p className="text-slate-500 text-xs text-center">
          Requires Anthropic API key — add it in{' '}
          <a href="/settings" className="text-orange-400 hover:text-orange-300">Settings</a>
        </p>
      </form>
    </div>
  )
}
