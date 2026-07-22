import './HomeSkeleton.css'

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-card-img skeleton-shimmer"></div>
      <div className="skeleton-card-title skeleton-shimmer"></div>
      <div className="skeleton-card-meta skeleton-shimmer"></div>
    </div>
  )
}

function SkeletonRow({ titleWidth = '180px' }: { titleWidth?: string }) {
  return (
    <section className="skeleton-section">
      <div className="skeleton-section-header">
        <div
          className="skeleton-section-title skeleton-shimmer"
          style={{ width: titleWidth }}
        ></div>
      </div>

      <div className="skeleton-carousel-track">
        {Array.from({ length: 9 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    </section>
  )
}

function MoreRowsSkeleton() {
  return (
    <main className="skeleton-more-main">
      <SkeletonRow titleWidth="170px" />
      <SkeletonRow titleWidth="210px" />
    </main>
  )
}

export default MoreRowsSkeleton