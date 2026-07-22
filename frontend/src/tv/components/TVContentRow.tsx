import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CarouselRowData } from '../../types/home'
import { tvPath } from '../utils'
import TVCard from './TVCard'

function TVContentRow({
  row,
  rowIndex,
  autofocusFirst = false,
  featured = false,
  heroAbove = false,
}: {
  row: CarouselRowData
  rowIndex: number
  autofocusFirst?: boolean
  featured?: boolean
  heroAbove?: boolean
}) {
  return (
    <section
      className={`tv-content-row${featured ? ' tv-content-row-featured' : ''}`}
      aria-labelledby={`tv-row-${rowIndex}`}
    >
      <div className="tv-row-heading">
        <h2 id={`tv-row-${rowIndex}`}>{row.title}</h2>

        {(row.category === 'all-movies' || row.category === 'all-series') && (
          <Link
            to={tvPath(row.category === 'all-movies' ? '/movies' : '/shows')}
            className="tv-row-see-all tv-focusable"
            data-tv-focusable="true"
            data-tv-key={`row-${rowIndex}-see-all`}
          >
            View all
            <ChevronRight aria-hidden="true" />
          </Link>
        )}
      </div>

      <div className="tv-row-track">
        {row.items.map((item, itemIndex) => (
          <TVCard
            key={`${item.content_type}-${item.id}`}
            item={item}
            rowIndex={rowIndex}
            itemIndex={itemIndex}
            autofocus={autofocusFirst && itemIndex === 0}
            nextUpKey={heroAbove && itemIndex === 0 ? 'hero-play' : undefined}
          />
        ))}
      </div>
    </section>
  )
}

export default TVContentRow
