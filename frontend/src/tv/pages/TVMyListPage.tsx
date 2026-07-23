import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '../../services/api'
import type { HomeItem } from '../../types/home'
import TVCard from '../components/TVCard'
import TVErrorState from '../components/TVErrorState'
import TVLoading from '../components/TVLoading'
import TVShell from '../components/TVShell'
import type { TVMyListResponse } from '../types'
import { normalizeMyListItem } from '../utils'

const GRID_COLUMNS = 5

function TVMyListPage() {
  const [items, setItems] = useState<HomeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const loadList = useCallback(() => {
    setLoading(true)
    setFailed(false)

    apiGet<TVMyListResponse>('/api/my-list')
      .then((response) => {
        setItems((response.items || []).map(normalizeMyListItem))
      })
      .catch((error) => {
        console.error('TV MY LIST API ERROR:', error)
        setFailed(true)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    // The initial route load starts the API request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadList()
  }, [loadList])

  return (
    <TVShell>
      <section className="tv-library-page">
        <header className="tv-page-header">
          <p className="tv-kicker">Saved for later</p>
          <h1>My List</h1>
        </header>

        {loading ? (
          <TVLoading label="Loading My List" />
        ) : failed ? (
          <TVErrorState
            title="My List could not load"
            message="Check the network connection and try again."
            onRetry={loadList}
          />
        ) : items.length === 0 ? (
          <div className="tv-empty-state">
            <h2>Your list is empty</h2>
            <p>Add movies and series from their details screen.</p>
          </div>
        ) : (
          <div className="tv-card-grid">
            {items.map((item, index) => (
              <TVCard
                key={`${item.content_type}-${item.id}`}
                item={item}
                rowIndex="my-list"
                itemIndex={index}
                autofocus={index === 0}
                group={`my-list-grid-${Math.floor(index / GRID_COLUMNS)}`}
              />
            ))}
          </div>
        )}
      </section>
    </TVShell>
  )
}

export default TVMyListPage
