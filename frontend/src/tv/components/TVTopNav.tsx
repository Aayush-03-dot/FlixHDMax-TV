import { Search, UserRound } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { tvPath } from '../utils'

const mainNavItems = [
  { label: 'Home', path: '/', key: 'top-home' },
  { label: 'Movies', path: '/movies', key: 'top-movies' },
  { label: 'TV Shows', path: '/shows', key: 'top-tv-shows' },
  { label: 'My List', path: '/my-list', key: 'top-my-list' },
]

function TVTopNav() {
  const { user } = useAuth()
  const profileName =
    (user?.display_name as string | null | undefined) ||
    user?.username ||
    'Profile'

  return (
    <header
      className="tv-top-nav"
      data-tv-group="top-nav"
      aria-label="FlixHDMax TV navigation"
    >
      <div className="tv-top-brand" aria-label="FlixHDMax">
        <img src="/favicon1.png" alt="FlixHDMax" />
      </div>

      <nav className="tv-top-nav-links" aria-label="Primary">
        {mainNavItems.map(({ label, path, key }, index) => (
          <NavLink
            key={path}
            to={tvPath(path)}
            end={path === '/'}
            className={({ isActive }) =>
              `tv-top-link tv-focusable${isActive ? ' is-active' : ''}`
            }
            data-tv-focusable="true"
            data-tv-key={key}
            data-tv-next-left={index > 0 ? mainNavItems[index - 1].key : undefined}
            data-tv-next-right={
              index < mainNavItems.length - 1
                ? mainNavItems[index + 1].key
                : 'top-search'
            }
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
          data-tv-next-left="top-my-list"
          data-tv-next-right="top-profile"
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
          data-tv-next-left="top-search"
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
