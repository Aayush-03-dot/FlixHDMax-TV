import { Link, useSearchParams } from 'react-router-dom'
import './VideoUnavailablePage.css'

function VideoUnavailablePage() {
  const [searchParams] = useSearchParams()

  const title = searchParams.get('title') || 'Video unavailable'
  const message =
    searchParams.get('message') ||
    'This title is not available to watch right now. Please try again later.'

  const backUrl = searchParams.get('back') || '/'

  return (
    <main className="video-unavailable-page">
      <div className="video-unavailable-bg"></div>
      <div className="video-unavailable-overlay"></div>

      <section className="video-unavailable-card">
        <div className="video-unavailable-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <p className="video-unavailable-kicker">Playback Error</p>

        <h1>{title}</h1>

        <p className="video-unavailable-message">{message}</p>

        <div className="video-unavailable-actions">
          <Link to={backUrl} className="video-unavailable-primary-btn">
            Back to title
          </Link>

          <Link to="/" className="video-unavailable-secondary-btn">
            Go home
          </Link>
        </div>
      </section>
    </main>
  )
}

export default VideoUnavailablePage