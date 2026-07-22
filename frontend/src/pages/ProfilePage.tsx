import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiGet } from '../services/api'
import './ProfilePage.css'

type ProfileUser = {
  id: string | number
  username: string
  display_name?: string | null
  email: string
  role: string
  login_count?: number | null
  created_at?: string | null
}

type ProfileResponse = {
  success: boolean
  user: ProfileUser
  profile_img?: string | null
  watchlist_count: number
  request_count: number
}

const API_BASE_URL = ''

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

function formatMemberSince(date?: string | null) {
  if (!date) return 'Not available'

  const parsed = new Date(date)

  if (Number.isNaN(parsed.getTime())) {
    return 'Not available'
  }

  return parsed.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

function getRoleLabel(role?: string | null) {
  if (!role) return 'Member'

  return role.charAt(0).toUpperCase() + role.slice(1)
}

function ProfileTopBar() {
  return (
    <header className="profile-top-bar">
      <Link to="/" className="profile-logo" aria-label="FlixHDMax home">
        <span>FLIXHD</span>
        <span>MAX</span>
      </Link>

      <Link to="/" className="profile-back-btn">
        <i className="bi bi-arrow-left" aria-hidden="true"></i>
        <span>Back to home</span>
      </Link>
    </header>
  )
}

function ProfilePage() {
  const navigate = useNavigate()

  const [user, setUser] = useState<ProfileUser | null>(null)
  const [profileImg, setProfileImg] = useState<string | null>(null)
  const [watchlistCount, setWatchlistCount] = useState(0)
  const [requestCount, setRequestCount] = useState(0)
  const [avatarFailed, setAvatarFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true

    setLoading(true)
    setFailed(false)

    apiGet<ProfileResponse>('/api/profile')
      .then((response) => {
        if (!active) return

        setUser(response.user)
        setProfileImg(response.profile_img || null)
        setWatchlistCount(response.watchlist_count || 0)
        setRequestCount(response.request_count || 0)
      })
      .catch((error) => {
        if (!active) return

        console.error('PROFILE API ERROR:', error)
        setFailed(true)

        const message =
          error instanceof Error ? error.message.toLowerCase() : ''

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

  const displayName = user?.display_name?.trim() || user?.username || 'User'

  const avatarInitial = useMemo(() => {
    return displayName.charAt(0).toUpperCase() || 'U'
  }, [displayName])

  const avatarUrl = useMemo(() => {
    return resolveMediaUrl(profileImg)
  }, [profileImg])

  useEffect(() => {
    setAvatarFailed(false)
  }, [avatarUrl])

  const roleLabel = getRoleLabel(user?.role)
  const isAdmin = user?.role?.toLowerCase() === 'admin'

  if (loading) {
    return (
      <main className="profile-page">
        <ProfileTopBar />

        <section className="profile-shell">
          <div className="profile-loading-layout">
            <div className="profile-loading-header">
              <div className="profile-loading-avatar"></div>

              <div className="profile-loading-lines">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>

            <div className="profile-loading-panel">
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
      <main className="profile-page">
        <ProfileTopBar />

        <section className="profile-shell">
          <div className="profile-error-card">
            <i
              className="bi bi-exclamation-circle"
              aria-hidden="true"
            ></i>

            <h1>Profile unavailable</h1>

            <p>
              Your profile could not be loaded. Sign in again to continue.
            </p>

            <Link to="/login" className="profile-primary-btn">
              Sign in
            </Link>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="profile-page">
      <ProfileTopBar />

      <section className="profile-shell">
        <div className="profile-heading">
          <h1>Profile</h1>
          <p>Account details and activity.</p>
        </div>

        <section className="profile-overview">
          <div className="profile-identity">
            {avatarUrl && !avatarFailed ? (
              <img
                src={avatarUrl}
                className="profile-avatar"
                alt={`${displayName} profile`}
                onError={() => {
                  setAvatarFailed(true)
                }}
              />
            ) : (
              <div
                className="profile-avatar-fallback"
                aria-label={`${displayName} profile`}
              >
                {avatarInitial}
              </div>
            )}

            <div className="profile-name-block">
              <div className="profile-name-line">
                <h2>{displayName}</h2>

                <span
                  className={`profile-role ${
                    isAdmin ? 'admin' : 'member'
                  }`}
                >
                  {roleLabel}
                </span>
              </div>

              <p>@{user.username}</p>

              <span className="profile-email-summary">
                {user.email}
              </span>
            </div>
          </div>

          <Link to="/account-settings" className="profile-edit-btn">
            <i className="bi bi-pencil" aria-hidden="true"></i>
            Edit profile
          </Link>
        </section>

        <div className="profile-layout">
          <div className="profile-main-column">
            <section className="profile-section">
              <div className="profile-section-heading">
                <h2>Account details</h2>
              </div>

              <div className="profile-info-list">
                <div className="profile-info-row">
                  <div className="profile-info-label">
                    <i className="bi bi-person" aria-hidden="true"></i>

                    <div>
                      <span>Username</span>
                      <small>Your account identifier</small>
                    </div>
                  </div>

                  <span className="profile-info-value">
                    {user.username}
                  </span>
                </div>

                <div className="profile-info-row">
                  <div className="profile-info-label">
                    <i className="bi bi-envelope" aria-hidden="true"></i>

                    <div>
                      <span>Email</span>
                      <small>Used for account access</small>
                    </div>
                  </div>

                  <span className="profile-info-value">
                    {user.email}
                  </span>
                </div>

                <div className="profile-info-row">
                  <div className="profile-info-label">
                    <i
                      className="bi bi-person-badge"
                      aria-hidden="true"
                    ></i>

                    <div>
                      <span>Account type</span>
                      <small>Current access level</small>
                    </div>
                  </div>

                  <span className="profile-info-value">
                    {roleLabel}
                  </span>
                </div>

                <div className="profile-info-row">
                  <div className="profile-info-label">
                    <i className="bi bi-calendar3" aria-hidden="true"></i>

                    <div>
                      <span>Member since</span>
                      <small>Account creation date</small>
                    </div>
                  </div>

                  <span className="profile-info-value">
                    {formatMemberSince(user.created_at)}
                  </span>
                </div>
              </div>
            </section>

            <section className="profile-section">
              <div className="profile-section-heading">
                <h2>Quick links</h2>
              </div>

              <div className="profile-links-grid">
                <Link to="/my-list" className="profile-link-card">
                  <span className="profile-link-icon">
                    <i className="bi bi-bookmark" aria-hidden="true"></i>
                  </span>

                  <span className="profile-link-content">
                    <span>My List</span>
                    <small>View your saved titles</small>
                  </span>

                  <i
                    className="bi bi-chevron-right profile-link-arrow"
                    aria-hidden="true"
                  ></i>
                </Link>

                <Link to="/request" className="profile-link-card">
                  <span className="profile-link-icon">
                    <i className="bi bi-film" aria-hidden="true"></i>
                  </span>

                  <span className="profile-link-content">
                    <span>Request content</span>
                    <small>Suggest a movie or series</small>
                  </span>

                  <i
                    className="bi bi-chevron-right profile-link-arrow"
                    aria-hidden="true"
                  ></i>
                </Link>

                <Link
                  to="/account-settings"
                  className="profile-link-card"
                >
                  <span className="profile-link-icon">
                    <i className="bi bi-gear" aria-hidden="true"></i>
                  </span>

                  <span className="profile-link-content">
                    <span>Account settings</span>
                    <small>Update your profile and security</small>
                  </span>

                  <i
                    className="bi bi-chevron-right profile-link-arrow"
                    aria-hidden="true"
                  ></i>
                </Link>

                <Link to="/contact" className="profile-link-card">
                  <span className="profile-link-icon">
                    <i
                      className="bi bi-chat-left-text"
                      aria-hidden="true"
                    ></i>
                  </span>

                  <span className="profile-link-content">
                    <span>Contact support</span>
                    <small>Send a message to the team</small>
                  </span>

                  <i
                    className="bi bi-chevron-right profile-link-arrow"
                    aria-hidden="true"
                  ></i>
                </Link>
              </div>
            </section>
          </div>

          <aside className="profile-side-column">
            <section className="profile-section profile-activity-section">
              <div className="profile-section-heading">
                <h2>Activity</h2>
              </div>

              <div className="profile-stat-list">
                <Link to="/my-list" className="profile-stat-row">
                  <span className="profile-stat-icon saved">
                    <i className="bi bi-bookmark" aria-hidden="true"></i>
                  </span>

                  <span className="profile-stat-copy">
                    <span>Saved titles</span>
                    <small>Items in My List</small>
                  </span>

                  <span className="profile-stat-value">
                    {watchlistCount}
                  </span>
                </Link>

                <Link to="/request" className="profile-stat-row">
                  <span className="profile-stat-icon requests">
                    <i className="bi bi-film" aria-hidden="true"></i>
                  </span>

                  <span className="profile-stat-copy">
                    <span>Requests</span>
                    <small>Content requests sent</small>
                  </span>

                  <span className="profile-stat-value">
                    {requestCount}
                  </span>
                </Link>

                <div className="profile-stat-row">
                  <span className="profile-stat-icon logins">
                    <i
                      className="bi bi-box-arrow-in-right"
                      aria-hidden="true"
                    ></i>
                  </span>

                  <span className="profile-stat-copy">
                    <span>Sign-ins</span>
                    <small>Recorded account logins</small>
                  </span>

                  <span className="profile-stat-value">
                    {user.login_count || 0}
                  </span>
                </div>
              </div>
            </section>

            <section className="profile-section profile-help-section">
              <i className="bi bi-headset" aria-hidden="true"></i>

              <div>
                <h2>Need help?</h2>
                <p>Contact support about your account or content access.</p>
              </div>

              <Link to="/contact">Contact support</Link>
            </section>
          </aside>
        </div>
      </section>
    </main>
  )
}

export default ProfilePage