import { Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiGet } from '../../services/api'
import type { HomeItem, SearchResponse } from '../../types/home'
import TVCard from '../components/TVCard'
import TVErrorState from '../components/TVErrorState'
import TVLoading from '../components/TVLoading'
import TVShell from '../components/TVShell'

function TVSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryFromUrl = useMemo(
    () => (searchParams.get('q') || '').trim(),
    [searchParams]
  )

  const [query, setQuery] = useState(queryFromUrl)
  const [results, setResults] = useState<HomeItem[]>([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [hasSearched, setHasSearched] = useState(Boolean(queryFromUrl))

  const runSearch = (value: string) => {
    const normalized = value.trim()

    setHasSearched(Boolean(normalized))
    setFailed(false)

    if (!normalized) {
      setResults([])
      setSearchParams({})
      return
    }

    setLoading(true)
    setSearchParams({ q: normalized })

    apiGet<SearchResponse>(`/api/search?q=${encodeURIComponent(normalized)}`)
      .then((response) => setResults(response.results || []))
      .catch((error) => {
        console.error('TV SEARCH API ERROR:', error)
        setFailed(true)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    // Keep the remote search field synchronized with browser history.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery(queryFromUrl)

    if (queryFromUrl) {
      runSearch(queryFromUrl)
    }
    // Search URL is the source of truth. runSearch intentionally stays out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryFromUrl])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    runSearch(query)
  }

  return (
    <TVShell>
      <section className="tv-library-page tv-search-page">
        <header className="tv-page-header">
          <p className="tv-kicker">Find something to watch</p>
          <h1>Search</h1>
        </header>

        <form className="tv-search-form" onSubmit={handleSubmit}>
          <Search aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Movies, series, actors or genres"
            autoComplete="off"
            data-tv-focusable="true"
            data-tv-autofocus="true"
            data-tv-key="search-input"
          />

          {query && (
            <button
              type="button"
              className="tv-icon-button tv-focusable"
              onClick={() => {
                setQuery('')
                setResults([])
                setHasSearched(false)
                setSearchParams({})
              }}
              data-tv-focusable="true"
              data-tv-key="search-clear"
              aria-label="Clear search"
            >
              <X aria-hidden="true" />
            </button>
          )}

          <button
            type="submit"
            className="tv-primary-button tv-focusable"
            data-tv-focusable="true"
            data-tv-key="search-submit"
          >
            Search
          </button>
        </form>

        <p className="tv-search-hint">
          Select the search field to open the television keyboard.
        </p>

        {loading ? (
          <TVLoading label="Searching" />
        ) : failed ? (
          <TVErrorState
            title="Search failed"
            message="FlixHDMax could not complete this search."
            onRetry={() => runSearch(query)}
          />
        ) : hasSearched && results.length === 0 ? (
          <div className="tv-empty-state">
            <h2>No matches found</h2>
            <p>Try a shorter title or another spelling.</p>
          </div>
        ) : (
          <div className="tv-card-grid">
            {results.map((item, index) => (
              <TVCard
                key={`${item.content_type}-${item.id}`}
                item={item}
                rowIndex="search"
                itemIndex={index}
              />
            ))}
          </div>
        )}
      </section>
    </TVShell>
  )
}

export default TVSearchPage
