import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
// import { API_BASE_URL } from '../services/api'
import './MyListToggleButton.css'

type ContentType = 'movie' | 'series'

type MyListToggleButtonProps = {
  contentId: string | number
  contentType: ContentType
  title?: string
  initialInList?: boolean
  variant?: 'hero' | 'card'
  onChanged?: (inList: boolean) => void
}

const API_BASE_URL = ""

async function toggleMyList(contentId: string | number, contentType: ContentType) {
  const response = await fetch(`${API_BASE_URL}/api/my-list/toggle`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content_id: String(contentId),
      content_type: contentType,
    }),
  })

  const data = await response.json().catch(() => null)

  if (response.status === 401) {
    throw new Error('LOGIN_REQUIRED')
  }

  if (!response.ok || data?.success === false) {
    throw new Error(data?.message || 'Could not update My List.')
  }

  return Boolean(data?.in_list)
}

function MyListToggleButton({
  contentId,
  contentType,
  title,
  initialInList = false,
  variant = 'card',
  onChanged,
}: MyListToggleButtonProps) {
  const navigate = useNavigate()

  const [inList, setInList] = useState(initialInList)
  const [loading, setLoading] = useState(false)

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (!contentId || loading) return

    setLoading(true)

    const previousValue = inList
    setInList(!previousValue)

    try {
      const nextValue = await toggleMyList(contentId, contentType)

      setInList(nextValue)
      onChanged?.(nextValue)
    } catch (error) {
      setInList(previousValue)

      if (error instanceof Error && error.message === 'LOGIN_REQUIRED') {
        navigate('/login')
        return
      }

      console.error('MY LIST TOGGLE ERROR:', error)
      alert('Could not update My List. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (variant === 'hero') {
    return (
      <button
        type="button"
        className={`my-list-toggle-hero ${inList ? 'active' : ''}`}
        onClick={handleClick}
        disabled={loading}
        aria-label={inList ? `Remove ${title || 'title'} from My List` : `Add ${title || 'title'} to My List`}
      >
        <i
          className={`bi ${
            loading
              ? 'bi-arrow-repeat my-list-toggle-spin'
              : inList
                ? 'bi-check-lg'
                : 'bi-plus-lg'
          }`}
        ></i>
        {inList ? 'My List' : 'Add to List'}
      </button>
    )
  }

  return (
    <button
      type="button"
      className={`my-list-toggle-card ${inList ? 'active' : ''}`}
      onClick={handleClick}
      disabled={loading}
      title={inList ? 'Remove from My List' : 'Add to My List'}
      aria-label={inList ? `Remove ${title || 'title'} from My List` : `Add ${title || 'title'} to My List`}
    >
      <i
        className={`bi ${
          loading
            ? 'bi-arrow-repeat my-list-toggle-spin'
            : inList
              ? 'bi-check-lg'
              : 'bi-plus-lg'
        }`}
      ></i>
    </button>
  )
}

export default MyListToggleButton