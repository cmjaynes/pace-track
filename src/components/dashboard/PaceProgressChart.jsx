import { TrendingUp } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { formatPace } from '../../lib/utils'
import { format, parseISO } from 'date-fns'

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-navy-800 border border-white/10 rounded-lg px-3 py-2 text-xs">
      <p className="text-slate-300">{d.label}</p>
      <p className="text-orange-400 font-semibold">{formatPace(d.pace)} /mi</p>
    </div>
  )
}

export default function PaceProgressChart({ runs = [] }) {
  const data = runs
    .filter(r => r.pace)
    .slice(0, 30)
    .reverse()
    .map(r => ({
      label: format(parseISO(r.date), 'MMM d'),
      pace: r.pace,
      paceStr: formatPace(r.pace),
    }))

  // Y-axis: invert so faster (lower) pace looks higher on chart
  const paces = data.map(d => d.pace)
  const minP = Math.min(...paces) - 0.5
  const maxP = Math.max(...paces) + 0.5

  return (
    <div className="bg-navy-800 border border-white/10 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={15} className="text-indigo-400" />
        <h3 className="text-white font-semibold text-sm">Pace Progress</h3>
        <span className="text-slate-500 text-xs ml-auto">Last 30 days</span>
      </div>

      {data.length < 2 ? (
        <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
          Log more runs to see your trend
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data} margin={{ left: -20, right: 8, top: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
            <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis
              domain={[minP, maxP]}
              reversed
              tickFormatter={v => formatPace(v)}
              tick={{ fill: '#64748b', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="pace"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
