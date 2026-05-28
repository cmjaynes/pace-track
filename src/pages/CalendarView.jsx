import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday, parseISO,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Run, TrainingPlan } from '../lib/db'
import { paceColorBg } from '../lib/utils'
import RunForm from '../components/runs/RunForm'
import DayRunSummary from '../components/calendar/DayRunSummary'

// Build a map of {dateStr: [{type, distance}]} from all active plans
function buildPlanWorkouts(plans) {
  const map = {}
  plans.forEach(plan => {
    if (!plan.race_date || !plan.weeks) return
    const raceDate = new Date(plan.race_date)
    plan.weeks.forEach((week, wi) => {
      ;(week.workouts || []).forEach(w => {
        if (w.type === 'Rest') return
        const d = new Date(raceDate)
        d.setDate(d.getDate() - (plan.weeks.length - wi) * 7 + (w.day ?? 0))
        const key = format(d, 'yyyy-MM-dd')
        if (!map[key]) map[key] = []
        map[key].push({ type: w.type, distance: w.distance })
      })
    })
  })
  return map
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarView() {
  const [month, setMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editRun, setEditRun] = useState(null)
  const [prefillDate, setPrefillDate] = useState(null)

  const { data: runs = [] } = useQuery({
    queryKey: ['runs'],
    queryFn: () => Run.list('-date', 500),
  })
  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: () => TrainingPlan.list(),
  })

  const planWorkoutsByDate = buildPlanWorkouts(plans)

  // Build calendar grid
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const gridStart = startOfWeek(monthStart)
  const gridEnd = endOfWeek(monthEnd)

  const days = []
  let d = gridStart
  while (d <= gridEnd) {
    days.push(new Date(d))
    d = addDays(d, 1)
  }

  const runsByDate = {}
  runs.forEach(r => {
    if (!r.date) return
    if (!runsByDate[r.date]) runsByDate[r.date] = []
    runsByDate[r.date].push(r)
  })

  // Month stats
  const monthRuns = runs.filter(r => r.date && isSameMonth(parseISO(r.date), month))
  const monthDist = monthRuns.reduce((s, r) => s + (r.distance || 0), 0)

  const handleDayClick = (day) => {
    const key = format(day, 'yyyy-MM-dd')
    setSelectedDay(key)
  }

  const handleLogNew = (date) => {
    setPrefillDate(date)
    setEditRun(null)
    setShowForm(true)
  }

  const handleEditRun = (run) => {
    setEditRun(run)
    setShowForm(true)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Calendar</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          {monthRuns.length} runs · {monthDist.toFixed(1)} miles in {format(month, 'MMMM')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Calendar grid */}
        <div className="lg:col-span-2 bg-navy-800 border border-white/10 rounded-2xl p-5">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">{format(month, 'MMMM yyyy')}</h2>
            <div className="flex gap-1">
              <button onClick={() => setMonth(m => subMonths(m, 1))}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setMonth(new Date())}
                className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 text-xs transition-colors">
                Today
              </button>
              <button onClick={() => setMonth(m => addMonths(m, 1))}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Day of week headers */}
          <div className="grid grid-cols-7 mb-2">
            {DOW.map(d => (
              <div key={d} className="text-center text-slate-500 text-xs font-medium py-1">{d}</div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map(day => {
              const key = format(day, 'yyyy-MM-dd')
              const dayRuns = runsByDate[key] || []
              const planWorkouts = planWorkoutsByDate[key] || []
              const inMonth = isSameMonth(day, month)
              const today = isToday(day)
              const selected = selectedDay === key

              return (
                <button
                  key={key}
                  onClick={() => handleDayClick(day)}
                  className={`
                    aspect-square rounded-xl p-1 flex flex-col items-center justify-start transition-all
                    ${inMonth ? 'hover:bg-white/5' : 'opacity-30'}
                    ${selected ? 'ring-1 ring-orange-500/60 bg-orange-500/10' : ''}
                    ${today ? 'ring-1 ring-white/30' : ''}
                  `}
                >
                  <span className={`text-xs font-medium leading-none mb-1 ${
                    today ? 'text-orange-400' : inMonth ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                    {format(day, 'd')}
                  </span>
                  <div className="flex flex-wrap gap-0.5 justify-center">
                    {dayRuns.slice(0, 3).map(r => (
                      <div key={r.id} className={`w-2 h-2 rounded-full ${paceColorBg(r.pace)}`} />
                    ))}
                    {planWorkouts.slice(0, 2).map((w, i) => (
                      <div key={`p${i}`} className="w-2 h-2 rounded-full border border-indigo-400 bg-transparent" />
                    ))}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-4 flex-wrap mt-4 pt-4 border-t border-white/5">
            {[
              ['bg-emerald-500', '< 8:00'],
              ['bg-indigo-500', '8–9:30'],
              ['bg-amber-500', '9:30–11'],
              ['bg-rose-500', '> 11:00'],
            ].map(([cls, label]) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${cls}`} />
                <span className="text-slate-500 text-xs">{label} /mi</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full border border-indigo-400 bg-transparent" />
              <span className="text-slate-500 text-xs">Planned</span>
            </div>
          </div>
        </div>

        {/* Day detail panel */}
        <div>
          {selectedDay ? (
            <DayRunSummary
              date={selectedDay}
              runs={runs}
              onClose={() => setSelectedDay(null)}
              onLogNew={handleLogNew}
              onEdit={handleEditRun}
            />
          ) : (
            <div className="bg-navy-800 border border-white/10 rounded-2xl p-5 flex flex-col items-center justify-center h-48 text-center">
              <p className="text-slate-500 text-sm">Click any day</p>
              <p className="text-slate-600 text-xs mt-1">to view or log runs</p>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <RunForm
          run={editRun}
          prefillDate={prefillDate}
          onClose={() => { setShowForm(false); setEditRun(null); setPrefillDate(null) }}
        />
      )}
    </div>
  )
}
