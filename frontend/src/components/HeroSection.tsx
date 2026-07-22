import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MyListToggleButton from './MyListToggleButton'

type FeaturedItem = {
  id: string | number
  title: string
  description?: string
  release_date?: string
  rating?: number | string | null
  content_type: 'movie' | 'series'
  poster_display?: string
  thumbnail_display?: string
  backdrop_display?: string
  preview_url?: string | null
  in_my_list?: boolean
}

type Props = {
  featuredItem?: FeaturedItem | null
  searchQuery?: string
  isLoggedIn?: boolean
}

type NetworkInformation = {
  saveData?: boolean
}

type NavigatorWithConnection = Navigator & {
  connection?: NetworkInformation
}

const PREVIEW_START_DELAY_MS = 1800
const DESCRIPTION_HIDE_DELAY_MS = 2300

function formatRating(rating?: number | string | null) {
  if (rating === null || rating === undefined || rating === '') return 'N/A'

  const numericRating = Number(rating)

  if (Number.isNaN(numericRating)) return 'N/A'

  return numericRating.toFixed(1)
}

function formatYear(releaseDate?: string | null) {
  if (!releaseDate) return 'N/A'

  const year = releaseDate.slice(0, 4)

  return year || 'N/A'
}

function canUseHeroPreview() {
  if (typeof window === 'undefined') return false

  const isDesktop = window.matchMedia('(min-width: 769px)').matches
  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches
  const saveData = Boolean(
    (navigator as NavigatorWithConnection).connection?.saveData
  )

  return isDesktop && !reducedMotion && !saveData
}

function isSupportedPreviewUrl(value: string) {
  if (!value) return false

  try {
    const parsedUrl = new URL(value, window.location.origin)
    const pathname = parsedUrl.pathname.toLowerCase()

    return (
      pathname.endsWith('.mp4') ||
      pathname.endsWith('.m4v') ||
      pathname.endsWith('.webm')
    )
  } catch {
    return false
  }
}

