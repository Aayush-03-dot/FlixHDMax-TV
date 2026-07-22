import { Play, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { HomeItem } from '../../types/home'
import { detailPath, formatRating, getItemArtwork, getYear } from '../utils'

function TVCard({
  item,
  rowIndex,
  itemIndex,
  autofocus = false,
}: {
  item: HomeItem
  rowIndex: number | string
  itemIndex: number
  autofocus?: boolean
}) {
  const rating = formatRating(item.rating)
  const year = getYear(item.release_date)

  return (
    <Link
      to={detailPath(item)}
      className="tv-card tv-focusable"
      data-tv-focusable="true"
      data-tv-autofocus={autofocus ? 'true' : undefined}
      data-tv-key={`card-${rowIndex}-${item.content_type}-${item.id}`}
      aria-label={`${item.title}, ${item.content_type}`}
    >
      <div className="tv-card-artwork">
        <img
          src={getItemArtwork(item)}
          alt=""
          loading={itemIndex < 6 ? 'eager' : 'lazy'}
          onError={(event) => {
            event.currentTarget.src = '/admin-logo.png'
          }}
        />
        <div className="tv-card-shade" />
        <div className="tv-card-play" aria-hidden="true">
          <Play fill="currentColor" />
        </div>
        {item.in_my_list && <span className="tv-card-list-badge">My List</span>}
      </div>

      <div className="tv-card-copy">
        <h3>{item.title}</h3>
        <p>
          {rating && (
            <span className="tv-card-rating">
              <Star fill="currentColor" aria-hidden="true" />
              {rating}
            </span>
          )}
          {rating && year && <span className="tv-meta-dot" />}
          {year && <span>{year}</span>}
          {(rating || year) && <span className="tv-meta-dot" />}
          <span>{item.content_type === 'series' ? 'Series' : 'Movie'}</span>
        </p>
      </div>
    </Link>
  )
}

export default TVCard
