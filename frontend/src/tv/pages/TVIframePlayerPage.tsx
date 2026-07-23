import { ArrowLeft, Maximize } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { apiGet } from '../../services/api'
import TVErrorState from '../components/TVErrorState'
import TVLoading from '../components/TVLoading'
import TVStandalonePage from '../components/TVStandalonePage'
import type {
  TVMovieDetailResponse,
  TVSeriesDetailResponse,
} from '../types'

type PlayerContent = {
  title: string
  embedCode: string
}

function requestFullscreen(element: HTMLElement | null) {
  if (!element || document.fullscreenElement) return
  void element.requestFullscreen?.().catch(() => undefined)
}

function extractIframeSource(embedCode: string) {
  try {
    const documentFragment = new DOMParser().parseFromString(embedCode, 'text/html')
    return documentFragment.querySelector('iframe')?.getAttribute('src') || ''
  } catch {
    return ''
  }
}

function TVIframePlayerPage() {
  const { contentType, contentId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const pageRef = useRef<HTMLDivElement | null>(null)
  const [content, setContent] = useState<PlayerContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!contentId || (contentType !== 'movie' && contentType !== 'series')) {
      // Invalid routes are converted to the TV error state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFailed(true)
      setLoading(false)
      return
    }

    setLoading(true)
    setFailed(false)

    if (contentType === 'movie') {
      apiGet<TVMovieDetailResponse>(`/api/movie/${contentId}`)
        .then((response) => {
          if (!response.item.embed_code) throw new Error('No iframe player')
          setContent({
            title: response.item.title,
            embedCode: response.item.embed_code,
          })
        })
        .catch((error) => {
          console.error('TV IFRAME MOVIE PLAYER ERROR:', error)
          setFailed(true)
        })
        .finally(() => setLoading(false))

      return
    }

    const episodeId = Number(searchParams.get('episode'))

    apiGet<TVSeriesDetailResponse>(`/api/series/${contentId}`)
      .then((response) => {
        const episodes = response.item.seasons.flatMap((season) => season.episodes)
        const episode = episodes.find((candidate) => candidate.id === episodeId)

        if (!episode?.embed_code) throw new Error('No iframe episode player')

        setContent({
          title: `${response.item.title} — ${episode.title || `Episode ${episode.number}`}`,
          embedCode: episode.embed_code,
        })
      })
      .catch((error) => {
        console.error('TV IFRAME SERIES PLAYER ERROR:', error)
        setFailed(true)
      })
      .finally(() => setLoading(false))
  }, [contentId, contentType, searchParams])

  const iframeSource = useMemo(
    () => (content ? extractIframeSource(content.embedCode) : ''),
    [content]
  )

  return (
    <TVStandalonePage>
      <div ref={pageRef} className="tv-player-page tv-player-fullscreen">
        <div className="tv-player-overlay" data-tv-group="player-controls">
          <button
            type="button"
            className="tv-player-back tv-focusable"
            onClick={() => navigate(-1)}
            data-tv-focusable="true"
            data-tv-autofocus="true"
            data-tv-key="player-back"
            data-tv-group="player-controls"
            data-tv-next-right="iframe-player-fullscreen"
          >
            <ArrowLeft aria-hidden="true" />
            Back
          </button>

          {content && (
            <div className="tv-player-heading">
              <span>Now playing</span>
              <strong>{content.title}</strong>
            </div>
          )}

          <button
            type="button"
            className="tv-player-icon tv-focusable"
            onClick={() => requestFullscreen(pageRef.current)}
            data-tv-focusable="true"
            data-tv-key="iframe-player-fullscreen"
            data-tv-group="player-controls"
            data-tv-next-left="player-back"
            aria-label="Full screen"
          >
            <Maximize aria-hidden="true" />
          </button>
        </div>

        {loading ? (
          <TVLoading label="Opening player" />
        ) : failed || !content ? (
          <TVErrorState
            title="Video not available"
            message="This player could not be opened on the television."
            onRetry={() => navigate(-1)}
          />
        ) : iframeSource ? (
          <iframe
            className="tv-iframe-player"
            src={iframeSource}
            title={content.title}
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowFullScreen
            referrerPolicy="origin-when-cross-origin"
          />
        ) : (
          <div
            className="tv-iframe-player"
            dangerouslySetInnerHTML={{ __html: content.embedCode }}
          />
        )}
      </div>
    </TVStandalonePage>
  )
}

export default TVIframePlayerPage
