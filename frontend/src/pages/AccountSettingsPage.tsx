import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiGet } from '../services/api'
import { useAuth } from '../context/AuthContext'
import './AccountSettingsPage.css'

type SettingsTab =
  | 'profile'
  | 'avatar'
  | 'password'
  | 'notifications'
  | 'danger'

type AccountUser = {
  id: string | number
  username: string
  display_name?: string | null
  email: string
  role: string
  profile_image?: string | null
  created_at?: string | null
  login_count?: number | null
}

type NotificationPreferences = {
  new_content_alerts: boolean
  request_updates: boolean
  account_alerts: boolean
  announcements: boolean
  promotional_messages: boolean
}

type AccountSettingsResponse = {
  success: boolean
  user: AccountUser
  profile_img?: string | null
  notification_preferences?: NotificationPreferences
}

type ToastState = {
  type: 'success' | 'error' | 'info'
  title: string
  message: string
}

type ToggleRowProps = {
  label: string
  hint: string
  checked: boolean
  onChange: (checked: boolean) => void
}

const API_BASE_URL = ''

const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  new_content_alerts: true,
  request_updates: true,
  account_alerts: true,
  announcements: true,
  promotional_messages: false,
}

const SETTINGS_TABS: Array<{
  id: SettingsTab
  label: string
  shortLabel: string
  icon: string
}> = [
  {
    id: 'profile',
    label: 'Profile information',
    shortLabel: 'Profile',
    icon: 'bi-person',
  },
  {
    id: 'avatar',
    label: 'Profile picture',
    shortLabel: 'Picture',
    icon: 'bi-image',
  },
  {
    id: 'password',
    label: 'Password',
    shortLabel: 'Password',
    icon: 'bi-shield-lock',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    shortLabel: 'Notifications',
    icon: 'bi-bell',
  },
  {
    id: 'danger',
    label: 'Delete account',
    shortLabel: 'Delete',
    icon: 'bi-trash3',
  },
]

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

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await response.json().catch(() => null)

  if (!response.ok || data?.success === false) {
    throw new Error(data?.message || 'Request failed.')
  }

  return data as T
}

function getPasswordStrength(password: string) {
  let score = 0

  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1

  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) {
    score += 1
  }

  if (/\d/.test(password) && /[^a-zA-Z0-9]/.test(password)) {
    score += 1
  }

  return score
}

function AccountTopBar() {
  return (
    <header className="account-top-bar">
      <Link to="/" className="account-logo" aria-label="FlixHDMax home">
        <span>FLIXHD</span>
        <span>MAX</span>
      </Link>

      <Link to="/profile" className="account-back-link">
        <i className="bi bi-arrow-left" aria-hidden="true"></i>
        <span>Back to profile</span>
      </Link>
    </header>
  )
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: ToggleRowProps) {
  return (
    <div className="account-toggle-row">
      <div className="account-toggle-copy">
        <span>{label}</span>
        <small>{hint}</small>
      </div>

      <label className="account-switch">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-label={label}
        />

        <span aria-hidden="true"></span>
      </label>
    </div>
  )
}

