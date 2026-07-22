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

function HomeSkeleton() {
  return (
    <>
      <section className="skeleton-hero">
        <div className="skeleton-hero-bg skeleton-shimmer"></div>

        <div className="skeleton-hero-content">
          <div className="skeleton-badge skeleton-shimmer"></div>
          <div className="skeleton-hero-title skeleton-shimmer"></div>
          <div className="skeleton-hero-meta skeleton-shimmer"></div>
          <div className="skeleton-hero-desc skeleton-shimmer"></div>
          <div className="skeleton-hero-desc short skeleton-shimmer"></div>

          <div className="skeleton-hero-actions">
            <div className="skeleton-action skeleton-shimmer"></div>
            <div className="skeleton-action secondary skeleton-shimmer"></div>
          </div>
        </div>
      </section>

      <main className="skeleton-main">
        <SkeletonRow titleWidth="180px" />
        <SkeletonRow titleWidth="140px" />
        <SkeletonRow titleWidth="210px" />
      </main>
    </>
  )
}

export default HomeSkeleton