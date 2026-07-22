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
          <p className="tv-kicker">Account</p>
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
              <p>{user?.email || 'Signed in'}</p>
            </div>
          </article>

          <article className="tv-settings-card">
            <Monitor aria-hidden="true" />
            <div>
              <h2>FlixHDMax TV</h2>
              <p>Fire TV · Android TV</p>
            </div>
          </article>
        </div>

        <div className="tv-profile-actions">
          <button
            type="button"
            className="tv-secondary-button tv-focusable"
            onClick={handleLogout}
            data-tv-focusable="true"
            data-tv-autofocus="true"
            data-tv-key="profile-logout"
          >
            <LogOut aria-hidden="true" />
            Sign out
          </button>
        </div>
      </section>
    </TVShell>
  )
}

export default TVProfilePage
