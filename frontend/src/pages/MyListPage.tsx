import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { apiGet } from '../services/api'
import './MyListPage.css'

type ContentType = 'movie' | 'series'
type FilterType = 'all' | ContentType

type MyListItem = {
  id: string
  title: string
  description?: string | null
  release_date?: string | null
  genre?: string | null
  content_type: ContentType
  display_thumbnail?: string | null
  thumbnail_display?: string | null
  poster_display?: string | null
  poster_url?: string | null
  backdrop_display?: string | null
  saved_at?: string | null
}

type MyListResponse = {
  success: boolean
  items: MyListItem[]
}

type ToggleMyListResponse = {
  success: boolean
  in_list: boolean
  message?: string
}

const API_BASE_URL = ''

const POSTER_FALLBACK =
  'https://placehold.co/300x450/111111/a3a3a3?text=No+Image'

function resolveMediaUrl(url?: string | null, fallback = POSTER_FALLBACK) {
  if (!url) return fallback

  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url
  }

  if (url.startsWith('/')) {
    return `${API_BASE_URL}${url}`
  }

  return url
}

function getYear(date?: string | null) {
  if (!date) return ''
  return date.slice(0, 4)
}

function getItemPoster(item: MyListItem) {
  return resolveMediaUrl(
    item.display_thumbnail ||
      item.thumbnail_display ||
      item.poster_display ||
      item.poster_url,
    POSTER_FALLBACK
  )
}

function getDetailUrl(item: MyListItem) {
  return item.content_type === 'series' ? `/series/${item.id}` : `/movie/${item.id}`
}

