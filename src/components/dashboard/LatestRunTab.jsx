import { useState } from 'react'
import { Sparkles, Heart, Flame, Wind, TrendingUp, Mountain, Activity } from 'lucide-react'
import { formatPace, formatDuration, formatDate, paceColor } from '../../lib/utils'

export default function LatestRunTab({ runs = [] }) {
  const [aiText, setAiText] = useState(null)
  const [loading, setLoading] = useState(false)
  const run = runs[0]

  const getAIBreakdown = async () => {
    if (!run) return
    setLoading(true)
    try {
      const apiKey = localStorage.getItem('pt_anthropic_key')
      if (!apiKey) {
        setAiText('Add your Anthropic API key in Settings to enable AI analysis.')
        return
      }

      const prompt = `Analyze this run for a recreational runner and give a brief, encouraging breakdown in 3-4 sentences. Cover: 1) a key win from this run, 2) how elevation (${run.elevation_gain ?? 0} ft) and weather (${run.temperature_f ? run.temperature_f + '°F' : 'unknown temp'}, ${run.humidity_percent ? run.humidity_percent + '% humidity' : 'unknown humidity'}) may have impacted pace, 3) one specific tip for next time.

Run stats: ${run.distance} miles, pace ${formatPace(run.pace)}/mi, duration ${formatDuration(run.duration_minutes)}, avg HR ${run.avg_heart_rate_bpm ?? 'unknown'} bpm, elevation gain ${run.elevation_gain ?? 0} ft, temp ${run.temperature_f ?? 'unknown'}°F, humidity ${run.humidity_percent ?? 'unknown'}%.`

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      const data = await res.json()
      setAiText(data.content?.[0]?.text ?? 'Could not generate analysis.')
    } catch (e) {
      setAiText('AI analysis failed. Check your API key in Settings.')
    } finally {
      setLoading(false)
    }
  }

  if (!run) {
    return (
      <div className="text-center py-12 text-slate-500 text-sm">
        Log your first run to see the breakdown here.
      </div>
    )
  }

  const stats = [
    { icon: TrendingUp, label: 'Pace', value: `${formatPace(run.pace)}/mi`, color: paceColor(run.pace) },
    { icon: Activity, label: 'Distance', value: `${run.distance?.toFixed(2) ?? '--'} mi`, color: 'text-indigo-400' },
    { icon: Flame, label: 'Duration', value: formatDuration(run.duration_minutes), color: 'text-amber-400' },
    { icon: Heart, label: 'Avg HR', value: run.avg_heart_rate_bpm ? `${run.avg_heart_rate_bpm} bpm` : '--', color: 'text-rose-400' },
    { icon: Mountain, label: 'Elevation', value: run.elevation_gain ? `${run.elevation_gain} ft` : '--', color: 'text-emerald-400' },
    { icon: Wind, label: 'Cadence', value: run.step_cadence_spm ? `${run.step_cadence_spm} spm` : '--', color: 'text-sky-400' },
  ]

  const weather = []
  if (run.temperature_f != null) weather.push(`${run.temperature_f}°F`)
  if (run.humidity_percent != null) weather.push(`${run.humidity_percent}% humidity`)
  if (run.active_energy_kcal != null) weather.push(`${Math.round(run.active_energy_kcal)} kcal`)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold">{run.workout_type ?? 'Run'}</h3>
          <p className="text-slate-400 text-xs mt-0.5">{formatDate(run.date)}</p>
        </div>
        {weather.length > 0 && (
          <div className="flex gap-2">
            {weather.map((w, i) => (
              <span key={i} className="text-xs bg-white/5 text-slate-300 px-2.5 py-1 rounded-full">{w}</span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {stats.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-navy-900/50 rounded-xl p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <Icon size={12} className={color} />
              <span className="text-slate-500 text-xs">{label}</span>
            </div>
            <p className={`font-semibold text-sm ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* AI section */}
      <div className="bg-navy-900/50 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={13} className="text-purple-400" />
            <span className="text-white text-sm font-medium">AI Breakdown</span>
          </div>
          {!aiText && (
            <button
              onClick={getAIBreakdown}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors disabled:opacity-50"
            >
              {loading ? 'Analyzing…' : 'Analyze Run'}
            </button>
          )}
        </div>
        {aiText && (
          <p className="text-slate-300 text-sm leading-relaxed">{aiText}</p>
        )}
        {!aiText && !loading && (
          <p className="text-slate-500 text-xs">Get an AI-powered analysis of elevation, weather impact, and tips for next time.</p>
        )}
      </div>

      {run.notes && (
        <div className="bg-navy-900/50 rounded-xl p-4">
          <p className="text-slate-400 text-xs italic">"{run.notes}"</p>
        </div>
      )}
    </div>
  )
}
