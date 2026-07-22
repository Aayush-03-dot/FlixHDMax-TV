import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './NotificationBell.css'

type NotificationType = 'info' | 'success' | 'warning' | 'alert'

type RawNotification = {
  id?: number | string
  title?: string | null
  message?: string | null
  body?: string | null
  description?: string | null
  type?: string | null
  notification_type?: string | null
  image_url?: string | null
  image?: string | null
  poster_url?: string | null
  thumbnail?: string | null
  is_read?: boolean | number | null
  read?: boolean | number | null
  created_at?: string | null
  date?: string | null
  time_ago?: string | null
  link?: string | null
  url?: string | null
  action_url?: string | null
  target_url?: string | null
}

type NotificationItem = {
  id: number
  title: string
  message: string
  type: NotificationType
  image_url?: string | null
  is_read: boolean
  created_at?: string | null
  time_ago?: string | null
  link_url?: string | null
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

function normalizeType(type?: string | null): NotificationType {
  if (type === 'success') return 'success'
  if (type === 'warning') return 'warning'
  if (type === 'alert') return 'alert'
  return 'info'
}

function normalizeIsRead(value?: boolean | number | null) {
  return value === true || value === 1
}

function normalizeNotification(raw: RawNotification): NotificationItem | null {
  const idNumber = Number(raw.id)

  if (!Number.isFinite(idNumber)) return null

  return {
    id: idNumber,
    title: raw.title || 'Notification',
    message: raw.message || raw.body || raw.description || '',
    type: normalizeType(raw.type || raw.notification_type),
    image_url: raw.image_url || raw.image || raw.poster_url || raw.thumbnail || null,
    is_read: normalizeIsRead(raw.is_read ?? raw.read),
    created_at: raw.created_at || raw.date || null,
    time_ago: raw.time_ago || raw.date || null,
    link_url: raw.link || raw.url || raw.action_url || raw.target_url || null,
  }
}

function extractNotifications(data: unknown): NotificationItem[] {
  let rawList: RawNotification[] = []

  if (Array.isArray(data)) {
    rawList = data as RawNotification[]
  } else if (data && typeof data === 'object') {
    const obj = data as {
      notifications?: RawNotification[]
      items?: RawNotification[]
      data?: RawNotification[]
      results?: RawNotification[]
    }

    if (Array.isArray(obj.notifications)) rawList = obj.notifications
    else if (Array.isArray(obj.items)) rawList = obj.items
    else if (Array.isArray(obj.data)) rawList = obj.data
    else if (Array.isArray(obj.results)) rawList = obj.results
  }

  return rawList
    .map((notification) => normalizeNotification(notification))
    .filter((notification): notification is NotificationItem => Boolean(notification))
}

function resolveMediaUrl(url?: string | null) {
  if (!url) return ''

  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url
  }

  if (url.startsWith('/')) {
    return `${API_BASE_URL}${url}`
  }

  return url
}

function getNotificationIcon(type: NotificationType) {
  if (type === 'success') return 'bi-check-circle'
  if (type === 'warning') return 'bi-exclamation-triangle'
  if (type === 'alert') return 'bi-exclamation-octagon'
  return 'bi-info-circle'
}

function NotificationArtwork({
  imageUrl,
  type,
  large = false,
}: {
  imageUrl: string
  type: NotificationType
  large?: boolean
}) {
  return (
    <div
      className={`${large ? 'notification-view-media' : 'notification-thumb'} type-${type}`}
      aria-hidden="true"
    >
      <div className="notification-media-fallback">
        <i className={`bi ${getNotificationIcon(type)}`}></i>
      </div>

      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          onError={(event) => {
            event.currentTarget.remove()
          }}
        />
      )}
    </div>
  )
}

