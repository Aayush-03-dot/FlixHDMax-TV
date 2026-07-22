import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { apiGet } from '../services/api'
import './MovieDetailPage.css'

type CastMember = {
  name: string
  profile_path?: string | null
}

type RelatedItem = {
  id: string
  title: string
  content_type: 'movie' | 'series'
  release_date?: string | null
  thumbnail_display?: string | null
  poster_display?: string | null
  backdrop_display?: string | null
}

type MovieDetailItem = {
  id: string
  tmdb_id?: string | null
  title: string
  description?: string | null
  embed_code?: string | null
  poster_url?: string | null
  backdrop_url?: string | null
  thumbnail?: string | null
  release_date?: string | null
  director?: string | null
  genre?: string | null
  genre_list?: string[]
  cast?: CastMember[]
  download_url?: string | null
  content_type: 'movie'
  display_thumbnail?: string | null
  poster_display?: string | null
  backdrop_display?: string | null
  video_source_type?: 'iframe' | 'hosted'
  hosted_video_id?: string | null
  hosted_watch_url?: string | null
}

type MovieDetailResponse = {
  success: boolean
  item: MovieDetailItem
  cast: CastMember[]
  director?: string | null
  related_items: RelatedItem[]
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5000'

const POSTER_FALLBACK =
  'https://via.placeholder.com/280x420/181818/858585.png?text=No+Poster'

const RELATED_FALLBACK =
  'https://via.placeholder.com/140x210/181818/858585.png?text=N/A'

const CAST_FALLBACK =
  'https://via.placeholder.com/80x80/333333/858585.png?text=?'

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

function resolveBackendUrl(url: string) {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  if (url.startsWith('/')) {
    return `${BACKEND_BASE_URL}${url}`
  }

  return `${BACKEND_BASE_URL}/${url}`
}

function getYear(date?: string | null) {
  if (!date) return ''
  return date.slice(0, 4)
}

function MovieDetailPage() {
  const { movieId } = useParams()

  const [item, setItem] = useState<MovieDetailItem | null>(null)
  const [cast, setCast] = useState<CastMember[]>([])
  const [relatedItems, setRelatedItems] = useState<RelatedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!movieId) return

    setLoading(true)
    setFailed(false)

    apiGet<MovieDetailResponse>(`/api/movie/${movieId}`)
      .then((response) => {
        setItem(response.item)
        setCast(response.cast || response.item.cast || [])
        setRelatedItems(response.related_items || [])
      })
      .catch((error) => {
        console.error('MOVIE DETAIL API ERROR:', error)
        setFailed(true)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [movieId])

  const posterUrl = useMemo(() => {
    return resolveMediaUrl(
      item?.poster_display || item?.poster_url || item?.display_thumbnail
    )
  }, [item])

  const backdropUrl = useMemo(() => {
    return resolveMediaUrl(
      item?.backdrop_display || item?.backdrop_url || item?.poster_display,
      ''
    )
  }, [item])

  const genres = item?.genre_list?.length
    ? item.genre_list
    : item?.genre
      ? item.genre
          .split(',')
          .map((genre) => genre.trim())
          .filter(Boolean)
      : []

  const hasHostedPlayer = Boolean(
    item?.video_source_type === 'hosted' &&
      (item?.hosted_watch_url || item?.hosted_video_id)
  )

  const hasIframePlayer = Boolean(
    item?.embed_code &&
      (item?.video_source_type !== 'hosted' || !hasHostedPlayer)
  )

  const hostedWatchUrl = useMemo(() => {
    if (!item) return '#'

    const rawHostedUrl =
      item.hosted_watch_url ||
      (item.hosted_video_id ? `/watch/hosted/${item.hosted_video_id}` : '')

    if (!rawHostedUrl) return '#'

    const backendHostedUrl = resolveBackendUrl(rawHostedUrl)

    const params = new URLSearchParams({
      back: `/movie/${item.id}`,
      title: item.title,
    })

    const separator = backendHostedUrl.includes('?') ? '&' : '?'

    return `${backendHostedUrl}${separator}${params.toString()}`
  }, [item])

  const handleIframePlay = () => {
    const section = document.getElementById('movie-player-section')

    if (section) {
      section.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />

        <main className="movie-detail-page">
          <section className="movie-detail-loading">
            <div className="movie-detail-loading-card">
              <div className="movie-detail-loading-poster" />

              <div className="movie-detail-loading-lines">
                <span />
                <span />
                <span />
              </div>
            </div>
          </section>
        </main>
      </>
    )
  }

  if (failed || !item) {
    return (
      <>
        <Navbar />

        <main className="movie-detail-page">
          <section className="movie-detail-error">
            <h1>Movie not available</h1>
            <p>We could not load this movie right now.</p>

            <Link to="/" className="md-btn md-btn-primary">
              Back to Home
            </Link>
          </section>
        </main>

        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />

      <main className="movie-detail-page">
        <section
          className="movie-detail-hero"
          style={{
            backgroundImage: backdropUrl ? `url("${backdropUrl}")` : undefined,
          }}
        >
          <div className="md-container">
            <div className="movie-detail-hero-content">
              <div className="movie-detail-poster">
                <img
                  src={posterUrl}
                  alt={`${item.title} Poster`}
                  onError={(event) => {
                    event.currentTarget.src = POSTER_FALLBACK
                  }}
                />
              </div>

              <div className="movie-detail-hero-info">
                <h1>{item.title}</h1>

                <div className="movie-detail-meta">
                  {item.release_date && (
                    <span>
                      <i className="bi bi-calendar3"></i>
                      {getYear(item.release_date)}
                    </span>
                  )}
                </div>

                <div className="movie-detail-genres">
                  {genres.length > 0 ? (
                    genres.map((genre) => <span key={genre}>{genre}</span>)
                  ) : (
                    <span>N/A</span>
                  )}
                </div>

                <p className="movie-detail-description">
                  {item.description || 'No detailed description available.'}
                </p>

                <div className="movie-detail-actions">
                  {hasHostedPlayer ? (
                    <a
                      href={hostedWatchUrl}
                      className="md-btn md-btn-primary"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <i className="bi bi-play-circle-fill"></i>
                      Play Movie
                    </a>
                  ) : (
                    <button
                      type="button"
                      className="md-btn md-btn-primary"
                      onClick={handleIframePlay}
                    >
                      <i className="bi bi-play-circle-fill"></i>
                      Play Movie
                    </button>
                  )}

                  {item.download_url ? (
                    <a
                      href={item.download_url}
                      className="md-btn md-btn-download"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <i className="bi bi-download"></i>
                      Download Movie
                    </a>
                  ) : (
                    <span className="md-btn md-btn-download disabled">
                      <i className="bi bi-download"></i>
                      Download Movie
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {hasIframePlayer && (
          <section
            className="md-page-section md-player-section"
            id="movie-player-section"
          >
            <div className="md-container">
              <h2 className="md-section-heading">
                <i className="bi bi-film"></i>
                Watch Now
              </h2>

              <div
                className="md-player-container"
                dangerouslySetInnerHTML={{ __html: item.embed_code || '' }}
              />
            </div>
          </section>
        )}

        {!hasHostedPlayer && !hasIframePlayer && (
          <section
            className="md-page-section md-player-section"
            id="movie-player-section"
          >
            <div className="md-container">
              <h2 className="md-section-heading">
                <i className="bi bi-film"></i>
                Watch Now
              </h2>

              <div className="md-player-empty">
                <i className="bi bi-exclamation-triangle"></i>
                <h3>Video not available</h3>
                <p>This title is not available to watch right now.</p>
              </div>
            </div>
          </section>
        )}

        <section className="md-page-section md-overview-section">
          <div className="md-container">
            <h2 className="md-section-heading">
              <i className="bi bi-info-lg"></i>
              Overview & Details
            </h2>

            <div className="md-full-synopsis">
              <p>{item.description || 'No detailed description available.'}</p>
            </div>

            <div className="md-details-grid">
              <div className="md-detail-item">
                <strong>Title:</strong>
                <span>{item.title}</span>
              </div>

              <div className="md-detail-item">
                <strong>Release Date:</strong>
                <span>{item.release_date || 'N/A'}</span>
              </div>

              <div className="md-detail-item">
                <strong>Genres:</strong>
                <span>{item.genre || 'N/A'}</span>
              </div>

              <div className="md-detail-item">
                <strong>Director:</strong>
                <span>{item.director || 'N/A'}</span>
              </div>
            </div>

            <h3 className="md-section-heading md-cast-heading">
              <i className="bi bi-people-fill"></i>
              Cast
            </h3>

            <div className="md-cast-grid">
              {cast.length > 0 ? (
                cast.map((actor, index) => {
                  const actorInitial =
                    actor.name?.charAt(0)?.toUpperCase() || '?'

                  const actorImage = actor.profile_path
                    ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
                    : CAST_FALLBACK.replace('?', actorInitial)

                  return (
                    <div className="md-cast-member" key={`${actor.name}-${index}`}>
                      <img
                        src={actorImage}
                        alt={actor.name}
                        onError={(event) => {
                          event.currentTarget.src = CAST_FALLBACK.replace(
                            '?',
                            actorInitial
                          )
                        }}
                      />

                      <div>{actor.name}</div>
                    </div>
                  )
                })
              ) : (
                <p className="md-muted-text">No cast information available.</p>
              )}
            </div>
          </div>
        </section>

        {relatedItems.length > 0 && (
          <section className="md-page-section md-related-section">
            <div className="md-container">
              <h2 className="md-section-heading">
                <i className="bi bi-collection-play-fill"></i>
                You Might Also Like
              </h2>

              <div className="md-related-grid">
                {relatedItems.map((related) => {
                  const relatedUrl =
                    related.content_type === 'series'
                      ? `/series/${related.id}`
                      : `/movie/${related.id}`

                  return (
                    <Link
                      to={relatedUrl}
                      className="md-related-card"
                      key={`${related.content_type}-${related.id}`}
                    >
                      <img
                        src={resolveMediaUrl(
                          related.thumbnail_display || related.poster_display,
                          RELATED_FALLBACK
                        )}
                        alt={`${related.title} Poster`}
                        onError={(event) => {
                          event.currentTarget.src = RELATED_FALLBACK
                        }}
                      />

                      <div className="md-related-info">
                        <p>{related.title}</p>

                        {related.release_date && (
                          <span>{getYear(related.release_date)}</span>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </>
  )
}

export default MovieDetailPage