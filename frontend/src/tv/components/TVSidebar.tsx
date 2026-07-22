import { Film, Home, ListVideo, Search, Tv, UserRound } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { tvPath } from '../utils'

const navItems = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'Search', path: '/search', icon: Search },
  { label: 'Movies', path: '/movies', icon: Film },
  { label: 'TV Shows', path: '/shows', icon: Tv },
  { label: 'My List', path: '/my-list', icon: ListVideo },
]

function TVSidebar() {
  const { user } = useAuth()
  const profileName =
    (user?.display_name as string | null | undefined) ||
    user?.username ||
    'Profile'

  return (
    <aside className="tv-sidebar" aria-label="TV navigation">
      <div className="tv-sidebar-scrim" aria-hidden="true" />

      <div className="tv-brand" aria-label="FlixHDMax TV">
        <span className="tv-brand-mark">F</span>
        <span className="tv-brand-word">FlixHDMax</span>
      </div>

      <nav className="tv-sidebar-nav">
        {navItems.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={tvPath(path)}
            end={path === '/'}
            className={({ isActive }) =>
              `tv-sidebar-link tv-focusable${isActive ? ' is-active' : ''}`
            }
            data-tv-focusable="true"
            data-tv-key={`sidebar-${label.toLowerCase().replaceAll(' ', '-')}`}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <NavLink
        to={tvPath('/profile')}
        className={({ isActive }) =>
          `tv-sidebar-link tv-sidebar-profile tv-focusable${isActive ? ' is-active' : ''}`
        }
        data-tv-focusable="true"
        data-tv-key="sidebar-profile"
        aria-label={profileName}
      >
        {user?.profile_image_url ? (
          <img
            src={String(user.profile_image_url)}
            alt=""
            className="tv-sidebar-avatar"
          />
        ) : (
          <UserRound aria-hidden="true" />
        )}
        <span>{profileName}</span>
      </NavLink>
    </aside>
  )
}

export default TVSidebar
