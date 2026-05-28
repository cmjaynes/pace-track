import { Outlet, NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Activity, Calendar, BarChart2,
  Calculator, Target, ClipboardList, Settings, Trophy,
} from 'lucide-react'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/runs', label: 'Runs', icon: Activity },
  { to: '/records', label: 'Records', icon: Trophy },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/analysis', label: 'Analysis', icon: BarChart2 },
  { to: '/pace-calculator', label: 'Pace Calc', icon: Calculator },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/plans', label: 'Plans', icon: ClipboardList },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Layout() {
  return (
    <div className="min-h-screen bg-navy-900 flex flex-col">
      {/* Top nav */}
      <header className="sticky top-0 z-50 bg-navy-800/90 backdrop-blur border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-2 h-14">
          {/* Logo */}
          <div className="flex items-center gap-2 mr-4">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center">
              <Activity size={14} className="text-white" />
            </div>
            <span className="font-bold text-white text-sm tracking-wide">PaceTrack</span>
          </div>

          {/* Nav links */}
          <nav className="flex items-center gap-0.5 overflow-x-auto">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-orange-500/20 text-orange-400'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`
                }
              >
                <Icon size={13} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
