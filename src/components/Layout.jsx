import { Outlet, NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Activity, Calendar, BarChart2,
  Calculator, Target, ClipboardList, Settings, Trophy, Menu, X,
} from 'lucide-react'
import { useState } from 'react'

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

// Primary items shown in mobile bottom bar
const BOTTOM_NAV = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/runs', label: 'Runs', icon: Activity },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/goals', label: 'Goals', icon: Target },
]

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col">
      {/* Top nav — hidden on mobile */}
      <header className="sticky top-0 z-50 bg-navy-800/90 backdrop-blur border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-2 h-14">
          {/* Logo */}
          <div className="flex items-center gap-2 mr-4">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center">
              <Activity size={14} className="text-white" />
            </div>
            <span className="font-bold text-white text-sm tracking-wide">PaceTrack</span>
          </div>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-0.5 overflow-x-auto">
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

          {/* Mobile: hamburger for overflow pages */}
          <div className="md:hidden ml-auto">
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-white/5 bg-navy-800/95 backdrop-blur">
            <nav className="max-w-7xl mx-auto px-4 py-3 grid grid-cols-3 gap-1">
              {NAV.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-1 px-2 py-3 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`
                  }
                >
                  <Icon size={16} />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Page content — extra bottom padding on mobile for bottom nav */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 pb-24 md:pb-6">
        <Outlet />
      </main>

      {/* Mobile bottom nav bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-navy-800/95 backdrop-blur border-t border-white/10">
        <div className="flex items-stretch">
          {BOTTOM_NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-all ${
                  isActive ? 'text-orange-400' : 'text-slate-500 hover:text-slate-300'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} className={isActive ? 'text-orange-400' : ''} />
                  <span style={{ fontSize: 10 }}>{label}</span>
                </>
              )}
            </NavLink>
          ))}
          {/* More button opens dropdown */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-all ${menuOpen ? 'text-orange-400' : 'text-slate-500'}`}
          >
            <Menu size={20} />
            <span style={{ fontSize: 10 }}>More</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
