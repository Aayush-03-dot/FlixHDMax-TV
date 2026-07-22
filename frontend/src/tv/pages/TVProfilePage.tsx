import { LogOut, Monitor, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import TVShell from '../components/TVShell'
import { tvPath } from '../utils'

function TVProfilePage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      navigate(tvPath('/login'), { replace: true })
    }
  }

  const displayName =
    (user?.display_name as string | null | undefined) ||
    user?.username ||
    'FlixHDMax user'

  return (
    <TVShell>
      <section className="tv-profile-page">
        <header className="tv-page-header">
          <p className="tv-kicker">Account and device</p>
          <h1>Profile</h1>
        </header>

        <div className="tv-profile-grid">
          <article className="tv-profile-card">
            <div className="tv-profile-avatar">
              {user?.profile_image_url ? (
                <img src={String(user.profile_image_url)} alt="" />
              ) : (
                <UserRound aria-hidden="true" />
              )}
            </div>
            <div>
              <h2>{displayName}</h2>
              <p>{user?.email || 'Signed in to FlixHDMax'}</p>
            </div>
          </article>

          <article className="tv-settings-card">
            <Monitor aria-hidden="true" />
            <div>
              <h2>TV application</h2>
              <p>
                D-pad navigation, remote Select, remote Back, landscape layout and visible focus are enabled.
              </p>
            </div>
          </article>
        </div>

        <div className="tv-profile-actions">
          <button
            type="button"
            className="tv-primary-button tv-focusable"
            onClick={handleLogout}
            data-tv-focusable="true"
            data-tv-autofocus="true"
            data-tv-key="profile-logout"
          >
            <LogOut aria-hidden="true" />
            Sign out
          </button>
        </div>

        <div className="tv-install-note">
          <h2>Fire TV installation</h2>
          <p>
            Amazon Silk does not provide a standard PWA install button. Install the FlixHDMax Fire TV APK or load this hosted TV site through Amazon Web App Tester during development.
          </p>
        </div>
      </section>
    </TVShell>
  )
}

export default TVProfilePage
