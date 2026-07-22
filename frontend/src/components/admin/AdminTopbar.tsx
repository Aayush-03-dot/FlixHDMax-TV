import { useEffect, useRef, useState } from 'react'
import type { AdminUser } from './adminTypes'

type Props = {
  title: string
  avatarLetter: string
  adminUser: AdminUser | null
  onToggleSidebar: () => void
  onLogout: () => void
}

function AdminTopbar({
  title,
  avatarLetter,
  adminUser,
  onToggleSidebar,
  onLogout,
}: Props) {
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement | null>(null)

  const displayName =
    adminUser?.display_name?.trim() || adminUser?.username || 'Admin'
  const secondaryText = adminUser?.email || 'Administrator'

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <header className="admin-topbar">
      <div className="admin-topbar-left">
        <button
          type="button"
          className="admin-mobile-menu"
          onClick={onToggleSidebar}
          aria-label="Open admin menu"
        >
          <i className="bi bi-list"></i>
        </button>

        <div className="admin-topbar-title-block">
          <span className="admin-topbar-title">{title}</span>
          <span className="admin-topbar-date">
            {new Intl.DateTimeFormat(undefined, {
              weekday: 'short',
              day: '2-digit',
              month: 'short',
            }).format(new Date())}
          </span>
        </div>
      </div>

      <div className="admin-topbar-right">
        <a
          href="/"
          className="admin-topbar-site-link"
          title="Open FlixHDMax"
        >
          <i className="bi bi-box-arrow-up-right"></i>
          <span>View site</span>
        </a>

        <div className="admin-topbar-profile-wrap" ref={profileRef}>
          <button
            type="button"
            className={`admin-topbar-profile ${profileOpen ? 'open' : ''}`}
            onClick={() => setProfileOpen((open) => !open)}
            aria-expanded={profileOpen}
            aria-haspopup="menu"
          >
            <span className="admin-avatar">{avatarLetter}</span>

            <span className="admin-topbar-profile-copy">
              <span>{displayName}</span>
              <small>{secondaryText}</small>
            </span>

            <i className="bi bi-chevron-down"></i>
          </button>

          {profileOpen && (
            <div className="admin-profile-menu" role="menu">
              <div className="admin-profile-menu-head">
                <span className="admin-avatar large">{avatarLetter}</span>
                <span>
                  <strong>{displayName}</strong>
                  <small>{secondaryText}</small>
                </span>
              </div>

              <a href="/" role="menuitem">
                <i className="bi bi-house-door"></i>
                Open website
              </a>

              <button type="button" role="menuitem" onClick={onLogout}>
                <i className="bi bi-box-arrow-right"></i>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default AdminTopbar
