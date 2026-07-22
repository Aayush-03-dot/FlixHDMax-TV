import type { ReactNode } from 'react'
import { useTVRemoteNavigation } from '../hooks/useTVRemoteNavigation'
import TVDocumentMetadata from './TVDocumentMetadata'

function TVStandalonePage({ children }: { children: ReactNode }) {
  useTVRemoteNavigation()

  return (
    <div className="tv-standalone-page">
      <TVDocumentMetadata />
      {children}
    </div>
  )
}

export default TVStandalonePage
