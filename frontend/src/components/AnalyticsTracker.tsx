import { useEffect, useMemo, useRef } from 'react'
import { useLocation } from 'react-router-dom'

type AnalyticsEvent = {
  ts: number
  event_name: string
  path: string
  referrer?: string
  properties?: Record<string, unknown>
}

const RAW_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const API_BASE_URL = String(RAW_API_BASE_URL).replace(/\/$/, '')
const ANALYTICS_URL = `${API_BASE_URL}/api/analytics/track`

let lastTrackedPath = ''
let lastTrackedAt = 0

function createId() {
  if (crypto?.randomUUID) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function getSessionId() {
  const key = 'flixhd_analytics_session_id'
  const existing = sessionStorage.getItem(key)

  if (existing) return existing

  const nextId = createId()
  sessionStorage.setItem(key, nextId)

  return nextId
}

function getGuestId() {
  const key = 'flixhd_guest_id'
  const existing = localStorage.getItem(key)

  if (existing) return existing

  const nextId = createId()
  localStorage.setItem(key, nextId)

  return nextId
}

function getContentInfo(path: string) {
  const movieMatch = path.match(/^\/movie\/([^/?#]+)/)
  if (movieMatch?.[1]) {
    return {
      content_type: 'movie',
      content_id: movieMatch[1],
    }
  }

  const seriesMatch = path.match(/^\/series\/([^/?#]+)/)
  if (seriesMatch?.[1]) {
    return {
      content_type: 'series',
      content_id: seriesMatch[1],
    }
  }

  return null
}

async function sendAnalyticsEvents(events: AnalyticsEvent[]) {
  if (!events.length) return

  try {
    await fetch(ANALYTICS_URL, {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        session_id: getSessionId(),
        guest_id: getGuestId(),
        events,
      }),
    })
  } catch {
    // Analytics must never break the website UI.
  }
}

function AnalyticsTracker() {
  const location = useLocation()
  const referrerRef = useRef<string>(document.referrer || '')

  const currentPath = useMemo(() => {
    return `${location.pathname}${location.search}`
  }, [location.pathname, location.search])

  useEffect(() => {
    const now = Date.now()
    const duplicatePath =
      lastTrackedPath === currentPath && now - lastTrackedAt < 1200

    if (duplicatePath) {
      return
    }

    lastTrackedPath = currentPath
    lastTrackedAt = now

    const events: AnalyticsEvent[] = [
      {
        ts: now,
        event_name: 'page_view',
        path: currentPath,
        referrer: referrerRef.current || undefined,
        properties: {},
      },
    ]

    const contentInfo = getContentInfo(currentPath)

    if (contentInfo) {
      events.push({
        ts: now,
        event_name: 'detail_page_open',
        path: currentPath,
        referrer: referrerRef.current || undefined,
        properties: contentInfo,
      })

      events.push({
        ts: now,
        event_name: 'watch_page_open',
        path: currentPath,
        referrer: referrerRef.current || undefined,
        properties: contentInfo,
      })
    }

    sendAnalyticsEvents(events)

    referrerRef.current = window.location.href
  }, [currentPath])

  useEffect(() => {
    const heartbeat = window.setInterval(() => {
      const now = Date.now()
      const contentInfo = getContentInfo(currentPath)

      const events: AnalyticsEvent[] = [
        {
          ts: now,
          event_name: 'heartbeat',
          path: currentPath,
          referrer: referrerRef.current || undefined,
          properties: {},
        },
      ]

      if (contentInfo) {
        events.push({
          ts: now,
          event_name: 'detail_page_heartbeat',
          path: currentPath,
          referrer: referrerRef.current || undefined,
          properties: contentInfo,
        })

        events.push({
          ts: now,
          event_name: 'watch_page_heartbeat',
          path: currentPath,
          referrer: referrerRef.current || undefined,
          properties: contentInfo,
        })
      }

      sendAnalyticsEvents(events)
    }, 15000)

    return () => {
      window.clearInterval(heartbeat)
    }
  }, [currentPath])

  return null
}

export default AnalyticsTracker