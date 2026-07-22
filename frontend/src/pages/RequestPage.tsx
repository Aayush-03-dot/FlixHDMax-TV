import { useEffect, useMemo, useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import './RequestPage.css'

type BackendRequestType = 'movie' | 'series'

type RequestOption = {
  label: string
  value: string
  backendType: BackendRequestType
}

type SubmitResponse = {
  success: boolean
  message?: string
  request?: {
    id: number
    title: string
    link?: string | null
    notes?: string | null
    request_type?: string
    requester_username?: string
    requester_email?: string
    status?: string
    date?: string
  }
}

const API_BASE_URL = ''

const REQUEST_OPTIONS: RequestOption[] = [
  {
    label: 'Movie',
    value: 'Movie',
    backendType: 'movie',
  },
  {
    label: 'TV Show',
    value: 'TV Show',
    backendType: 'series',
  },
  {
    label: 'Documentary',
    value: 'Documentary',
    backendType: 'movie',
  },
  {
    label: 'Anime',
    value: 'Anime',
    backendType: 'series',
  },
  {
    label: 'Mini Series',
    value: 'Mini Series',
    backendType: 'series',
  },
]

function RequestPage() {
  const [selectedOption, setSelectedOption] = useState<RequestOption>(
    REQUEST_OPTIONS[0]
  )
  const [title, setTitle] = useState('')
  const [link, setLink] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info'
    title: string
    message: string
  } | null>(null)

  useEffect(() => {
    if (!toast) return

    const timer = window.setTimeout(() => {
      setToast(null)
    }, 4200)

    return () => window.clearTimeout(timer)
  }, [toast])

  const canSubmit = useMemo(() => {
    return title.trim().length > 0 && !submitting
  }, [title, submitting])

  const finalNotes = useMemo(() => {
    const cleanNotes = notes.trim()

    if (selectedOption.value === 'Movie' || selectedOption.value === 'TV Show') {
      return cleanNotes
    }

    if (!cleanNotes) {
      return `Requested category: ${selectedOption.value}`
    }

    return `${cleanNotes}\n\nRequested category: ${selectedOption.value}`
  }, [notes, selectedOption])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const cleanTitle = title.trim()
    const cleanLink = link.trim()

    if (!cleanTitle) {
      setToast({
        type: 'error',
        title: 'Title required',
        message: 'Enter a title before submitting.',
      })
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/request/submit`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: cleanTitle,
          link: cleanLink,
          notes: finalNotes,
          request_type: selectedOption.backendType,
        }),
      })

      const data = (await response.json().catch(() => null)) as
        | SubmitResponse
        | null

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Could not submit request.')
      }

      setToast({
        type: 'success',
        title: 'Request submitted',
        message: data.message || 'Your request has been sent.',
      })

      setTitle('')
      setLink('')
      setNotes('')
      setSelectedOption(REQUEST_OPTIONS[0])
    } catch (error) {
      console.error('REQUEST SUBMIT ERROR:', error)

      setToast({
        type: 'error',
        title: 'Request failed',
        message:
          error instanceof Error
            ? error.message
            : 'Could not submit your request.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Navbar />

      <main className="request-page">
        <div className="request-container">
          <header className="request-header">
            <h1>Request a movie or show</h1>
          </header>

          <form className="request-form" onSubmit={handleSubmit}>
            <div className="request-field-group">
              <span className="request-label">Type</span>

              <div className="request-type-list">
                {REQUEST_OPTIONS.map((option) => {
                  const isActive = selectedOption.value === option.value

                  return (
                    <button
                      type="button"
                      key={option.value}
                      className={isActive ? 'active' : ''}
                      aria-pressed={isActive}
                      onClick={() => setSelectedOption(option)}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="request-field">
              <label htmlFor="request-title">
                Title <span>*</span>
              </label>

              <input
                id="request-title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Movie or show title"
                required
              />
            </div>

            <div className="request-field">
              <label htmlFor="request-link">
                IMDb or TMDb link <small>Optional</small>
              </label>

              <input
                id="request-link"
                type="url"
                value={link}
                onChange={(event) => setLink(event.target.value)}
                placeholder="https://"
              />
            </div>

            <div className="request-field">
              <label htmlFor="request-notes">
                Notes <small>Optional</small>
              </label>

              <textarea
                id="request-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Year, language, season, or version"
              />
            </div>

            <button
              type="submit"
              className="request-submit-btn"
              disabled={!canSubmit}
            >
              {submitting ? (
                <>
                  <i className="bi bi-arrow-repeat request-spin"></i>
                  Sending
                </>
              ) : (
                'Submit request'
              )}
            </button>
          </form>
        </div>

        {toast && (
          <div className={`request-toast ${toast.type}`} role="status">
            <i
              className={`bi ${
                toast.type === 'success'
                  ? 'bi-check-circle-fill'
                  : toast.type === 'error'
                    ? 'bi-x-circle-fill'
                    : 'bi-info-circle-fill'
              }`}
            ></i>

            <div>
              <strong>{toast.title}</strong>
              <span>{toast.message}</span>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </>
  )
}

export default RequestPage