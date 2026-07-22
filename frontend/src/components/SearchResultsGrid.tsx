import FadeImage from './FadeImage'
import { useAuth } from '../context/AuthContext'
import type { HomeItem } from '../types/home'

type Props = {
  query: string
  results: HomeItem[]
}

function formatRating(rating?: number | string | null) {
  if (rating === null || rating === undefined || rating === '') return 'N/A'

  const numericRating = Number(rating)

  if (Number.isNaN(numericRating)) return 'N/A'

  return numericRating.toFixed(1)
}

function SearchResultsGrid({ query, results }: Props) {
  const { user } = useAuth()
  const isLoggedIn = Boolean(user)

  return (
    <main className="search-page-main">
      <section className="search-results-header">
        <div>
          <span className="search-eyebrow">Search Results</span>

          <h1>
            {results.length > 0
              ? `Results for “${query}”`
              : `No results for “${query}”`}
          </h1>

          <p>
            {results.length > 0
              ? `${results.length} title${results.length === 1 ? '' : 's'} found`
              : 'Try searching for another movie or TV show.'}
          </p>
        </div>
      </section>

      {results.length > 0 ? (
        <section className="search-results-grid-section">
          <div className="search-results-grid">
            {results.map((item, index) => {
              const detailUrl =
                item.content_type === 'series'
                  ? `/series/${item.id}`
                  : `/movie/${item.id}`

              const year = item.release_date ? item.release_date.slice(0, 4) : ''

              return (
                <a
                  href={detailUrl}
                  className="search-result-card"
                  key={`${item.content_type}-${item.id}`}
                >
                  <div className="search-result-img">
                    <FadeImage
                      src={item.thumbnail_display || item.poster_display}
                      alt={item.title}
                      loading={index < 8 ? 'eager' : 'lazy'}
                      fetchPriority={index < 6 ? 'high' : 'auto'}
                    />

                    <div className="search-result-rating">
                      <i className="bi bi-star-fill"></i>{' '}
                      {formatRating(item.rating)}
                    </div>

                    <div className="search-result-overlay">
                      <div className="search-result-actions">
                        <div className="search-result-play">
                          <i className="bi bi-play-fill"></i>
                        </div>

                        {isLoggedIn && (
                          <button
                            type="button"
                            className="pv-mylist-btn js-mylist-toggle"
                            title="Add to My List"
                            data-item-id={item.id}
                            data-content-type={item.content_type}
                            data-in-list={item.in_my_list ? '1' : '0'}
                            onClick={(event) => {
                              event.preventDefault()
                            }}
                          >
                            <i className="bi bi-plus-lg"></i>
                          </button>
                        )}
                      </div>

                      <div className="search-result-overlay-title">
                        {item.title}
                      </div>
                      <div className="search-result-overlay-meta">{year}</div>
                    </div>
                  </div>

                  <div className="search-result-info">
                    <div className="search-result-title">{item.title}</div>
                    <div className="search-result-meta">
                      {year} • {item.content_type === 'series' ? 'Series' : 'Movie'}
                    </div>
                  </div>
                </a>
              )
            })}
          </div>
        </section>
      ) : (
        <section className="search-empty-state">
          <div className="search-empty-card">
            <i className="bi bi-search"></i>
            <h2>No titles found</h2>
            <p>Check the spelling or try a different movie or show name.</p>
          </div>
        </section>
      )}
    </main>
  )
}

export default SearchResultsGrid