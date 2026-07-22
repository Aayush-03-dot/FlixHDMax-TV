import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { adminFetch, adminMutation } from './adminApi'
import type {
  AdminPendingUser,
  AdminPendingUserMutationResponse,
  AdminPendingUsersResponse,
  AdminToast,
  ConfirmDialog,
} from './adminTypes'

type Props = {
  onShowToast: (type: AdminToast['type'], message: string) => void
  onConfirmAction: (dialog: Omit<ConfirmDialog, 'open'>) => void
  onStatsRefresh: () => void
}

function formatDate(value?: string | null) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

function formatAge(seconds?: number) {
  if (!seconds || seconds < 0) return 'Just now'

  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`

  return 'Just now'
}

function PendingUsersTab({
  onShowToast,
  onConfirmAction,
  onStatsRefresh,
}: Props) {
  const [pendingUsers, setPendingUsers] = useState<AdminPendingUser[]>([])
  const [search, setSearch] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const [visibleOtpIds, setVisibleOtpIds] = useState<Set<number>>(
    () => new Set()
  )

  const [actioningId, setActioningId] = useState<number | null>(null)

  const loadPendingUsers = async (
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
      const response = await adminFetch<
        AdminPendingUsersResponse | AdminPendingUser[]
      >(`/api/admin/pending_users?${params.toString()}`)

      const items = Array.isArray(response)
        ? response
        : response.items || response.pending_users || []

      setPendingUsers((currentUsers) =>
        append ? [...currentUsers, ...items] : items
      )

      if (Array.isArray(response)) {
        setPage(1)
        setHasNext(false)
        setTotalItems(items.length)
      } else {
        setPage(response.page || response.current_page || requestedPage)
        setHasNext(Boolean(response.has_next))
        setTotalItems(response.total_items || response.total_pending_users || 0)
      }
    } catch {
      setError(true)
      onShowToast('error', 'Could not load pending users.')
    } finally {
      setLoading(false)
    }
  }


  const applySearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const cleanSearch = search.trim()
    setActiveSearch(cleanSearch)
    loadPendingUsers(1, false, cleanSearch)
  }

  const clearSearch = () => {
    setSearch('')
    setActiveSearch('')
    loadPendingUsers(1, false, '')
  }

  const toggleOtpVisibility = (pendingUserId: number) => {
    setVisibleOtpIds((currentIds) => {
      const nextIds = new Set(currentIds)

      if (nextIds.has(pendingUserId)) {
        nextIds.delete(pendingUserId)
      } else {
        nextIds.add(pendingUserId)
      }

      return nextIds
    })
  }

  const approvePendingUser = async (pendingUser: AdminPendingUser) => {
    setActioningId(pendingUser.id)

    try {
      const response = await adminMutation<AdminPendingUserMutationResponse>(
        `/api/admin/pending_users/approve/${pendingUser.id}`,
        'POST'
      )

      if (response.success === false) {
        throw new Error(response.message || 'Could not verify pending user.')
      }

      setPendingUsers((currentUsers) =>
        currentUsers.filter((user) => user.id !== pendingUser.id)
      )

      setTotalItems((currentTotal) => Math.max(0, currentTotal - 1))

      onShowToast(
        'success',
        response.message || 'Pending user verified successfully.'
      )

      onStatsRefresh()
    } catch (error) {
      onShowToast(
        'error',
        error instanceof Error
          ? error.message
          : 'Could not verify pending user.'
      )
    } finally {
      setActioningId(null)
    }
  }

  const deletePendingUser = async (pendingUser: AdminPendingUser) => {
    setActioningId(pendingUser.id)

    try {
      const response = await adminMutation<AdminPendingUserMutationResponse>(
        `/api/admin/pending_users/delete/${pendingUser.id}`,
        'DELETE'
      )

      if (response.success === false) {
        throw new Error(response.message || 'Could not delete pending user.')
      }

      setPendingUsers((currentUsers) =>
        currentUsers.filter((user) => user.id !== pendingUser.id)
      )

      setTotalItems((currentTotal) => Math.max(0, currentTotal - 1))

      onShowToast(
        'success',
        response.message || 'Pending user deleted successfully.'
      )

      onStatsRefresh()
    } catch (error) {
      onShowToast(
        'error',
        error instanceof Error
          ? error.message
          : 'Could not delete pending user.'
      )
    } finally {
      setActioningId(null)
    }
  }

  const askApprovePendingUser = (pendingUser: AdminPendingUser) => {
    onConfirmAction({
      title: 'Force verify this account?',
      message: `This will create a real user account for "${pendingUser.username}" without requiring OTP verification.`,
      confirmText: 'Force Verify',
      danger: false,
      onConfirm: () => {
        approvePendingUser(pendingUser)
      },
    })
  }

  const askDeletePendingUser = (pendingUser: AdminPendingUser) => {
    onConfirmAction({
      title: 'Delete this pending user?',
      message: `This will permanently remove "${pendingUser.username}" from pending verification.`,
      confirmText: 'Delete Pending User',
      danger: true,
      onConfirm: () => {
        deletePendingUser(pendingUser)
      },
    })
  }

  useEffect(() => {
    loadPendingUsers(1, false, '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="admin-pending-users-page admin-directory-page">
      <div className="admin-page-header">
        <div>
          <span className="admin-page-kicker">Accounts</span>
          <h1>Pending users</h1>
        </div>
        <span className="admin-page-count">{totalItems} waiting</span>
      </div>

      <div className="admin-directory-toolbar">
        <form className="admin-directory-search" onSubmit={applySearch}>
          <i className="bi bi-search"></i>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search pending users"
          />
          {search.trim() && (
            <button type="button" onClick={clearSearch} aria-label="Clear search">
              <i className="bi bi-x-lg"></i>
            </button>
          )}
        </form>
      </div>

      {error && (
        <div className="admin-alert-error">Pending users are temporarily unavailable.</div>
      )}

      <div className="admin-card admin-directory-card">
        <div className="admin-table-wrap">
          <table className="admin-dt admin-pending-users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Verification code</th>
                <th>Created</th>
                <th>Expiry</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && pendingUsers.length === 0 && (
                <tr><td colSpan={6} className="admin-table-empty">Loading pending users</td></tr>
              )}
              {!loading && pendingUsers.length === 0 && (
                <tr><td colSpan={6} className="admin-table-empty">No pending users</td></tr>
              )}

              {pendingUsers.map((pendingUser) => {
                const otpVisible = visibleOtpIds.has(pendingUser.id)
                const isActioning = actioningId === pendingUser.id

                return (
                  <tr key={pendingUser.id}>
                    <td>
                      <div className="admin-pending-users-person">
                        <div className="admin-pending-users-avatar">
                          {pendingUser.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="admin-pending-users-name">{pendingUser.username}</span>
                          <small>#{pendingUser.id} · {pendingUser.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="admin-pending-users-otp">
                        <code>{otpVisible ? pendingUser.otp : '••••••'}</code>
                        <button type="button" onClick={() => toggleOtpVisibility(pendingUser.id)}>
                          {otpVisible ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </td>
                    <td>
                      <div className="admin-pending-users-date">
                        <span>{formatDate(pendingUser.created_at)}</span>
                        <small>{formatAge(pendingUser.age_seconds)}</small>
                      </div>
                    </td>
                    <td>{pendingUser.expires_at ? formatDate(pendingUser.expires_at) : '—'}</td>
                    <td>
                      <span className={`admin-badge ${
                        pendingUser.is_expired ? 'admin-badge-red' : 'admin-badge-green'
                      }`}>
                        {pendingUser.is_expired ? 'Expired' : 'Active'}
                      </span>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          type="button"
                          className="admin-row-text-btn"
                          disabled={isActioning}
                          onClick={() => askApprovePendingUser(pendingUser)}
                        >
                          {isActioning ? 'Working' : 'Verify'}
                        </button>
                        <button
                          type="button"
                          className="admin-row-text-btn danger"
                          disabled={isActioning}
                          onClick={() => askDeletePendingUser(pendingUser)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="admin-directory-footer">
          <span>Showing {pendingUsers.length} of {totalItems}</span>
          {hasNext && (
            <button
              type="button"
              className="admin-btn admin-btn-ghost"
              disabled={loading}
              onClick={() => loadPendingUsers(page + 1, true)}
            >
              {loading ? 'Loading' : 'Load more'}
            </button>
          )}
        </div>
      </div>
    </div>
  )

}

export default PendingUsersTab