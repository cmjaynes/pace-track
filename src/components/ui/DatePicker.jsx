import { useState, useRef, useEffect } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday, parseISO,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export default function DatePicker({ value, onChange, placeholder = 'Pick a date', minDate }) {
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => value ? parseISO(value) : new Date())
  const ref = useRef()

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Sync displayed month when value changes externally
  useEffect(() => {
    if (value) setMonth(parseISO(value))
  }, [value])

  const selected = value ? parseISO(value) : null

  // Build grid
  const gridStart = startOfWeek(startOfMonth(month))
  const gridEnd = endOfWeek(endOfMonth(month))
  const days = []
  let d = gridStart
  while (d <= gridEnd) { days.push(new Date(d)); d = addDays(d, 1) }

  const handleDay = (day) => {
    onChange(format(day, 'yyyy-MM-dd'))
    setOpen(false)
  }

  const isDisabled = (day) => minDate && day < parseISO(minDate)

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="input flex items-center gap-2 text-left w-full"
      >
        <Calendar size={14} className="text-slate-500 shrink-0" />
        {selected
          ? <span className="text-white">{format(selected, 'MMM d, yyyy')}</span>
          : <span className="text-slate-600">{placeholder}</span>
        }
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute z-50 mt-1 bg-navy-800 border border-white/10 rounded-xl shadow-2xl p-4 w-72">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => setMonth(m => subMonths(m, 1))}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
              <ChevronLeft size={15} />
            </button>
            <span className="text-white text-sm font-semibold">{format(month, 'MMMM yyyy')}</span>
            <button type="button" onClick={() => setMonth(m => addMonths(m, 1))}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {DOW.map(d => (
              <div key={d} className="text-center text-slate-600 text-xs py-1">{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-0.5">
            {days.map(day => {
              const inMonth = isSameMonth(day, month)
              const isSelected = selected && isSameDay(day, selected)
              const isNow = isToday(day)
              const disabled = isDisabled(day)

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleDay(day)}
                  className={`
                    aspect-square rounded-lg text-xs font-medium transition-all
                    ${!inMonth ? 'opacity-20' : ''}
                    ${disabled ? 'opacity-20 cursor-not-allowed' : 'hover:bg-white/10'}
                    ${isSelected ? 'bg-orange-500 text-white hover:bg-orange-400' : ''}
                    ${isNow && !isSelected ? 'ring-1 ring-orange-500/50 text-orange-400' : ''}
                    ${!isSelected && inMonth && !isNow ? 'text-slate-300' : ''}
                  `}
                >
                  {format(day, 'd')}
                </button>
              )
            })}
          </div>

          {/* Today shortcut */}
          <div className="mt-3 pt-3 border-t border-white/5 flex gap-2">
            <button type="button"
              onClick={() => handleDay(new Date())}
              className="text-xs text-orange-400 hover:text-orange-300 transition-colors">
              Today
            </button>
            {selected && (
              <button type="button"
                onClick={() => { onChange(''); setOpen(false) }}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors ml-auto">
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
