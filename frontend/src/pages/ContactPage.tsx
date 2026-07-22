import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import './ContactPage.css'

type TopicOption = {
  label: string
  value: string
}

type SubmitResponse = {
  success: boolean
  message?: string
  contact_message?: {
    id: number
    name: string
    email: string
    subject?: string | null
    message: string
    date: string
    status: string
  }
}

const API_BASE_URL = ''
const MESSAGE_MAX_LENGTH = 2000

const TOPIC_OPTIONS: TopicOption[] = [
  { label: 'Bug Report', value: 'Bug Report' },
  { label: 'Playback Issue', value: 'Playback Issue' },
  { label: 'Account Help', value: 'Account Help' },
  { label: 'Feature Request', value: 'Feature Request' },
  { label: 'General', value: 'General Inquiry' },
]

function ContactPage() {
  const [selectedTopic, setSelectedTopic] = useState<string>('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
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
    return (
      name.trim().length > 0 &&
      email.trim().length > 0 &&
      message.trim().length > 0 &&
      message.length <= MESSAGE_MAX_LENGTH &&
      !submitting
    )
  }, [name, email, message, submitting])

  const charStatusClass = useMemo(() => {
    if (message.length >= MESSAGE_MAX_LENGTH) return 'over'
    if (message.length > MESSAGE_MAX_LENGTH * 0.85) return 'warn'
    return ''
  }, [message])

  const handleTopicClick = (topic: TopicOption) => {
    setSelectedTopic(topic.value)
    setSubject(topic.value)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const cleanName = name.trim()
    const cleanEmail = email.trim()
    const cleanSubject = subject.trim()
    const cleanMessage = message.trim()

    if (!cleanName || !cleanEmail || !cleanMessage) {
      setToast({
        type: 'error',
        title: 'Missing details',
        message: 'Enter your name, email, and message.',
      })
      return
    }

    if (cleanMessage.length > MESSAGE_MAX_LENGTH) {
      setToast({
        type: 'error',
        title: 'Message too long',
        message: `Keep your message under ${MESSAGE_MAX_LENGTH} characters.`,
      })
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/contact/submit`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          subject: cleanSubject,
          message: cleanMessage,
        }),
      })

      const data = (await response.json().catch(() => null)) as
        | SubmitResponse
        | null

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Could not send message.')
      }

      setToast({
        type: 'success',
        title: 'Message sent',
        message: data.message || 'Your message has been sent.',
      })

      setName('')
      setEmail('')
      setSubject('')
      setSelectedTopic('')
      setMessage('')
    } catch (error) {
      console.error('CONTACT SUBMIT ERROR:', error)

      setToast({
        type: 'error',
        title: 'Message failed',
        message:
          error instanceof Error
            ? error.message
            : 'Could not send your message.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Navbar />

      <main className="contact-page">
        <div className="contact-background" aria-hidden="true"></div>
        <div className="contact-overlay" aria-hidden="true"></div>

        <section className="contact-shell">
          <div className="contact-heading">
            <h1>Contact support</h1>
            <p>Send a message about playback, account, or technical issues.</p>
          </div>

          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="contact-topic-group">
              <span className="contact-label">Topic</span>

              <div className="contact-topic-list">
                {TOPIC_OPTIONS.map((topic) => {
                  const isActive = selectedTopic === topic.value

                  return (
                    <button
                      type="button"
                      key={topic.value}
                      className={isActive ? 'active' : ''}
                      aria-pressed={isActive}
                      onClick={() => handleTopicClick(topic)}
                    >
                      {topic.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="contact-field-row">
              <div className="contact-field">
                <label htmlFor="contact-name">
                  Name <span>*</span>
                </label>

                <input
                  id="contact-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  required
                />
              </div>

              <div className="contact-field">
                <label htmlFor="contact-email">
                  Email <span>*</span>
                </label>

                <input
                  id="contact-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div className="contact-field">
              <label htmlFor="contact-subject">Subject</label>

              <input
                id="contact-subject"
                type="text"
                value={subject}
                onChange={(event) => {
                  setSubject(event.target.value)
                  setSelectedTopic(event.target.value)
                }}
                placeholder="Brief subject"
              />
            </div>

            <div className="contact-field">
              <label htmlFor="contact-message">
                Message <span>*</span>
              </label>

              <textarea
                id="contact-message"
                value={message}
                maxLength={MESSAGE_MAX_LENGTH}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Describe the issue"
                required
              />
            </div>

            <div className="contact-form-footer">
              <span className={`contact-char-count ${charStatusClass}`}>
                {message.length} / {MESSAGE_MAX_LENGTH}
              </span>

              <button
                type="submit"
                className="contact-submit-btn"
                disabled={!canSubmit}
              >
                {submitting ? (
                  <>
                    <i className="bi bi-arrow-repeat contact-spin"></i>
                    Sending
                  </>
                ) : (
                  'Send message'
                )}
              </button>
            </div>

            <p className="contact-request-note">
              Looking for a movie or show? <Link to="/request">Use the request page.</Link>
            </p>
          </form>
        </section>

        {toast && (
          <div className={`contact-toast ${toast.type}`} role="status">
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

export default ContactPage