import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import NotificationBell from './NotificationBell'
import './Navbar.css'

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  const isLoggedIn = Boolean(user)
  const isAdmin = user?.role === 'admin'
  const username = user?.username || 'User'
  const displayName = user?.display_name?.trim() || username
  const avatarUrl = user?.profile_image_url || ''
  const avatarLetter = displayName.charAt(0).toUpperCase()

  const params = new URLSearchParams(location.search)
  const category = params.get('category')
  const currentSearchQuery = params.get('search_query') || ''

  const isHomeActive =
    location.pathname === '/' && !category && !currentSearchQuery

  const isMoviesActive =
    location.pathname === '/' && category === 'all-movies'

  const isSeriesActive =
    location.pathname === '/' && category === 'all-series'

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname, location.search])

  const closeMobileMenu = () => {
    setMobileOpen(false)
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      // Keep logout flow safe even if backend request fails.
    } finally {
      setMobileOpen(false)
      navigate('/login')
    }
  }

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const searchQuery = String(formData.get('search_query') || '').trim()

    setMobileOpen(false)

    if (!searchQuery) {
      navigate('/')
      return
    }

    navigate(`/?search_query=${encodeURIComponent(searchQuery)}`)
  }

  return (
    <>
      <nav className={`pv-nav${scrolled ? ' scrolled' : ''}`} id="mainNav">
        <Link to="/" className="pv-logo" onClick={closeMobileMenu}>
          <span className="logo-flix">FlixHD</span>
          
          <span className="logo-hd">Max</span>
        </Link>

        <ul className="pv-nav-links d-none d-lg-flex">
          <li>
            <Link to="/" className={isHomeActive ? 'active' : ''}>
              Home
            </Link>
          </li>

          <li>
            <Link
              to="/?category=all-series"
              className={isSeriesActive ? 'active' : ''}
            >
              TV Shows
            </Link>
          </li>

          <li>
            <Link
              to="/?category=all-movies"
              className={isMoviesActive ? 'active' : ''}
            >
              Movies
            </Link>
          </li>

          <li>
            <NavLink to="/request">Request</NavLink>
          </li>

          <li>
            <NavLink to="/contact">Contact</NavLink>
          </li>

          <li>
            <NavLink to="/my-list">My List</NavLink>
          </li>
        </ul>

        <form
          className="pv-search d-none d-md-flex"
          onSubmit={handleSearchSubmit}
        >
          <i className="bi bi-search pv-search-icon"></i>

          <input
            type="text"
            name="search_query"
            className="pv-search-input"
            placeholder="Search movies, shows..."
            defaultValue={currentSearchQuery}
          />
        </form>

        <div className="pv-nav-right">
          {isLoggedIn ? (
            <>
              <NotificationBell />

              <div className="dropdown">
                <a
                  className="pv-avatar-btn"
                  href="#"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  onClick={(event) => event.preventDefault()}
                >
                  <div className="pv-avatar">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={`${displayName} profile`} />
                    ) : (
                      avatarLetter
                    )}
                  </div>

                  <span className="d-none d-lg-inline">{displayName}</span>

                  <i
                    className="bi bi-chevron-down"
                    style={{
                      fontSize: '0.65rem',
                      color: 'var(--text-dim)',
                    }}
                  ></i>
                </a>

                <ul className="dropdown-menu dropdown-menu-end pv-dropdown">
                  {isAdmin && (
                    <>
                      <li>
                        <button
                          type="button"
                          className="dropdown-item"
                          onClick={async () => {
                            try {
                              const response = await fetch('/api/admin/route', {
                                method: 'GET',
                                credentials: 'include',
                                headers: {
                                  Accept: 'application/json',
                                },
                              })

                              const data = await response.json()

                              if (!response.ok || !data?.admin_path) {
                                throw new Error('Could not open admin panel.')
                              }

                              navigate(data.admin_path)
                            } catch {
                              navigate('/admin/login')
                            }
                          }}
                        >
                          <i
                            className="bi bi-shield-lock me-2"
                            style={{ color: 'var(--brand-red)' }}
                          ></i>
                          Admin Panel
                        </button>
                      </li>

                      <li>
                        <hr className="dropdown-divider" />
                      </li>
                    </>
                  )}

                  <li>
                    <Link className="dropdown-item" to="/profile">
                      <i className="bi bi-person-circle me-2"></i>
                      Profile
                    </Link>
                  </li>

                  <li>
                    <Link className="dropdown-item" to="/account/settings">
                      <i className="bi bi-gear me-2"></i>
                      Account Settings
                    </Link>
                  </li>

                  <li>
                    <Link className="dropdown-item" to="/my-list">
                      <i className="bi bi-list me-2"></i>
                      My List
                    </Link>
                  </li>

                  <li>
                    <hr className="dropdown-divider" />
                  </li>

                  <li>
                    <button
                      type="button"
                      className="dropdown-item"
                      onClick={handleLogout}
                    >
                      <i className="bi bi-box-arrow-right me-2"></i>
                      Sign Out
                    </button>
                  </li>
                </ul>
              </div>
            </>
          ) : (
            <Link to="/login" className="pv-signin-btn">
              Sign In
            </Link>
          )}

          <button
            className="mobile-menu-btn"
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? 'Close mobile menu' : 'Open mobile menu'}
            aria-expanded={mobileOpen}
          >
            <i className={`bi ${mobileOpen ? 'bi-x-lg' : 'bi-list'}`}></i>
          </button>
        </div>
      </nav>

      {/* Mobile Nav Panel */}
      <div className={`mobile-nav-panel ${mobileOpen ? 'open' : ''}`}>
        <Link
          to="/"
          className={isHomeActive ? 'active' : ''}
          onClick={closeMobileMenu}
        >
          Home
        </Link>

        <Link
          to="/?category=all-series"
          className={isSeriesActive ? 'active' : ''}
          onClick={closeMobileMenu}
        >
          TV Shows
        </Link>

        <Link
          to="/?category=all-movies"
          className={isMoviesActive ? 'active' : ''}
          onClick={closeMobileMenu}
        >
          Movies
        </Link>

        <NavLink to="/request" onClick={closeMobileMenu}>
          Request
        </NavLink>

        <NavLink to="/contact" onClick={closeMobileMenu}>
          Contact
        </NavLink>

        {/* {isLoggedIn && (
          <>
            <NavLink to="/my-list" onClick={closeMobileMenu}>
              My List
            </NavLink>

            <NavLink to="/profile" onClick={closeMobileMenu}>
              Profile
            </NavLink>

            <NavLink to="/account/settings" onClick={closeMobileMenu}>
              Account Settings
            </NavLink>

            {isAdmin && (
              <a href="/admin" onClick={closeMobileMenu}>
                Admin Panel
              </a>
            )}

            <button
              type="button"
              className="mobile-nav-logout"
              onClick={handleLogout}
            >
              Sign Out
            </button>
          </>
        )}

        {!isLoggedIn && (
          <NavLink to="/login" onClick={closeMobileMenu}>
            Sign In
          </NavLink>
        )} */}

        <form className="mobile-search-form" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            name="search_query"
            placeholder="Search movies, shows..."
            defaultValue={currentSearchQuery}
          />
        </form>
      </div>
    </>
  )
}

export default Navbar