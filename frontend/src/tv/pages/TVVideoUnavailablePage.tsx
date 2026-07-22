import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import TVStandalonePage from '../components/TVStandalonePage'

function TVVideoUnavailablePage() {
  const navigate = useNavigate()

  return (
    <TVStandalonePage>
      <section className="tv-video-unavailable">
        <img src="/admin-logo.png" alt="FlixHDMax" />
        <h1>Video unavailable</h1>
        <p>This title cannot be played right now.</p>
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
