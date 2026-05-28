import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings as SettingsIcon, Upload, Link2, Unlink, RefreshCw, Key, Check, AlertCircle, Heart } from 'lucide-react'
import { Settings as SettingsDB, Run } from '../lib/db'
import { parseHealthExport } from '../lib/csvImport'
import { stravaAuthUrl, exchangeCode, syncStravaRuns, disconnectStrava } from '../lib/strava'
import { useQueryClient } from '@tanstack/react-query'

export default function Settings() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const fileRef = useRef()

  const [settings, setSettings] = useState(() => SettingsDB.get())
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('pt_anthropic_key') || '')
  const [apiKeySaved, setApiKeySaved] = useState(false)
  const [maxHR, setMaxHR] = useState(() => localStorage.getItem('pt_max_hr') || '190')
  const [maxHRSaved, setMaxHRSaved] = useState(false)

  const saveMaxHR = () => {
    localStorage.setItem('pt_max_hr', maxHR)
    setMaxHRSaved(true)
    setTimeout(() => setMaxHRSaved(false), 2000)
  }

  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)

  const [syncing, setSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState(null)
  const [syncResult, setSyncResult] = useState(null)

  const stravaClientId = import.meta.env.VITE_STRAVA_CLIENT_ID

  // Handle Strava OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const error = params.get('error')
    if (error) {
      setSyncResult({ error: 'Strava authorization denied.' })
      navigate('/settings', { replace: true })
      return
    }
    if (code) {
      exchangeCode(code)
        .then(() => {
          setSettings(SettingsDB.get())
          setSyncResult({ success: 'Connected to Strava! Click "Sync Now" to import runs.' })
        })
        .catch(e => setSyncResult({ error: e.message }))
        .finally(() => navigate('/settings', { replace: true }))
    }
  }, [])

  const saveApiKey = () => {
    localStorage.setItem('pt_anthropic_key', apiKey)
    setApiKeySaved(true)
    setTimeout(() => setApiKeySaved(false), 2000)
  }

  const handleCSVImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    try {
      const rows = await parseHealthExport(file)
      const existing = Run.list()
      const existingDates = new Set(existing.filter(r => r.source === 'health_app').map(r => r.date))
      const newRows = rows.filter(r => !existingDates.has(r.date))
      if (newRows.length > 0) {
        Run.bulkCreate(newRows)
        qc.invalidateQueries({ queryKey: ['runs'] })
      }
      setImportResult({ imported: newRows.length, skipped: rows.length - newRows.length })
    } catch (e) {
      setImportResult({ error: e.message })
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  const handleStravaSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const result = await syncStravaRuns(p => setSyncProgress(p))
      qc.invalidateQueries({ queryKey: ['runs'] })
      setSyncResult({ success: `Imported ${result.imported} new runs.` })
    } catch (e) {
      setSyncResult({ error: e.message })
    } finally {
      setSyncing(false)
      setSyncProgress(null)
    }
  }

  const handleDisconnectStrava = () => {
    if (confirm('Disconnect Strava? Your imported runs will remain.')) {
      disconnectStrava()
      setSettings(SettingsDB.get())
    }
  }

  const clearAllData = () => {
    if (confirm('Delete ALL run data? This cannot be undone.')) {
      localStorage.removeItem('pt_runs')
      localStorage.removeItem('pt_goals')
      localStorage.removeItem('pt_plans')
      qc.invalidateQueries()
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 text-sm mt-0.5">Connect data sources and configure AI features</p>
      </div>

      {/* Anthropic API key */}
      <Section title="AI Features" icon={Key} iconColor="text-purple-400">
        <p className="text-slate-400 text-sm mb-3">
          Required for AI run analysis, monthly reports, and plan generation.
          Get a free key at{' '}
          <a href="https://console.anthropic.com" target="_blank" rel="noopener"
            className="text-orange-400 hover:text-orange-300">console.anthropic.com</a>
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-ant-…"
            className="input flex-1 font-mono text-sm"
          />
          <button onClick={saveApiKey}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              apiKeySaved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
            }`}>
            {apiKeySaved ? <><Check size={13} /> Saved</> : 'Save Key'}
          </button>
        </div>
      </Section>

      {/* Health App CSV/ZIP */}
      <Section title="Auto Export Health App" icon={Upload} iconColor="text-sky-400">
        <p className="text-slate-400 text-sm mb-3">
          Export workouts from the <strong className="text-slate-200">Auto Export</strong> app on your iPhone.
          Upload the <strong className="text-slate-200">.zip</strong> file directly — or a standalone Workouts CSV if you prefer.
          GPS route data from the ZIP is imported automatically.
        </p>
        <input type="file" accept=".zip,.csv" ref={fileRef} onChange={handleCSVImport} className="hidden" />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={importing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Upload size={14} />
          {importing ? 'Importing…' : 'Upload ZIP or CSV'}
        </button>
        {importResult && (
          <div className={`mt-3 flex items-start gap-2 text-sm rounded-lg p-3 ${
            importResult.error ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
          }`}>
            {importResult.error ? <AlertCircle size={14} className="mt-0.5 shrink-0" /> : <Check size={14} className="mt-0.5 shrink-0" />}
            <span>
              {importResult.error || `Imported ${importResult.imported} runs${importResult.skipped ? `, skipped ${importResult.skipped} duplicates` : ''}.`}
            </span>
          </div>
        )}
      </Section>

      {/* Strava */}
      <Section title="Strava Sync" icon={Link2} iconColor="text-orange-400">
        {!stravaClientId ? (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-sm text-amber-300 space-y-2">
            <p className="font-medium">Setup required</p>
            <p className="text-amber-400/80">
              To enable Strava sync, create a <code className="bg-black/30 px-1 rounded">.env</code> file
              in your project root with:
            </p>
            <pre className="bg-black/30 rounded p-2 text-xs font-mono">
{`VITE_STRAVA_CLIENT_ID=your_client_id
VITE_STRAVA_CLIENT_SECRET=your_client_secret`}
            </pre>
            <p className="text-amber-400/80">
              Get these from{' '}
              <a href="https://www.strava.com/settings/api" target="_blank" rel="noopener"
                className="text-orange-400 hover:text-orange-300">strava.com/settings/api</a>
              {' '}— create a free app, set callback URL to <code className="bg-black/30 px-1 rounded">http://localhost:5173/settings</code>
            </p>
          </div>
        ) : settings.strava_connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-slate-300 text-sm">
                Connected{settings.strava_athlete?.firstname ? ` as ${settings.strava_athlete.firstname}` : ''}
              </span>
            </div>
            {settings.strava_last_sync && (
              <p className="text-slate-500 text-xs">Last synced: {new Date(settings.strava_last_sync).toLocaleString()}</p>
            )}
            {syncProgress && (
              <p className="text-slate-400 text-xs">Syncing… {syncProgress.imported} runs imported (page {syncProgress.page})</p>
            )}
            {syncResult && (
              <div className={`flex items-start gap-2 text-sm rounded-lg p-3 ${
                syncResult.error ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
              }`}>
                {syncResult.error ? <AlertCircle size={14} /> : <Check size={14} />}
                <span>{syncResult.error || syncResult.success}</span>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={handleStravaSync} disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 text-sm font-medium transition-colors disabled:opacity-50">
                <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Syncing…' : 'Sync Now'}
              </button>
              <button onClick={handleDisconnectStrava}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-slate-400 hover:text-rose-400 text-sm font-medium transition-colors">
                <Unlink size={13} />
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-slate-400 text-sm">
              Connect your Strava account to automatically import runs.
              Apple Watch → Strava → PaceTrack.
            </p>
            {syncResult?.error && (
              <div className="flex items-center gap-2 text-sm bg-rose-500/10 text-rose-400 rounded-lg p-3">
                <AlertCircle size={14} />
                {syncResult.error}
              </div>
            )}
            <a href={stravaAuthUrl()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 text-sm font-medium transition-colors">
              <Link2 size={13} />
              Connect Strava
            </a>
          </div>
        )}
      </Section>

      {/* Max HR */}
      <Section title="Heart Rate Zones" icon={Heart} iconColor="text-rose-400">
        <p className="text-slate-400 text-sm mb-3">
          Used to calculate HR zones (Z1–Z5) and training load. A common estimate is <strong className="text-slate-200">220 − your age</strong>.
        </p>
        <div className="flex gap-2 items-center">
          <div className="relative w-32">
            <input
              type="number"
              min="140" max="220"
              value={maxHR}
              onChange={e => setMaxHR(e.target.value)}
              className="input w-full pr-12"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">bpm</span>
          </div>
          <button onClick={saveMaxHR}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              maxHRSaved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
            }`}>
            {maxHRSaved ? <><Check size={13} /> Saved</> : 'Save'}
          </button>
        </div>
        <div className="mt-3 flex gap-2 flex-wrap">
          {[
            { name: 'Z1 Recovery', color: 'bg-blue-500/20 text-blue-400', range: `< ${Math.round(parseInt(maxHR||190)*0.6)}` },
            { name: 'Z2 Aerobic', color: 'bg-emerald-500/20 text-emerald-400', range: `${Math.round(parseInt(maxHR||190)*0.6)}–${Math.round(parseInt(maxHR||190)*0.7)}` },
            { name: 'Z3 Tempo', color: 'bg-amber-500/20 text-amber-400', range: `${Math.round(parseInt(maxHR||190)*0.7)}–${Math.round(parseInt(maxHR||190)*0.8)}` },
            { name: 'Z4 Threshold', color: 'bg-orange-500/20 text-orange-400', range: `${Math.round(parseInt(maxHR||190)*0.8)}–${Math.round(parseInt(maxHR||190)*0.9)}` },
            { name: 'Z5 VO₂ Max', color: 'bg-rose-500/20 text-rose-400', range: `> ${Math.round(parseInt(maxHR||190)*0.9)}` },
          ].map(z => (
            <div key={z.name} className={`${z.color} rounded-lg px-2.5 py-1 text-xs`}>
              {z.name} <span className="opacity-70">{z.range} bpm</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Danger zone */}
      <Section title="Data" icon={SettingsIcon} iconColor="text-slate-400">
        <p className="text-slate-400 text-sm mb-3">All data is stored locally in your browser.</p>
        <button onClick={clearAllData}
          className="px-4 py-2 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-sm transition-colors">
          Clear all run data
        </button>
      </Section>
    </div>
  )
}

function Section({ title, icon: Icon, iconColor, children }) {
  return (
    <div className="bg-navy-800 border border-white/10 rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={15} className={iconColor} />
        <h3 className="text-white font-semibold text-sm">{title}</h3>
      </div>
      {children}
    </div>
  )
}
