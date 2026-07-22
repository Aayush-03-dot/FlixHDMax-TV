import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { tvPath } from '../utils'
import TVStandalonePage from './TVStandalonePage'
import TVLoading from './TVLoading'

function TVProtectedRoute({ children }: { children: ReactNode }) {
  const { authenticated, loading } = useAuth()

  if (loading) {
    return (
      <TVStandalonePage>
        <TVLoading label="Starting FlixHDMax TV" />
      </TVStandalonePage>
    )
  }

  if (!authenticated) {
    return <Navigate to={tvPath('/login')} replace />
  }

  return children
}

export default TVProtectedRoute
