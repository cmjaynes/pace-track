import { HashRouter as BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import RunHistory from './pages/RunHistory'
import RunDetail from './pages/RunDetail'
import CalendarView from './pages/CalendarView'
import RunBreakdown from './pages/RunBreakdown'
import PaceCalculator from './pages/PaceCalculator'
import Goals from './pages/Goals'
import Plans from './pages/Plans'
import CreatePlan from './pages/CreatePlan'
import Settings from './pages/Settings'
import Records from './pages/Records'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="runs" element={<RunHistory />} />
          <Route path="runs/:id" element={<RunDetail />} />
          <Route path="calendar" element={<CalendarView />} />
          <Route path="analysis" element={<RunBreakdown />} />
          <Route path="pace-calculator" element={<PaceCalculator />} />
          <Route path="goals" element={<Goals />} />
          <Route path="plans" element={<Plans />} />
          <Route path="plans/create" element={<CreatePlan />} />
          <Route path="settings" element={<Settings />} />
          <Route path="records" element={<Records />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
