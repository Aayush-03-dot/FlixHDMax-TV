import { Check, ListPlus, Play, Star } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { apiGet } from '../../services/api'
import type { CarouselRowData } from '../../types/home'
import { isInMyList, toggleTVMyList } from '../api'
import TVContentRow from '../components/TVContentRow'
import TVErrorState from '../components/TVErrorState'
import TVLoading from '../components/TVLoading'
import TVShell from '../components/TVShell'
import type { TVMovieDetail, TVMovieDetailResponse } from '../types'
import {
  formatRating,
  getPosterArtwork,
  getYear,
  resolveMediaUrl,
  tvPath,
} from '../utils'

function TVMovieDetailPage() {
  const { movieId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const autoplayHandled = useRef(false)
  const [item, setItem] = useState<TVMovieDetail | null>(null)
  const [relatedRow, setRelatedRow] = useState<CarouselRowData | null>(null)
  const [inMyList, setInMyList] = useState(false)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [listBusy, setListBusy] = useState(false)

  const loadMovie = useCallback(() => {
    if (!movieId) return

    setLoading(true)
    setFailed(false)

    Promise.all([
      apiGet<TVMovieDetailResponse>(`/api/movie/${movieId}`),
      isInMyList('movie', movieId).catch(() => false),
    ])
      .then(([response, saved]) => {
        setItem(response.item)
        setInMyList(saved)
        setRelatedRow({
          title: 'More like this',
          items: response.related_items || [],
        })
      })
      .catch((error) => {
        console.error('TV MOVIE DETAIL ERROR:', error)
        setFailed(true)
      })
      .finally(() => setLoading(false))
  }, [movieId])

  useEffect(() => {
    // Route changes start a fresh detail request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMovie()
  }, [loadMovie])

  const genres = useMemo(() => {
    if (item?.genre_list?.length) return item.genre_list
    return (item?.genre || '')
      .split(',')
      .map((genre) => genre.trim())
      .filter(Boolean)
  }, [item])

  const handlePlay = useCallback(() => {
    if (!item) return

    if (item.video_source_type === 'hosted' && item.hosted_video_id) {
      const params = new URLSearchParams({ title: item.title })
      navigate(
        tvPath(`/player/hosted/${encodeURIComponent(item.hosted_video_id)}?${params.toString()}`)
      )
      return
    }

    if (item.embed_code) {
      navigate(tvPath(`/player/movie/${item.id}`))
      return
    }

    navigate(tvPath('/video-unavailable'))
  }, [item, navigate])

  useEffect(() => {
    if (!item || autoplayHandled.current) return

    const shouldPlay = new URLSearchParams(location.search).get('play') === '1'
    if (!shouldPlay) return

    autoplayHandled.current = true
    handlePlay()
  }, [handlePlay, item, location.search])

  const handleListToggle = async () => {
    if (!item || listBusy) return

    setListBusy(true)
    try {
      setInMyList(await toggleTVMyList('movie', item.id))
    } catch (error) {
      console.error('TV MY LIST TOGGLE ERROR:', error)
    } finally {
      setListBusy(false)
    }
  }

  return (
    <TVShell>
      {loading ? (
        <TVLoading label="Loading movie" />
      ) : failed || !item ? (
        <TVErrorState
          title="Movie not available"
          message="FlixHDMax could not load this movie."
          onRetry={loadMovie}
        />
      ) : (
        <div className="tv-detail-page">
          <section className="tv-detail-hero">
            <img
              className="tv-detail-backdrop"
              src={resolveMediaUrl(
                item.backdrop_display || item.backdrop_url || item.poster_display
              )}
              alt=""
            />
            <div className="tv-detail-overlay" />

            <div className="tv-detail-content">
              <img
                className="tv-detail-poster"
                src={getPosterArtwork(item)}
                alt=""
              />

              <div className="tv-detail-copy">
                <p className="tv-kicker">Movie</p>
                <h1>{item.title}</h1>

                <div className="tv-detail-meta">
                  {formatRating(item.rating) && (
                    <span><Star fill="currentColor" aria-hidden="true" />{formatRating(item.rating)}</span>
                  )}
                  {getYear(item.release_date) && <span>{getYear(item.release_date)}</span>}
                  <span className="tv-quality-badge">HD</span>
                </div>

                <p className="tv-detail-description">
                  {item.description || 'No description is available for this title.'}
                </p>

                {genres.length > 0 && (
                  <p className="tv-detail-line">
                    <strong>Genres</strong> {genres.join(' · ')}
                  </p>
                )}

                {item.director && (
                  <p className="tv-detail-line">
                    <strong>Director</strong> {item.director}
                  </p>
                )}

                <div className="tv-detail-actions">
                  <button
                    type="button"
                    className="tv-primary-button tv-focusable"
                    onClick={handlePlay}
                    data-tv-focusable="true"
                    data-tv-autofocus="true"
                    data-tv-key="movie-play"
                  >
                    <Play fill="currentColor" aria-hidden="true" />
                    Play
                  </button>

                  <button
                    type="button"
                    className="tv-secondary-button tv-focusable"
                    onClick={handleListToggle}
                    disabled={listBusy}
                    data-tv-focusable="true"
                    data-tv-key="movie-my-list"
                  >
                    {inMyList ? <Check aria-hidden="true" /> : <ListPlus aria-hidden="true" />}
                    {inMyList ? 'In My List' : 'My List'}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {relatedRow && relatedRow.items.length > 0 && (
            <div className="tv-detail-related">
              <TVContentRow row={relatedRow} rowIndex={90} />
            </div>
          )}
        </div>
      )}
    </TVShell>
  )
}

export default TVMovieDetailPage
