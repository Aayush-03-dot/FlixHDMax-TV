function TVLoading({ label = 'Loading FlixHDMax' }: { label?: string }) {
  return (
    <div className="tv-loading" role="status" aria-live="polite">
      <div className="tv-loading-spinner" />
      <p>{label}</p>
    </div>
  )
}

export default TVLoading
