import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { adminFetch, adminMutation } from './adminApi'
import type {
  AdminManagedUser,
  AdminToast,
  AdminUserDetail,
  AdminUserDetailResponse,
  AdminUserMutationResponse,
  AdminUsersResponse,
  ConfirmDialog,
} from './adminTypes'

type Props = {
  currentAdminId?: number | null
  onShowToast: (type: AdminToast['type'], message: string) => void
  onConfirmAction: (dialog: Omit<ConfirmDialog, 'open'>) => void
  onStatsRefresh: () => void
}

type UserEditForm = {
  username: string
  email: string
  role: 'user' | 'admin'
  is_active: boolean
  password: string
}

function formatDate(value?: string | null) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

function getUserDisplayName(user: AdminManagedUser) {
  return user.display_name || user.username || `User #${user.id}`
}

function getInitial(user: AdminManagedUser) {
  return getUserDisplayName(user).charAt(0).toUpperCase()
}

function UsersTab({
  currentAdminId,
  onShowToast,
  onConfirmAction,
  onStatsRefresh,
}: Props) {
  const [users, setUsers] = useState<AdminManagedUser[]>([])
  const [search, setSearch] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [totalUsers, setTotalUsers] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const [actionKey, setActionKey] = useState<string | null>(null)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailUser, setDetailUser] = useState<AdminUserDetail | null>(null)
  const [editForm, setEditForm] = useState<UserEditForm | null>(null)
  const [savingDetail, setSavingDetail] = useState(false)

  const loadUsers = async (
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
      const response = await adminFetch<AdminUsersResponse>(
        `/api/admin/users?${params.toString()}`
      )

      const nextUsers = response.items || response.users || []

      setUsers((currentUsers) =>
        append ? [...currentUsers, ...nextUsers] : nextUsers
      )

      setPage(response.page || response.current_page || requestedPage)
      setHasNext(Boolean(response.has_next))
      setTotalUsers(response.total_items || response.total_users || 0)
    } catch {
      setError(true)
      onShowToast('error', 'Could not load users.')
    } finally {
      setLoading(false)
    }
  }

  const refreshUsers = () => {
    loadUsers(1, false)
  }

  const applySearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const cleanSearch = search.trim()
    setActiveSearch(cleanSearch)
    loadUsers(1, false, cleanSearch)
  }

  const quickSearch = (value: string) => {
    setSearch(value)
    setActiveSearch(value)
    loadUsers(1, false, value)
  }

  const clearSearch = () => {
    setSearch('')
    setActiveSearch('')
    loadUsers(1, false, '')
  }

  const mergeUserIntoList = (updatedUser: AdminManagedUser) => {
    setUsers((currentUsers) =>
      currentUsers.map((user) =>
        user.id === updatedUser.id
          ? {
              ...user,
              ...updatedUser,
              movie_requests_count:
                updatedUser.movie_requests_count ?? user.movie_requests_count,
              notifications_count:
                updatedUser.notifications_count ?? user.notifications_count,
              my_list_count: updatedUser.my_list_count ?? user.my_list_count,
              last_seen_at: updatedUser.last_seen_at ?? user.last_seen_at,
            }
          : user
      )
    )

    setDetailUser((currentUser) =>
      currentUser && currentUser.id === updatedUser.id
        ? {
            ...currentUser,
            ...updatedUser,
          }
        : currentUser
    )
  }

  const openUserDetail = async (userId: number) => {
    setDetailOpen(true)
    setDetailLoading(true)
    setDetailUser(null)
    setEditForm(null)

    try {
      const response = await adminFetch<AdminUserDetailResponse>(
        `/api/admin/users/${userId}`
      )

      const user = response.item || response.user

      if (!user) {
        throw new Error('Could not load user details.')
      }

      setDetailUser(user)
      setEditForm({
        username: user.username || '',
        email: user.email || '',
        role: user.role === 'admin' ? 'admin' : 'user',
        is_active: Boolean(user.is_active),
        password: '',
      })
    } catch (error) {
      onShowToast(
        'error',
        error instanceof Error ? error.message : 'Could not load user details.'
      )
      setDetailOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

  const closeUserDetail = () => {
    if (savingDetail) return

    setDetailOpen(false)
    setDetailLoading(false)
    setDetailUser(null)
    setEditForm(null)
  }

  const updateUser = async (
    userId: number,
    payload: Partial<UserEditForm>,
    successMessage = 'User updated successfully.'
  ) => {
    const key = `update-${userId}`
    setActionKey(key)

    try {
      const response = await adminMutation<AdminUserMutationResponse>(
        `/api/admin/users/${userId}`,
        'PUT',
        payload
      )

      if (response.success === false) {
        throw new Error(response.message || 'Could not update user.')
      }

      const updatedUser = response.item || response.user

      if (updatedUser) {
        mergeUserIntoList(updatedUser)
      } else {
        refreshUsers()
      }

      onShowToast('success', response.message || successMessage)
      onStatsRefresh()
    } catch (error) {
      onShowToast(
        'error',
        error instanceof Error ? error.message : 'Could not update user.'
      )
    } finally {
      setActionKey(null)
    }
  }

  const saveUserDetail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!detailUser || !editForm) return

    if (!editForm.username.trim()) {
      onShowToast('error', 'Username cannot be empty.')
      return
    }

    if (!editForm.email.trim()) {
      onShowToast('error', 'Email cannot be empty.')
      return
    }

    setSavingDetail(true)

    const payload: Partial<UserEditForm> = {
      username: editForm.username.trim(),
      email: editForm.email.trim().toLowerCase(),
      role: editForm.role,
      is_active: editForm.is_active,
    }

    if (editForm.password.trim()) {
      payload.password = editForm.password.trim()
    }

    try {
      const response = await adminMutation<AdminUserMutationResponse>(
        `/api/admin/users/${detailUser.id}`,
        'PUT',
        payload
      )

      if (response.success === false) {
        throw new Error(response.message || 'Could not save user.')
      }

      const updatedUser = response.item || response.user

      if (updatedUser) {
        mergeUserIntoList(updatedUser)
      }

      setEditForm((currentForm) =>
        currentForm
          ? {
              ...currentForm,
              password: '',
            }
          : currentForm
      )

      onShowToast('success', response.message || 'User saved successfully.')
      onStatsRefresh()
    } catch (error) {
      onShowToast(
        'error',
        error instanceof Error ? error.message : 'Could not save user.'
      )
    } finally {
      setSavingDetail(false)
    }
  }

  const requestRoleChange = (user: AdminManagedUser, newRole: 'user' | 'admin') => {
    if (user.role === newRole) return

    const isSelf = currentAdminId === user.id

    if (isSelf) {
      onShowToast('error', 'You cannot change your own role here.')
      return
    }

    onConfirmAction({
      title: 'Change user role?',
      message: `Change ${getUserDisplayName(user)} from "${user.role}" to "${newRole}"?`,
      confirmText: 'Change Role',
      danger: newRole === 'admin',
      onConfirm: () => {
        updateUser(user.id, { role: newRole }, 'User role updated.')
      },
    })
  }

  const requestToggleActive = (user: AdminManagedUser) => {
    const isSelf = currentAdminId === user.id

    if (isSelf) {
      onShowToast('error', 'You cannot suspend your own admin account.')
      return
    }

    const nextActive = !user.is_active

    onConfirmAction({
      title: nextActive ? 'Activate this user?' : 'Suspend this user?',
      message: nextActive
        ? `This will allow ${getUserDisplayName(user)} to log in again.`
        : `This will block ${getUserDisplayName(user)} from logging in.`,
      confirmText: nextActive ? 'Activate User' : 'Suspend User',
      danger: !nextActive,
      onConfirm: () => {
        updateUser(
          user.id,
          { is_active: nextActive },
          nextActive ? 'User activated.' : 'User suspended.'
        )
      },
    })
  }

  const deleteUser = async (user: AdminManagedUser) => {
    const key = `delete-${user.id}`
    setActionKey(key)

    try {
      const response = await adminMutation<AdminUserMutationResponse>(
        `/api/admin/users/${user.id}`,
        'DELETE'
      )

      if (response.success === false) {
        throw new Error(response.message || 'Could not delete user.')
      }

      setUsers((currentUsers) =>
        currentUsers.filter((currentUser) => currentUser.id !== user.id)
      )

      setTotalUsers((currentTotal) => Math.max(0, currentTotal - 1))

      if (detailUser?.id === user.id) {
        closeUserDetail()
      }

      onShowToast('success', response.message || 'User deleted successfully.')
      onStatsRefresh()
    } catch (error) {
      onShowToast(
        'error',
        error instanceof Error ? error.message : 'Could not delete user.'
      )
    } finally {
      setActionKey(null)
    }
  }

  const requestDeleteUser = (user: AdminManagedUser) => {
    const isSelf = currentAdminId === user.id

    if (isSelf) {
      onShowToast('error', 'You cannot delete your own account.')
      return
    }

    onConfirmAction({
      title: 'Delete this user permanently?',
      message: `This will delete ${getUserDisplayName(user)} and remove their notifications and My List rows. Movie requests will be kept but detached from the account.`,
      confirmText: 'Delete User',
      danger: true,
      onConfirm: () => {
        deleteUser(user)
      },
    })
  }

  useEffect(() => {
    loadUsers(1, false, '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="admin-users-simple-page admin-directory-page">
      <div className="admin-page-header">
        <div>
          <span className="admin-page-kicker">Accounts</span>
          <h1>Users</h1>
        </div>
        <span className="admin-page-count">{totalUsers} accounts</span>
      </div>

      <div className="admin-directory-toolbar">
        <form className="admin-directory-search" onSubmit={applySearch}>
          <i className="bi bi-search"></i>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search users"
          />
          {search.trim() && (
            <button type="button" onClick={clearSearch} aria-label="Clear search">
              <i className="bi bi-x-lg"></i>
            </button>
          )}
        </form>

        <div className="admin-filter-pills">
          {[
            ['All', ''],
            ['Active', 'active'],
            ['Suspended', 'suspended'],
            ['Admins', 'admin'],
            ['Members', 'user'],
          ].map(([label, value]) => (
            <button
              key={label}
              type="button"
              className={activeSearch === value ? 'active' : ''}
              onClick={() => quickSearch(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="admin-alert-error">Users are temporarily unavailable.</div>}

      <div className="admin-card admin-directory-card">
        <div className="admin-table-wrap">
          <table className="admin-dt admin-users-simple-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Provider</th>
                <th>Last active</th>
                <th>Activity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && users.length === 0 && (
                <tr><td colSpan={8} className="admin-table-empty">Loading users</td></tr>
              )}
              {!loading && users.length === 0 && (
                <tr><td colSpan={8} className="admin-table-empty">No users found</td></tr>
              )}

              {users.map((user) => {
                const isSelf = currentAdminId === user.id
                const rowActioning = actionKey?.endsWith(`-${user.id}`)

                return (
                  <tr key={user.id}>
                    <td>
                      <div className="admin-users-simple-user">
                        <div className="admin-users-simple-avatar">{getInitial(user)}</div>
                        <div>
                          <div className="admin-users-simple-name">
                            {getUserDisplayName(user)}
                            {isSelf && <span>You</span>}
                          </div>
                          <small>#{user.id} · @{user.username}</small>
                        </div>
                      </div>
                    </td>
                    <td className="admin-users-simple-email">{user.email}</td>
                    <td>
                      <select
                        className="admin-users-simple-select"
                        value={user.role === 'admin' ? 'admin' : 'user'}
                        disabled={isSelf || rowActioning}
                        onChange={(event) =>
                          requestRoleChange(
                            user,
                            event.target.value === 'admin' ? 'admin' : 'user'
                          )
                        }
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td>
                      <span className={`admin-badge ${
                        user.is_active ? 'admin-badge-green' : 'admin-badge-red'
                      }`}>
                        {user.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td><span className="admin-users-simple-provider">{user.auth_provider || 'local'}</span></td>
                    <td>{formatDate(user.last_seen_at || user.last_login_at)}</td>
                    <td>
                      <div className="admin-users-simple-counts">
                        <span>{user.my_list_count ?? 0} saved</span>
                        <span>{user.movie_requests_count ?? 0} requests</span>
                      </div>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button type="button" className="admin-row-text-btn" onClick={() => openUserDetail(user.id)}>
                          View
                        </button>
                        <button
                          type="button"
                          className="admin-row-text-btn"
                          disabled={isSelf || rowActioning}
                          onClick={() => requestToggleActive(user)}
                        >
                          {rowActioning ? 'Working' : user.is_active ? 'Suspend' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          className="admin-row-text-btn danger"
                          disabled={isSelf || rowActioning}
                          onClick={() => requestDeleteUser(user)}
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
          <span>Showing {users.length} of {totalUsers}</span>
          {hasNext && (
            <button
              type="button"
              className="admin-btn admin-btn-ghost"
              disabled={loading}
              onClick={() => loadUsers(page + 1, true)}
            >
              {loading ? 'Loading' : 'Load more'}
            </button>
          )}
        </div>
      </div>

      {detailOpen && (
        <div className="admin-modal-backdrop admin-users-simple-backdrop">
          <div className="admin-users-simple-modal">
            <div className="admin-users-simple-modal-head">
              <div>
                <h2>User Details</h2>
                <p>View and update account information.</p>
              </div>

              <button
                type="button"
                className="admin-edit-close"
                onClick={closeUserDetail}
                disabled={savingDetail}
                aria-label="Close user details"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            {detailLoading || !detailUser || !editForm ? (
              <div className="admin-edit-loading">
                <div className="admin-boot-spinner"></div>
                <span>Loading user details...</span>
              </div>
            ) : (
              <form className="admin-users-simple-modal-body" onSubmit={saveUserDetail}>
                <div className="admin-users-simple-profile">
                  <div className="admin-users-simple-profile-avatar">
                    {getInitial(detailUser)}
                  </div>

                  <div>
                    <h3>{getUserDisplayName(detailUser)}</h3>
                    <p>{detailUser.email}</p>

                    <div className="admin-users-simple-profile-tags">
                      <span>ID #{detailUser.id}</span>
                      <span>{detailUser.role}</span>
                      <span>{detailUser.auth_provider || 'local'}</span>
                      <span>{detailUser.is_active ? 'Active' : 'Suspended'}</span>
                    </div>
                  </div>
                </div>

                <div className="admin-users-simple-metrics">
                  <div>
                    <span>Login Count</span>
                    <strong>{detailUser.login_count ?? 0}</strong>
                  </div>

                  <div>
                    <span>My List</span>
                    <strong>{detailUser.my_list_count ?? 0}</strong>
                  </div>

                  <div>
                    <span>Requests</span>
                    <strong>{detailUser.movie_requests_count ?? 0}</strong>
                  </div>

                  <div>
                    <span>Notifications</span>
                    <strong>{detailUser.notifications_count ?? 0}</strong>
                  </div>
                </div>

                <div className="admin-users-simple-section">
                  <h4>Account</h4>

                  <div className="admin-two-col">
                    <div className="admin-form-field">
                      <label>Username</label>
                      <input
                        type="text"
                        value={editForm.username}
                        onChange={(event) =>
                          setEditForm((currentForm) =>
                            currentForm
                              ? {
                                  ...currentForm,
                                  username: event.target.value,
                                }
                              : currentForm
                          )
                        }
                        required
                      />
                    </div>

                    <div className="admin-form-field">
                      <label>Email</label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(event) =>
                          setEditForm((currentForm) =>
                            currentForm
                              ? {
                                  ...currentForm,
                                  email: event.target.value,
                                }
                              : currentForm
                          )
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="admin-two-col">
                    <div className="admin-form-field">
                      <label>Role</label>
                      <select
                        value={editForm.role}
                        disabled={currentAdminId === detailUser.id}
                        onChange={(event) =>
                          setEditForm((currentForm) =>
                            currentForm
                              ? {
                                  ...currentForm,
                                  role:
                                    event.target.value === 'admin'
                                      ? 'admin'
                                      : 'user',
                                }
                              : currentForm
                          )
                        }
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div className="admin-form-field">
                      <label>Status</label>
                      <select
                        value={editForm.is_active ? 'active' : 'suspended'}
                        disabled={currentAdminId === detailUser.id}
                        onChange={(event) =>
                          setEditForm((currentForm) =>
                            currentForm
                              ? {
                                  ...currentForm,
                                  is_active: event.target.value === 'active',
                                }
                              : currentForm
                          )
                        }
                      >
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </div>
                  </div>

                  <div className="admin-form-field">
                    <label>Set New Password</label>
                    <input
                      type="password"
                      value={editForm.password}
                      onChange={(event) =>
                        setEditForm((currentForm) =>
                          currentForm
                            ? {
                                ...currentForm,
                                password: event.target.value,
                              }
                            : currentForm
                        )
                      }
                      placeholder="Leave blank to keep current password"
                    />

                    <p className="admin-field-help">
                      Only enter a password if you want to reset this user’s password.
                    </p>
                  </div>
                </div>

                <div className="admin-users-simple-section">
                  <h4>Activity</h4>

                  <div className="admin-users-simple-activity">
                    <div>
                      <span>Last Login</span>
                      <strong>{formatDate(detailUser.last_login_at)}</strong>
                    </div>

                    <div>
                      <span>Last Seen</span>
                      <strong>{formatDate(detailUser.last_seen_at)}</strong>
                    </div>
                  </div>
                </div>

                <div className="admin-users-simple-recent">
                  <div className="admin-users-simple-section">
                    <h4>Recent Requests</h4>

                    {detailUser.recent_requests &&
                    detailUser.recent_requests.length > 0 ? (
                      detailUser.recent_requests.map((requestItem) => (
                        <div
                          className="admin-users-simple-recent-row"
                          key={requestItem.id}
                        >
                          <span>{requestItem.title}</span>
                          <strong>{requestItem.status}</strong>
                        </div>
                      ))
                    ) : (
                      <p className="admin-users-simple-empty-text">
                        No recent requests.
                      </p>
                    )}
                  </div>

                  <div className="admin-users-simple-section">
                    <h4>Recent Notifications</h4>

                    {detailUser.recent_notifications &&
                    detailUser.recent_notifications.length > 0 ? (
                      detailUser.recent_notifications.map((notification) => (
                        <div
                          className="admin-users-simple-recent-row"
                          key={notification.id}
                        >
                          <span>{notification.title}</span>
                          <strong>
                            {notification.time_ago || notification.created_at}
                          </strong>
                        </div>
                      ))
                    ) : (
                      <p className="admin-users-simple-empty-text">
                        No recent notifications.
                      </p>
                    )}
                  </div>
                </div>

                <div className="admin-users-simple-modal-actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn-ghost"
                    onClick={closeUserDetail}
                    disabled={savingDetail}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="admin-btn admin-btn-danger"
                    disabled={
                      savingDetail ||
                      actionKey === `delete-${detailUser.id}` ||
                      currentAdminId === detailUser.id
                    }
                    onClick={() => requestDeleteUser(detailUser)}
                  >
                    {actionKey === `delete-${detailUser.id}` ? (
                      <span className="admin-button-spinner"></span>
                    ) : (
                      <i className="bi bi-trash"></i>
                    )}
                    Delete user
                  </button>

                  <button
                    type="submit"
                    className="admin-btn admin-btn-primary"
                    disabled={savingDetail}
                  >
                    {savingDetail ? (
                      <span className="admin-button-spinner"></span>
                    ) : (
                      <i className="bi bi-save"></i>
                    )}
                    {savingDetail ? 'Saving' : 'Save changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default UsersTab