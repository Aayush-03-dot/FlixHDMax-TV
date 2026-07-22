import { useEffect, useMemo, useState } from 'react'
import { adminFetch } from './adminApi'
import type {
  AdminToast,
  AnalyticsLiveFeedItem,
  AnalyticsLiveFeedResponse,
  AnalyticsLiveNowResponse,
  AnalyticsOnlineResponse,
  AnalyticsOverviewResponse,
  AnalyticsRecentSessionsResponse,
  AnalyticsSessionItem,
  AnalyticsTimelineResponse,
  AnalyticsTopContentResponse,
  AnalyticsTopUsersResponse,
} from './adminTypes'

type Props = {
  onShowToast: (type: AdminToast['type'], message: string) => void
}

type RangePreset = '7d' | '30d' | '90d' | 'custom'

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10)
}

function getPresetDates(days: number) {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - (days - 1))

  return {
    from: toDateInputValue(start),
    to: toDateInputValue(end),
  }
}

function toNumber(value: number | string | null | undefined) {
  const numberValue = Number(value || 0)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function formatNumber(value: number | string | null | undefined) {
  return new Intl.NumberFormat().format(toNumber(value))
}

function formatDuration(value: number | string | null | undefined) {
  const totalSeconds = Math.max(0, Math.floor(toNumber(value)))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`

  return `${seconds}s`
}

function formatDateTime(value?: string | null) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

function shortSessionId(sessionId: string) {
  if (!sessionId) return '—'
  return `${sessionId.slice(0, 8)}...`
}

function getUserLabel(item: {
  user_id?: number | null
  username?: string | null
  email?: string | null
}) {
  if (item.username) return item.username
  if (item.email) return item.email
  if (item.user_id) return `User #${item.user_id}`

  return 'Guest'
}

function cleanEventName(value: string) {
  return value.replace(/_/g, ' ')
}

function cleanPath(value?: string | null) {
  if (!value) return '—'

  if (value.length <= 64) {
    return value
  }

  return `${value.slice(0, 64)}...`
}

function getDeviceIcon(device?: string | null) {
  if (device === 'mobile') return 'bi-phone'
  if (device === 'tablet') return 'bi-tablet'
  if (device === 'desktop') return 'bi-display'

  return 'bi-question-circle'
}

function AnalyticsTab({ onShowToast }: Props) {
  const initialRange = useMemo(() => getPresetDates(7), [])

  const [rangePreset, setRangePreset] = useState<RangePreset>('7d')
  const [dateFrom, setDateFrom] = useState(initialRange.from)
  const [dateTo, setDateTo] = useState(initialRange.to)

  const [overview, setOverview] = useState<AnalyticsOverviewResponse | null>(
    null
  )
  const [online, setOnline] = useState<AnalyticsOnlineResponse | null>(null)
  const [recentSessions, setRecentSessions] = useState<AnalyticsSessionItem[]>(
    []
  )
  const [topUsers, setTopUsers] = useState<
    AnalyticsTopUsersResponse['users']
  >([])
  const [topContent, setTopContent] = useState<
    AnalyticsTopContentResponse['content']
  >([])
  const [liveNow, setLiveNow] = useState<AnalyticsLiveNowResponse['sessions']>(
    []
  )
  const [liveFeed, setLiveFeed] = useState<AnalyticsLiveFeedItem[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [timelineOpen, setTimelineOpen] = useState(false)
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [timelineSessionId, setTimelineSessionId] = useState('')
  const [timeline, setTimeline] = useState<AnalyticsTimelineResponse['timeline']>(
    []
  )

  const rangeQuery = useMemo(() => {
    const params = new URLSearchParams()
    params.set('from', dateFrom)
    params.set('to', dateTo)

    return params.toString()
  }, [dateFrom, dateTo])

  const loadAnalytics = async () => {
    setLoading(true)
    setError(false)

    try {
      const [
        overviewResponse,
        onlineResponse,
        recentSessionsResponse,
        topUsersResponse,
        topContentResponse,
        liveNowResponse,
        liveFeedResponse,
      ] = await Promise.all([
        adminFetch<AnalyticsOverviewResponse>(
          `/api/admin/analytics/overview?${rangeQuery}`
        ),
        adminFetch<AnalyticsOnlineResponse>('/api/admin/analytics/online'),
        adminFetch<AnalyticsRecentSessionsResponse>(
          `/api/admin/analytics/recent-sessions?${rangeQuery}`
        ),
        adminFetch<AnalyticsTopUsersResponse>(
          `/api/admin/analytics/top-users?${rangeQuery}`
        ),
        adminFetch<AnalyticsTopContentResponse>(
          `/api/admin/analytics/top-content?${rangeQuery}`
        ),
        adminFetch<AnalyticsLiveNowResponse>('/api/admin/analytics/live-now'),
        adminFetch<AnalyticsLiveFeedResponse>(
          '/api/admin/analytics/live-feed?limit=40'
        ),
      ])

      setOverview(overviewResponse)
      setOnline(onlineResponse)
      setRecentSessions(recentSessionsResponse.sessions || [])
      setTopUsers(topUsersResponse.users || [])
      setTopContent(topContentResponse.content || [])
      setLiveNow(liveNowResponse.sessions || [])
      setLiveFeed(liveFeedResponse.events || [])
    } catch {
      setError(true)
      onShowToast('error', 'Could not load analytics.')
    } finally {
      setLoading(false)
    }
  }

  const applyPreset = (preset: RangePreset) => {
    setRangePreset(preset)

    if (preset === 'custom') {
      return
    }

    const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90
    const nextRange = getPresetDates(days)

    setDateFrom(nextRange.from)
    setDateTo(nextRange.to)
  }

  const openTimeline = async (sessionId: string) => {
    if (!sessionId) return

    setTimelineOpen(true)
    setTimelineLoading(true)
    setTimelineSessionId(sessionId)
    setTimeline([])

    try {
      const response = await adminFetch<AnalyticsTimelineResponse>(
        `/api/admin/analytics/session/${encodeURIComponent(sessionId)}/timeline`
      )

      setTimeline(response.timeline || [])
    } catch {
      onShowToast('error', 'Could not load session timeline.')
      setTimelineOpen(false)
    } finally {
      setTimelineLoading(false)
    }
  }

  const closeTimeline = () => {
    setTimelineOpen(false)
    setTimelineLoading(false)
    setTimelineSessionId('')
    setTimeline([])
  }

  useEffect(() => {
    loadAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const kpi = overview?.kpi

  return (
    <div className="admin-analytics-page">
      <div className="admin-page-header">
        <div>
          <h1>Analytics</h1>
          <p>Sessions, viewing activity and live traffic.</p>
        </div>
        <span className="admin-live-status">
          <span></span>
          {formatNumber(online?.online.sessions)} online
        </span>
      </div>

      <section className="admin-analytics-controls">
        <div className="admin-analytics-range-buttons">
          <button
            type="button"
            className={rangePreset === '7d' ? 'active' : ''}
            onClick={() => applyPreset('7d')}
          >
            7 days
          </button>

          <button
            type="button"
            className={rangePreset === '30d' ? 'active' : ''}
            onClick={() => applyPreset('30d')}
          >
            30 days
          </button>

          <button
            type="button"
            className={rangePreset === '90d' ? 'active' : ''}
            onClick={() => applyPreset('90d')}
          >
            90 days
          </button>
        </div>

        <div className="admin-analytics-date-fields">
          <label>
            From
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setRangePreset('custom')
                setDateFrom(event.target.value)
              }}
            />
          </label>

          <label>
            To
            <input
              type="date"
              value={dateTo}
              onChange={(event) => {
                setRangePreset('custom')
                setDateTo(event.target.value)
              }}
            />
          </label>

          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={loadAnalytics}
            disabled={loading || !dateFrom || !dateTo}
          >
            Apply
          </button>
        </div>
      </section>

      {error && (
        <div className="admin-alert-error">
          Analytics could not be loaded. Check backend logs if this keeps
          happening.
        </div>
      )}

      <section className="admin-analytics-kpis">
        <div className="admin-analytics-kpi-card">
          <span>Sessions</span>
          <strong>{loading ? '—' : formatNumber(kpi?.total_sessions)}</strong>
          <small>Selected date range</small>
        </div>

        <div className="admin-analytics-kpi-card">
          <span>Active Users</span>
          <strong>{loading ? '—' : formatNumber(kpi?.active_users)}</strong>
          <small>Logged-in visitors</small>
        </div>

        <div className="admin-analytics-kpi-card">
          <span>Pageviews</span>
          <strong>{loading ? '—' : formatNumber(kpi?.pageviews)}</strong>
          <small>Total tracked page views</small>
        </div>

        <div className="admin-analytics-kpi-card">
          <span>Watch Time</span>
          <strong>
            {loading ? '—' : formatDuration(kpi?.watchpage_seconds)}
          </strong>
          <small>Approx. watch page time</small>
        </div>

        <div className="admin-analytics-kpi-card live">
          <span>Online Now</span>
          <strong>{loading ? '—' : formatNumber(online?.online.sessions)}</strong>
          <small>
            {formatNumber(online?.online.users)} users ·{' '}
            {formatNumber(online?.online.guests)} guests
          </small>
        </div>
      </section>

      <section className="admin-analytics-grid">
        <div className="admin-analytics-panel large">
          <div className="admin-analytics-panel-head">
            <div>
              <h2>Recent Sessions</h2>
              <p>Latest sessions in the selected date range.</p>
            </div>
          </div>

          <div className="admin-analytics-table-wrap">
            <table className="admin-analytics-table">
              <thead>
                <tr>
                  <th>Session</th>
                  <th>User</th>
                  <th>Device</th>
                  <th>Started</th>
                  <th>Duration</th>
                  <th>Views</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {loading && recentSessions.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <div className="admin-analytics-empty">
                        <div className="admin-boot-spinner"></div>
                        Loading sessions...
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && recentSessions.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <div className="admin-analytics-empty">
                        No sessions found.
                      </div>
                    </td>
                  </tr>
                )}

                {recentSessions.map((session) => (
                  <tr key={session.session_id}>
                    <td>
                      <span className="admin-analytics-mono">
                        {shortSessionId(session.session_id)}
                      </span>
                    </td>

                    <td>{session.user_id ? `User #${session.user_id}` : 'Guest'}</td>

                    <td>
                      <span className="admin-analytics-device">
                        <i
                          className={`bi ${getDeviceIcon(session.device_type)}`}
                        ></i>
                        {session.device_type || 'unknown'}
                      </span>
                    </td>

                    <td>{formatDateTime(session.started_at)}</td>

                    <td>{formatDuration(session.duration_seconds)}</td>

                    <td>{formatNumber(session.pageviews)}</td>

                    <td className="right">
                      <button
                        type="button"
                        className="admin-analytics-link-btn"
                        onClick={() => openTimeline(session.session_id)}
                      >
                        Timeline
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-analytics-panel">
          <div className="admin-analytics-panel-head">
            <div>
              <h2>Top Users</h2>
              <p>Based on watch page time.</p>
            </div>
          </div>

          <div className="admin-analytics-list">
            {loading && topUsers.length === 0 && (
              <div className="admin-analytics-empty compact">Loading...</div>
            )}

            {!loading && topUsers.length === 0 && (
              <div className="admin-analytics-empty compact">
                No user activity found.
              </div>
            )}

            {topUsers.slice(0, 8).map((user) => (
              <div className="admin-analytics-list-row" key={user.user_id}>
                <div>
                  <span>{user.user_name || `User #${user.user_id}`}</span>
                  <small>
                    {formatNumber(user.sessions)} session
                    {toNumber(user.sessions) === 1 ? '' : 's'} ·{' '}
                    {formatNumber(user.opens)} opens
                  </small>
                </div>

                <strong>{formatDuration(user.watch_page_seconds)}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-analytics-panel">
          <div className="admin-analytics-panel-head">
            <div>
              <h2>Top Content</h2>
              <p>Most watched content IDs.</p>
            </div>
          </div>

          <div className="admin-analytics-list">
            {loading && topContent.length === 0 && (
              <div className="admin-analytics-empty compact">Loading...</div>
            )}

            {!loading && topContent.length === 0 && (
              <div className="admin-analytics-empty compact">
                No content activity found.
              </div>
            )}

            {topContent.slice(0, 8).map((content) => (
              <div
                className="admin-analytics-list-row content"
                key={`${content.content_type}-${content.content_id}`}
              >
                <div>
                  <span>{content.content_type || 'content'}</span>
                  <small>{content.content_id || 'Unknown ID'}</small>
                </div>

                <strong>{formatDuration(content.approx_seconds)}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-analytics-panel">
          <div className="admin-analytics-panel-head">
            <div>
              <h2>Live Now</h2>
              <p>Sessions active in the last minute.</p>
            </div>
          </div>

          <div className="admin-analytics-list">
            {loading && liveNow.length === 0 && (
              <div className="admin-analytics-empty compact">Loading...</div>
            )}

            {!loading && liveNow.length === 0 && (
              <div className="admin-analytics-empty compact">
                No one is active right now.
              </div>
            )}

            {liveNow.map((session) => (
              <div className="admin-analytics-list-row" key={session.session_id}>
                <div>
                  <span>{getUserLabel(session)}</span>
                  <small>{cleanPath(session.last_path)}</small>
                </div>

                <button
                  type="button"
                  className="admin-analytics-link-btn"
                  onClick={() => openTimeline(session.session_id)}
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-analytics-panel large">
          <div className="admin-analytics-panel-head">
            <div>
              <h2>Live Feed</h2>
              <p>Latest tracked events across the website.</p>
            </div>
          </div>

          <div className="admin-analytics-feed">
            {loading && liveFeed.length === 0 && (
              <div className="admin-analytics-empty compact">Loading...</div>
            )}

            {!loading && liveFeed.length === 0 && (
              <div className="admin-analytics-empty compact">
                No events found.
              </div>
            )}

            {liveFeed.map((event) => (
              <button
                type="button"
                className="admin-analytics-feed-row"
                key={event.id}
                onClick={() => openTimeline(event.session_id)}
              >
                <div className="admin-analytics-feed-icon">
                  <i className="bi bi-activity"></i>
                </div>

                <div>
                  <span>{cleanEventName(event.event_name)}</span>
                  <small>{cleanPath(event.path)}</small>
                </div>

                <em>{event.username || event.email || 'Guest'}</em>
              </button>
            ))}
          </div>
        </div>
      </section>

      {timelineOpen && (
        <div
          className="admin-analytics-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeTimeline()
            }
          }}
        >
          <div className="admin-analytics-modal">
            <div className="admin-analytics-modal-head">
              <div>
                <h2>Session Timeline</h2>
                <p>{timelineSessionId}</p>
              </div>

              <button type="button" onClick={closeTimeline}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="admin-analytics-modal-body">
              {timelineLoading && (
                <div className="admin-analytics-empty">
                  <div className="admin-boot-spinner"></div>
                  Loading timeline...
                </div>
              )}

              {!timelineLoading && timeline.length === 0 && (
                <div className="admin-analytics-empty">
                  No timeline events found.
                </div>
              )}

              {!timelineLoading && timeline.length > 0 && (
                <div className="admin-analytics-timeline">
                  {timeline.map((item, index) => (
                    <div
                      className="admin-analytics-timeline-item"
                      key={`${item.ts}-${item.event_name}-${index}`}
                    >
                      <div className="admin-analytics-timeline-dot"></div>

                      <div>
                        <span>{cleanEventName(item.event_name)}</span>
                        <small>{formatDateTime(item.ts)}</small>

                        {item.path && <p>{item.path}</p>}

                        {item.referrer && (
                          <em>Referrer: {cleanPath(item.referrer)}</em>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AnalyticsTab