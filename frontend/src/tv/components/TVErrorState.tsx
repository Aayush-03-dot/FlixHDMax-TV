import { RotateCcw } from 'lucide-react'

function TVErrorState({
  title,
  message,
  onRetry,
}: {
  title: string
  message: string
  onRetry?: () => void
}) {
  return (
    <section className="tv-error-state">
      <h1>{title}</h1>
      <p>{message}</p>
      {onRetry && (
        <button
          type="button"
          className="tv-primary-button tv-focusable"
          onClick={onRetry}
          data-tv-focusable="true"
          data-tv-autofocus="true"
          data-tv-key="error-retry"
        >
          <RotateCcw aria-hidden="true" />
          Try again
        </button>
      )}
    </section>
  )
}

export default TVErrorState
