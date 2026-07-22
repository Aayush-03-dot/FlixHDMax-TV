import { Info, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { HomeItem } from '../../types/home'
import {
  detailPath,
  formatRating,
  getItemArtwork,
  getYear,
} from '../utils'

function TVHero({ item }: { item: HomeItem }) {
  const detailUrl = detailPath(item)
  const playUrl = `${detailUrl}?play=1`
  const rating = formatRating(item.rating)
  const year = getYear(item.release_date)

  return (
    <section className="tv-hero" aria-label={`Featured: ${item.title}`}>
      <img
        className="tv-hero-backdrop"
        src={getItemArtwork(item)}
        alt=""
        fetchPriority="high"
        onError={(event) => {
          event.currentTarget.src = '/admin-logo.png'
        }}
      />
      <div className="tv-hero-overlay" />

      <div className="tv-hero-content">
        <p className="tv-kicker">Featured</p>
        <h1>{item.title}</h1>

        <div className="tv-hero-meta">
          {rating && <span>{rating}</span>}
          {year && <span>{year}</span>}
          <span>{item.content_type === 'series' ? 'TV Series' : 'Movie'}</span>
          <span className="tv-quality-badge">HD</span>
        </div>

        <p className="tv-hero-description">
          {item.description || 'Open this title to see details and start watching.'}
        </p>

        <div className="tv-hero-actions">
          <Link
            to={playUrl}
            className="tv-primary-button tv-focusable"
            data-tv-focusable="true"
            data-tv-autofocus="true"
            data-tv-key="hero-play"
          >
            <Play fill="currentColor" aria-hidden="true" />
            Play
          </Link>

          <Link
            to={detailUrl}
            className="tv-secondary-button tv-focusable"
            data-tv-focusable="true"
            data-tv-key="hero-info"
          >
            <Info aria-hidden="true" />
            More info
          </Link>
        </div>
      </div>
    </section>
  )
}

export default TVHero
