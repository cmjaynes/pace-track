import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { TrainingGoal, Run } from '../lib/db'
import GoalCard from '../components/goals/GoalCard'
import GoalForm from '../components/goals/GoalForm'

export default function Goals() {
  const [showForm, setShowForm] = useState(false)
  const [editGoal, setEditGoal] = useState(null)
  const [filter, setFilter] = useState('active')

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => TrainingGoal.list(),
  })
  const { data: runs = [] } = useQuery({
    queryKey: ['runs'],
    queryFn: () => Run.list('-date', 500),
  })

  const filtered = goals.filter(g =>
    filter === 'all' ? true : g.current_status === filter
  )

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Goals</h1>
          <p className="text-slate-400 text-sm mt-0.5">Set targets, track progress</p>
        </div>
        <button onClick={() => { setEditGoal(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium transition-colors">
          <Plus size={14} />
          New Goal
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-navy-800 rounded-xl p-1 w-fit">
        {[['active', 'Active'], ['all', 'All']].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filter === v ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}>
            {l}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-500 text-sm">No goals yet.</p>
          <button onClick={() => setShowForm(true)} className="text-orange-400 text-xs hover:text-orange-300 mt-2">
            Create your first goal →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(goal => (
            <GoalCard key={goal.id} goal={goal} runs={runs}
              onEdit={(g) => { setEditGoal(g); setShowForm(true) }} />
          ))}
        </div>
      )}

      {showForm && (
        <GoalForm goal={editGoal} onClose={() => { setShowForm(false); setEditGoal(null) }} />
      )}
    </div>
  )
}
