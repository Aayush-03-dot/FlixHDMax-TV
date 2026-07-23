import { Info, Play, Star, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { HomeItem } from '../../types/home'
import {
  detailPath,
  formatRating,
  getItemArtwork,
  getYear,
  resolveMediaUrl,
} from '../utils'

function supportedPreviewUrl(value?: string | null) {
  const source = (value || '').trim()
  if (!source) return ''

  try {
    const parsed = new URL(source, window.location.origin)
    const pathname = parsed.pathname.toLowerCase()

    if (
      pathname.endsWith('.mp4') ||
      pathname.endsWith('.m4v') ||
      pathname.endsWith('.webm')
    ) {
      return resolveMediaUrl(source, '')
    }
  } catch {
    return ''
  }

  return ''
}

function TVHero({
  item,
  nextDownKey,
  topNavKey = 'top-home',
}: {
  item: HomeItem
  nextDownKey?: string
  topNavKey?: string
}) {
  const heroRef = useRef<HTMLElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const detailUrl = detailPath(item)
  const playUrl = `${detailUrl}?play=1`
  const rating = formatRating(item.rating)
  const year = getYear(item.release_date)
  const previewUrl = useMemo(
    () => supportedPreviewUrl(item.preview_url),
    [item.preview_url]
  )
  const [previewVisible, setPreviewVisible] = useState(false)
  const [previewFailed, setPreviewFailed] = useState(false)
  const [muted, setMuted] = useState(true)

  useEffect(() => {
    const video = videoRef.current
    const hero = heroRef.current

    if (!video || !hero || !previewUrl) return

    let previewDelay = 0

    const playPreview = () => {
      video.muted = true
      setMuted(true)
      void video.play().catch(() => {
        setPreviewFailed(true)
        setPreviewVisible(false)
      })
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          entry.isIntersecting &&
          entry.intersectionRatio >= 0.35 &&
          !document.hidden
        ) {
          previewDelay = window.setTimeout(playPreview, 1100)
        } else {
          window.clearTimeout(previewDelay)
          video.pause()
          setPreviewVisible(false)
        }
      },
      { threshold: [0, 0.35, 0.75] }
    )

    const handleVisibility = () => {
      if (document.hidden) {
        video.pause()
        setPreviewVisible(false)
      } else {
        playPreview()
      }
    }

    observer.observe(hero)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.clearTimeout(previewDelay)
      observer.disconnect()
      document.removeEventListener('visibilitychange', handleVisibility)
      video.pause()
    }
  }, [item.id, previewUrl])

  const toggleMuted = () => {
    const video = videoRef.current
    if (!video) return

    const nextMuted = !video.muted
    video.muted = nextMuted
    setMuted(nextMuted)

    if (video.paused) {
      void video.play().catch(() => setPreviewFailed(true))
    }
  }

  return (
    <section
      ref={heroRef}
      className="tv-hero"
      aria-label={`Featured: ${item.title}`}
    >
      <img
        className="tv-hero-backdrop"
        src={getItemArtwork(item)}
        alt=""
        fetchPriority="high"
        onError={(event) => {
          event.currentTarget.style.display = 'none'
        }}
      />

      {previewUrl && !previewFailed && (
        <video
          ref={videoRef}
          className={`tv-hero-preview${previewVisible ? ' is-visible' : ''}`}
          src={previewUrl}
          preload="metadata"
          playsInline
          muted={muted}
          loop
          disablePictureInPicture
          controls={false}
          aria-hidden="true"
          tabIndex={-1}
          onPlaying={() => setPreviewVisible(true)}
          onError={() => {
            setPreviewFailed(true)
            setPreviewVisible(false)
          }}
        />
      )}

      <div className="tv-hero-overlay" />

      <div className="tv-hero-content">
        <div className="tv-hero-eyebrow">Featured on FlixHDMax</div>
        <h1>{item.title}</h1>

        <div className="tv-hero-meta">
          {rating && (
            <span className="tv-hero-rating">
              <Star fill="currentColor" aria-hidden="true" />
              {rating}
            </span>
          )}
          {year && <span>{year}</span>}
          <span>{item.content_type === 'series' ? 'Series' : 'Movie'}</span>
          <span className="tv-quality-badge">HD</span>
        </div>

        <p className="tv-hero-description">
          {item.description || 'Open this title to see details and start watching.'}
        </p>

        <div className="tv-hero-actions" data-tv-group="hero-actions">
          <Link
            to={playUrl}
            className="tv-primary-button tv-focusable"
            data-tv-focusable="true"
            data-tv-autofocus="true"
            data-tv-key="hero-play"
            data-tv-next-up={topNavKey}
            data-tv-next-right="hero-info"
            data-tv-next-down={nextDownKey}
          >
            <Play fill="currentColor" aria-hidden="true" />
            Play
          </Link>

          <Link
            to={detailUrl}
            className="tv-secondary-button tv-focusable"
            data-tv-focusable="true"
            data-tv-key="hero-info"
            data-tv-next-up={topNavKey}
            data-tv-next-left="hero-play"
            data-tv-next-right={previewVisible ? 'hero-audio' : undefined}
            data-tv-next-down={nextDownKey}
          >
            <Info aria-hidden="true" />
            More info
          </Link>

          {previewVisible && (
            <button
              type="button"
              className="tv-hero-audio tv-focusable"
              onClick={toggleMuted}
              data-tv-focusable="true"
              data-tv-key="hero-audio"
              data-tv-next-up={topNavKey}
              data-tv-next-left="hero-info"
              data-tv-next-down={nextDownKey}
              aria-label={muted ? 'Turn preview sound on' : 'Mute preview'}
            >
              {muted ? (
                <VolumeX aria-hidden="true" />
              ) : (
                <Volume2 aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

export default TVHero
