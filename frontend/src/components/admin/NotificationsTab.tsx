import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { adminFetch, adminMutation } from './adminApi'
import type {
  AdminNotificationItem,
  AdminNotificationsResponse,
  AdminToast,
  ConfirmDialog,
  DeleteNotificationResponse,
  SendNotificationResponse,
} from './adminTypes'

type Props = {
  onShowToast: (type: AdminToast['type'], message: string) => void
  onConfirmAction: (dialog: Omit<ConfirmDialog, 'open'>) => void
  onStatsRefresh: () => void
}

type NotificationForm = {
  recipient_type: 'all' | 'active' | 'single'
  user_id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  image_url: string
}

const emptyNotificationForm: NotificationForm = {
  recipient_type: 'all',
  user_id: '',
  title: '',
  message: '',
  type: 'info',
  image_url: '',
}

function getNotificationTypeLabel(type?: string) {
  if (type === 'success') return 'Success'
  if (type === 'warning') return 'Warning'
  if (type === 'error') return 'Error'
  return 'Info'
}

function NotificationsTab({
  onShowToast,
  onConfirmAction,
  onStatsRefresh,
}: Props) {
  const [form, setForm] = useState<NotificationForm>(emptyNotificationForm)
  const [sending, setSending] = useState(false)

  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([])
  const [search, setSearch] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const updateForm = <Key extends keyof NotificationForm>(
    key: Key,
    value: NotificationForm[Key]
  ) => {
    setForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }))
  }

  const loadNotifications = async (
    requestedPage = 1,
    append = false,
    searchOverride?: string
  ) => {
    setLoading(true)
    setError(false)

    const selectedSearch =
      typeof searchOverride === 'string' ? searchOverride : activeSearch

    const params = new URLSearchParams()
    params.set('page', String(requestedPage))
    params.set('per_page', '20')

    if (selectedSearch.trim()) {
      params.set('search', selectedSearch.trim())
    }

    try {
      const response = await adminFetch<AdminNotificationsResponse>(
        `/api/admin/notifications?${params.toString()}`
      )

      setNotifications((currentNotifications) =>
        append
          ? [...currentNotifications, ...(response.items || [])]
          : response.items || []
      )

      setPage(response.page || requestedPage)
      setHasNext(Boolean(response.has_next))
      setTotalItems(response.total_items || 0)
    } catch {
      setError(true)
      onShowToast('error', 'Could not load notifications.')
    } finally {
      setLoading(false)
    }
  }

  const applySearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const cleanSearch = search.trim()
    setActiveSearch(cleanSearch)
    loadNotifications(1, false, cleanSearch)
  }

  const clearSearch = () => {
    setSearch('')
    setActiveSearch('')
    loadNotifications(1, false, '')
  }

  const submitNotification = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!form.title.trim()) {
      onShowToast('error', 'Notification title is required.')
      return
    }

    if (!form.message.trim()) {
      onShowToast('error', 'Notification message is required.')
      return
    }

    if (form.recipient_type === 'single' && !form.user_id.trim()) {
      onShowToast('error', 'User ID is required for single-user notification.')
      return
    }

    setSending(true)

    const payload = {
      recipient_type: form.recipient_type,
      user_id: form.recipient_type === 'single' ? Number(form.user_id) : null,
      title: form.title.trim(),
      message: form.message.trim(),
      type: form.type,
      image_url: form.image_url.trim(),
    }

    try {
      const response = await adminMutation<SendNotificationResponse>(
        '/api/admin/send_notification',
        'POST',
        payload
      )

      if (response.success === false) {
        throw new Error(response.message || 'Could not send notification.')
      }

      onShowToast(
        'success',
        response.message || 'Notification sent successfully.'
      )

      setForm(emptyNotificationForm)
      loadNotifications(1, false)
      onStatsRefresh()
    } catch (error) {
      onShowToast(
        'error',
        error instanceof Error ? error.message : 'Could not send notification.'
      )
    } finally {
      setSending(false)
    }
  }

  const deleteNotification = async (notification: AdminNotificationItem) => {
    setDeletingId(notification.id)

    try {
      const response = await adminMutation<DeleteNotificationResponse>(
        `/api/admin/notifications/${notification.id}`,
        'DELETE'
      )

      if (response.success === false) {
        throw new Error(response.message || 'Could not delete notification.')
      }

      setNotifications((currentNotifications) =>
        currentNotifications.filter((item) => item.id !== notification.id)
      )

      setTotalItems((currentTotal) => Math.max(0, currentTotal - 1))

      onShowToast(
        'success',
        response.message || 'Notification deleted successfully.'
      )

      onStatsRefresh()
    } catch (error) {
      onShowToast(
        'error',
        error instanceof Error
          ? error.message
          : 'Could not delete notification.'
      )
    } finally {
      setDeletingId(null)
    }
  }

  const askDeleteNotification = (notification: AdminNotificationItem) => {
    onConfirmAction({
      title: 'Delete this notification?',
      message: `This will permanently delete "${notification.title}".`,
      confirmText: 'Delete Notification',
      danger: true,
      onConfirm: () => {
        deleteNotification(notification)
      },
    })
  }

  useEffect(() => {
    loadNotifications(1, false, '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="admin-notifications-page">
      <div className="admin-page-header">
        <div>
          <h1>Notifications</h1>
          <p>Create an announcement and review delivery history.</p>
        </div>
        <span className="admin-page-count">{totalItems} sent</span>
      </div>

      <div className="admin-notifications-layout">
        <section className="admin-notification-compose-card">
          <div className="admin-card-head">
            <div>
              <div className="admin-card-title">Send Notification</div>
              <div className="admin-card-sub">
                Send to all users, active users, or one user by DB ID.
              </div>
            </div>
          </div>

          <form
            className="admin-notification-form"
            onSubmit={submitNotification}
          >
            <div className="admin-form-field">
              <label>Recipient</label>
              <select
                value={form.recipient_type}
                onChange={(event) =>
                  updateForm(
                    'recipient_type',
                    event.target.value as NotificationForm['recipient_type']
                  )
                }
              >
                <option value="all">All Users</option>
                <option value="active">Active Users Only</option>
                <option value="single">Single User ID</option>
              </select>
            </div>

            {form.recipient_type === 'single' && (
              <div className="admin-form-field">
                <label>User ID</label>
                <input
                  type="number"
                  min="1"
                  value={form.user_id}
                  onChange={(event) => updateForm('user_id', event.target.value)}
                  placeholder="Example: 12"
                />
              </div>
            )}

            <div className="admin-form-field">
              <label>Type</label>
              <select
                value={form.type}
                onChange={(event) =>
                  updateForm(
                    'type',
                    event.target.value as NotificationForm['type']
                  )
                }
              >
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>

            <div className="admin-form-field">
              <label>Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(event) => updateForm('title', event.target.value)}
                placeholder="Notification title"
              />
            </div>

            <div className="admin-form-field">
              <label>Message</label>
              <textarea
                rows={5}
                value={form.message}
                onChange={(event) => updateForm('message', event.target.value)}
                placeholder="Write notification message..."
              ></textarea>
            </div>

            <div className="admin-form-field">
              <label>Image URL Optional</label>
              <input
                type="url"
                value={form.image_url}
                onChange={(event) => updateForm('image_url', event.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="admin-notification-preview">
              <div className={`admin-notification-preview-icon ${form.type}`}>
                <i className="bi bi-bell"></i>
              </div>

              <div>
                <strong>{form.title || 'Notification title'}</strong>
                <p>{form.message || 'Notification message preview...'}</p>
              </div>
            </div>

            <div className="admin-notification-actions">
              <button
                type="button"
                className="admin-btn admin-btn-ghost"
                disabled={sending}
                onClick={() => setForm(emptyNotificationForm)}
              >
                Reset
              </button>

              <button
                type="submit"
                className="admin-btn admin-btn-primary"
                disabled={sending}
              >
                {sending && <span className="admin-button-spinner"></span>}
                {!sending && <i className="bi bi-send"></i>}
                {sending ? 'Sending' : 'Send notification'}
              </button>
            </div>
          </form>
        </section>

        <section className="admin-notifications-list-card">
          <div className="admin-notifications-list-head">
            <div>
              <h2>Recent Notifications</h2>
              <p>
                Showing {notifications.length} of {totalItems}
              </p>
            </div>
          </div>

          <form
            className="admin-notifications-search"
            onSubmit={applySearch}
          >
            <i className="bi bi-search"></i>

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, message, type, user, email..."
            />

            {search.trim() && (
              <button type="button" onClick={clearSearch} aria-label="Clear">
                <i className="bi bi-x-lg"></i>
              </button>
            )}

            <button type="submit" className="admin-btn admin-btn-primary">
              Search
            </button>
          </form>

          {activeSearch && (
            <div className="admin-notifications-active-search">
              Search: <strong>{activeSearch}</strong>
            </div>
          )}

          {error && (
            <div className="admin-alert-error">
              Could not load notifications.
            </div>
          )}

          <div className="admin-notification-list">
            {loading && notifications.length === 0 && (
              <div className="admin-notification-empty">
                <div className="admin-boot-spinner"></div>
                <span>Loading notifications...</span>
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div className="admin-notification-empty">
                <i className="bi bi-bell"></i>
                <span>No notifications found.</span>
              </div>
            )}

            {notifications.map((notification) => (
              <article
                className="admin-notification-row"
                key={notification.id}
              >
                <div className={`admin-notification-icon ${notification.type || 'info'}`}>
                  <i className="bi bi-bell"></i>
                </div>

                <div className="admin-notification-main">
                  <div className="admin-notification-title-row">
                    <strong>{notification.title}</strong>

                    <span className={`admin-notification-type ${notification.type || 'info'}`}>
                      {getNotificationTypeLabel(notification.type)}
                    </span>
                  </div>

                  <p>{notification.message}</p>

                  <div className="admin-notification-meta">
                    <span>ID #{notification.id}</span>
                    {notification.recipient_count && notification.recipient_count > 1 ? (
                        <span>Sent to {notification.recipient_count} users</span>
                    ) : (
                        <>
                        {notification.user_id && <span>User #{notification.user_id}</span>}
                        {notification.username && <span>@{notification.username}</span>}
                        {notification.user_email && <span>{notification.user_email}</span>}
                    </>
                    )}
                    <span>{notification.time_ago || notification.created_at}</span>
                  </div>

                  {notification.image_url && (
                    <a
                      href={notification.image_url}
                      target="_blank"
                      rel="noreferrer"
                      className="admin-notification-image-link"
                    >
                      Open image
                    </a>
                  )}
                </div>

                <button
                  type="button"
                  className="admin-notification-delete"
                  disabled={deletingId === notification.id}
                  onClick={() => askDeleteNotification(notification)}
                  title="Delete notification"
                >
                  {deletingId === notification.id ? (
                    <span className="admin-button-spinner"></span>
                  ) : (
                    <i className="bi bi-trash"></i>
                  )}
                </button>
              </article>
            ))}
          </div>

          {hasNext && (
            <div className="admin-notifications-footer">
              <button
                type="button"
                className="admin-btn admin-btn-ghost"
                disabled={loading}
                onClick={() => loadNotifications(page + 1, true)}
              >
                {loading ? (
                  <span className="admin-button-spinner"></span>
                ) : (
                  <i className="bi bi-plus-circle"></i>
                )}
                {loading ? 'Loading' : 'Load more'}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default NotificationsTab