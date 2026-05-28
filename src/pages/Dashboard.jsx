import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Run, TrainingGoal } from '../lib/db'
import { formatPace, calcPace } from '../lib/utils'
import { startOfWeek, parseISO, isAfter } from 'date-fns'
import RunForm from '../components/runs/RunForm'
import RecentRunsWidget from '../components/dashboard/RecentRunsWidget'
import PaceProgressChart from '../components/dashboard/PaceProgressChart'
import WeeklyStatsWidget from '../components/dashboard/WeeklyStatsWidget'
import GoalProgressWidget from '../components/dashboard/GoalProgressWidget'
import LatestRunTab from '../components/dashboard/LatestRunTab'
import MonthlyReportsTab from '../components/dashboard/MonthlyReportsTab'

const TABS = ['Overview', 'Latest Run', 'Monthly Reports']

export default function Dashboard() {
  const [tab, setTab] = useState('Overview')
  const [showForm, setShowForm] = useState(false)

  const { data: runs = [] } = useQuery({
    queryKey: ['runs'],
    queryFn: () => Run.list('-date', 500),
  })
  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => TrainingGoal.list(),
  })

  // Stats
  const weekStart = startOfWeek(new Date())
  const weekRuns = runs.filter(r => isAfter(parseISO(r.date), weekStart))
  const weekDist = weekRuns.reduce((s, r) => s + (r.distance || 0), 0)
  const recentPaces = runs.filter(r => r.pace).slice(0, 10)
  const avgPace = recentPaces.length
    ? recentPaces.reduce((s, r) => s + r.pace, 0) / recentPaces.length
    : null
  const activeGoals = goals.filter(g => g.current_status === 'active').length

  const statCards = [
    {
      label: 'THIS WEEK',
      value: weekRuns.length,
      sub: 'runs',
      gradient: 'from-violet-600 to-indigo-600',
    },
    {
      label: 'DISTANCE',
      value: weekDist.toFixed(1),
      sub: 'miles',
      gradient: 'from-emerald-500 to-teal-600',
    },
    {
      label: 'AVG PACE',
      value: formatPace(avgPace),
      sub: 'min/mile',
      gradient: 'from-orange-500 to-rose-500',
    },
    {
      label: 'GOALS',
      value: activeGoals,
      sub: 'active',
      gradient: 'from-pink-500 to-rose-600',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Running Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">Track your progress, crush your goals</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium transition-colors"
        >
          <Plus size={14} />
          Log Run
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-navy-800 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === t
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map(({ label, value, sub, gradient }) => (
              <div key={label} className={`bg-gradient-to-br ${gradient} rounded-2xl p-5`}>
                <p className="text-white/60 text-xs font-semibold tracking-widest">{label}</p>
                <p className="text-white text-4xl font-bold mt-1">{value}</p>
                <p className="text-white/60 text-xs mt-1">{sub}</p>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RecentRunsWidget runs={runs} />
            <GoalProgressWidget goals={goals} runs={runs} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PaceProgressChart runs={runs} />
            <WeeklyStatsWidget runs={runs} />
          </div>
        </>
      )}

      {tab === 'Latest Run' && (
        <div className="bg-navy-800 border border-white/10 rounded-2xl p-5">
          <LatestRunTab runs={runs} />
        </div>
      )}

      {tab === 'Monthly Reports' && (
        <div className="bg-navy-800 border border-white/10 rounded-2xl p-5">
          <MonthlyReportsTab runs={runs} />
        </div>
      )}

      {showForm && <RunForm onClose={() => setShowForm(false)} />}
    </div>
  )
}
