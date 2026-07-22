import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import TVStandalonePage from '../components/TVStandalonePage'

function TVVideoUnavailablePage() {
  const navigate = useNavigate()

  return (
    <TVStandalonePage>
      <section className="tv-video-unavailable">
        <div className="tv-brand-mark">F</div>
        <h1>Video not available</h1>
        <p>This title does not currently have a television-compatible player.</p>
        <button
          type="button"
          className="tv-primary-button tv-focusable"
          onClick={() => navigate(-1)}
          data-tv-focusable="true"
          data-tv-autofocus="true"
          data-tv-key="unavailable-back"
        >
          <ArrowLeft aria-hidden="true" />
          Go back
        </button>
      </section>
    </TVStandalonePage>
  )
}

export default TVVideoUnavailablePage
