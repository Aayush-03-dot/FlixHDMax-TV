import { Search, UserRound } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { tvPath } from '../utils'

const mainNavItems = [
  { label: 'Home', path: '/' },
  { label: 'Movies', path: '/movies' },
  { label: 'TV Shows', path: '/shows' },
  { label: 'My List', path: '/my-list' },
]

function TVTopNav() {
  const { user } = useAuth()
  const profileName =
    (user?.display_name as string | null | undefined) ||
    user?.username ||
    'Profile'

  return (
    <header className="tv-top-nav" aria-label="FlixHDMax TV navigation">
      <NavLink
        to={tvPath('/')}
        end
        className="tv-top-brand tv-focusable"
        data-tv-focusable="true"
        data-tv-key="top-brand"
        aria-label="FlixHDMax home"
      >
        <img src="/favicon1.png" alt="FlixHDMax" />
      </NavLink>

      <nav className="tv-top-nav-links" aria-label="Primary">
        {mainNavItems.map(({ label, path }) => (
          <NavLink
            key={path}
            to={tvPath(path)}
            end={path === '/'}
            className={({ isActive }) =>
              `tv-top-link tv-focusable${isActive ? ' is-active' : ''}`
            }
            data-tv-focusable="true"
            data-tv-key={`top-${label.toLowerCase().replaceAll(' ', '-')}`}
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="tv-top-actions">
        <NavLink
          to={tvPath('/search')}
          className={({ isActive }) =>
            `tv-top-icon-link tv-focusable${isActive ? ' is-active' : ''}`
          }
          data-tv-focusable="true"
          data-tv-key="top-search"
          aria-label="Search"
        >
          <Search aria-hidden="true" />
        </NavLink>

        <NavLink
          to={tvPath('/profile')}
          className={({ isActive }) =>
            `tv-top-profile tv-focusable${isActive ? ' is-active' : ''}`
          }
          data-tv-focusable="true"
          data-tv-key="top-profile"
          aria-label={profileName}
        >
          {user?.profile_image_url ? (
            <img src={String(user.profile_image_url)} alt="" />
          ) : (
            <UserRound aria-hidden="true" />
          )}
          <span>{profileName}</span>
        </NavLink>
      </div>
    </header>
  )
}

export default TVTopNav
