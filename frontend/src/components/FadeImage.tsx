import { useState } from 'react'

type Props = {
  src?: string
  fallbackSrc?: string
  alt: string
  className?: string
  loading?: 'lazy' | 'eager'
  fetchPriority?: 'high' | 'low' | 'auto'
}

function FadeImage({
  src,
  fallbackSrc = 'https://placehold.co/300x450/1a2637/8fa4b5?text=No+Image',
  alt,
  className = '',
  loading = 'lazy',
  fetchPriority = 'auto',
}: Props) {
  const [loaded, setLoaded] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(src || fallbackSrc)

  return (
    <img
      src={currentSrc}
      alt={alt}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding="async"
      className={`fade-image ${loaded ? 'fade-image-loaded' : ''} ${className}`}
      onLoad={() => setLoaded(true)}
      onError={() => {
        if (currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc)
        }
      }}
    />
  )
}

export default FadeImage