function MyListPage() {
  const [items, setItems] = useState<MyListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [removingKey, setRemovingKey] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    setLoading(true)
    setFailed(false)

    apiGet<MyListResponse>('/api/my-list')
      .then((response) => {
        setItems(response.items || [])
      })
      .catch((error) => {
        console.error('MY LIST API ERROR:', error)
        setFailed(true)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!toast) return

    const timer = window.setTimeout(() => {
      setToast('')
    }, 2800)

    return () => window.clearTimeout(timer)
  }, [toast])

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return items.filter((item) => {
      const matchesFilter = filter === 'all' || item.content_type === filter
      const matchesSearch =
        !query ||
        item.title.toLowerCase().includes(query) ||
        (item.genre || '').toLowerCase().includes(query)

      return matchesFilter && matchesSearch
    })
  }, [items, filter, searchQuery])

  const handleRemove = async (item: MyListItem) => {
    const contentId = String(item.id || '').trim()
    const contentType = String(item.content_type || '').trim().toLowerCase()

    if (!contentId || (contentType !== 'movie' && contentType !== 'series')) {
      console.error('INVALID MY LIST ITEM:', item)
      setToast('Unable to remove this title.')
      return
    }

    const key = `${contentType}-${contentId}`

    if (removingKey) return

    const previousItems = items

    setRemovingKey(key)
    setItems((currentItems) =>
      currentItems.filter(
        (currentItem) =>
          !(
            String(currentItem.id) === contentId &&
            String(currentItem.content_type).toLowerCase() === contentType
          )
      )
    )

    try {
      const response = await fetch(`${API_BASE_URL}/api/my-list/toggle`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content_id: contentId,
          content_type: contentType,
        }),
      })

      const data = (await response.json().catch(() => null)) as
        | ToggleMyListResponse
        | null

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Unable to remove item.')
      }

      setToast(`${item.title} removed from My List.`)
    } catch (error) {
      console.error('REMOVE FROM MY LIST ERROR:', error)
      setItems(previousItems)
      setToast('Unable to remove this title. Please try again.')
    } finally {
      setRemovingKey(null)
    }
  }

  return (
    <>
      <Navbar />

      <main className="my-list-page">
        <header className="my-list-header">
          <div className="my-list-container">
            <h1>My List</h1>
            <p>Movies and series you have saved to watch later.</p>
          </div>
        </header>

        <section className="my-list-content">
          <div className="my-list-container">
            {loading && (
              <div className="my-list-grid" aria-label="Loading My List">
                {Array.from({ length: 12 }).map((_, index) => (
                  <div className="my-list-skeleton-card" key={index}>
                    <div className="my-list-skeleton-poster"></div>
                    <div className="my-list-skeleton-line"></div>
                    <div className="my-list-skeleton-line short"></div>
                  </div>
                ))}
              </div>
            )}

            {!loading && failed && (
              <div className="my-list-empty">
                <i className="bi bi-exclamation-circle" aria-hidden="true"></i>
                <h2>My List is unavailable</h2>
                <p>Refresh the page and try again.</p>

                <button
                  type="button"
                  className="my-list-primary-btn"
                  onClick={() => window.location.reload()}
                >
                  Refresh
                </button>
              </div>
            )}

            {!loading && !failed && items.length === 0 && (
              <div className="my-list-empty">
                <i className="bi bi-plus-lg" aria-hidden="true"></i>
                <h2>Your list is empty</h2>
                <p>Add movies and series to find them here later.</p>

                <Link to="/" className="my-list-primary-btn">
                  Browse titles
                </Link>
              </div>
            )}

            {!loading && !failed && items.length > 0 && (
              <>
                <div className="my-list-toolbar">
                  <div className="my-list-filters" aria-label="Filter My List">
                    <button
                      type="button"
                      className={filter === 'all' ? 'active' : ''}
                      aria-pressed={filter === 'all'}
                      onClick={() => setFilter('all')}
                    >
                      All
                    </button>

                    <button
                      type="button"
                      className={filter === 'movie' ? 'active' : ''}
                      aria-pressed={filter === 'movie'}
                      onClick={() => setFilter('movie')}
                    >
                      Movies
                    </button>

                    <button
                      type="button"
                      className={filter === 'series' ? 'active' : ''}
                      aria-pressed={filter === 'series'}
                      onClick={() => setFilter('series')}
                    >
                      TV Shows
                    </button>
                  </div>

                  <label className="my-list-search">
                    <i className="bi bi-search" aria-hidden="true"></i>
                    <span className="visually-hidden">Search My List</span>
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search My List"
                    />
                  </label>
                </div>

                {filteredItems.length === 0 ? (
                  <div className="my-list-no-results">
                    <h2>No titles found</h2>
                    <p>Change the filter or search for another title.</p>
                  </div>
                ) : (
                  <div className="my-list-grid">
                    {filteredItems.map((item) => {
                      const removeKey = `${item.content_type}-${item.id}`
                      const isRemoving = removingKey === removeKey
                      const detailUrl = getDetailUrl(item)

                      return (
                        <article className="my-list-card" key={removeKey}>
                          <Link to={detailUrl} className="my-list-poster-link">
                            <div className="my-list-poster-wrap">
                              <img
                                src={getItemPoster(item)}
                                alt={item.title}
                                loading="lazy"
                                onError={(event) => {
                                  event.currentTarget.src = POSTER_FALLBACK
                                }}
                              />

                              <div className="my-list-card-overlay" aria-hidden="true">
                                <span className="my-list-play-btn">
                                  <i className="bi bi-play-fill"></i>
                                </span>
                              </div>
                            </div>
                          </Link>

                          <button
                            type="button"
                            className="my-list-remove-btn"
                            aria-label={`Remove ${item.title} from My List`}
                            title="Remove from My List"
                            disabled={isRemoving}
                            onClick={() => handleRemove(item)}
                          >
                            {isRemoving ? (
                              <i className="bi bi-arrow-repeat"></i>
                            ) : (
                              <i className="bi bi-x-lg"></i>
                            )}
                          </button>

                          <div className="my-list-card-info">
                            <Link to={detailUrl}>
                              <h2>{item.title}</h2>
                            </Link>

                            <div className="my-list-card-meta">
                              {item.release_date && <span>{getYear(item.release_date)}</span>}
                              {item.release_date && <span className="my-list-dot"></span>}
                              <span>{item.content_type === 'series' ? 'TV Series' : 'Movie'}</span>
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {toast && (
          <div className="my-list-toast" role="status" aria-live="polite">
            <i className="bi bi-check-circle-fill" aria-hidden="true"></i>
            <span>{toast}</span>
          </div>
        )}
      </main>

      <Footer />
    </>
  )
}

export default MyListPage