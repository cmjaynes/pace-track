// Strava OAuth + API integration
// User must create a Strava API app at https://www.strava.com/settings/api
// and set VITE_STRAVA_CLIENT_ID and VITE_STRAVA_CLIENT_SECRET in .env

import { Settings, Run } from './db'
import { calcPace } from './utils'

const CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID
const CLIENT_SECRET = import.meta.env.VITE_STRAVA_CLIENT_SECRET
const REDIRECT_URI = `${window.location.origin}/settings`

export function stravaAuthUrl() {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'activity:read_all',
    approval_prompt: 'auto',
  })
  return `https://www.strava.com/oauth/authorize?${params}`
}

export async function exchangeCode(code) {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) throw new Error('Token exchange failed')
  const data = await res.json()
  Settings.set({
    strava_access_token: data.access_token,
    strava_refresh_token: data.refresh_token,
    strava_expires_at: data.expires_at,
    strava_athlete: data.athlete,
    strava_connected: true,
  })
  return data
}

async function getValidToken() {
  const s = Settings.get()
  if (!s.strava_access_token) throw new Error('Not connected')
  const now = Math.floor(Date.now() / 1000)
  if (s.strava_expires_at > now + 60) return s.strava_access_token

  // refresh
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: s.strava_refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error('Token refresh failed')
  const data = await res.json()
  Settings.set({
    strava_access_token: data.access_token,
    strava_refresh_token: data.refresh_token,
    strava_expires_at: data.expires_at,
  })
  return data.access_token
}

export async function syncStravaRuns(onProgress) {
  const token = await getValidToken()
  const existingRuns = Run.list()
  const existingStravaIds = new Set(existingRuns.map(r => r.strava_id).filter(Boolean))

  let page = 1
  let imported = 0
  let total = 0

  while (true) {
    const res = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?per_page=100&page=${page}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) throw new Error('Strava API error')
    const activities = await res.json()
    if (!activities.length) break

    const runs = activities.filter(a => a.type === 'Run' || a.sport_type === 'Run')
    total += runs.length

    for (const act of runs) {
      if (existingStravaIds.has(String(act.id))) continue
      const distanceMiles = act.distance / 1609.34
      const durationMinutes = act.moving_time / 60
      Run.create({
        date: act.start_date_local?.split('T')[0] ?? act.start_date?.split('T')[0],
        distance: Math.round(distanceMiles * 100) / 100,
        duration_minutes: Math.round(durationMinutes * 10) / 10,
        pace: calcPace(distanceMiles, durationMinutes),
        avg_heart_rate_bpm: act.average_heartrate ?? null,
        max_heart_rate_bpm: act.max_heartrate ?? null,
        elevation_gain: act.total_elevation_gain ? Math.round(act.total_elevation_gain * 3.28084) : null,
        workout_type: 'Outdoor Run',
        notes: act.name,
        source: 'strava',
        strava_id: String(act.id),
      })
      imported++
    }

    onProgress?.({ imported, page })
    if (activities.length < 100) break
    page++
  }

  Settings.set({ strava_last_sync: new Date().toISOString() })
  return { imported, total }
}

export function disconnectStrava() {
  Settings.set({
    strava_access_token: null,
    strava_refresh_token: null,
    strava_expires_at: null,
    strava_athlete: null,
    strava_connected: false,
    strava_last_sync: null,
  })
}
