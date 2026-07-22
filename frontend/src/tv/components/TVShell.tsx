import type { ReactNode } from 'react'
import { useTVRemoteNavigation } from '../hooks/useTVRemoteNavigation'
import TVDocumentMetadata from './TVDocumentMetadata'
import TVSidebar from './TVSidebar'

function TVShell({ children }: { children: ReactNode }) {
  useTVRemoteNavigation()

  return (
    <div className="tv-app-shell">
      <TVDocumentMetadata />
      <TVSidebar />
      <main className="tv-main-content">{children}</main>
    </div>
  )
}

export default TVShell