function HeroSection({ featuredItem, searchQuery }: Props) {
  const heroRef = useRef<HTMLElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const heroInViewRef = useRef(true)
  const previewStartedRef = useRef(false)
  const isMutedRef = useRef(false)
  const descriptionTimerRef = useRef<number | null>(null)
  const replayTimerRef = useRef<number | null>(null)

  const [heroLoaded, setHeroLoaded] = useState(false)
  const [previewEligible, setPreviewEligible] = useState(false)
  const [previewReady, setPreviewReady] = useState(false)
  const [previewVisible, setPreviewVisible] = useState(false)
  const [previewFailed, setPreviewFailed] = useState(false)
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)
  const [descriptionHidden, setDescriptionHidden] = useState(false)
  const [isMuted, setIsMuted] = useState(false)

  const fallbackImage = useMemo(() => {
    return featuredItem?.poster_display || featuredItem?.thumbnail_display || ''
  }, [featuredItem?.poster_display, featuredItem?.thumbnail_display])

  const heroImage = useMemo(() => {
    return featuredItem?.backdrop_display || fallbackImage
  }, [featuredItem?.backdrop_display, fallbackImage])

  const mobileImage = useMemo(() => {
    return featuredItem?.poster_display || featuredItem?.thumbnail_display || heroImage
  }, [featuredItem?.poster_display, featuredItem?.thumbnail_display, heroImage])

  const previewUrl = (featuredItem?.preview_url || '').trim()
  const validPreviewUrl = isSupportedPreviewUrl(previewUrl)
    ? previewUrl
    : ''

  const clearDescriptionTimer = useCallback(() => {
    if (descriptionTimerRef.current !== null) {
      window.clearTimeout(descriptionTimerRef.current)
      descriptionTimerRef.current = null
    }
  }, [])

  const clearReplayTimer = useCallback(() => {
    if (replayTimerRef.current !== null) {
      window.clearTimeout(replayTimerRef.current)
      replayTimerRef.current = null
    }
  }, [])

  const resetPreviewPresentation = useCallback(() => {
    clearDescriptionTimer()
    setPreviewVisible(false)
    setDescriptionHidden(false)
  }, [clearDescriptionTimer])

  const startPreview = useCallback(async () => {
    const video = videoRef.current

    if (
      !video ||
      !previewStartedRef.current ||
      !heroInViewRef.current ||
      document.hidden
    ) {
      return
    }

    if (
      video.ended ||
      (Number.isFinite(video.duration) &&
        video.duration > 0 &&
        video.currentTime >= video.duration - 0.25)
    ) {
      video.currentTime = 0
    }

    const playWithMutedState = async (muted: boolean) => {
      video.muted = muted
      video.volume = 1
      isMutedRef.current = muted
      setIsMuted(muted)
      await video.play()
    }

    try {
      await playWithMutedState(isMutedRef.current)
      setAutoplayBlocked(false)
    } catch (error) {
      const errorName = error instanceof DOMException ? error.name : ''

      // Browsers commonly reject autoplay with sound. Keep the preview
      // reliable by retrying muted, then let the viewer enable sound.
      if (errorName === 'NotAllowedError' && !isMutedRef.current) {
        try {
          await playWithMutedState(true)
          setAutoplayBlocked(false)
          return
        } catch (mutedError) {
          const mutedErrorName =
            mutedError instanceof DOMException ? mutedError.name : ''

          if (mutedErrorName === 'NotAllowedError') {
            setAutoplayBlocked(true)
            return
          }
        }
      }

      if (errorName === 'NotAllowedError') {
        setAutoplayBlocked(true)
        return
      }

      setPreviewFailed(true)
      resetPreviewPresentation()
    }
  }, [resetPreviewPresentation])

  useEffect(() => {
    setHeroLoaded(false)

    if (!heroImage) return

    const preloadImage = new Image()

    preloadImage.onload = () => {
      setHeroLoaded(true)
    }

    preloadImage.onerror = () => {
      if (fallbackImage) {
        setHeroLoaded(true)
      }
    }

    preloadImage.src = heroImage

    const frame = window.requestAnimationFrame(() => {
      const image = imageRef.current

      if (image && image.complete && image.naturalWidth > 0) {
        setHeroLoaded(true)
      }
    })

    return () => {
      window.cancelAnimationFrame(frame)
    }
  }, [featuredItem?.id, heroImage, fallbackImage])

  useEffect(() => {
    const updateEligibility = () => {
      setPreviewEligible(canUseHeroPreview())
    }

    updateEligibility()

    const desktopQuery = window.matchMedia('(min-width: 769px)')
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    desktopQuery.addEventListener('change', updateEligibility)
    motionQuery.addEventListener('change', updateEligibility)

    return () => {
      desktopQuery.removeEventListener('change', updateEligibility)
      motionQuery.removeEventListener('change', updateEligibility)
    }
  }, [])

  useEffect(() => {
    const video = videoRef.current

    setPreviewReady(false)
    setPreviewFailed(false)
    setAutoplayBlocked(false)
    setIsMuted(false)
    isMutedRef.current = false
    previewStartedRef.current = false
    resetPreviewPresentation()

    if (!video || !previewEligible || !validPreviewUrl) {
      return
    }

    const handleReady = () => {
      setPreviewReady(true)
    }

    const handleError = () => {
      setPreviewFailed(true)
      resetPreviewPresentation()
    }

    video.addEventListener('loadedmetadata', handleReady)
    video.addEventListener('canplay', handleReady)
    video.addEventListener('error', handleError)

    video.pause()
    video.currentTime = 0
    video.src = validPreviewUrl
    video.load()

    return () => {
      video.removeEventListener('loadedmetadata', handleReady)
      video.removeEventListener('canplay', handleReady)
      video.removeEventListener('error', handleError)

      video.pause()
      video.removeAttribute('src')
      video.load()
    }
  }, [
    featuredItem?.id,
    previewEligible,
    resetPreviewPresentation,
    validPreviewUrl,
  ])

  useEffect(() => {
    const video = videoRef.current

    if (!video || !previewReady || previewFailed) return

    const timer = window.setTimeout(() => {
      previewStartedRef.current = true
      void startPreview()
    }, PREVIEW_START_DELAY_MS)

    const observer = new IntersectionObserver(
      ([entry]) => {
        const inView = entry.isIntersecting && entry.intersectionRatio >= 0.35
        heroInViewRef.current = inView

        if (!inView) {
          video.pause()
          resetPreviewPresentation()
          return
        }

        if (previewStartedRef.current && !document.hidden) {
          void startPreview()
        }
      },
      { threshold: [0, 0.35, 0.7] }
    )

    if (heroRef.current) {
      observer.observe(heroRef.current)
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        video.pause()
        resetPreviewPresentation()
        return
      }

      if (previewStartedRef.current && heroInViewRef.current) {
        void startPreview()
      }
    }

    const handlePageReturn = () => {
      if (!previewStartedRef.current || !heroInViewRef.current || document.hidden) {
        return
      }

      if (video.ended) {
        video.currentTime = 0
      }

      void startPreview()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pageshow', handlePageReturn)
    window.addEventListener('focus', handlePageReturn)

    return () => {
      window.clearTimeout(timer)
      clearReplayTimer()
      observer.disconnect()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pageshow', handlePageReturn)
      window.removeEventListener('focus', handlePageReturn)
      video.pause()
      previewStartedRef.current = false
    }
  }, [
    clearReplayTimer,
    previewFailed,
    previewReady,
    resetPreviewPresentation,
    startPreview,
  ])

  useEffect(() => {
    if (!autoplayBlocked) return

    const resumeWithSound = () => {
      void startPreview()
    }

    window.addEventListener('pointerdown', resumeWithSound, {
      capture: true,
      once: true,
    })
    window.addEventListener('keydown', resumeWithSound, { once: true })

    return () => {
      window.removeEventListener('pointerdown', resumeWithSound, true)
      window.removeEventListener('keydown', resumeWithSound)
    }
  }, [autoplayBlocked, startPreview])

  useEffect(() => {
    return () => {
      clearDescriptionTimer()
      clearReplayTimer()
    }
  }, [clearDescriptionTimer, clearReplayTimer])

  if (!featuredItem || searchQuery) {
    return <div style={{ height: 'var(--nav-height)' }} />
  }

  const detailUrl =
    featuredItem.content_type === 'series'
      ? `/series/${featuredItem.id}`
      : `/movie/${featuredItem.id}`

  const year = formatYear(featuredItem.release_date)
  const rating = formatRating(featuredItem.rating)

  const description =
    featuredItem.description && featuredItem.description.length > 200
      ? `${featuredItem.description.slice(0, 200)}...`
      : featuredItem.description

  const handlePreviewPlaying = () => {
    setPreviewVisible(true)
    setAutoplayBlocked(false)
    clearDescriptionTimer()

    descriptionTimerRef.current = window.setTimeout(() => {
      setDescriptionHidden(true)
    }, DESCRIPTION_HIDE_DELAY_MS)
  }

  const handlePreviewPause = () => {
    resetPreviewPresentation()
  }

  const handlePreviewEnded = () => {
    const video = videoRef.current

    resetPreviewPresentation()
    clearReplayTimer()

    if (!video) return

    video.currentTime = 0

    if (!heroInViewRef.current || document.hidden) return

    replayTimerRef.current = window.setTimeout(() => {
      replayTimerRef.current = null
      previewStartedRef.current = true
      void startPreview()
    }, 900)
  }

  const toggleMute = () => {
    const video = videoRef.current

    if (!video) return

    const nextMuted = !video.muted
    video.muted = nextMuted
    isMutedRef.current = nextMuted
    setIsMuted(nextMuted)
  }

  const handleManualPreviewStart = () => {
    const video = videoRef.current

    if (video) {
      video.muted = false
    }

    isMutedRef.current = false
    setIsMuted(false)
    previewStartedRef.current = true
    void startPreview()
  }

  return (
    <header
      ref={heroRef}
      className={`hero-section${
        validPreviewUrl && previewEligible ? ' hero-section-has-preview' : ''
      }`}
    >
      <div className="hero-bg">
        <picture className="hero-bg-picture">
          <source media="(max-width: 768px)" srcSet={mobileImage} />

          <img
            ref={imageRef}
            src={heroImage}
            alt={featuredItem.title}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className={`fade-image ${heroLoaded ? 'fade-image-loaded' : ''}`}
            onLoad={() => setHeroLoaded(true)}
            onError={(event) => {
              if (fallbackImage && event.currentTarget.src !== fallbackImage) {
                event.currentTarget.src = fallbackImage
              }

              setHeroLoaded(true)
            }}
          />
        </picture>

        {validPreviewUrl && previewEligible && !previewFailed && (
          <video
            key={`${featuredItem.id}-${validPreviewUrl}`}
            ref={videoRef}
            className={`hero-preview-video ${previewVisible ? 'is-visible' : ''}`}
            preload="auto"
            muted={isMuted}
            playsInline
            loop
            controls={false}
            controlsList="nodownload noremoteplayback noplaybackrate"
            disablePictureInPicture
            disableRemotePlayback
            aria-hidden="true"
            tabIndex={-1}
            onContextMenu={(event) => event.preventDefault()}
            onPlaying={handlePreviewPlaying}
            onPause={handlePreviewPause}
            onEnded={handlePreviewEnded}
            onError={() => {
              setPreviewFailed(true)
              resetPreviewPresentation()
            }}
          />
        )}

        <div className="hero-gradient"></div>
      </div>

      {(previewVisible || autoplayBlocked) && !previewFailed && (
        <button
          type="button"
          className={`hero-preview-audio ${
            autoplayBlocked && !previewVisible ? 'is-start-control' : ''
          }`}
          onClick={
            autoplayBlocked && !previewVisible
              ? handleManualPreviewStart
              : toggleMute
          }
          aria-label={
            autoplayBlocked && !previewVisible
              ? 'Play hero preview with sound'
              : isMuted
                ? 'Unmute hero preview'
                : 'Mute hero preview'
          }
          title={
            autoplayBlocked && !previewVisible
              ? 'Play preview'
              : isMuted
                ? 'Unmute'
                : 'Mute'
          }
        >
          <i
            className={
              autoplayBlocked && !previewVisible
                ? 'bi bi-play-fill'
                : isMuted
                  ? 'bi bi-volume-mute-fill'
                  : 'bi bi-volume-up-fill'
            }
          ></i>
        </button>
      )}

      <div className="hero-content">
        <div className="prime-badge">
          <i className="bi bi-lightning-fill"></i> FlixHD Exclusive
        </div>

        <h1 className="hero-title">{featuredItem.title}</h1>

        <div className="hero-meta">
          <span className="hero-rating">
            <i className="bi bi-star-fill"></i> {rating}
          </span>

          <span className="hero-dot"></span>

          <span className="hero-meta-item">{year}</span>

          <span className="hero-dot"></span>

          <span className="hero-hd-badge">HD</span>

          <span className="hero-dot"></span>

          <span className="hero-meta-item">
            <i className="bi bi-badge-cc me-1"></i>
            Subtitles
          </span>
        </div>

        <p
          className={`hero-desc ${descriptionHidden ? 'is-preview-hidden' : ''}`}
          aria-hidden={descriptionHidden}
        >
          {description}
        </p>

        <div className="hero-actions">
          <a href={detailUrl} className="btn-pv-play">
            <i className="bi bi-play-fill" style={{ fontSize: '1.2rem' }}></i>
            Watch Now
          </a>

          <a href={detailUrl} className="btn-pv-info">
            <i className="bi bi-info-circle"></i>
            Details
          </a>

          <MyListToggleButton
            contentId={featuredItem.id}
            contentType={featuredItem.content_type}
            title={featuredItem.title}
            initialInList={Boolean(featuredItem.in_my_list)}
            variant="hero"
          />
        </div>
      </div>
    </header>
  )
}

export default HeroSection