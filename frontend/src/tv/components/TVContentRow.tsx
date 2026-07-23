import type { CarouselRowData } from '../../types/home'
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
  const group = `content-row-${rowIndex}`

  return (
    <section
      className={`tv-content-row${featured ? ' tv-content-row-featured' : ''}`}
      aria-labelledby={`tv-row-${rowIndex}`}
    >
      <div className="tv-row-heading">
        <h2 id={`tv-row-${rowIndex}`}>{row.title}</h2>
      </div>

      <div className="tv-row-track" data-tv-group={group}>
        {row.items.map((item, itemIndex) => (
          <TVCard
            key={`${item.content_type}-${item.id}`}
            item={item}
            rowIndex={rowIndex}
            itemIndex={itemIndex}
            autofocus={autofocusFirst && itemIndex === 0}
            nextUpKey={heroAbove ? 'hero-play' : undefined}
            group={group}
          />
        ))}
      </div>
    </section>
  )
}

export default TVContentRow
