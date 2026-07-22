import type { AdminStats, AdminTab } from './adminTypes'

type NavGroup = {
  label?: string
  items: {
    tab: AdminTab
    label: string
    icon: string
    badgeKey?: keyof AdminStats
  }[]
}

type Props = {
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  navGroups: NavGroup[]
  currentTab: AdminTab
  stats: AdminStats
  onTabChange: (tab: AdminTab) => void
  onToggleSidebarCollapsed: () => void
}

function AdminSidebar({
  sidebarOpen,
  sidebarCollapsed,
  navGroups,
  currentTab,
  stats,
  onTabChange,
  onToggleSidebarCollapsed,
}: Props) {
  const appVersion = __APP_VERSION__

  return (
    <aside
      className={`admin-sidebar ${sidebarOpen ? 'open' : ''} ${
        sidebarCollapsed ? 'collapsed' : ''
      }`}
    >
      <div className="admin-sidebar-brand-row">
        <a href="/" className="admin-sidebar-brand" aria-label="FlixHDMax">
          <span className="admin-sidebar-logo-placeholder">
            <img
              src="/admin-logo.png"
              alt=""
              onError={(event) => {
                event.currentTarget.style.display = 'none'
              }}
            />
            <span>F</span>
          </span>

          <span className="admin-sidebar-brand-copy">
            <span className="admin-sidebar-brand-name">FlixHDMax</span>
            <span className="admin-app-version">{appVersion}</span>
          </span>
        </a>

        <button
          type="button"
          className="admin-sidebar-collapse-btn"
          onClick={onToggleSidebarCollapsed}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <i
            className={`bi ${
              sidebarCollapsed ? 'bi-chevron-right' : 'bi-chevron-left'
            }`}
          ></i>
        </button>
      </div>

      <nav className="admin-nav-body" aria-label="Admin navigation">
        {navGroups.map((group, groupIndex) => (
          <div
            className="admin-nav-group"
            key={group.label || `group-${groupIndex}`}
          >
            {group.label && (
              <div className="admin-nav-section-label">{group.label}</div>
            )}

            {group.items.map((item) => {
              const badgeValue = item.badgeKey ? stats[item.badgeKey] : 0

              return (
                <button
                  key={item.tab}
                  type="button"
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`admin-nav-link ${
                    currentTab === item.tab ? 'active' : ''
                  }`}
                  onClick={() => onTabChange(item.tab)}
                >
                  <span className="admin-nav-left">
                    <i className={`bi ${item.icon}`}></i>
                    <span className="admin-nav-label">{item.label}</span>
                  </span>

                  {Boolean(badgeValue) && (
                    <span className="admin-nav-badge">{badgeValue}</span>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

     
    </aside>
  )
}

export default AdminSidebar
