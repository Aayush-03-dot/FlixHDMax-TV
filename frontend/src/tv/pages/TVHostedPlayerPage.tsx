import Hls from 'hls.js'
import { ArrowLeft, Play, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { apiGet } from '../../services/api'
import TVLoading from '../components/TVLoading'
import TVStandalonePage from '../components/TVStandalonePage'

type HostedPlaybackResponse = {
  success: boolean
  hosted_video_id: string
  master_url: string
  watch_url?: string
  expires_at?: number
  message?: string
}

function hasNativeTVPlayer() {
  try {
    return Boolean(window.AndroidTVPlayer?.isAvailable())
  } catch {
    return false
  }
}

function TVHostedPlayerPage() {
  const { hostedVideoId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const nativeOpenedRef = useRef(false)
  const [playback, setPlayback] = useState<HostedPlaybackResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const title = searchParams.get('title') || 'FlixHDMax'
  const nativePlayerAvailable = hasNativeTVPlayer()

  const loadPlayback = useCallback(() => {
    if (!hostedVideoId) {
      setError('The hosted video ID is missing.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    apiGet<HostedPlaybackResponse>(
      `/api/tv/hosted-playback/${encodeURIComponent(hostedVideoId)}`
    )
      .then((response) => {
        if (!response.success || !response.master_url) {
          throw new Error(response.message || 'The video is not available.')
        }

        setPlayback(response)
      })
      .catch((playbackError: unknown) => {
        const message =
          playbackError instanceof Error
            ? playbackError.message
            : 'The video could not be prepared for playback.'

        setError(message)
      })
      .finally(() => setLoading(false))
  }, [hostedVideoId])

  useEffect(() => {
    // Route changes intentionally start a fresh playback request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPlayback()
  }, [loadPlayback])

  const openNativePlayer = useCallback(() => {
    if (!playback?.master_url || !hasNativeTVPlayer()) return false

    try {
      window.AndroidTVPlayer?.play(playback.master_url, title)
      return true
    } catch (nativeError) {
      console.error('NATIVE TV PLAYER ERROR:', nativeError)
      return false
    }
  }, [playback, title])

  useEffect(() => {
    if (!playback || nativeOpenedRef.current || !nativePlayerAvailable) return

    nativeOpenedRef.current = true
    openNativePlayer()
  }, [nativePlayerAvailable, openNativePlayer, playback])

  useEffect(() => {
    if (!playback?.master_url || nativePlayerAvailable) return

    const video = videoRef.current
    if (!video) return

    let hls: Hls | null = null

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = playback.master_url
      video.play().catch(() => undefined)
    } else if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 30,
      })

      hls.loadSource(playback.master_url)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => undefined)
      })
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          setError('The television browser could not play this stream.')
        }
      })
    } else {
      window.setTimeout(() => {
        setError('HLS playback is not supported by this television browser.')
      }, 0)
    }

    return () => {
      hls?.destroy()
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
  }, [nativePlayerAvailable, playback])

  return (
    <TVStandalonePage>
      <div className="tv-hosted-player-page">
        <div className="tv-player-toolbar">
          <button
            type="button"
            className="tv-player-back tv-focusable"
            onClick={() => navigate(-1)}
            data-tv-focusable="true"
            data-tv-key="hosted-player-back"
          >
            <ArrowLeft aria-hidden="true" />
            Back
          </button>
          <div className="tv-player-heading">
            <span>Now playing</span>
            <strong>{title}</strong>
          </div>
        </div>

        {loading ? (
          <TVLoading label="Preparing video" />
        ) : error ? (
          <section className="tv-player-error">
            <h1>Playback unavailable</h1>
            <p>{error}</p>
            <button
              type="button"
              className="tv-primary-button tv-focusable"
              onClick={loadPlayback}
              data-tv-focusable="true"
              data-tv-autofocus="true"
              data-tv-key="hosted-player-retry"
            >
              <RotateCcw aria-hidden="true" />
              Try again
            </button>
          </section>
        ) : nativePlayerAvailable ? (
          <section className="tv-native-player-launcher">
            <Play fill="currentColor" aria-hidden="true" />
            <h1>{title}</h1>
            <p>The Fire TV native player is ready.</p>
            <button
              type="button"
              className="tv-primary-button tv-focusable"
              onClick={openNativePlayer}
              data-tv-focusable="true"
              data-tv-autofocus="true"
              data-tv-key="hosted-player-open"
            >
              <Play fill="currentColor" aria-hidden="true" />
              Resume playback
            </button>
          </section>
        ) : (
          <video
            ref={videoRef}
            className="tv-native-video"
            controls
            autoPlay
            playsInline
            preload="auto"
            aria-label={title}
          />
        )}
      </div>
    </TVStandalonePage>
  )
}

export default TVHostedPlayerPage
