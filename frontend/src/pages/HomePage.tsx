import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'
import HeroSection from '../components/HeroSection'
import CarouselRow from '../components/CarouselRow'
import Footer from '../components/Footer'
import HomeSkeleton from '../components/HomeSkeleton'
import MoreRowsSkeleton from '../components/MoreRowsSkeleton'
import SearchResultsGrid from '../components/SearchResultsGrid'
import { apiGet } from '../services/api'
import type {
  CarouselRowData,
  HomeInitialResponse,
  HomeRowsResponse,
  HomeItem,
  SearchResponse,
} from '../types/home'
import './HomePage.css'

type BrowseMode = 'home' | 'movie' | 'series'

function HomePage() {
  const location = useLocation()

  const searchQueryParam = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return (params.get('search_query') || '').trim()
  }, [location.search])

  const browseMode = useMemo<BrowseMode>(() => {
    if (searchQueryParam) return 'home'

    const params = new URLSearchParams(location.search)
    const category = params.get('category')

    if (category === 'all-movies') return 'movie'
    if (category === 'all-series') return 'series'

    return 'home'
  }, [location.search, searchQueryParam])

  const [pageTitle, setPageTitle] = useState('')
  const [featuredItem, setFeaturedItem] =
    useState<HomeInitialResponse['featured_item']>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<HomeItem[]>([])

  const [rows, setRows] = useState<CarouselRowData[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [moreLoading, setMoreLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [nextOffset, setNextOffset] = useState(0)
  const [failed, setFailed] = useState(false)

  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const didAutoPreloadRef = useRef(false)

  const initialEndpoint = useMemo(() => {
    if (searchQueryParam) {
      return `/api/search?search_query=${encodeURIComponent(searchQueryParam)}`
    }

    if (browseMode === 'movie') {
      return '/api/browse/initial?type=movie&limit=2'
    }

    if (browseMode === 'series') {
      return '/api/browse/initial?type=series&limit=2'
    }

    return '/api/home/initial?limit=2'
  }, [browseMode, searchQueryParam])

  const rowsEndpoint = useCallback(
    (offset: number) => {
      if (browseMode === 'movie') {
        return `/api/browse/rows?type=movie&offset=${offset}&limit=3`
      }

      if (browseMode === 'series') {
        return `/api/browse/rows?type=series&offset=${offset}&limit=3`
      }

      return `/api/home/rows?offset=${offset}&limit=3`
    },
    [browseMode]
  )

  useEffect(() => {
    setInitialLoading(true)
    setMoreLoading(false)
    setFailed(false)
    setRows([])
    setSearchResults([])
    setFeaturedItem(null)
    setNextOffset(0)
    setHasMore(false)
    didAutoPreloadRef.current = false

    if (searchQueryParam) {
      apiGet<SearchResponse>(initialEndpoint)
        .then((response) => {
          setSearchQuery(response.search_query || searchQueryParam)
          setSearchResults(response.results || [])
          setPageTitle('')
        })
        .catch((error) => {
          console.error('SEARCH API ERROR:', error)
          setFailed(true)
        })
        .finally(() => {
          setInitialLoading(false)
        })

      return
    }

    apiGet<HomeInitialResponse>(initialEndpoint)
      .then((response) => {
        setPageTitle(response.page_title || '')
        setFeaturedItem(response.featured_item)
        setSearchQuery(response.search_query || '')
        setRows(response.carousel_rows || [])
        setNextOffset(response.next_offset || 0)
        setHasMore(Boolean(response.has_more))
      })
      .catch((error) => {
        console.error('INITIAL PAGE API ERROR:', error)
        setFailed(true)
      })
      .finally(() => {
        setInitialLoading(false)
      })
  }, [initialEndpoint, searchQueryParam])

  const loadMoreRows = useCallback(async () => {
    if (searchQueryParam || moreLoading || !hasMore) return

    setMoreLoading(true)

    try {
      const response = await apiGet<HomeRowsResponse>(rowsEndpoint(nextOffset))

      setRows((currentRows) => [
        ...currentRows,
        ...(response.carousel_rows || []),
      ])

      setNextOffset(response.next_offset || nextOffset)
      setHasMore(Boolean(response.has_more))
    } catch (error) {
      console.error('MORE ROWS API ERROR:', error)
    } finally {
      setMoreLoading(false)
    }
  }, [hasMore, moreLoading, nextOffset, rowsEndpoint, searchQueryParam])

  useEffect(() => {
    if (
      searchQueryParam ||
      didAutoPreloadRef.current ||
      initialLoading ||
      rows.length === 0 ||
      !hasMore
    ) {
      return
    }

    didAutoPreloadRef.current = true

    const timer = window.setTimeout(() => {
      loadMoreRows()
    }, 700)

    return () => {
      window.clearTimeout(timer)
    }
  }, [searchQueryParam, initialLoading, rows.length, hasMore, loadMoreRows])

  useEffect(() => {
    if (searchQueryParam) return

    const element = loadMoreRef.current

    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0]

        if (firstEntry.isIntersecting) {
          loadMoreRows()
        }
      },
      {
        root: null,
        rootMargin: '700px',
        threshold: 0,
      }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [loadMoreRows, searchQueryParam])

  if (initialLoading) {
    return (
      <>
        <Navbar />
        <HomeSkeleton />
      </>
    )
  }

  if (failed) {
    return (
      <>
        <Navbar />

        <main>
          <section className="pv-section" style={{ marginTop: '120px' }}>
            <div
              className="p-4"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-muted)',
              }}
            >
              Failed to load page data.
            </div>
          </section>
        </main>

        <Footer />
      </>
    )
  }

  if (searchQueryParam) {
    return (
      <>
        <Navbar />
        <SearchResultsGrid query={searchQuery} results={searchResults} />
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />

      <HeroSection featuredItem={featuredItem} searchQuery={searchQuery} />

      {pageTitle && (
        <section className="browse-page-label">
          <span>{pageTitle}</span>
        </section>
      )}

      <main className="pv-sections-wrap">
        {rows.length > 0 ? (
          rows.map((row, index) => (
            <div
              key={`${browseMode}-${row.title}-${index}`}
              className={index === 0 ? 'pv-first-row' : undefined}
            >
              <CarouselRow
                row={row}
                index={index + 1}
              />
            </div>
          ))
        ) : (
          <section className="pv-section" style={{ marginTop: '30px' }}>
            <div
              className="p-4"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-muted)',
              }}
            >
              Nothing to show right now.
            </div>
          </section>
        )}
      </main>

      {moreLoading && <MoreRowsSkeleton />}

      <div ref={loadMoreRef} style={{ height: '1px' }} />

      <Footer />
    </>
  )
}

export default HomePage