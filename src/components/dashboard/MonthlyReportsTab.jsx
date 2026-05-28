import { useState } from 'react'
import { Sparkles, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { format, startOfMonth, endOfMonth, parseISO, subMonths } from 'date-fns'
import { formatPace } from '../../lib/utils'

function MonthStats(runs, monthDate) {
  const start = startOfMonth(monthDate)
  const end = endOfMonth(monthDate)
  const monthRuns = runs.filter(r => {
    const d = parseISO(r.date)
    return d >= start && d <= end
  })
  const totalDist = monthRuns.reduce((s, r) => s + (r.distance || 0), 0)
  const avgPace = monthRuns.filter(r => r.pace).length
    ? monthRuns.filter(r => r.pace).reduce((s, r) => s + r.pace, 0) / monthRuns.filter(r => r.pace).length
    : null
  const totalElev = monthRuns.reduce((s, r) => s + (r.elevation_gain || 0), 0)
  return { totalDist, avgPace, totalElev, count: monthRuns.length }
}

function Trend({ current, previous, invert = false }) {
  if (!previous || previous === 0) return <Minus size={12} className="text-slate-500" />
  const pct = ((current - previous) / previous) * 100
  const up = pct > 0
  const good = invert ? !up : up
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <span className={`flex items-center gap-0.5 text-xs ${good ? 'text-emerald-400' : 'text-rose-400'}`}>
      <Icon size={11} />
      {Math.abs(pct).toFixed(0)}%
    </span>
  )
}

export default function MonthlyReportsTab({ runs = [] }) {
  const [aiText, setAiText] = useState(null)
  const [loading, setLoading] = useState(false)

  const now = new Date()
  const thisMonth = MonthStats(runs, now)
  const lastMonth = MonthStats(runs, subMonths(now, 1))

  const chartData = Array.from({ length: 6 }, (_, i) => {
    const m = subMonths(now, 5 - i)
    const s = MonthStats(runs, m)
    return {
      month: format(m, 'MMM'),
      miles: Math.round(s.totalDist * 10) / 10,
      pace: s.avgPace,
    }
  })

  const getReport = async () => {
    setLoading(true)
    try {
      const apiKey = localStorage.getItem('pt_anthropic_key')
      if (!apiKey) {
        setAiText('Add your Anthropic API key in Settings to enable AI reports.')
        return
      }
      const prompt = `Generate a brief (3-4 sentence) monthly running report comparing this month vs last month. Be encouraging and specific.

This month: ${thisMonth.totalDist.toFixed(1)} miles, ${thisMonth.count} runs, avg pace ${formatPace(thisMonth.avgPace)}/mi, ${Math.round(thisMonth.totalElev)} ft elevation.
Last month: ${lastMonth.totalDist.toFixed(1)} miles, ${lastMonth.count} runs, avg pace ${formatPace(lastMonth.avgPace)}/mi, ${Math.round(lastMonth.totalElev)} ft elevation.`

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
          max_tokens: 250,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      const data = await res.json()
      setAiText(data.content?.[0]?.text ?? 'Could not generate report.')
    } catch {
      setAiText('Report generation failed. Check your API key in Settings.')
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      label: 'Distance',
      current: `${thisMonth.totalDist.toFixed(1)} mi`,
      trend: <Trend current={thisMonth.totalDist} previous={lastMonth.totalDist} />,
      color: 'from-orange-500/20 to-rose-500/20 border-orange-500/20',
      text: 'text-orange-400',
    },
    {
      label: 'Avg Pace',
      current: `${formatPace(thisMonth.avgPace)}/mi`,
      trend: <Trend current={thisMonth.avgPace} previous={lastMonth.avgPace} invert />,
      color: 'from-indigo-500/20 to-purple-500/20 border-indigo-500/20',
      text: 'text-indigo-400',
    },
    {
      label: 'Elevation',
      current: `${Math.round(thisMonth.totalElev)} ft`,
      trend: <Trend current={thisMonth.totalElev} previous={lastMonth.totalElev} />,
      color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/20',
      text: 'text-emerald-400',
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold">{format(now, 'MMMM yyyy')}</h3>
          <p className="text-slate-400 text-xs">{thisMonth.count} runs this month</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        {statCards.map(({ label, current, trend, color, text }) => (
          <div key={label} className={`bg-gradient-to-br ${color} border rounded-xl p-3`}>
            <p className="text-slate-400 text-xs mb-1">{label}</p>
            <p className={`font-bold text-base ${text}`}>{current}</p>
            <div className="mt-1">{trend}</div>
          </div>
        ))}
      </div>

      {/* 6-month chart */}
      <div className="bg-navy-900/50 rounded-xl p-4">
        <p className="text-slate-400 text-xs mb-3">Monthly Miles — Last 6 Months</p>
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={chartData} margin={{ left: -20, right: 4, top: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="milesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#FF6B35" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" />
            <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#1A2B3C', border: '1px solid #2E3F55', borderRadius: 8 }}
              labelStyle={{ color: '#94a3b8', fontSize: 11 }}
              itemStyle={{ color: '#FF6B35', fontSize: 11 }}
            />
            <Area type="monotone" dataKey="miles" stroke="#FF6B35" fill="url(#milesGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* AI report */}
      <div className="bg-navy-900/50 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={13} className="text-purple-400" />
            <span className="text-white text-sm font-medium">AI Monthly Report</span>
          </div>
          {!aiText && (
            <button
              onClick={getReport}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors disabled:opacity-50"
            >
              {loading ? 'Generating…' : 'Generate Report'}
            </button>
          )}
        </div>
        {aiText && <p className="text-slate-300 text-sm leading-relaxed">{aiText}</p>}
        {!aiText && !loading && (
          <p className="text-slate-500 text-xs">Compare this month vs last with an AI-generated summary.</p>
        )}
      </div>
    </div>
  )
}