function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [selectedNotification, setSelectedNotification] =
    useState<NotificationItem | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [available, setAvailable] = useState(true)

  const dropdownRef = useRef<HTMLDivElement | null>(null)

  const unreadCount = useMemo(() => {
    return notifications.filter((notification) => !notification.is_read).length
  }, [notifications])

  const fetchNotifications = async () => {
    setLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      })

      if (
        response.status === 401 ||
        response.status === 403 ||
        response.status === 404
      ) {
        setAvailable(false)
        setNotifications([])
        return
      }

      const contentType = response.headers.get('content-type') || ''

      if (!contentType.includes('application/json')) {
        setAvailable(false)
        setNotifications([])
        return
      }

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        setNotifications([])
        return
      }

      setAvailable(true)
      setNotifications(extractNotifications(data))
    } catch {
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  const markAllRead = async () => {
    const previousNotifications = notifications

    setNotifications((currentNotifications) =>
      currentNotifications.map((notification) => ({
        ...notification,
        is_read: true,
      }))
    )

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/notifications/mark-all-read`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
          },
        }
      )

      if (!response.ok) {
        setNotifications(previousNotifications)
      }
    } catch {
      setNotifications(previousNotifications)
    }
  }

  const markOneRead = async (notificationId: number) => {
    const selected = notifications.find(
      (notification) => notification.id === notificationId
    )

    if (!selected || selected.is_read) return

    const previousNotifications = notifications

    setNotifications((currentNotifications) =>
      currentNotifications.map((notification) =>
        notification.id === notificationId
          ? {
              ...notification,
              is_read: true,
            }
          : notification
      )
    )

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/notifications/${notificationId}/mark-read`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
          },
        }
      )

      if (!response.ok) {
        setNotifications(previousNotifications)
      }
    } catch {
      setNotifications(previousNotifications)
    }
  }

  const handleNotificationClick = (notification: NotificationItem) => {
    setSelectedNotification({
      ...notification,
      is_read: true,
    })

    setOpen(false)
    markOneRead(notification.id)
  }

  const closeNotificationView = () => {
    setSelectedNotification(null)
  }

  useEffect(() => {
    fetchNotifications()

    const interval = window.setInterval(() => {
      fetchNotifications()
    }, 30000)

    return () => {
      window.clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return

      setSelectedNotification(null)
      setOpen(false)
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    if (!selectedNotification) return

    const originalOverflow = document.body.style.overflow
    const originalPaddingRight = document.body.style.paddingRight
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth

    document.body.style.overflow = 'hidden'

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.paddingRight = originalPaddingRight
    }
  }, [selectedNotification])

  if (!available) return null

  const selectedImageUrl = resolveMediaUrl(selectedNotification?.image_url)

  return (
    <>
      <div className="notification-bell-wrap" ref={dropdownRef}>
        <button
          type="button"
          className={`notification-bell-btn ${open ? 'active' : ''}`}
          onClick={() => {
            const nextOpen = !open
            setOpen(nextOpen)

            if (nextOpen) {
              fetchNotifications()
            }
          }}
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : 'Notifications'
          }
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls="notification-dropdown"
        >
          <i className={`bi ${open ? 'bi-bell-fill' : 'bi-bell'}`}></i>

          {unreadCount > 0 && (
            <span className="notification-badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {open && (
          <div
            className="notification-dropdown"
            id="notification-dropdown"
            role="dialog"
            aria-label="Notifications"
          >
            <span className="notification-caret" aria-hidden="true"></span>

            <div className="notification-dropdown-header">
              <div className="notification-heading">
                <span className="notification-heading-title">Notifications</span>

                {unreadCount > 0 && (
                  <span className="notification-heading-count">
                    {unreadCount > 99 ? '99+' : unreadCount} new
                  </span>
                )}
              </div>

              <button
                type="button"
                className="notification-mark-read"
                onClick={markAllRead}
                disabled={unreadCount === 0}
              >
                <i className="bi bi-check2-all" aria-hidden="true"></i>
                Mark read
              </button>
            </div>

            <div className="notification-list">
              {loading && notifications.length === 0 && (
                <div className="notification-empty" role="status">
                  <i className="bi bi-arrow-repeat notification-spin"></i>
                  <span>Loading notifications</span>
                </div>
              )}

              {!loading && notifications.length === 0 && (
                <div className="notification-empty">
                  <i className="bi bi-bell-slash"></i>
                  <span>No new notifications</span>
                  
                </div>
              )}

              {notifications.map((notification) => {
                const imageUrl = resolveMediaUrl(notification.image_url)

                return (
                  <button
                    type="button"
                    key={notification.id}
                    className={`notification-item ${
                      notification.is_read ? 'read' : 'unread'
                    } type-${notification.type}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <NotificationArtwork
                      imageUrl={imageUrl}
                      type={notification.type}
                    />

                    <div className="notification-body">
                      <div className="notification-title-row">
                        <span className="notification-item-title">
                          {notification.title}
                        </span>

                        {!notification.is_read && (
                          <span
                            className="notification-unread-dot"
                            aria-label="Unread"
                          ></span>
                        )}
                      </div>

                      <p>{notification.message}</p>

                      <span className="notification-time">
                        {notification.time_ago || 'Recently'}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {selectedNotification &&
        createPortal(
          <div
            className="notification-view-overlay"
            onClick={closeNotificationView}
            role="presentation"
          >
            <section
              className="notification-view-card"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="notification-view-title"
            >
              <button
                type="button"
                className="notification-view-close"
                onClick={closeNotificationView}
                aria-label="Close notification"
              >
                <i className="bi bi-x-lg"></i>
              </button>

              <NotificationArtwork
                imageUrl={selectedImageUrl}
                type={selectedNotification.type}
                large
              />

              <div className="notification-view-body">
                <span className="notification-view-time">
                  {selectedNotification.time_ago || 'Recently'}
                </span>

                <h2 id="notification-view-title">
                  {selectedNotification.title}
                </h2>

                <p>{selectedNotification.message}</p>

                {selectedNotification.link_url && (
                  <a
                    href={selectedNotification.link_url}
                    className="notification-view-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open
                    <i className="bi bi-arrow-up-right"></i>
                  </a>
                )}
              </div>
            </section>
          </div>,
          document.body
        )}
    </>
  )
}

export default NotificationBell