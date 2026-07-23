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
import type {
  TVEpisode,
  TVSeason,
  TVSeriesDetail,
  TVSeriesDetailResponse,
} from '../types'
import {
  formatRating,
  getPosterArtwork,
  getYear,
  resolveMediaUrl,
  tvPath,
} from '../utils'

function firstEpisode(seasons: TVSeason[]) {
  for (const season of seasons) {
    if (season.episodes.length > 0) return season.episodes[0]
  }

  return null
}

function TVSeriesDetailPage() {
  const { seriesId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const autoplayHandled = useRef(false)
  const [item, setItem] = useState<TVSeriesDetail | null>(null)
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null)
  const [selectedEpisode, setSelectedEpisode] = useState<TVEpisode | null>(null)
  const [relatedRow, setRelatedRow] = useState<CarouselRowData | null>(null)
  const [inMyList, setInMyList] = useState(false)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [listBusy, setListBusy] = useState(false)

  const loadSeries = useCallback(() => {
    if (!seriesId) return

    setLoading(true)
    setFailed(false)

    Promise.all([
      apiGet<TVSeriesDetailResponse>(`/api/series/${seriesId}`),
      isInMyList('series', seriesId).catch(() => false),
    ])
      .then(([response, saved]) => {
        const series = response.item
        const initialEpisode = firstEpisode(series.seasons || [])

        setItem(series)
        setInMyList(saved)
        setSelectedEpisode(initialEpisode)
        setSelectedSeasonId(series.seasons?.[0]?.id || null)
        setRelatedRow({
          title: 'More like this',
          items: response.related_items || [],
        })
      })
      .catch((error) => {
        console.error('TV SERIES DETAIL ERROR:', error)
        setFailed(true)
      })
      .finally(() => setLoading(false))
  }, [seriesId])

  useEffect(() => {
    // Route changes start a fresh detail request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSeries()
  }, [loadSeries])

  const selectedSeason = useMemo(
    () => item?.seasons.find((season) => season.id === selectedSeasonId) || null,
    [item, selectedSeasonId]
  )

  const genres = useMemo(() => {
    if (item?.genre_list?.length) return item.genre_list
    return (item?.genre || '')
      .split(',')
      .map((genre) => genre.trim())
      .filter(Boolean)
  }, [item])

  const playEpisode = useCallback(
    (episode: TVEpisode | null) => {
      if (!item || !episode) return

      setSelectedEpisode(episode)

      const title = `${item.title} — ${episode.title || `Episode ${episode.number}`}`

      if (episode.video_source_type === 'hosted' && episode.hosted_video_id) {
        const params = new URLSearchParams({ title })
        navigate(
          tvPath(`/player/hosted/${encodeURIComponent(episode.hosted_video_id)}?${params.toString()}`)
        )
        return
      }

      if (episode.embed_code) {
        navigate(tvPath(`/player/series/${item.id}?episode=${episode.id}`))
        return
      }

      navigate(tvPath('/video-unavailable'))
    },
    [item, navigate]
  )

  useEffect(() => {
    if (!item || !selectedEpisode || autoplayHandled.current) return

    const shouldPlay = new URLSearchParams(location.search).get('play') === '1'
    if (!shouldPlay) return

    autoplayHandled.current = true
    // The play query deliberately invokes playback after the detail request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    playEpisode(selectedEpisode)
  }, [item, location.search, playEpisode, selectedEpisode])

  const handleListToggle = async () => {
    if (!item || listBusy) return

    setListBusy(true)
    try {
      setInMyList(await toggleTVMyList('series', item.id))
    } catch (error) {
      console.error('TV MY LIST TOGGLE ERROR:', error)
    } finally {
      setListBusy(false)
    }
  }

  return (
    <TVShell>
      {loading ? (
        <TVLoading label="Loading series" />
      ) : failed || !item ? (
        <TVErrorState
          title="Series not available"
          message="FlixHDMax could not load this series."
          onRetry={loadSeries}
        />
      ) : (
        <div className="tv-detail-page">
          <section className="tv-detail-hero tv-series-hero">
            <img
              className="tv-detail-backdrop"
              src={resolveMediaUrl(
                item.backdrop_display || item.backdrop_url || item.poster_display
              )}
              alt=""
            />
            <div className="tv-detail-overlay" />

            <div className="tv-detail-content">
              <img className="tv-detail-poster" src={getPosterArtwork(item)} alt="" />

              <div className="tv-detail-copy">
                <p className="tv-kicker">TV Series</p>
                <h1>{item.title}</h1>

                <div className="tv-detail-meta">
                  {formatRating(item.rating) && (
                    <span><Star fill="currentColor" aria-hidden="true" />{formatRating(item.rating)}</span>
                  )}
                  {getYear(item.release_date) && <span>{getYear(item.release_date)}</span>}
                  <span>{item.seasons.length} {item.seasons.length === 1 ? 'season' : 'seasons'}</span>
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

                <div className="tv-detail-actions" data-tv-group="series-actions">
                  <button
                    type="button"
                    className="tv-primary-button tv-focusable"
                    onClick={() => playEpisode(selectedEpisode)}
                    disabled={!selectedEpisode}
                    data-tv-focusable="true"
                    data-tv-autofocus="true"
                    data-tv-key="series-play"
                    data-tv-group="series-actions"
                    data-tv-next-up="top-tv-shows"
                    data-tv-next-right="series-my-list"
                  >
                    <Play fill="currentColor" aria-hidden="true" />
                    {selectedEpisode ? `Play episode ${selectedEpisode.number}` : 'No episodes'}
                  </button>

                  <button
                    type="button"
                    className="tv-secondary-button tv-focusable"
                    onClick={handleListToggle}
                    disabled={listBusy}
                    data-tv-focusable="true"
                    data-tv-key="series-my-list"
                    data-tv-group="series-actions"
                    data-tv-next-up="top-tv-shows"
                    data-tv-next-left="series-play"
                  >
                    {inMyList ? <Check aria-hidden="true" /> : <ListPlus aria-hidden="true" />}
                    {inMyList ? 'In My List' : 'My List'}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="tv-episodes-section">
            <div className="tv-section-heading-block">
              <p className="tv-kicker">Choose an episode</p>
              <h2>Episodes</h2>
            </div>

            <div className="tv-season-tabs" data-tv-group="season-tabs" role="tablist" aria-label="Seasons">
              {item.seasons.map((season) => (
                <button
                  key={season.id}
                  type="button"
                  className={`tv-season-tab tv-focusable${selectedSeasonId === season.id ? ' is-selected' : ''}`}
                  onClick={() => {
                    setSelectedSeasonId(season.id)
                    setSelectedEpisode(season.episodes[0] || null)
                  }}
                  data-tv-focusable="true"
                  data-tv-key={`season-${season.id}`}
                  data-tv-group="season-tabs"
                >
                  {season.title}
                </button>
              ))}
            </div>

            <div className="tv-episode-list" data-tv-group="episode-list">
              {(selectedSeason?.episodes || []).map((episode) => (
                <button
                  key={episode.id}
                  type="button"
                  className={`tv-episode-card tv-focusable${selectedEpisode?.id === episode.id ? ' is-selected' : ''}`}
                  onClick={() => playEpisode(episode)}
                  data-tv-focusable="true"
                  data-tv-key={`episode-${episode.id}`}
                  data-tv-group="episode-list"
                >
                  <div className="tv-episode-number">{episode.number}</div>
                  <div className="tv-episode-copy">
                    <h3>{episode.title || `Episode ${episode.number}`}</h3>
                    <p>Select to start this episode</p>
                  </div>
                  <Play fill="currentColor" aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>

          {relatedRow && relatedRow.items.length > 0 && (
            <div className="tv-detail-related">
              <TVContentRow row={relatedRow} rowIndex={91} />
            </div>
          )}
        </div>
      )}
    </TVShell>
  )
}

export default TVSeriesDetailPage
