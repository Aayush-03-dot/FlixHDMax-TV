import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Film, Heart, Home, Tv, User } from 'lucide-react'
import './MobileBottomNav.css'

type MobileNavItem = {
  label: string
  to: string
  icon: React.ElementType
  match: (pathname: string, searchParams: URLSearchParams) => boolean
}

const hiddenPaths = [
  '/login',
  '/signup',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/account/settings',
  '/account-settings',
]

const navItems: MobileNavItem[] = [
  {
    label: 'Home',
    to: '/',
    icon: Home,
    match: (pathname, searchParams) =>
      pathname === '/' && !searchParams.get('category'),
  },
  {
    label: 'Movies',
    to: '/?category=all-movies',
    icon: Film,
    match: (pathname, searchParams) =>
      pathname === '/' && searchParams.get('category') === 'all-movies',
  },
  {
    label: 'Series',
    to: '/?category=all-series',
    icon: Tv,
    match: (pathname, searchParams) =>
      pathname === '/' && searchParams.get('category') === 'all-series',
  },
  {
    label: 'My List',
    to: '/my-list',
    icon: Heart,
    match: (pathname) => pathname === '/my-list',
  },
  {
    label: 'Profile',
    to: '/profile',
    icon: User,
    match: (pathname) => pathname === '/profile',
  },
]

function MobileBottomNav() {
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)

  const shouldHide =
    hiddenPaths.includes(location.pathname) ||
    location.pathname.startsWith('/movie/') ||
    location.pathname.startsWith('/series/') ||
    location.pathname.startsWith('/watch') ||
    location.pathname.startsWith('/admin')

  useEffect(() => {
    if (shouldHide) {
      document.body.classList.remove('has-mobile-nav')
      return
    }

    document.body.classList.add('has-mobile-nav')

    return () => {
      document.body.classList.remove('has-mobile-nav')
    }
  }, [shouldHide])

  if (shouldHide) return null

  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = item.match(location.pathname, searchParams)

        return (
          <Link
            key={item.label}
            to={item.to}
            className={isActive ? 'active' : ''}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon size={20} strokeWidth={2} />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export default MobileBottomNav