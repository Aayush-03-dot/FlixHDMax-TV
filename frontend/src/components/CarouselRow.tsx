import FadeImage from './FadeImage'
import MyListToggleButton from './MyListToggleButton'

type CarouselItem = {
  id: string | number
  title: string
  content_type: 'movie' | 'series'
  thumbnail_display?: string
  release_date?: string
  rating?: number | string | null
  in_my_list?: boolean
}

type CarouselRowData = {
  title: string
  category?: string | null
  items: CarouselItem[]
}

type Props = {
  row: CarouselRowData
  index: number
  isLoggedIn?: boolean
}

function formatRating(rating?: number | string | null) {
  if (rating === null || rating === undefined || rating === '') return 'N/A'

  const numericRating = Number(rating)

  if (Number.isNaN(numericRating)) return 'N/A'

  return numericRating.toFixed(1)
}

function CarouselRow({ row, index }: Props) {
  const scrollCarousel = (direction: number) => {
    const track = document.getElementById(`track-${index}`)
    if (!track) return

    track.scrollBy({
      left: direction * 600,
      behavior: 'smooth',
    })
  }

  return (
    <section className="pv-section">
      <div className="pv-section-header">
        <h2 className="pv-section-title">
          <span className="title-accent"></span>
          {row.title}
        </h2>

        {row.category && (
          <a href={`/?category=${row.category}`} className="pv-see-all">
            See all{' '}
            <i
              className="bi bi-chevron-right"
              style={{ fontSize: '0.7rem' }}
            ></i>
          </a>
        )}
      </div>

      <div className="pv-carousel-wrapper" id={`carousel-${index}`}>
        <button
          className="pv-arrow pv-arrow-left"
          onClick={() => scrollCarousel(-1)}
          aria-label="Previous"
          type="button"
        >
          <i className="bi bi-chevron-left"></i>
        </button>

        <div className="pv-carousel-track" id={`track-${index}`}>
          {row.items.map((item, itemIndex) => {
            const detailUrl =
              item.content_type === 'series'
                ? `/series/${item.id}`
                : `/movie/${item.id}`

            const year = item.release_date ? item.release_date.slice(0, 4) : ''

            return (
              <a
                href={detailUrl}
                className="pv-card"
                key={`${item.content_type}-${item.id}`}
              >
                <div className="pv-card-img">
                  <FadeImage
                    src={item.thumbnail_display}
                    alt={item.title}
                    loading={itemIndex < 6 ? 'eager' : 'lazy'}
                    fetchPriority={index <= 2 && itemIndex < 4 ? 'high' : 'auto'}
                  />

                  <div className="pv-card-rating">
                    <i className="bi bi-star-fill"></i>{' '}
                    {formatRating(item.rating)}
                  </div>

                  <div className="pv-card-overlay">
                    <div className="pv-card-overlay-actions">
                      <div className="pv-card-play-btn">
                        <i className="bi bi-play-fill"></i>
                      </div>

                      <MyListToggleButton
                        contentId={item.id}
                        contentType={item.content_type}
                        title={item.title}
                        initialInList={Boolean(item.in_my_list)}
                        variant="card"
                      />
                    </div>

                    <div className="pv-card-overlay-title">{item.title}</div>
                    <div className="pv-card-overlay-meta">{year}</div>
                  </div>

                  {itemIndex < 3 && <div className="pv-prime-badge">Included</div>}
                </div>

                <div className="pv-card-info">
                  <div className="pv-card-title">{item.title}</div>
                  <div className="pv-card-meta">
                    {year} • {item.content_type === 'series' ? 'Series' : 'Movie'}
                  </div>
                </div>
              </a>
            )
          })}
        </div>

        <button
          className="pv-arrow pv-arrow-right"
          onClick={() => scrollCarousel(1)}
          aria-label="Next"
          type="button"
        >
          <i className="bi bi-chevron-right"></i>
        </button>
      </div>
    </section>
  )
}

export default CarouselRow