function AccountSettingsPage() {
  const navigate = useNavigate()
  const { refreshAuth } = useAuth()

  const [activeTab, setActiveTab] =
    useState<SettingsTab>('profile')

  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const [user, setUser] = useState<AccountUser | null>(null)
  const [profileImg, setProfileImg] = useState<string | null>(null)
  const [avatarFailed, setAvatarFailed] = useState(false)

  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')

  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [prefs, setPrefs] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFS
  )

  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deletePassword, setDeletePassword] = useState('')

  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)

  const [toast, setToast] = useState<ToastState | null>(null)

  useEffect(() => {
    const syncTabFromHash = () => {
      const hash = window.location.hash.replace(
        '#',
        ''
      ) as SettingsTab

      const isValidTab = SETTINGS_TABS.some(
        (tab) => tab.id === hash
      )

      if (isValidTab) {
        setActiveTab(hash)
      }
    }

    syncTabFromHash()

    window.addEventListener('hashchange', syncTabFromHash)

    return () => {
      window.removeEventListener('hashchange', syncTabFromHash)
    }
  }, [])

  useEffect(() => {
    if (!toast) return

    const timer = window.setTimeout(() => {
      setToast(null)
    }, 4200)

    return () => {
      window.clearTimeout(timer)
    }
  }, [toast])

  useEffect(() => {
    let active = true

    setLoading(true)
    setFailed(false)

    apiGet<AccountSettingsResponse>('/api/account/settings')
      .then((response) => {
        if (!active) return

        setUser(response.user)
        setProfileImg(response.profile_img || null)
        setUsername(response.user.username || '')
        setDisplayName(response.user.display_name || '')
        setEmail(response.user.email || '')
        setPrefs(
          response.notification_preferences ||
            DEFAULT_NOTIFICATION_PREFS
        )
      })
      .catch((error) => {
        if (!active) return

        console.error('ACCOUNT SETTINGS API ERROR:', error)
        setFailed(true)

        const message =
          error instanceof Error
            ? error.message.toLowerCase()
            : ''

        if (
          message.includes('unauthorized') ||
          message.includes('login') ||
          message.includes('401')
        ) {
          navigate('/login', {
            replace: true,
          })
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [navigate])

  const displayTitle =
    user?.display_name?.trim() || user?.username || 'User'

  const avatarInitial = useMemo(() => {
    return displayTitle.charAt(0).toUpperCase() || 'U'
  }, [displayTitle])

  const avatarUrl = useMemo(() => {
    return avatarPreview || resolveMediaUrl(profileImg)
  }, [avatarPreview, profileImg])

  useEffect(() => {
    setAvatarFailed(false)
  }, [avatarUrl])

  const passwordStrength = useMemo(() => {
    return getPasswordStrength(newPassword)
  }, [newPassword])

  const passwordStrengthLabel = useMemo(() => {
    if (!newPassword) return 'Enter a new password'
    if (passwordStrength <= 1) return 'Weak'
    if (passwordStrength === 2) return 'Fair'
    if (passwordStrength === 3) return 'Good'
    return 'Strong'
  }, [newPassword, passwordStrength])

  const passwordStrengthClass = useMemo(() => {
    if (!newPassword) return ''
    if (passwordStrength <= 1) return 'weak'
    if (passwordStrength <= 3) return 'medium'
    return 'strong'
  }, [newPassword, passwordStrength])

  const passwordsMatch =
    confirmPassword.length > 0 &&
    newPassword === confirmPassword

  const passwordsMismatch =
    confirmPassword.length > 0 &&
    newPassword !== confirmPassword

  const setTab = (tab: SettingsTab) => {
    setActiveTab(tab)
    window.history.replaceState(null, '', `#${tab}`)
  }

  const showToast = (nextToast: ToastState) => {
    setToast(nextToast)
  }

  const handleProfileSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()

    if (!username.trim() || !email.trim()) {
      showToast({
        type: 'error',
        title: 'Missing details',
        message: 'Username and email are required.',
      })

      return
    }

    setSavingProfile(true)

    try {
      const response = await postJson<{
        success: boolean
        message: string
        user: AccountUser
        profile_img?: string | null
      }>('/api/account/settings/profile', {
        username: username.trim(),
        display_name: displayName.trim(),
        email: email.trim(),
      })

      setUser(response.user)
      setProfileImg(response.profile_img ?? profileImg)

      await refreshAuth()

      showToast({
        type: 'success',
        title: 'Profile updated',
        message:
          response.message || 'Your changes have been saved.',
      })
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Update failed',
        message:
          error instanceof Error
            ? error.message
            : 'Could not update your profile.',
      })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleAvatarChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0] || null

    setAvatarFile(file)
    setAvatarFailed(false)

    if (!file) {
      setAvatarPreview('')
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      setAvatarPreview(String(reader.result || ''))
    }

    reader.readAsDataURL(file)
  }

  const handleAvatarSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()

    if (!avatarFile) {
      showToast({
        type: 'error',
        title: 'No image selected',
        message: 'Choose an image before uploading.',
      })

      return
    }

    setUploadingAvatar(true)

    try {
      const formData = new FormData()
      formData.append('profile_image', avatarFile)

      const response = await fetch(
        `${API_BASE_URL}/api/account/settings/avatar`,
        {
          method: 'POST',
          credentials: 'include',
          body: formData,
        }
      )

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.message || 'Could not upload profile picture.'
        )
      }

      setProfileImg(data.profile_img || null)
      setAvatarFile(null)
      setAvatarPreview('')
      setAvatarFailed(false)

      await refreshAuth()

      showToast({
        type: 'success',
        title: 'Picture updated',
        message:
          data.message || 'Your profile picture has been updated.',
      })
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Upload failed',
        message:
          error instanceof Error
            ? error.message
            : 'Could not upload your profile picture.',
      })
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handlePasswordSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()

    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast({
        type: 'error',
        title: 'Missing password',
        message: 'Complete all password fields.',
      })

      return
    }

    if (newPassword.length < 8) {
      showToast({
        type: 'error',
        title: 'Password too short',
        message: 'Your new password must contain 8 characters.',
      })

      return
    }

    if (newPassword !== confirmPassword) {
      showToast({
        type: 'error',
        title: 'Passwords do not match',
        message: 'Check the password confirmation and try again.',
      })

      return
    }

    setSavingPassword(true)

    try {
      const response = await postJson<{
        success: boolean
        message: string
      }>('/api/account/settings/password', {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      })

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')

      showToast({
        type: 'success',
        title: 'Password updated',
        message:
          response.message || 'Your password has been changed.',
      })
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Password update failed',
        message:
          error instanceof Error
            ? error.message
            : 'Could not change your password.',
      })
    } finally {
      setSavingPassword(false)
    }
  }

  const handlePrefsSubmit = async () => {
    setSavingPrefs(true)

    try {
      const response = await postJson<{
        success: boolean
        message: string
      }>('/api/account/settings/notifications', prefs)

      showToast({
        type: 'success',
        title: 'Preferences saved',
        message:
          response.message ||
          'Your notification preferences have been saved.',
      })
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Save failed',
        message:
          error instanceof Error
            ? error.message
            : 'Could not save your notification preferences.',
      })
    } finally {
      setSavingPrefs(false)
    }
  }

  const handleDeleteSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()

    if (deleteConfirm.trim().toLowerCase() !== 'delete') {
      showToast({
        type: 'error',
        title: 'Confirmation required',
        message: 'Type "delete" to confirm this action.',
      })

      return
    }

    if (!deletePassword) {
      showToast({
        type: 'error',
        title: 'Password required',
        message: 'Enter your password to delete the account.',
      })

      return
    }

    setDeletingAccount(true)

    try {
      const response = await postJson<{
        success: boolean
        message: string
      }>('/api/account/settings/delete', {
        confirm_delete: deleteConfirm,
        delete_password: deletePassword,
      })

      showToast({
        type: 'success',
        title: 'Account deleted',
        message:
          response.message ||
          'Your account has been deleted successfully.',
      })

      window.setTimeout(() => {
        navigate('/login', {
          replace: true,
        })
      }, 900)
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Delete failed',
        message:
          error instanceof Error
            ? error.message
            : 'Could not delete your account.',
      })

      setDeletingAccount(false)
    }
  }

  const renderAvatar = (className: string) => {
    if (avatarUrl && !avatarFailed) {
      return (
        <img
          src={avatarUrl}
          className={className}
          alt={`${displayTitle} profile`}
          onError={() => {
            setAvatarFailed(true)
          }}
        />
      )
    }

    return (
      <div
        className={`${className} account-avatar-fallback`}
        aria-label={`${displayTitle} profile`}
      >
        {avatarInitial}
      </div>
    )
  }

  if (loading) {
    return (
      <main className="account-settings-page">
        <AccountTopBar />

        <section className="account-loading">
          <div className="account-loading-heading">
            <span></span>
            <span></span>
          </div>

          <div className="account-loading-layout">
            <div className="account-loading-sidebar">
              <div></div>
              <span></span>
              <span></span>
              <span></span>
            </div>

            <div className="account-loading-card">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </section>
      </main>
    )
  }

  if (failed || !user) {
    return (
      <main className="account-settings-page">
        <AccountTopBar />

        <section className="account-loading">
          <div className="account-error-card">
            <i
              className="bi bi-exclamation-circle"
              aria-hidden="true"
            ></i>

            <h1>Settings unavailable</h1>

            <p>
              Your account settings could not be loaded. Sign in
              again to continue.
            </p>

            <Link to="/login">Sign in</Link>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="account-settings-page">
      <AccountTopBar />

      <nav
        className="account-mobile-tabs"
        aria-label="Account settings sections"
      >
        {SETTINGS_TABS.map((tab) => (
          <button
            type="button"
            key={tab.id}
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => setTab(tab.id)}
            aria-selected={activeTab === tab.id}
          >
            <i className={`bi ${tab.icon}`} aria-hidden="true"></i>
            {tab.shortLabel}
          </button>
        ))}
      </nav>

      <section className="account-shell">
        <div className="account-page-heading">
          <h1>Account settings</h1>
          <p>Manage your profile, security and notifications.</p>
        </div>

        <div className="account-layout">
          <aside className="account-sidebar">
            <div className="account-sidebar-profile">
              {renderAvatar('account-sidebar-avatar')}

              <div>
                <span>{displayTitle}</span>
                <small>@{user.username}</small>
              </div>
            </div>

            <nav
              className="account-sidebar-nav"
              aria-label="Account settings"
            >
              {SETTINGS_TABS.slice(0, 4).map((tab) => (
                <button
                  type="button"
                  key={tab.id}
                  className={activeTab === tab.id ? 'active' : ''}
                  onClick={() => setTab(tab.id)}
                  aria-selected={activeTab === tab.id}
                >
                  <i
                    className={`bi ${tab.icon}`}
                    aria-hidden="true"
                  ></i>

                  <span>{tab.label}</span>
                </button>
              ))}

              <div className="account-sidebar-divider"></div>

              <button
                type="button"
                className={`danger ${
                  activeTab === 'danger' ? 'active' : ''
                }`}
                onClick={() => setTab('danger')}
                aria-selected={activeTab === 'danger'}
              >
                <i className="bi bi-trash3" aria-hidden="true"></i>
                <span>Delete account</span>
              </button>
            </nav>
          </aside>

          <section className="account-content">
            {activeTab === 'profile' && (
              <div className="account-panel">
                <div className="account-panel-heading">
                  <h2>Profile information</h2>
                  <p>
                    Update the details shown across your account.
                  </p>
                </div>

                <form onSubmit={handleProfileSubmit}>
                  <section className="account-card">
                    <div className="account-card-heading">
                      <h3>Personal details</h3>
                      <p>
                        Username and email are required for your
                        account.
                      </p>
                    </div>

                    <div className="account-field-grid">
                      <div className="account-field">
                        <label htmlFor="account-username">
                          Username
                          <span aria-hidden="true">*</span>
                        </label>

                        <input
                          id="account-username"
                          value={username}
                          onChange={(event) =>
                            setUsername(event.target.value)
                          }
                          placeholder="Your username"
                          autoComplete="username"
                          required
                        />

                        <small>
                          Used for signing in and identifying your
                          account.
                        </small>
                      </div>

                      <div className="account-field">
                        <label htmlFor="account-display-name">
                          Display name
                        </label>

                        <input
                          id="account-display-name"
                          value={displayName}
                          onChange={(event) =>
                            setDisplayName(event.target.value)
                          }
                          placeholder="Your public name"
                          autoComplete="name"
                        />

                        <small>
                          This name appears on your profile.
                        </small>
                      </div>
                    </div>

                    <div className="account-field">
                      <label htmlFor="account-email">
                        Email address
                        <span aria-hidden="true">*</span>
                      </label>

                      <input
                        id="account-email"
                        type="email"
                        value={email}
                        onChange={(event) =>
                          setEmail(event.target.value)
                        }
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                      />

                      <small>
                        Used for account recovery and important
                        updates.
                      </small>
                    </div>
                  </section>

                  <div className="account-form-actions">
                    <button
                      type="submit"
                      className="account-primary-btn"
                      disabled={savingProfile}
                    >
                      {savingProfile && (
                        <i
                          className="bi bi-arrow-repeat account-spin"
                          aria-hidden="true"
                        ></i>
                      )}

                      {savingProfile ? 'Saving…' : 'Save changes'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'avatar' && (
              <div className="account-panel">
                <div className="account-panel-heading">
                  <h2>Profile picture</h2>
                  <p>
                    Choose the image displayed on your account.
                  </p>
                </div>

                <form onSubmit={handleAvatarSubmit}>
                  <section className="account-card">
                    <div className="account-avatar-row">
                      <div className="account-avatar-preview">
                        {avatarUrl && !avatarFailed ? (
                          <img
                            src={avatarUrl}
                            alt="Profile preview"
                            onError={() => {
                              setAvatarFailed(true)
                            }}
                          />
                        ) : (
                          <span>{avatarInitial}</span>
                        )}
                      </div>

                      <div className="account-avatar-meta">
                        <h3>Upload a new picture</h3>

                        <p>
                          Use a JPG, PNG or GIF image up to 5 MB.
                          Square images provide the best result.
                        </p>

                        <label className="account-file-label">
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/gif"
                            onChange={handleAvatarChange}
                          />

                          <i
                            className="bi bi-image"
                            aria-hidden="true"
                          ></i>

                          Choose image
                        </label>

                        <span className="account-file-name">
                          {avatarFile
                            ? avatarFile.name
                            : 'No image selected'}
                        </span>
                      </div>
                    </div>
                  </section>

                  <div className="account-form-actions">
                    <button
                      type="submit"
                      className="account-primary-btn"
                      disabled={uploadingAvatar}
                    >
                      {uploadingAvatar && (
                        <i
                          className="bi bi-arrow-repeat account-spin"
                          aria-hidden="true"
                        ></i>
                      )}

                      {uploadingAvatar
                        ? 'Uploading…'
                        : 'Upload picture'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'password' && (
              <div className="account-panel">
                <div className="account-panel-heading">
                  <h2>Password</h2>
                  <p>
                    Change the password used to access your account.
                  </p>
                </div>

                <form onSubmit={handlePasswordSubmit}>
                  <section className="account-card">
                    <div className="account-field">
                      <label htmlFor="account-current-password">
                        Current password
                        <span aria-hidden="true">*</span>
                      </label>

                      <input
                        id="account-current-password"
                        type="password"
                        value={currentPassword}
                        onChange={(event) =>
                          setCurrentPassword(event.target.value)
                        }
                        placeholder="Enter your current password"
                        autoComplete="current-password"
                        required
                      />
                    </div>

                    <div className="account-card-divider"></div>

                    <div className="account-field-grid">
                      <div className="account-field">
                        <label htmlFor="account-new-password">
                          New password
                          <span aria-hidden="true">*</span>
                        </label>

                        <input
                          id="account-new-password"
                          type="password"
                          value={newPassword}
                          onChange={(event) =>
                            setNewPassword(event.target.value)
                          }
                          placeholder="At least 8 characters"
                          autoComplete="new-password"
                          required
                        />

                        <div
                          className="account-strength-bar"
                          aria-hidden="true"
                        >
                          {[0, 1, 2, 3].map((index) => (
                            <span
                              key={index}
                              className={
                                index < passwordStrength
                                  ? passwordStrengthClass
                                  : ''
                              }
                            ></span>
                          ))}
                        </div>

                        <small className={passwordStrengthClass}>
                          {passwordStrengthLabel}
                        </small>
                      </div>

                      <div className="account-field">
                        <label htmlFor="account-confirm-password">
                          Confirm password
                          <span aria-hidden="true">*</span>
                        </label>

                        <input
                          id="account-confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={(event) =>
                            setConfirmPassword(event.target.value)
                          }
                          placeholder="Repeat the new password"
                          autoComplete="new-password"
                          required
                        />

                        {passwordsMatch && (
                          <small className="match">
                            Passwords match
                          </small>
                        )}

                        {passwordsMismatch && (
                          <small className="mismatch">
                            Passwords do not match
                          </small>
                        )}
                      </div>
                    </div>
                  </section>

                  <div className="account-form-actions">
                    <button
                      type="submit"
                      className="account-primary-btn"
                      disabled={savingPassword}
                    >
                      {savingPassword && (
                        <i
                          className="bi bi-arrow-repeat account-spin"
                          aria-hidden="true"
                        ></i>
                      )}

                      {savingPassword
                        ? 'Updating…'
                        : 'Update password'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="account-panel">
                <div className="account-panel-heading">
                  <h2>Notifications</h2>
                  <p>
                    Choose which account and content updates you
                    receive.
                  </p>
                </div>

                <section className="account-card">
                  <div className="account-card-heading">
                    <h3>Email notifications</h3>
                  </div>

                  <div className="account-toggle-list">
                    <ToggleRow
                      label="New content alerts"
                      hint="Receive an update when movies or series are added."
                      checked={prefs.new_content_alerts}
                      onChange={(checked) =>
                        setPrefs((current) => ({
                          ...current,
                          new_content_alerts: checked,
                        }))
                      }
                    />

                    <ToggleRow
                      label="Request updates"
                      hint="Receive updates about your content requests."
                      checked={prefs.request_updates}
                      onChange={(checked) =>
                        setPrefs((current) => ({
                          ...current,
                          request_updates: checked,
                        }))
                      }
                    />

                    <ToggleRow
                      label="Account alerts"
                      hint="Receive security and account-related updates."
                      checked={prefs.account_alerts}
                      onChange={(checked) =>
                        setPrefs((current) => ({
                          ...current,
                          account_alerts: checked,
                        }))
                      }
                    />
                  </div>
                </section>

                <section className="account-card">
                  <div className="account-card-heading">
                    <h3>Platform notifications</h3>
                  </div>

                  <div className="account-toggle-list">
                    <ToggleRow
                      label="Announcements"
                      hint="Platform news and feature announcements."
                      checked={prefs.announcements}
                      onChange={(checked) =>
                        setPrefs((current) => ({
                          ...current,
                          announcements: checked,
                        }))
                      }
                    />

                    <ToggleRow
                      label="Promotional messages"
                      hint="Occasional offers and promotional content."
                      checked={prefs.promotional_messages}
                      onChange={(checked) =>
                        setPrefs((current) => ({
                          ...current,
                          promotional_messages: checked,
                        }))
                      }
                    />
                  </div>
                </section>

                <div className="account-form-actions">
                  <button
                    type="button"
                    className="account-primary-btn"
                    onClick={handlePrefsSubmit}
                    disabled={savingPrefs}
                  >
                    {savingPrefs && (
                      <i
                        className="bi bi-arrow-repeat account-spin"
                        aria-hidden="true"
                      ></i>
                    )}

                    {savingPrefs
                      ? 'Saving…'
                      : 'Save preferences'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'danger' && (
              <div className="account-panel">
                <div className="account-panel-heading danger-heading">
                  <h2>Delete account</h2>
                  <p>
                    Permanently remove your profile and saved account
                    data.
                  </p>
                </div>

                <form
                  className="account-danger-card"
                  onSubmit={handleDeleteSubmit}
                >
                  <div className="account-danger-intro">
                    <i
                      className="bi bi-exclamation-triangle"
                      aria-hidden="true"
                    ></i>

                    <div>
                      <h3>This action cannot be undone</h3>

                      <p>
                        Your profile, My List, request history and
                        other saved account data will be removed.
                      </p>
                    </div>
                  </div>

                  <div className="account-field-grid">
                    <div className="account-field danger-field">
                      <label htmlFor="account-delete-confirmation">
                        Type “delete” to confirm
                      </label>

                      <input
                        id="account-delete-confirmation"
                        value={deleteConfirm}
                        onChange={(event) =>
                          setDeleteConfirm(event.target.value)
                        }
                        placeholder="delete"
                        autoComplete="off"
                        required
                      />
                    </div>

                    <div className="account-field danger-field">
                      <label htmlFor="account-delete-password">
                        Password
                      </label>

                      <input
                        id="account-delete-password"
                        type="password"
                        value={deletePassword}
                        onChange={(event) =>
                          setDeletePassword(event.target.value)
                        }
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        required
                      />
                    </div>
                  </div>

                  <div className="account-form-actions">
                    <button
                      type="submit"
                      className="account-danger-btn"
                      disabled={deletingAccount}
                    >
                      {deletingAccount && (
                        <i
                          className="bi bi-arrow-repeat account-spin"
                          aria-hidden="true"
                        ></i>
                      )}

                      {deletingAccount
                        ? 'Deleting…'
                        : 'Delete account'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </section>
        </div>
      </section>

      {toast && (
        <div
          className={`account-toast ${toast.type}`}
          role="status"
          aria-live="polite"
        >
          <i
            className={`bi ${
              toast.type === 'success'
                ? 'bi-check-circle'
                : toast.type === 'error'
                  ? 'bi-exclamation-circle'
                  : 'bi-info-circle'
            }`}
            aria-hidden="true"
          ></i>

          <div>
            <span>{toast.title}</span>
            <small>{toast.message}</small>
          </div>
        </div>
      )}
    </main>
  )
}

export default AccountSettingsPage