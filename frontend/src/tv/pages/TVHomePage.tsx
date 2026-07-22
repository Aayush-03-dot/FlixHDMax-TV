import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import TVContentRow from '../components/TVContentRow'
import TVErrorState from '../components/TVErrorState'
import TVHero from '../components/TVHero'
import TVLoading from '../components/TVLoading'
import TVShell from '../components/TVShell'
import { apiGet } from '../../services/api'
import type {
  CarouselRowData,
  HomeInitialResponse,
  HomeRowsResponse,
} from '../../types/home'

type TVBrowseMode = 'home' | 'movie' | 'series'

function TVHomePage({ mode = 'home' }: { mode?: TVBrowseMode }) {
  const [featuredItem, setFeaturedItem] = useState<HomeInitialResponse['featured_item']>(null)
  const [rows, setRows] = useState<CarouselRowData[]>([])
  const [nextOffset, setNextOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [failed, setFailed] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const pageTitle = mode === 'movie' ? 'Movies' : mode === 'series' ? 'TV Shows' : ''

  const initialEndpoint = useMemo(() => {
    if (mode === 'movie') return '/api/browse/initial?type=movie&limit=5'
    if (mode === 'series') return '/api/browse/initial?type=series&limit=5'
    return '/api/home/initial?limit=5'
  }, [mode])

  const rowsEndpoint = useCallback(
    (offset: number) => {
      if (mode === 'movie') {
        return `/api/browse/rows?type=movie&offset=${offset}&limit=5`
      }

      if (mode === 'series') {
        return `/api/browse/rows?type=series&offset=${offset}&limit=5`
      }

      return `/api/home/rows?offset=${offset}&limit=5`
    },
    [mode]
  )

  const loadInitial = useCallback(() => {
    setLoading(true)
    setFailed(false)
    setRows([])
    setFeaturedItem(null)

    apiGet<HomeInitialResponse>(initialEndpoint)
      .then((response) => {
        setFeaturedItem(response.featured_item)
        setRows(response.carousel_rows || [])
        setNextOffset(response.next_offset || 0)
        setHasMore(Boolean(response.has_more))
      })
      .catch((error) => {
        console.error('TV HOME API ERROR:', error)
        setFailed(true)
      })
      .finally(() => setLoading(false))
  }, [initialEndpoint])

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return

    setLoadingMore(true)

    apiGet<HomeRowsResponse>(rowsEndpoint(nextOffset))
      .then((response) => {
        setRows((current) => [...current, ...(response.carousel_rows || [])])
        setNextOffset(response.next_offset || nextOffset)
        setHasMore(Boolean(response.has_more))
      })
      .catch((error) => {
        console.error('TV HOME ROWS API ERROR:', error)
      })
      .finally(() => setLoadingMore(false))
  }, [hasMore, loadingMore, nextOffset, rowsEndpoint])

  useEffect(() => {
    // Loading is intentionally reset when the browse mode changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInitial()
  }, [loadInitial])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMore()
        }
      },
      { rootMargin: '600px 0px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadMore])

  const firstCardKey =
    rows[0]?.items[0]
      ? `card-0-${rows[0].items[0].content_type}-${rows[0].items[0].id}`
      : undefined

  return (
    <TVShell>
      {loading ? (
        <TVLoading label={`Loading ${pageTitle || 'FlixHDMax'}`} />
      ) : failed ? (
        <TVErrorState
          title="FlixHDMax could not load"
          message="Check the network connection and try again."
          onRetry={loadInitial}
        />
      ) : (
        <div className="tv-home-page">
          {featuredItem && (
            <TVHero
              key={`${featuredItem.content_type}-${featuredItem.id}`}
              item={featuredItem}
              nextDownKey={firstCardKey}
            />
          )}

          <div className={`tv-rows${featuredItem ? '' : ' tv-rows-without-hero'}`}>
            {pageTitle && <h1 className="tv-page-title">{pageTitle}</h1>}

            {rows.map((row, rowIndex) => (
              <TVContentRow
                key={`${row.title}-${rowIndex}`}
                row={row}
                rowIndex={rowIndex}
                autofocusFirst={!featuredItem && rowIndex === 0}
                featured={mode === 'home' && rowIndex === 0}
                heroAbove={Boolean(featuredItem) && rowIndex === 0}
              />
            ))}

            <div ref={sentinelRef} className="tv-load-sentinel" aria-hidden="true" />
            {loadingMore && <div className="tv-loading-more">Loading more titles</div>}
          </div>
        </div>
      )}
    </TVShell>
  )
}

export default TVHomePage
